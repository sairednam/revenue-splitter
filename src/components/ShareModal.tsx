import { useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Download, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { REVENUE_SPLITTER } from '@/contract';

interface ShareModalProps {
  onClose: () => void;
}

export function ShareModal({ onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<SVGSVGElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function copyAddress() {
    void navigator.clipboard.writeText(REVENUE_SPLITTER.address);
    toast.success('Address copied!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQR() {
    const svg = qrRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const size = 440;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 20, 20, size - 40, size - 40);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = 'revenue-splitter-qr.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR downloaded!');
    };
    img.src = url;
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,18,30,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="glass-card relative w-full max-w-sm rounded-3xl p-6"
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-xl transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Title */}
        <h2 className="display mb-1 text-lg font-bold pr-10" style={{ color: 'var(--ink)' }}>
          Share Split
        </h2>
        <p className="mb-5 text-xs" style={{ color: 'var(--muted)' }}>
          Share this QR with anyone to receive USDC payments
        </p>

        {/* Large QR */}
        <div className="mb-5 flex justify-center">
          <div className="rounded-2xl p-4" style={{ background: '#ffffff', border: '1px solid var(--border)' }}>
            <QRCodeSVG
              ref={qrRef}
              value={REVENUE_SPLITTER.address}
              size={220}
              bgColor="#ffffff"
              fgColor="#122d45"
              level="M"
              marginSize={0}
            />
          </div>
        </div>

        {/* Full address */}
        <div
          className="mb-4 rounded-2xl px-4 py-3"
          style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Contract address
          </p>
          <span className="mono block break-all text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {REVENUE_SPLITTER.address}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={copyAddress}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
            style={{
              background: copied ? 'rgba(26,128,71,0.12)' : 'var(--accent)',
              color: copied ? 'var(--success)' : '#ffffff',
            }}
          >
            {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy Address</>}
          </button>
          <button
            onClick={downloadQR}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
            style={{ background: 'var(--surface-muted)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            <Download className="size-3.5" /> Download QR
          </button>
        </div>
      </div>
    </div>
  );
}
