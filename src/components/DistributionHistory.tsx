import { useReadContract } from 'wagmi';
import { Clock, ArrowDownToLine } from 'lucide-react';
import { REVENUE_SPLITTER, ARC_MAINNET_CHAIN_ID } from '@/contract';
import { formatUsdc } from '@/utils';

interface Distribution {
  amount: bigint;
  timestamp: bigint;
}

export function DistributionHistory() {
  const { data: distributions, isLoading } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'getDistributions',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const { data: totalDistributed } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'totalDistributed',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const { data: recipientCount } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'recipientCount',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const list = (distributions as Distribution[] | undefined) ?? [];
  const reversed = [...list].reverse();
  const count = recipientCount !== undefined ? Number(recipientCount) : null;

  return (
    <section className="glass-card rounded-3xl p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4" style={{ color: 'var(--accent)' }} />
          <h2 className="display text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Distribution History
          </h2>
          {list.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
            >
              {list.length} payout{list.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {totalDistributed !== undefined && (totalDistributed as bigint) > 0n && (
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Total distributed</p>
            <p className="display text-sm font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {formatUsdc(totalDistributed as bigint)} USDC
            </p>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reversed.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-10 text-center"
          style={{ background: 'var(--surface-muted)' }}
        >
          <ArrowDownToLine className="mb-2 size-8 opacity-20" style={{ color: 'var(--subtle)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No distributions yet</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>
            Fund the contract and click Distribute Now
          </p>
        </div>
      )}

      {/* History rows */}
      {!isLoading && reversed.length > 0 && (
        <div className="space-y-2">
          {reversed.map((d, i) => {
            const index = list.length - i; // newest = highest index
            const date = new Date(Number(d.timestamp) * 1000);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl px-4 py-3"
                style={{ background: 'var(--surface-muted)' }}
              >
                {/* Index badge */}
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums"
                  style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--ink-2)' }}
                >
                  #{index}
                </div>

                {/* Date + recipients */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{dateStr}</p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                    {timeStr}
                    {count !== null && (
                      <span className="ml-2" style={{ color: 'var(--muted)' }}>
                        · {count} recipient{count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>

                {/* Amount */}
                <span className="display shrink-0 text-sm font-bold tabular-nums" style={{ color: 'var(--success)' }}>
                  +{formatUsdc(d.amount)} USDC
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
