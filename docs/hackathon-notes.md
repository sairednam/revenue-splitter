# Revenue Splitter — Hackathon Reference Notes

Everything built in this project, explained so you can present it confidently.

---

## What We Built

**Revenue Splitter** is a full-stack Web3 app on Arc Testnet that lets a team or creator set up a programmable USDC payment account that automatically splits incoming funds among multiple recipients by percentage.

**Real-world use cases:**
- A dev team splitting client payments (30% / 40% / 30%)
- A creator splitting revenue with collaborators
- A DAO splitting grant payouts
- A protocol splitting protocol fees among contributors

---

## The Stack

| Layer | Technology | Why |
|---|---|---|
| Blockchain | Arc Testnet | USDC is the native gas token — no ETH needed |
| Smart contract | Solidity (EVM) | Holds USDC, enforces split logic on-chain |
| Contract framework | Foundry (forge) | Compile, test, deploy |
| Frontend | React + TypeScript + Vite | Fast, type-safe UI |
| Onchain hooks | wagmi v2 + viem | Read/write contracts from the browser |
| Wallet connection | ConnectKit + WalletConnect (Reown) | 300+ wallets supported |
| UI styling | Tailwind CSS | Utility-first, no CSS files |
| Toast notifications | Sonner | User feedback on tx status |
| QR codes | qrcode.react | Deposit address QR |
| Contract safety | OpenZeppelin v5 | Ownable, ReentrancyGuard, SafeERC20 |

---

## Why Arc Testnet

Arc is Circle's own blockchain where **USDC is the native gas token**. This means:
- Users pay gas in USDC — no need to hold a separate ETH or MATIC
- Fees are stable and predictable (not volatile)
- Sub-second finality — transactions confirm almost instantly
- Perfect for payment apps where USDC is the only asset involved

**USDC address on Arc Testnet:** `0x3600000000000000000000000000000000000000`

---

## The Smart Contract — RevenueSplitter.sol

**Deployed at:** `0x4a4b7de8521a748be2e5c88b36967f32a25d7402` on Arc Testnet

### What it does
- Holds USDC sent by anyone
- The owner configures up to 50 recipients and their percentage shares (stored as basis points, where 10000 = 100%)
- The owner calls `distribute()` to split the entire USDC balance proportionally in one transaction
- Every distribution is recorded on-chain with amount and timestamp
- Tracks total USDC ever distributed

### Key design decisions

**Basis points instead of percentages**
Shares are stored as `uint16 shareBps` where 10000 = 100%. This avoids floating point entirely — all math is integer division on-chain.

**Dust handling**
Integer division always leaves a remainder. For example, splitting 10 USDC three ways: each gets 3.333... USDC. The contract gives the first recipient the leftover dust, so the full balance is always drained.

**MAX_RECIPIENTS = 50**
The `distribute()` function loops over all recipients and sends a transfer per recipient. Unbounded loops can hit the block gas limit. We cap at 50 to keep gas predictable.

**`renounceOwnership()` disabled**
OpenZeppelin's `Ownable` has a `renounceOwnership()` function. If called, the contract would have no owner and `distribute()` could never be called again — locking any USDC inside forever. We override it to always revert.

**`nonReentrant` before `onlyOwner`**
The reentrancy lock must be acquired before any other modifier runs. Correct order: `nonReentrant onlyOwner`.

**SafeERC20**
Instead of calling `token.transfer()` directly (which can silently fail on some ERC-20s), we use OpenZeppelin's `SafeERC20.safeTransfer()` which reverts on failure.

### Custom errors (gas efficient)
```solidity
error LengthMismatch();
error EmptyRecipients();
error ZeroWallet();
error InvalidShareTotal(uint256 totalBps);
error NoRecipientsConfigured();
error ZeroBalance();
error ZeroUsdcToken();
error RenounceOwnershipDisabled();
error TooManyRecipients(uint256 count, uint256 max);
```
Custom errors cost less gas than `require("string")` because error strings are not stored in bytecode.

### ABI surface
```
constructor(address initialOwner, string name, address usdcToken)
setRecipients(address[] wallets, uint16[] shares)   — onlyOwner
distribute()                                         — onlyOwner, nonReentrant
getRecipients() → Recipient[]
getDistributions() → Distribution[]
getUsdcBalance() → uint256
recipientCount() → uint256
routeName() → string
totalDistributed() → uint256
```

---

## Security Audit

The contract went through a full security review before deployment. Findings and fixes:

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Critical | `renounceOwnership()` could permanently lock USDC | Overrode to always revert |
| 2 | High | Unbounded recipient loop could hit block gas limit | Added `MAX_RECIPIENTS = 50` cap |
| 3 | High | Wrong modifier order (`onlyOwner` before `nonReentrant`) | Reordered to `nonReentrant onlyOwner` |

**Test coverage:** 40 unit tests, fuzz tests (256 runs each), and invariant tests (256 × 500 depth = 128,000 calls). Zero failures.

---

## Frontend Features

### 1. Name Your Split
A text input at the top lets the team name their split (e.g. "Team Alpha Revenue"). The name updates:
- The header title in real time
- The browser tab title via `document.title`

This is purely local (client-side state) — the on-chain `routeName` is set at deploy time via the constructor.

### 2. Route Info Card
Reads `routeName` and `recipientCount` live from the contract using wagmi's `useReadContract`. Shows:
- The route name
- Shortened contract address
- Recipient count, network, token
- Explorer link to view the contract on-chain

### 3. Balance Card
Calls `getUsdcBalance()` on the contract (which reads `IERC20(usdc).balanceOf(address(this))`). Shows the current USDC balance with a refresh button. Auto-displays as formatted USDC with 2 decimal places.

### 4. Deposit Address + QR Code
A dedicated card with:
- A 200px QR code generated by `qrcode.react` encoding the contract address
- The full contract address displayed
- A copy button that turns green with a checkmark on success
- Anyone can scan the QR with any wallet and send USDC directly

### 5. Set Recipients Form
The owner can configure up to 50 recipients:
- Wallet address input per row
- Percentage input (0–100, supports decimals)
- Live running total badge — turns green at exactly 100%, red otherwise
- Add/remove rows
- **Equal Split button** — one click divides 100% evenly among all current rows
- On submit, calls `setRecipients(wallets, shares)` on-chain

### 6. Send USDC to Contract
Any connected wallet can send USDC to the contract:
- Amount input with decimal validation
- "Max" button reads the user's live USDC balance and fills it
- Calls the ERC-20 `transfer(contractAddress, amount)` function

### 7. Distribute Button
Owner-only button that calls `distribute()` on-chain. Splits the entire contract balance to all recipients in one transaction. Shows a transaction explorer link on success.

### 8. Current Recipients (with earnings)
Reads `getRecipients()` from the contract. For each recipient shows:
- Shortened wallet address
- Their percentage share
- **Total earned:** calculated as `totalDistributed × shareBps / 10000` — how much USDC they have received across all distributions

### 9. Distribution History
Reads `getDistributions()` from the contract — an array of `{amount, timestamp}` structs. Shows every distribution with date, time, and amount. Most recent first. Shows total distributed in the header.

---

## Wallet Support

The app supports virtually every Web3 wallet via ConnectKit + WalletConnect (Reown):

| Connector | Wallets covered |
|---|---|
| `injected()` | MetaMask, Rabby, Brave Wallet, any browser extension |
| `walletConnect()` | Rainbow, Trust Wallet, 1inch, Zerion, Ledger Live, Argent, Uniswap Wallet, 300+ more |
| `coinbaseWallet()` | Coinbase Wallet (mobile + extension) |
| `safe()` | Gnosis Safe, multisig wallets |

WalletConnect Project ID provisioned via Reown Cloud (cloud.reown.com).

---

## How a Full Flow Works (for demo)

1. Connect your wallet (owner wallet)
2. The app reads the contract and shows the route name, balance, and recipient count
3. Add recipient wallet addresses and set their percentages (or click Equal Split)
4. Click "Save Recipients" — sends `setRecipients()` tx, confirm in wallet
5. Share the QR code or contract address with a client
6. Client scans QR, sends 100 USDC to the contract
7. Balance card updates to show 100 USDC
8. Owner clicks "Distribute Now" — sends `distribute()` tx
9. Each recipient receives their share instantly
10. Distribution History updates with the payout record
11. Each recipient row now shows their total earned

---

## Key Numbers

| Metric | Value |
|---|---|
| Contract address | `0x4a4b7de8521a748be2e5c88b36967f32a25d7402` |
| Network | Arc Testnet (chain ID 5042002) |
| USDC address | `0x3600000000000000000000000000000000000000` |
| Max recipients | 50 |
| Test coverage | 40 tests (unit + fuzz + invariant) |
| Security findings fixed | 3 (1 Critical, 2 High) |
| Wallet connectors | 4 (300+ wallets total) |

---

## What Makes This Different from a Simple Multi-Send

A regular multi-send requires the sender to calculate amounts and send to each address manually every time. Revenue Splitter:
- Stores the split configuration on-chain permanently
- Anyone can deposit — they don't need to know the recipients
- One `distribute()` call splits everything, no manual math
- Full history is stored on-chain, not in a database
- No custodian — the contract is the escrow, not a company
