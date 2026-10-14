// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RevenueSplitter} from "../RevenueSplitter.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Handler used by the invariant test
// ─────────────────────────────────────────────────────────────────────────────

contract SplitterHandler is Test {
    RevenueSplitter public splitter;
    MockERC20 public usdc;
    address public owner;

    // Ghost tracking: sum of all expected recipient receipts
    uint256 public ghostTotalReceived;

    address[] internal _wallets;
    uint256 internal _walletCount;

    constructor(RevenueSplitter _splitter, MockERC20 _usdc, address _owner, address[] memory wallets) {
        splitter = _splitter;
        usdc = _usdc;
        owner = _owner;
        _wallets = wallets;
        _walletCount = wallets.length;
    }

    /// @dev Fund the contract and distribute; tracks ghost totals.
    function fundAndDistribute(uint256 amount) external {
        // Bound to a realistic but wide USDC range (1 unit to 1 billion USDC, 6 decimals)
        amount = bound(amount, 1, 1_000_000_000e6);

        usdc.mint(address(splitter), amount);
        ghostTotalReceived += amount;

        vm.prank(owner);
        splitter.distribute();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test contract
// ─────────────────────────────────────────────────────────────────────────────

contract RevenueSplitterTest is Test {
    // ── Canonical USDC address (immutable constant in the contract under test) ──
    // RevenueSplitter takes usdc as a constructor arg, NOT a hardcoded constant,
    // so we deploy MockERC20 normally and pass it in — no vm.etch needed.

    RevenueSplitter internal splitter;
    MockERC20 internal usdc;

    address internal owner  = makeAddr("owner");
    address internal alice  = makeAddr("alice");
    address internal bob    = makeAddr("bob");
    address internal carol  = makeAddr("carol");
    address internal dave   = makeAddr("dave");

    uint256 internal constant USDC_DECIMALS = 6;
    uint256 internal constant ONE_USDC      = 10 ** USDC_DECIMALS;

    // ── setUp ─────────────────────────────────────────────────────────────────

    function setUp() public {
        usdc     = new MockERC20("Mock USDC", "mUSDC", 6);
        splitter = new RevenueSplitter(owner, "TestRoute", address(usdc));
    }

    // =========================================================================
    // 1. DEPLOYMENT & INITIALIZATION
    // =========================================================================

    function test_Constructor_SetsOwner() public view {
        assertEq(splitter.owner(), owner);
    }

    function test_Constructor_SetsRouteName() public view {
        assertEq(splitter.routeName(), "TestRoute");
    }

    function test_Constructor_SetsUsdcAddress() public view {
        assertEq(splitter.usdc(), address(usdc));
    }

    function test_Constructor_StartsWithNoRecipients() public view {
        assertEq(splitter.recipientCount(), 0);
    }

    function test_Constructor_StartsWithNoDistributions() public view {
        RevenueSplitter.Distribution[] memory dists = splitter.getDistributions();
        assertEq(dists.length, 0);
    }

    function test_Constructor_TotalDistributedIsZero() public view {
        assertEq(splitter.totalDistributed(), 0);
    }

    function test_Constructor_RevertsOnZeroUsdcToken() public {
        vm.expectRevert(RevenueSplitter.ZeroUsdcToken.selector);
        new RevenueSplitter(owner, "TestRoute", address(0));
    }

    // =========================================================================
    // 2. setRecipients — happy paths
    // =========================================================================

    function test_SetRecipients_SingleRecipient() public {
        address[] memory wallets = new address[](1);
        uint16[]  memory shares  = new uint16[](1);
        wallets[0] = alice;
        shares[0]  = 10_000;

        vm.prank(owner);
        splitter.setRecipients(wallets, shares);

        assertEq(splitter.recipientCount(), 1);
        RevenueSplitter.Recipient[] memory recs = splitter.getRecipients();
        assertEq(recs[0].wallet,   alice);
        assertEq(recs[0].shareBps, 10_000);
    }

    function test_SetRecipients_ThreeRecipients() public {
        _setThreeRecipients(5_000, 3_000, 2_000);

        assertEq(splitter.recipientCount(), 3);
        RevenueSplitter.Recipient[] memory recs = splitter.getRecipients();
        assertEq(recs[0].wallet,   alice); assertEq(recs[0].shareBps, 5_000);
        assertEq(recs[1].wallet,   bob);   assertEq(recs[1].shareBps, 3_000);
        assertEq(recs[2].wallet,   carol); assertEq(recs[2].shareBps, 2_000);
    }

    function test_SetRecipients_OverwritesPreviousRecipients() public {
        _setThreeRecipients(5_000, 3_000, 2_000);

        // Overwrite with a single new recipient
        address[] memory wallets = new address[](1);
        uint16[]  memory shares  = new uint16[](1);
        wallets[0] = dave;
        shares[0]  = 10_000;

        vm.prank(owner);
        splitter.setRecipients(wallets, shares);

        assertEq(splitter.recipientCount(), 1);
        RevenueSplitter.Recipient[] memory recs = splitter.getRecipients();
        assertEq(recs[0].wallet, dave);
    }

    function test_SetRecipients_EmitsRecipientsSet() public {
        address[] memory wallets = new address[](2);
        uint16[]  memory shares  = new uint16[](2);
        wallets[0] = alice; shares[0] = 6_000;
        wallets[1] = bob;   shares[1] = 4_000;

        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(splitter));
        emit RevenueSplitter.RecipientsSet(wallets, shares);
        splitter.setRecipients(wallets, shares);
    }

    function test_SetRecipients_MaxRecipients() public {
        // Exactly 50 recipients should succeed
        (address[] memory wallets, uint16[] memory shares) = _buildEqualRecipients(50);
        vm.prank(owner);
        splitter.setRecipients(wallets, shares);
        assertEq(splitter.recipientCount(), 50);
    }

    // =========================================================================
    // 3. setRecipients — revert paths
    // =========================================================================

    function test_SetRecipients_RevertIfNotOwner() public {
        address[] memory wallets = new address[](1);
        uint16[]  memory shares  = new uint16[](1);
        wallets[0] = alice;
        shares[0]  = 10_000;

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        splitter.setRecipients(wallets, shares);
    }

    function test_SetRecipients_RevertIfEmptyArray() public {
        address[] memory wallets = new address[](0);
        uint16[]  memory shares  = new uint16[](0);

        vm.prank(owner);
        vm.expectRevert(RevenueSplitter.EmptyRecipients.selector);
        splitter.setRecipients(wallets, shares);
    }

    function test_SetRecipients_RevertIfLengthMismatch() public {
        address[] memory wallets = new address[](2);
        uint16[]  memory shares  = new uint16[](1);
        wallets[0] = alice; wallets[1] = bob;
        shares[0]  = 10_000;

        vm.prank(owner);
        vm.expectRevert(RevenueSplitter.LengthMismatch.selector);
        splitter.setRecipients(wallets, shares);
    }

    function test_SetRecipients_RevertIfSharesTooLow() public {
        address[] memory wallets = new address[](2);
        uint16[]  memory shares  = new uint16[](2);
        wallets[0] = alice; wallets[1] = bob;
        shares[0]  = 4_000; shares[1] = 4_000; // 8000 != 10000

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(RevenueSplitter.InvalidShareTotal.selector, uint256(8_000)));
        splitter.setRecipients(wallets, shares);
    }

    function test_SetRecipients_RevertIfSharesTooHigh() public {
        address[] memory wallets = new address[](2);
        uint16[]  memory shares  = new uint16[](2);
        wallets[0] = alice; wallets[1] = bob;
        shares[0]  = 6_000; shares[1] = 6_000; // 12000 != 10000

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(RevenueSplitter.InvalidShareTotal.selector, uint256(12_000)));
        splitter.setRecipients(wallets, shares);
    }

    function test_SetRecipients_RevertIfZeroAddress() public {
        address[] memory wallets = new address[](2);
        uint16[]  memory shares  = new uint16[](2);
        wallets[0] = alice; wallets[1] = address(0);
        shares[0]  = 5_000; shares[1]  = 5_000;

        vm.prank(owner);
        vm.expectRevert(RevenueSplitter.ZeroWallet.selector);
        splitter.setRecipients(wallets, shares);
    }

    function test_SetRecipients_RevertIfTooManyRecipients() public {
        (address[] memory wallets, uint16[] memory shares) = _buildEqualRecipients(51);

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(RevenueSplitter.TooManyRecipients.selector, uint256(51), uint256(50))
        );
        splitter.setRecipients(wallets, shares);
    }

    // =========================================================================
    // 4. distribute() — happy paths
    // =========================================================================

    function test_Distribute_SingleRecipient_FullBalance() public {
        _setOneRecipient(alice, 10_000);

        uint256 amount = 1_000 * ONE_USDC;
        usdc.mint(address(splitter), amount);

        vm.prank(owner);
        splitter.distribute();

        assertEq(usdc.balanceOf(alice), amount, "alice should receive full balance");
        assertEq(usdc.balanceOf(address(splitter)), 0, "splitter should be drained");
    }

    function test_Distribute_ThreeRecipients_ExactSplit() public {
        // 50 / 30 / 20 — amount chosen so all divisions are exact (no dust)
        _setThreeRecipients(5_000, 3_000, 2_000);

        uint256 amount = 1_000 * ONE_USDC; // 1000e6
        usdc.mint(address(splitter), amount);

        vm.prank(owner);
        splitter.distribute();

        assertEq(usdc.balanceOf(alice), 500 * ONE_USDC, "alice 50%");
        assertEq(usdc.balanceOf(bob),   300 * ONE_USDC, "bob 30%");
        assertEq(usdc.balanceOf(carol), 200 * ONE_USDC, "carol 20%");
        assertEq(usdc.balanceOf(address(splitter)), 0, "splitter drained");
    }

    function test_Distribute_DustGoesToFirstRecipient() public {
        // 3 recipients: 1/3 each → use a balance not divisible by 3
        address[] memory wallets = new address[](3);
        uint16[]  memory shares  = new uint16[](3);
        wallets[0] = alice; shares[0] = 3_334; // ~1/3 (plus 2 bps for rounding)
        wallets[1] = bob;   shares[1] = 3_333;
        wallets[2] = carol; shares[2] = 3_333;

        vm.prank(owner);
        splitter.setRecipients(wallets, shares);

        // Use 10 units so integer division causes dust
        uint256 amount = 10; // tiny amount to force dust
        usdc.mint(address(splitter), amount);

        vm.prank(owner);
        splitter.distribute();

        uint256 aliceBal = usdc.balanceOf(alice);
        uint256 bobBal   = usdc.balanceOf(bob);
        uint256 carolBal = usdc.balanceOf(carol);

        // Total must equal initial balance (no leakage)
        assertEq(aliceBal + bobBal + carolBal, amount, "total must equal initial balance");

        // Dust (if any) lands on alice (first recipient)
        uint256 bobExpect   = (amount * 3_333) / 10_000;
        uint256 carolExpect = (amount * 3_333) / 10_000;
        assertEq(bobBal,   bobExpect,   "bob exact share");
        assertEq(carolBal, carolExpect, "carol exact share");
        // Alice gets the remainder (base + dust)
        assertEq(aliceBal, amount - bobExpect - carolExpect, "alice gets remainder with dust");
    }

    function test_Distribute_UpdatesTotalDistributed() public {
        _setOneRecipient(alice, 10_000);

        uint256 first  = 100 * ONE_USDC;
        uint256 second = 200 * ONE_USDC;

        usdc.mint(address(splitter), first);
        vm.prank(owner);
        splitter.distribute();

        usdc.mint(address(splitter), second);
        vm.prank(owner);
        splitter.distribute();

        assertEq(splitter.totalDistributed(), first + second);
    }

    function test_Distribute_RecordsDistributionEntry() public {
        _setOneRecipient(alice, 10_000);

        uint256 amount = 500 * ONE_USDC;
        usdc.mint(address(splitter), amount);

        uint256 ts = block.timestamp;
        vm.prank(owner);
        splitter.distribute();

        RevenueSplitter.Distribution[] memory dists = splitter.getDistributions();
        assertEq(dists.length,    1);
        assertEq(dists[0].amount, amount);
        assertEq(dists[0].timestamp, ts);
    }

    function test_Distribute_EmitsDistributedEvent() public {
        _setOneRecipient(alice, 10_000);

        uint256 amount = 250 * ONE_USDC;
        usdc.mint(address(splitter), amount);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(splitter));
        emit RevenueSplitter.Distributed(amount, block.timestamp);
        splitter.distribute();
    }

    function test_Distribute_GetUsdcBalanceReturnsZeroAfterDistribute() public {
        _setOneRecipient(alice, 10_000);
        usdc.mint(address(splitter), 100 * ONE_USDC);

        vm.prank(owner);
        splitter.distribute();

        assertEq(splitter.getUsdcBalance(), 0);
    }

    function test_Distribute_MultipleRounds_AccumulatesDistributions() public {
        _setOneRecipient(alice, 10_000);

        for (uint256 i = 0; i < 3; i++) {
            usdc.mint(address(splitter), ONE_USDC);
            vm.prank(owner);
            splitter.distribute();
        }

        RevenueSplitter.Distribution[] memory dists = splitter.getDistributions();
        assertEq(dists.length, 3);
    }

    // =========================================================================
    // 5. distribute() — revert paths
    // =========================================================================

    function test_Distribute_RevertIfNotOwner() public {
        _setOneRecipient(alice, 10_000);
        usdc.mint(address(splitter), ONE_USDC);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        splitter.distribute();
    }

    function test_Distribute_RevertIfNoRecipients() public {
        usdc.mint(address(splitter), ONE_USDC);

        vm.prank(owner);
        vm.expectRevert(RevenueSplitter.NoRecipientsConfigured.selector);
        splitter.distribute();
    }

    function test_Distribute_RevertIfZeroBalance() public {
        _setOneRecipient(alice, 10_000);
        // No USDC minted to splitter

        vm.prank(owner);
        vm.expectRevert(RevenueSplitter.ZeroBalance.selector);
        splitter.distribute();
    }

    // =========================================================================
    // 6. renounceOwnership — always reverts
    // =========================================================================

    function test_RenounceOwnership_RevertsForOwner() public {
        vm.prank(owner);
        vm.expectRevert(RevenueSplitter.RenounceOwnershipDisabled.selector);
        splitter.renounceOwnership();
    }

    function test_RenounceOwnership_RevertsForNonOwner() public {
        // Non-owner call: OwnableUnauthorizedAccount fires first (from onlyOwner),
        // but the override is view+onlyOwner — the OZ modifier runs first.
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        splitter.renounceOwnership();
    }

    // =========================================================================
    // 7. getUsdcBalance view function
    // =========================================================================

    function test_GetUsdcBalance_ReflectsContractBalance() public {
        uint256 amount = 77 * ONE_USDC;
        usdc.mint(address(splitter), amount);
        assertEq(splitter.getUsdcBalance(), amount);
    }

    function test_GetUsdcBalance_IsZeroInitially() public view {
        assertEq(splitter.getUsdcBalance(), 0);
    }

    // =========================================================================
    // 8. FUZZ — share arithmetic: no value is lost or created during distribute
    // =========================================================================

    /// @dev Fuzz the balance to verify total recipient receipts == initial balance.
    ///      Uses 3 fixed recipients (50/30/20 BPS) and varies the USDC amount.
    function testFuzz_Distribute_TotalEqualsInitialBalance(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000_000e6); // 1 unit to 1B USDC

        _setThreeRecipients(5_000, 3_000, 2_000);

        usdc.mint(address(splitter), amount);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore   = usdc.balanceOf(bob);
        uint256 carolBefore = usdc.balanceOf(carol);

        vm.prank(owner);
        splitter.distribute();

        uint256 aliceReceived = usdc.balanceOf(alice) - aliceBefore;
        uint256 bobReceived   = usdc.balanceOf(bob)   - bobBefore;
        uint256 carolReceived = usdc.balanceOf(carol) - carolBefore;

        assertEq(
            aliceReceived + bobReceived + carolReceived,
            amount,
            "total distributed must equal initial balance (no leak, no creation)"
        );
        assertEq(usdc.balanceOf(address(splitter)), 0, "splitter must be fully drained");
        assertEq(splitter.totalDistributed(), amount, "totalDistributed must equal amount");
    }

    /// @dev Fuzz arbitrary share splits across 2 recipients (must sum to 10000).
    ///      Verifies no value leaks for any valid BPS pair.
    function testFuzz_Distribute_TwoRecipients_NoLeakForAnyShares(
        uint16 share1,
        uint256 amount
    ) public {
        // Constrain share1 to [1, 9999] so share2 is also in [1, 9999]
        share1 = uint16(bound(uint256(share1), 1, 9_999));
        uint16 share2 = 10_000 - share1;
        amount = bound(amount, 1, 1_000_000_000e6);

        address[] memory wallets = new address[](2);
        uint16[]  memory shares  = new uint16[](2);
        wallets[0] = alice; shares[0] = share1;
        wallets[1] = bob;   shares[1] = share2;

        vm.prank(owner);
        splitter.setRecipients(wallets, shares);

        usdc.mint(address(splitter), amount);

        uint256 aliceBefore = usdc.balanceOf(alice);
        uint256 bobBefore   = usdc.balanceOf(bob);

        vm.prank(owner);
        splitter.distribute();

        uint256 totalReceived = (usdc.balanceOf(alice) - aliceBefore) + (usdc.balanceOf(bob) - bobBefore);
        assertEq(totalReceived, amount, "all tokens must be distributed");
        assertEq(usdc.balanceOf(address(splitter)), 0, "no tokens left in splitter");
    }

    /// @dev Fuzz: totalDistributed tracks running sum across multiple rounds.
    function testFuzz_TotalDistributed_AccumulatesAcrossRounds(
        uint256 amount1,
        uint256 amount2
    ) public {
        amount1 = bound(amount1, 1, 1_000_000e6);
        amount2 = bound(amount2, 1, 1_000_000e6);

        _setOneRecipient(alice, 10_000);

        usdc.mint(address(splitter), amount1);
        vm.prank(owner);
        splitter.distribute();

        usdc.mint(address(splitter), amount2);
        vm.prank(owner);
        splitter.distribute();

        assertEq(splitter.totalDistributed(), amount1 + amount2);
    }

    // =========================================================================
    // 9. INVARIANT — sum of all recipient balances after distribute == contract balance
    // =========================================================================

    // The invariant test is in a separate contract below (RevenueSplitterInvariantTest).
    // Solidity invariant tests require their own contract with targetContract().

    // =========================================================================
    // Internal helpers
    // =========================================================================

    function _setOneRecipient(address wallet, uint16 shareBps) internal {
        address[] memory wallets = new address[](1);
        uint16[]  memory shares  = new uint16[](1);
        wallets[0] = wallet;
        shares[0]  = shareBps;
        vm.prank(owner);
        splitter.setRecipients(wallets, shares);
    }

    function _setThreeRecipients(uint16 s1, uint16 s2, uint16 s3) internal {
        address[] memory wallets = new address[](3);
        uint16[]  memory shares  = new uint16[](3);
        wallets[0] = alice; shares[0] = s1;
        wallets[1] = bob;   shares[1] = s2;
        wallets[2] = carol; shares[2] = s3;
        vm.prank(owner);
        splitter.setRecipients(wallets, shares);
    }

    /// @dev Build N equal recipients. If 10000 % N != 0, any remainder goes to slot 0.
    function _buildEqualRecipients(uint256 n) internal returns (address[] memory wallets, uint16[] memory shares) {
        wallets = new address[](n);
        shares  = new uint16[](n);
        uint16 baseShare = uint16(10_000 / n);
        uint16 remainder = uint16(10_000 - baseShare * n);
        for (uint256 i = 0; i < n; i++) {
            wallets[i] = makeAddr(string(abi.encodePacked("recipient_", i)));
            shares[i]  = baseShare;
        }
        shares[0] += remainder; // add any rounding remainder to first slot
        return (wallets, shares);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Invariant test — SEPARATE CONTRACT (required by Foundry's invariant runner)
// ─────────────────────────────────────────────────────────────────────────────

contract RevenueSplitterInvariantTest is Test {
    RevenueSplitter internal splitter;
    MockERC20       internal usdc;
    SplitterHandler internal handler;

    address internal owner = makeAddr("inv_owner");
    address internal alice = makeAddr("inv_alice");
    address internal bob   = makeAddr("inv_bob");
    address internal carol = makeAddr("inv_carol");

    function setUp() public {
        usdc     = new MockERC20("Mock USDC", "mUSDC", 6);
        splitter = new RevenueSplitter(owner, "InvRoute", address(usdc));

        // Configure 3 recipients (50/30/20)
        address[] memory wallets = new address[](3);
        uint16[]  memory shares  = new uint16[](3);
        wallets[0] = alice; shares[0] = 5_000;
        wallets[1] = bob;   shares[1] = 3_000;
        wallets[2] = carol; shares[2] = 2_000;

        vm.prank(owner);
        splitter.setRecipients(wallets, shares);

        address[] memory handlerWallets = new address[](3);
        handlerWallets[0] = alice;
        handlerWallets[1] = bob;
        handlerWallets[2] = carol;

        handler = new SplitterHandler(splitter, usdc, owner, handlerWallets);

        // Only drive state through the handler
        targetContract(address(handler));
    }

    /// @dev INVARIANT: After every distribute(), the splitter holds 0 USDC.
    ///      i.e. every token that entered via the handler left via distribute().
    function invariant_SplitterAlwaysDrainedToZero() public view {
        assertEq(
            usdc.balanceOf(address(splitter)),
            0,
            "splitter must hold 0 USDC after each distribute"
        );
    }

    /// @dev INVARIANT: totalDistributed == sum of what was minted to splitter and distributed.
    ///      The handler's ghostTotalReceived tracks cumulative minted+distributed amounts.
    function invariant_TotalDistributedMatchesGhost() public view {
        assertEq(
            splitter.totalDistributed(),
            handler.ghostTotalReceived(),
            "totalDistributed must equal sum of all distributions"
        );
    }

    /// @dev INVARIANT: Sum of all recipient USDC balances equals totalDistributed.
    ///      (No tokens were minted to any address outside distribute().)
    function invariant_RecipientBalancesSumToTotalDistributed() public view {
        uint256 recipientSum = usdc.balanceOf(alice) + usdc.balanceOf(bob) + usdc.balanceOf(carol);
        assertEq(
            recipientSum,
            splitter.totalDistributed(),
            "sum of recipient balances must equal totalDistributed"
        );
    }
}
