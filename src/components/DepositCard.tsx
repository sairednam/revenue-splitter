import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { REVENUE_SPLITTER, ARC_MAINNET_CHAIN_ID } from '@/contract';
import { buildAddressExplorerUrl } from '@/onchain-facts';
import { ShareModal } from '@/components/ShareModal';

export function DepositCard() {
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const explorerUrl = buildAddressExplorerUrl(ARC_MAINNET_CHAIN_ID, REVENUE_SPLITTER.address);

  function copyAddress() {
    void navigator.clipboard.writeText(REVENUE_SPLITTER.address);
    toast.success('Address copied!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <section className="glass-card rounded-3xl p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md" style={{ background: 'rgba(16,97,166,0.12)' }}>
            <QrCode className="size-3" style={{ color: 'var(--accent-hover)' }} />
          </div>
          <h2 className="display text-sm font-bold" style={{ color: 'var(--ink)' }}>Deposit Address</h2>
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: 'rgba(26,128,71,0.10)', color: 'var(--success)' }}
          >
            Send USDC here
          </span>
        </div>

        {/* Two-column: QR left, info right */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">

          {/* QR code */}
          <div className="flex shrink-0 justify-center sm:justify-start">
            <div className="rounded-2xl p-3" style={{ background: '#ffffff', border: '1px solid var(--border)' }}>
              <QRCodeSVG
                value={REVENUE_SPLITTER.address}
                size={160}
                bgColor="#ffffff"
                fgColor="#122d45"
                level="M"
                marginSize={0}
              />
            </div>
          </div>

          {/* Right: address + actions */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Contract address
              </p>
              <div
                className="rounded-2xl px-3.5 py-3"
                style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
              >
                <span className="mono block break-all text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {REVENUE_SPLITTER.address}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={copyAddress}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{
                  background: copied ? 'rgba(26,128,71,0.12)' : 'var(--accent)',
                  color: copied ? 'var(--success)' : '#ffffff',
                }}
                aria-label="Copy contract address"
              >
                {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
              </button>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ background: 'var(--surface-muted)', color: 'var(--accent)', border: '1px solid var(--border)' }}
              >
                <ExternalLink className="size-3.5" />
              </a>
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'var(--surface-muted)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                aria-label="Share split"
              >
                <Share2 className="size-3.5" />
                Share
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--subtle)' }}>
              Scan with any wallet to send USDC. Token: <strong style={{ color: 'var(--ink-2)' }}>USDC</strong> on <strong style={{ color: 'var(--ink-2)' }}>Arc Mainnet</strong>.
            </p>
          </div>
        </div>
      </section>

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </>
  );
}
