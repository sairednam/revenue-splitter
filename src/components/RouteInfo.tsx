import { useReadContract } from 'wagmi';
import { Copy, ExternalLink, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { REVENUE_SPLITTER, ARC_MAINNET_CHAIN_ID } from '@/contract';
import { buildAddressExplorerUrl } from '@/onchain-facts';

export function RouteInfo() {
  const { data: recipientCount } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'recipientCount',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const { data: totalDistributed } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'totalDistributed',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const explorerUrl = buildAddressExplorerUrl(ARC_MAINNET_CHAIN_ID, REVENUE_SPLITTER.address);

  function copyAddress() {
    void navigator.clipboard.writeText(REVENUE_SPLITTER.address);
    toast.success('Address copied!');
  }

  const totalFmt = totalDistributed !== undefined
    ? (Number(totalDistributed) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

  return (
    <section className="glass-card rounded-3xl p-5">
      {/* Title row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 items-center justify-center rounded-lg"
            style={{ background: 'rgba(16,97,166,0.12)' }}
          >
            <Shield className="size-3.5" style={{ color: 'var(--accent-hover)' }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Route Info
          </span>
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all hover:opacity-70"
          style={{ background: 'var(--surface-muted)', color: 'var(--accent-hover)' }}
        >
          Explorer <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Address row */}
      <div
        className="glass-inner mb-4 flex items-center gap-2 rounded-2xl px-3.5 py-3"
      >
        <span className="mono min-w-0 flex-1 truncate text-xs" style={{ color: 'var(--ink-2)' }}>
          {REVENUE_SPLITTER.address.slice(0, 10)}...{REVENUE_SPLITTER.address.slice(-8)}
        </span>
        <button
          onClick={copyAddress}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-all hover:opacity-70 active:scale-95"
          style={{ background: 'var(--border)' }}
          aria-label="Copy contract address"
        >
          <Copy className="size-3.5" style={{ color: 'var(--subtle)' }} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Recipients', value: recipientCount !== undefined ? Number(recipientCount).toString() : '—' },
          { label: 'Network', value: 'Arc' },
          { label: 'Total Paid', value: `$${totalFmt}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl px-3 py-2.5 text-center"
            style={{ background: 'var(--surface-muted)' }}
          >
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="display mt-0.5 text-sm font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
