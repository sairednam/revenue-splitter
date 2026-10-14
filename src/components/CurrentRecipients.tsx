import { useReadContract } from 'wagmi';
import { Users } from 'lucide-react';
import { REVENUE_SPLITTER, ARC_MAINNET_CHAIN_ID } from '@/contract';
import { formatAddress, bpsToPercent } from '@/utils';

interface Recipient {
  wallet: `0x${string}`;
  shareBps: number;
}

export function CurrentRecipients() {
  const { data: onchainRecipients } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'getRecipients',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const { data: totalDistributed } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'totalDistributed',
    chainId: ARC_MAINNET_CHAIN_ID,
  });

  const recipients = (onchainRecipients as Recipient[] | undefined) ?? [];

  return (
    <section className="glass-card h-full rounded-3xl p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex size-6 items-center justify-center rounded-lg"
          style={{ background: 'rgba(18,45,69,0.08)' }}
        >
          <Users className="size-3.5" style={{ color: 'var(--accent)' }} />
        </div>
        <h2 className="display text-sm font-bold" style={{ color: 'var(--ink)' }}>
          Current Recipients
        </h2>
        {recipients.length > 0 && (
          <span
            className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
            style={{ background: 'rgba(16,97,166,0.10)', color: 'var(--accent-hover)' }}
          >
            {recipients.length} active
          </span>
        )}
      </div>

      {recipients.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-10 text-center"
          style={{ background: 'var(--surface-muted)' }}
        >
          <div
            className="mb-3 flex size-12 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(18,45,69,0.06)' }}
          >
            <Users className="size-6 opacity-30" style={{ color: 'var(--subtle)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No recipients yet</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>Add recipients using the form</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recipients.map((r, i) => {
            const earned = totalDistributed !== undefined
              ? (totalDistributed as bigint) * BigInt(r.shareBps) / 10000n
              : null;

            // share bar width capped at 100%
            const sharePct = r.shareBps / 100;

            return (
              <div
                key={i}
                className="glass-inner overflow-hidden rounded-2xl px-4 py-3"
              >
                {/* Share progress bar */}
                <div className="mb-2 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(sharePct, 100)}%`,
                      background: 'linear-gradient(90deg, #5fbeff, #af8ff4)',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="mono block text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                      {formatAddress(r.wallet)}
                    </span>
                    {earned !== null && earned > 0n ? (
                      <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                        Earned: {(Number(earned) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--subtle)' }}>No distributions yet</span>
                    )}
                  </div>
                  <span
                    className="display ml-3 shrink-0 text-base font-bold tabular-nums"
                    style={{ color: 'var(--accent)' }}
                  >
                    {bpsToPercent(r.shareBps)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
