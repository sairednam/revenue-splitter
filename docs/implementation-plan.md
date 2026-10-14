Let me read the files I need to edit before touching anything. Good. I have everything I need. Now installing `qrcode.react`, then making all four changes in parallel. Plan mode is active — I can't run commands or write files. Here's exactly what needs to happen in Build mode, so you can approve and I'll execute all four changes immediately.

---

**Plan: 4 features to add**

**Step 1 — Install `qrcode.react`**
```
bun add qrcode.react
```
`qrcode.react` ships its own types so no `@types/` package needed.

---

**Step 2 — Feature 1: Name Your Split**

- Add `splitName` state (`useState<string>`) to `App.tsx`, defaulting to `"Revenue Splitter"`
- Render a styled text input above the grid in `<main>` that writes to `splitName`
- Pass `splitName` down as a prop to `<Header>` so the header title reflects it
- Use `useEffect(() => { document.title = splitName || 'Revenue Splitter'; }, [splitName])` to update the browser tab

---

**Step 3 — Feature 2: New `DepositCard` component**

New file: `src/components/DepositCard.tsx`

- Imports `QRCodeSVG` from `qrcode.react`
- Shows the full contract address with a copy button (same as RouteInfo)
- Below the address, renders `<QRCodeSVG value={REVENUE_SPLITTER.address} size={200} />` centered in the card, with a white background and padding so it scans cleanly
- Add `<DepositCard />` to `App.tsx` spanning the full width above the two-column grid (or inline in the top row below RouteInfo/BalanceCard)

---

**Step 4 — Feature 3: Equal Split button**

In `RecipientsPanel.tsx`, add a button in the "Set Recipients" header row (next to the `{totalPct}% / 100%` badge):

```ts
const handleEqualSplit = () => {
  const count = rows.length;
  if (count === 0) return;
  const base = Math.floor(10000 / count);       // BPS per recipient
  const remainder = 10000 - base * count;        // leftover BPS (dust)
  setRows(prev => prev.map((r, i) => ({
    ...r,
    percent: ((base + (i === 0 ? remainder : 0)) / 100).toFixed(2),
  })));
};
```

This gives the first recipient any dust from rounding (same logic as the contract), so shares always total exactly 100%.

---

**Step 5 — Feature 4: Per-recipient earnings**

In `RecipientsPanel.tsx`, read `totalDistributed` from the contract:

```ts
const { data: totalDistributed } = useReadContract({
  address: REVENUE_SPLITTER.address,
  abi: REVENUE_SPLITTER.abi,
  functionName: 'totalDistributed',
  chainId: ARC_TESTNET_CHAIN_ID,
});
```

Then in each recipient row, compute and display:
```ts
const earned = totalDistributed
  ? (totalDistributed as bigint) * BigInt(r.shareBps) / 10000n
  : null;
```

Show this below the wallet address in the Current Recipients section — small green text reading e.g. `Earned: 125.00 USDC`.

---

**Step 6 — Typecheck**
```
bun run typecheck
```
Fix any errors before finishing.

---

Switch to **Build mode** using the mode selector and I'll implement all of this right away.
