import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  title: string;
  description: string;
  done: boolean;
}

interface OnboardingStepperProps {
  isConnected: boolean;
  hasRecipients: boolean;
  hasDistributions: boolean;
}

export function OnboardingStepper({ isConnected, hasRecipients, hasDistributions }: OnboardingStepperProps) {
  const steps: Step[] = [
    {
      title: 'Connect Wallet',
      description: 'Connect your wallet to manage the split',
      done: isConnected,
    },
    {
      title: 'Add Recipients',
      description: 'Set wallet addresses and percentages',
      done: hasRecipients,
    },
    {
      title: 'Share QR Code',
      description: 'Send the deposit address to your payers',
      done: isConnected && hasRecipients, // visible once setup is done
    },
    {
      title: 'Distribute',
      description: 'Split the contract balance to all recipients',
      done: hasDistributions,
    },
  ];

  const allDone = steps.every(s => s.done);
  // First incomplete step index
  const activeIndex = steps.findIndex(s => !s.done);

  return (
    <AnimatePresence>
      {!allDone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.3 } }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1.0] }}
        >
          <section className="glass-card rounded-3xl p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="display text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  Getting Started
                </h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {steps.filter(s => s.done).length} of {steps.length} steps complete
                </p>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(steps.filter(s => s.done).length / steps.length) * 100}%`,
                    background: 'linear-gradient(90deg, #5fbeff, #7ef1b3)',
                  }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="grid gap-2 sm:grid-cols-4">
              {steps.map((step, i) => {
                const isActive = i === activeIndex;
                const isDone = step.done;

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-2xl px-3 py-3 sm:flex-col sm:items-center sm:text-center"
                    style={{
                      background: isDone
                        ? 'rgba(126,241,179,0.08)'
                        : isActive
                        ? 'rgba(95,190,255,0.08)'
                        : 'var(--surface-muted)',
                      border: `1px solid ${isDone ? 'rgba(126,241,179,0.25)' : isActive ? 'rgba(95,190,255,0.25)' : 'transparent'}`,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {/* Circle */}
                    <div
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-all duration-300"
                      style={{
                        background: isDone
                          ? 'var(--success)'
                          : isActive
                          ? '#5fbeff'
                          : 'var(--border)',
                        color: isDone || isActive ? '#ffffff' : 'var(--subtle)',
                      }}
                    >
                      {isDone ? <Check className="size-3.5" /> : i + 1}
                    </div>

                    {/* Text */}
                    <div className="min-w-0">
                      <p
                        className="text-xs font-semibold leading-tight"
                        style={{
                          color: isDone ? 'var(--success)' : isActive ? 'var(--accent-hover)' : 'var(--muted)',
                          transition: 'color 0.3s ease',
                        }}
                      >
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-tight" style={{ color: 'var(--subtle)' }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
