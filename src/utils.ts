export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatUsdc(raw: bigint): string {
  const n = Number(raw) / 1_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2);
}

export function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? '';
  if (msg.includes('user rejected') || msg.includes('user denied')) return 'Transaction cancelled.';
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) return 'Insufficient USDC balance.';
  if (msg.includes('zerobalance')) return 'Contract has no USDC to distribute.';
  if (msg.includes('norecipientsconfigured')) return 'No recipients configured yet.';
  if (msg.includes('invalidsharetotal')) return 'Shares must total exactly 100%.';
  if (msg.includes('reverted')) {
    const match = msg.match(/reason="([^"]+)"/);
    return match ? `Failed: ${match[1]}` : 'Transaction failed. Please try again.';
  }
  if (msg.includes('network') || msg.includes('timeout')) return 'Network error. Please try again.';
  return 'Something went wrong. Please try again.';
}
