import { ConnectKitButton } from 'connectkit';
import { GitFork, Zap, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  splitName: string;
  dark: boolean;
  onToggleDark: () => void;
}

export function Header({ splitName, dark, onToggleDark }: HeaderProps) {
  const displayName = splitName.trim() || 'Revenue Splitter';

  return (
    <header className="sticky top-0 z-20">
      {/* Spectral strip */}
      <div className="spectral-strip" />

      {/* Nav bar */}
      <div
        className="px-4 py-3"
        style={{
          background: dark ? 'rgba(13,17,23,0.88)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(18,45,69,0.09)'}`,
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">

          {/* Left: logo + name */}
          <div className="flex items-center gap-3">
            <div
              className="relative flex size-9 items-center justify-center rounded-2xl"
              style={{
                background: 'var(--accent)',
                boxShadow: dark ? '0 2px 12px rgba(95,190,255,0.28)' : '0 2px 12px rgba(18,45,69,0.28)',
              }}
            >
              <GitFork className="size-4" style={{ color: dark ? '#0d1117' : '#ffffff' }} />
              <span
                className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full"
                style={{
                  background: '#7ef1b3',
                  border: `2px solid ${dark ? '#0d1117' : 'white'}`,
                  boxShadow: '0 0 6px rgba(126,241,179,0.6)',
                }}
              />
            </div>
            <div>
              <h1 className="display text-base font-bold leading-tight" style={{ color: 'var(--ink)' }}>
                {displayName}
              </h1>
              <div className="flex items-center gap-1">
                <Zap className="size-2.5" style={{ color: '#5fbeff' }} />
                <p className="text-xs leading-tight font-medium" style={{ color: 'var(--muted)' }}>
                  Arc Mainnet · USDC
                </p>
              </div>
            </div>
          </div>

          {/* Right: dark toggle + connect */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDark}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex size-9 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(18,45,69,0.07)',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(18,45,69,0.10)'}`,
                color: 'var(--ink)',
              }}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <ConnectKitButton />
          </div>
        </div>
      </div>
    </header>
  );
}
