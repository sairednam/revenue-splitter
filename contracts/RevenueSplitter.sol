// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RevenueSplitter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 private constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_RECIPIENTS = 50;

    error TooManyRecipients(uint256 count, uint256 max);

    struct Recipient {
        address wallet;
        uint16 shareBps;
    }

    struct Distribution {
        uint256 amount;
        uint256 timestamp;
    }

    error LengthMismatch();
    error EmptyRecipients();
    error ZeroWallet();
    error InvalidShareTotal(uint256 totalBps);
    error NoRecipientsConfigured();
    error ZeroBalance();
    error ZeroUsdcToken();
    error RenounceOwnershipDisabled();

    string public routeName;
    address public immutable usdc;
    Recipient[] public recipients;
    Distribution[] public distributions;
    uint256 public totalDistributed;

    event RecipientsSet(address[] wallets, uint16[] shares);
    event Distributed(uint256 totalAmount, uint256 timestamp);

    constructor(address initialOwner, string memory name, address usdcToken) Ownable(initialOwner) {
        if (usdcToken == address(0)) {
            revert ZeroUsdcToken();
        }

        routeName = name;
        usdc = usdcToken;
    }

    function setRecipients(address[] calldata wallets, uint16[] calldata shares) external onlyOwner {
        uint256 length = wallets.length;

        if (length != shares.length) {
            revert LengthMismatch();
        }
        if (length == 0) {
            revert EmptyRecipients();
        }
        if (length > MAX_RECIPIENTS) {
            revert TooManyRecipients(length, MAX_RECIPIENTS);
        }

        uint256 totalBps = 0;

        delete recipients;

        for (uint256 i = 0; i < length; ++i) {
            address wallet = wallets[i];
            if (wallet == address(0)) {
                revert ZeroWallet();
            }

            uint16 share = shares[i];
            totalBps += share;

            recipients.push(Recipient({wallet: wallet, shareBps: share}));
        }

        if (totalBps != BPS_DENOMINATOR) {
            revert InvalidShareTotal(totalBps);
        }

        emit RecipientsSet(wallets, shares);
    }

    function distribute() external nonReentrant onlyOwner {
        uint256 length = recipients.length;
        if (length == 0) {
            revert NoRecipientsConfigured();
        }

        IERC20 token = IERC20(usdc);
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) {
            revert ZeroBalance();
        }

        uint256 firstAmount = 0;
        uint256 sentToOthers = 0;

        for (uint256 i = 0; i < length; ++i) {
            Recipient memory recipient = recipients[i];
            uint256 amount = (balance * recipient.shareBps) / BPS_DENOMINATOR;

            if (i == 0) {
                firstAmount = amount;
            } else {
                sentToOthers += amount;
                token.safeTransfer(recipient.wallet, amount);
            }
        }

        uint256 dust = balance - (firstAmount + sentToOthers);
        token.safeTransfer(recipients[0].wallet, firstAmount + dust);

        distributions.push(Distribution({amount: balance, timestamp: block.timestamp}));
        totalDistributed += balance;

        emit Distributed(balance, block.timestamp);
    }

    /// @dev Override to prevent accidental or malicious permanent fund-lockup.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceOwnershipDisabled();
    }

    function recipientCount() external view returns (uint256) {
        return recipients.length;
    }

    function getRecipients() external view returns (Recipient[] memory) {
        return recipients;
    }

    function getDistributions() external view returns (Distribution[] memory) {
        return distributions;
    }

    function getUsdcBalance() external view returns (uint256) {
        return IERC20(usdc).balanceOf(address(this));
    }
}
