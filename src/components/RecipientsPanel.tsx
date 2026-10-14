import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { Plus, Trash2, ExternalLink, Loader2, ChevronRight, Equal } from 'lucide-react';
import { toast } from 'sonner';
import { REVENUE_SPLITTER, ARC_MAINNET_CHAIN_ID, arcUsdc } from '@/contract';
import { parseOnchainError } from '@/utils';
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money';
import { buildTxExplorerUrl } from '@/onchain-facts';

interface RecipientRow {
  wallet: string;
  percent: string;
}

interface Recipient {
  wallet: `0x${string}`;
  shareBps: number;
}

function pctToBps(pct: string): number {
  return Math.round(parseFloat(pct || '0') * 100);
}

export function RecipientsPanel() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const [userRows, setUserRows] = useState<RecipientRow[] | null>(null);
  const [sendAmount, setSendAmount] = useState('');

  const wrongChain = chainId !== ARC_MAINNET_CHAIN_ID;

  const { data: onchainRecipients, refetch: refetchRecipients } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'getRecipients',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const onchainRows: RecipientRow[] = (onchainRecipients as Recipient[] | undefined ?? []).map((r) => ({
    wallet: r.wallet,
    percent: (r.shareBps / 100).toFixed(2),
  }));
  const rows = userRows ?? (onchainRows.length > 0 ? onchainRows : [{ wallet: '', percent: '50' }, { wallet: '', percent: '50' }]);

  const { data: userBalance } = useReadContract({
    address: arcUsdc.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const userBalanceFormatted = userBalance !== undefined
    ? Amount.fromRaw(userBalance, usdcDecimalsFor(ARC_MAINNET_CHAIN_ID)).toFixed(2)
    : undefined;

  const { writeContract: writeSetRecipients, data: setHash, isPending: setIsPending } = useWriteContract();
  const { isLoading: setIsConfirming, isSuccess: setIsSuccess } =
    useWaitForTransactionReceipt({
      hash: setHash,
      chainId: ARC_MAINNET_CHAIN_ID,
    });

  const { writeContract: writeSend, data: sendHash, isPending: sendIsPending } = useWriteContract();

  const { isLoading: sendIsConfirming, isSuccess: sendIsSuccess } =
    useWaitForTransactionReceipt({
      hash: sendHash,
      chainId: ARC_MAINNET_CHAIN_ID,
    });

  const totalBps = rows.reduce((sum, r) => sum + pctToBps(r.percent), 0);
  const totalPct = (totalBps / 100).toFixed(2);
  const totalOk = totalBps === 10000;


  const addRow = () => {
    const nextRows = [...(userRows ?? rows), { wallet: '', percent: '0' }];
    const count = nextRows.length;
    const baseBps = Math.floor(10000 / count);
    const dustBps = 10000 - baseBps * count;

    setUserRows(
      nextRows.map((row, i) => ({
        ...row,
        percent: ((baseBps + (i === 0 ? dustBps : 0)) / 100).toFixed(2),
      }))
    );
  };

  const removeRow = (i: number) => setUserRows((prev) => (prev ?? rows).filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof RecipientRow, val: string) => {
    setUserRows((prev) => (prev ?? rows).map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  };

  const handleEqualSplit = () => {
    const count = rows.length;
    if (count === 0) return;
    const baseBps = Math.floor(10000 / count);
    const dustBps = 10000 - baseBps * count;
    setUserRows(
      rows.map((r, i) => ({
        ...r,
        percent: ((baseBps + (i === 0 ? dustBps : 0)) / 100).toFixed(2),
      }))
    );
  };

  const handleSetRecipients = () => {
    if (wrongChain) { switchChain({ chainId: ARC_MAINNET_CHAIN_ID }); return; }
    if (!address) return;
    if (!totalOk) { toast.error('Shares must total exactly 100%'); return; }
    const wallets = rows.map((r) => r.wallet as `0x${string}`);
    const shares = rows.map((r) => pctToBps(r.percent));
    writeSetRecipients({
      address: REVENUE_SPLITTER.address,
      abi: REVENUE_SPLITTER.abi,
      functionName: 'setRecipients',
      args: [wallets, shares],
      chainId: ARC_MAINNET_CHAIN_ID,
    }, {
      onSuccess: () => { toast.success('Recipients updated!'); setUserRows(null); void refetchRecipients(); },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  };

  const handleSendUsdc = useCallback(() => {
    if (wrongChain) { switchChain({ chainId: ARC_MAINNET_CHAIN_ID }); return; }
    if (!sendAmount) return;
    const parsed = parseAmount(ARC_MAINNET_CHAIN_ID, sendAmount);
    writeSend({
      address: arcUsdc.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [REVENUE_SPLITTER.address, parsed.raw],
      chainId: ARC_MAINNET_CHAIN_ID,
    }, {
      onSuccess: () => { toast.success('USDC sent to contract!'); setSendAmount(''); },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  }, [wrongChain, switchChain, sendAmount, writeSend]);

  return (
    <div className="space-y-5">
      {/* Set recipients form */}
      <section className="glass-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="display text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Set Recipients
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEqualSplit}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'rgba(16,97,166,0.10)', color: 'var(--accent-hover)' }}
              title="Divide 100% equally among all recipients"
            >
              <Equal className="size-3" />
              Equal split
            </button>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
              style={{
                background: totalOk ? 'rgba(26,128,71,0.10)' : 'rgba(186,43,76,0.10)',
                color: totalOk ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {totalPct}% / 100%
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder="0x wallet address"
                value={row.wallet}
                onChange={(e) => updateRow(i, 'wallet', e.target.value)}
                className="mono min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs outline-none"
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                }}
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="50"
                  value={row.percent}
                  onChange={(e) => updateRow(i, 'percent', e.target.value)}
                  className="w-16 rounded-xl px-2 py-2.5 text-center text-xs font-semibold tabular-nums outline-none"
                  style={{
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    color: 'var(--ink)',
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>%</span>
              </div>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(i)}
                  className="flex size-9 items-center justify-center rounded-xl transition-opacity hover:opacity-70"
                  style={{ background: 'rgba(186,43,76,0.08)' }}
                >
                  <Trash2 className="size-3.5" style={{ color: 'var(--danger)' }} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent-hover)' }}
        >
          <Plus className="size-3.5" />
          Add recipient
        </button>

        <button
          disabled={!totalOk || setIsPending || setIsConfirming}
          onClick={handleSetRecipients}
          className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {wrongChain ? 'Switch to Arc Mainnet'
            : setIsPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Confirm in wallet...
              </span>
            ) : setIsConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Confirming...
              </span>
            ) : 'Save Recipients'}
        </button>

        {setIsSuccess && setHash && (
          <a
            href={buildTxExplorerUrl(ARC_MAINNET_CHAIN_ID, setHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-1 text-xs"
            style={{ color: 'var(--success)' }}
          >
            Recipients saved <ExternalLink className="size-3" />
          </a>
        )}
      </section>

      {/* Send USDC to contract */}
      <section className="glass-card rounded-3xl p-5">
        <h2 className="display mb-4 text-sm font-bold" style={{ color: 'var(--ink)' }}>
          Send USDC to Contract
        </h2>
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
          <input
            inputMode="decimal"
            value={sendAmount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '');
              if (v === '' || /^\d*\.?\d*$/.test(v)) setSendAmount(v);
            }}
            placeholder="0.00"
            className="display w-full bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-30"
            style={{ color: 'var(--ink)' }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>USDC</span>
            {userBalanceFormatted && (
              <button
                onClick={() => setSendAmount(userBalanceFormatted)}
                className="text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent-hover)' }}
              >
                Balance: {userBalanceFormatted} · Max
              </button>
            )}
          </div>
        </div>
        <button
          disabled={!sendAmount || sendIsPending || sendIsConfirming}
          onClick={handleSendUsdc}
          className="mt-3 w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {wrongChain ? 'Switch to Arc Mainnet'
            : sendIsPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Confirm in wallet...
              </span>
            ) : sendIsConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Confirming...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                Send to Contract <ChevronRight className="size-4" />
              </span>
            )}
        </button>
        {sendIsSuccess && sendHash && (
          <a
            href={buildTxExplorerUrl(ARC_MAINNET_CHAIN_ID, sendHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-1 text-xs"
            style={{ color: 'var(--success)' }}
          >
            USDC sent <ExternalLink className="size-3" />
          </a>
        )}
      </section>
    </div>
  );
}
