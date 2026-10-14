import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { RouteInfo } from '@/components/RouteInfo';
import { BalanceCard } from '@/components/BalanceCard';
import { DepositCard } from '@/components/DepositCard';
import { CurrentRecipients } from '@/components/CurrentRecipients';
import { RecipientsPanel } from '@/components/RecipientsPanel';
import { DistributionHistory } from '@/components/DistributionHistory';
import { ConnectPrompt } from '@/components/ConnectPrompt';
import { OnboardingStepper } from '@/components/OnboardingStepper';
import { useDarkMode } from '@/hooks/useDarkMode';
import { REVENUE_SPLITTER, ARC_MAINNET_CHAIN_ID } from '@/contract';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1.0] },
};

function stagger(i: number) {
  return { ...fadeUp, transition: { ...fadeUp.transition, delay: i * 0.07 } };
}

export default function App() {
  const { isConnected } = useAccount();
  const [splitName, setSplitName] = useState('Revenue Splitter');
  const { dark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    document.title = splitName.trim() || 'Revenue Splitter';
  }, [splitName]);

  // Stepper state — read contract data
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

  const hasRecipients = recipientCount !== undefined && Number(recipientCount) > 0;
  const hasDistributions = totalDistributed !== undefined && (totalDistributed as bigint) > 0n;

  return (
    <div className="relative min-h-dvh overflow-x-hidden" style={{ background: 'var(--bg-gradient)' }}>

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: 'absolute', top: '4%', left: '3%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,190,255,0.13) 0%, transparent 70%)', filter: 'blur(72px)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-5%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(175,143,244,0.10) 0%, transparent 70%)', filter: 'blur(68px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,205,131,0.14) 0%, transparent 70%)', filter: 'blur(64px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(126,241,179,0.10) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <Header splitName={splitName} dark={dark} onToggleDark={toggleDark} />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-7 pb-16">

        {/* Split name input */}
        <motion.div className="mb-6" {...stagger(0)}>
          <div className="glass-card flex items-center gap-3 rounded-3xl px-5 py-4">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Split name
            </span>
            <input
              type="text"
              value={splitName}
              onChange={(e) => setSplitName(e.target.value)}
              placeholder="e.g. Team Alpha Revenue"
              className="display min-w-0 flex-1 bg-transparent text-lg font-bold outline-none placeholder:font-normal placeholder:opacity-25"
              style={{ color: 'var(--ink)' }}
              maxLength={60}
            />
          </div>
        </motion.div>

        {/* Onboarding stepper */}
        <motion.div className="mb-6" {...stagger(1)}>
          <OnboardingStepper
            isConnected={isConnected}
            hasRecipients={hasRecipients}
            hasDistributions={hasDistributions}
          />
        </motion.div>

        {/* Route info + Balance */}
        <motion.div className="mb-6 grid gap-5 sm:grid-cols-2" {...stagger(2)}>
          <RouteInfo />
          <BalanceCard />
        </motion.div>

        {/* Deposit card */}
        <motion.div className="mb-6" {...stagger(3)}>
          <DepositCard />
        </motion.div>

        {/* Set Recipients + Current Recipients */}
        <motion.div className="mb-6 grid gap-5 lg:grid-cols-2" {...stagger(4)}>
          <div>{isConnected ? <RecipientsPanel /> : <ConnectPrompt />}</div>
          <CurrentRecipients />
        </motion.div>

        {/* Distribution History */}
        <motion.div {...stagger(5)}>
          <DistributionHistory />
        </motion.div>

      </main>
    </div>
  );
}
