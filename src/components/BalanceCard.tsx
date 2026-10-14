import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { Wallet, RefreshCw, Loader2, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { REVENUE_SPLITTER, ARC_MAINNET_CHAIN_ID } from '@/contract';
import { formatUsdc, parseOnchainError } from '@/utils';
import { buildTxExplorerUrl } from '@/onchain-facts';

export function BalanceCard() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const wrongChain = chainId !== ARC_MAINNET_CHAIN_ID;

  const { data: balance, isLoading, refetch } = useReadContract({
    address: REVENUE_SPLITTER.address,
    abi: REVENUE_SPLITTER.abi,
    functionName: 'getUsdcBalance',
    chainId: ARC_MAINNET_CHAIN_ID,
    query: {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  const { writeContract: writeDistribute, data: distHash, isPending: distIsPending } = useWriteContract();
  const { isLoading: distIsConfirming, isSuccess: distIsSuccess } = useWaitForTransactionReceipt({ hash: distHash });

  const formatted = balance !== undefined ? formatUsdc(balance as bigint) : '—';
  const hasBalance = balance !== undefined && (balance as bigint) > 0n;

  const handleDistribute = () => {
    if (wrongChain) { switchChain({ chainId: ARC_MAINNET_CHAIN_ID }); return; }
    writeDistribute({
      address: REVENUE_SPLITTER.address,
      abi: REVENUE_SPLITTER.abi,
      functionName: 'distribute',
      chainId: ARC_MAINNET_CHAIN_ID,
    }, {
      onSuccess: () => { toast.success('USDC distributed to all recipients!'); void refetch(); },
      onError: (err) => toast.error(parseOnchainError(err)),
    });
  };

  return (
    <section className="glass-card rounded-3xl p-5">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 items-center justify-center rounded-lg"
            style={{ background: 'rgba(26,128,71,0.12)' }}
          >
            <Wallet className="size-3.5" style={{ color: 'var(--success)' }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Contract Balance
          </span>
        </div>
        <button
          onClick={() => { void refetch(); }}
          className="flex size-8 items-center justify-center rounded-xl transition-all hover:opacity-70 active:scale-95"
          style={{ background: 'var(--surface-muted)' }}
          aria-label="Refresh balance"
        >
          <RefreshCw className="size-3.5" style={{ color: 'var(--subtle)' }} />
        </button>
      </div>

      {/* Amount */}
      <div className="mb-1 flex items-baseline gap-2">
        {isLoading ? (
          <div className="h-12 w-40 animate-pulse rounded-2xl" style={{ background: 'var(--border)' }} />
        ) : (
          <>
            <span className="display text-5xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
              {formatted}
            </span>
            <span className="display text-2xl font-semibold" style={{ color: 'var(--subtle)' }}>USDC</span>
          </>
        )}
      </div>

      <p className="mb-5 text-xs" style={{ color: 'var(--muted)' }}>
        Anyone can send USDC to this contract
      </p>

      {/* Distribute Now CTA */}
      {address && (
        <div>
          <button
            disabled={!hasBalance || distIsPending || distIsConfirming}
            onClick={handleDistribute}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
            style={{
              background: hasBalance ? 'var(--success)' : 'var(--surface-muted)',
              color: hasBalance ? '#ffffff' : 'var(--subtle)',
            }}
          >
            {wrongChain ? 'Switch to Arc Mainnet'
              : distIsPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Confirm in wallet...
                </span>
              ) : distIsConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Distributing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="size-4" />
                  Distribute Now
                </span>
              )}
          </button>
          {!hasBalance && !isLoading && (
            <p className="mt-2 text-center text-xs" style={{ color: 'var(--subtle)' }}>
              Fund the contract first to enable distribution
            </p>
          )}
          {distIsSuccess && distHash && (
            <a
              href={buildTxExplorerUrl(ARC_MAINNET_CHAIN_ID, distHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-1 text-xs font-medium"
              style={{ color: 'var(--success)' }}
            >
              Distribution confirmed <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
