# Revenue Splitter

A full-stack onchain app on **Arc Testnet** that lets a team or creator set up a programmable USDC revenue account that automatically splits incoming payments among multiple recipients.

## Features

- Create a named revenue route with a custom set of recipients
- Assign percentage shares to each wallet (must total exactly 100%)
- Anyone can send USDC into the contract at any time
- The owner distributes the current balance to all recipients in one transaction
- All distribution history is stored on-chain and visible in the dashboard
- Up to 50 recipients supported per route

## Architecture

```
contracts/
  RevenueSplitter.sol         — Main contract (Ownable, ReentrancyGuard, SafeERC20)
  test/
    RevenueSplitter.t.sol     — 40 Foundry unit + fuzz + invariant tests
  out/                        — Compiled artifacts (forge build output)
  contract-metadata/
    RevenueSplitter.json      — Deployment metadata

src/
  contract.ts                 — Contract address + ABI import
  utils.ts                    — Formatting helpers
  components/
    Header.tsx                — App header + wallet connect button
    RouteInfo.tsx             — Route name, address, recipient count
    BalanceCard.tsx           — Live USDC balance of the contract
    RecipientsPanel.tsx       — Set recipients, send USDC, distribute
    DistributionHistory.tsx   — On-chain distribution history
    ConnectPrompt.tsx         — Wallet connect gate
```

## Deployed Contract

| | |
|---|---|
| **Network** | Arc Testnet (chain ID 5042002) |
| **Address** | `0x4a4b7de8521a748be2e5c88b36967f32a25d7402` |
| **USDC** | `0x3600000000000000000000000000000000000000` |
| **Explorer** | https://explorer.testnet.arc.io/address/0x4a4b7de8521a748be2e5c88b36967f32a25d7402 |

## Local Development

### Prerequisites

- [Bun](https://bun.sh) v1.x
- [Foundry](https://getfoundry.sh) (forge)
- Node 18+

### Install & run

```bash
bun install
bun run dev
```

The app starts at `http://localhost:5173`.

### Run contract tests

```bash
forge test -v
```

### Build contracts

```bash
forge build
```

## How to use the app

1. **Connect your wallet** — click the Connect button (top right). Switch to Arc Testnet.

2. **Get test USDC** — use the "Get test USDC" button in the Arc Studio sidebar to drip Arc Testnet USDC to your wallet.

3. **Set recipients** — enter wallet addresses and percentage shares. Shares must sum to exactly 100%. Click **Save Recipients** and confirm the transaction.

4. **Fund the contract** — enter an amount in "Send USDC to Contract" and confirm. Anyone can do this step.

5. **Distribute** — once the contract has a balance and recipients are set, click **Distribute Now**. The owner's wallet splits the entire balance proportionally in one transaction.

6. **View history** — the Distribution History panel shows every payout with its amount and timestamp.

## Contract Design

The `RevenueSplitter` contract:

- Accepts any ERC-20 token address at deploy time (set to Arc Testnet USDC)
- Stores recipients as an array of `(address wallet, uint16 shareBps)` structs
- Shares are in basis points (1 BPS = 0.01%). Must sum to exactly 10 000 (100%)
- Hard cap of 50 recipients to prevent gas-limit DOS
- Dust from integer division always goes to the first recipient
- Full distribution history stored on-chain in a `Distribution[]` array
- `renounceOwnership()` is disabled to prevent accidental permanent fund-lockup
- All USDC transfers use OpenZeppelin `SafeERC20`
- `distribute()` uses `nonReentrant` (first) and `onlyOwner` guards

## Security Review Summary

A balanced security review was run before deployment. Three findings were resolved:

| Severity | Issue | Fix |
|---|---|---|
| Critical | `renounceOwnership()` could permanently lock USDC | Overridden to revert |
| High | Unbounded recipient loop could hit block gas limit | Hard cap of 50 recipients added |
| High | `nonReentrant` was not first in modifier order | Reordered to `nonReentrant onlyOwner` |

## License

MIT
