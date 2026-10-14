import { ConnectKitButton } from 'connectkit';
import { Wallet } from 'lucide-react';

export function ConnectPrompt() {
  return (
    <section className="glass-card rounded-3xl p-8 text-center">
      <div
        className="mx-auto mb-4 flex size-14 items-center justify-center rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(95,190,255,0.15) 0%, rgba(175,143,244,0.15) 100%)',
          border: '1px solid rgba(255,255,255,0.6)',
        }}
      >
        <Wallet className="size-6" style={{ color: 'var(--accent-hover)' }} />
      </div>
      <h3 className="display mb-1.5 text-base font-bold" style={{ color: 'var(--ink)' }}>
        Connect your wallet
      </h3>
      <p className="mb-6 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Connect to set recipients, send USDC, or trigger a distribution.
      </p>
      <div className="flex justify-center">
        <ConnectKitButton />
      </div>
    </section>
  );
}
