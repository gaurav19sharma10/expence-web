import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RvsLogo } from '../components/vector/RvsLogo';
import { VectorIcon } from '../components/vector/VectorIcons';
import { Banner, Button, Field, SelectInput, TextInput } from '../components/ui/Field';
import { useHousehold } from '../contexts/HouseholdContext';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

/**
 * Creating or joining a family.
 *
 * Two paths from one screen, because they share the same question — which family
 * am I in — and the difference is only which end of it you answer.
 */
export function OnboardingScreen() {
  const { createHousehold, joinHousehold, household } = useHousehold();
  const [step, setStep] = useState<'choice' | 'create' | 'join'>('choice');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err: any) {
      setError(err?.message || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <motion.div
        layout
        className="w-full max-w-md space-y-6 rounded-3xl border border-line bg-surface p-8 shadow-xl"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <RvsLogo size={52} />
          <h1 className="text-xl font-black tracking-tight text-body">
            {household ? household.name : step === 'join' ? 'Join a family' : 'Create a family'}
          </h1>
          <p className="text-xs font-medium text-muted">
            Shared expenses need a household. Everyone in it sees the same ledger, live.
          </p>
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        <AnimatePresence mode="wait">
          {step === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <Button className="w-full py-3" onClick={() => setStep('create')}>
                <VectorIcon name="plus" size={16} />
                Create a family
              </Button>
              <Button variant="ghost" className="w-full py-3" onClick={() => setStep('join')}>
                <VectorIcon name="users" size={16} />
                Join with an invite code
              </Button>
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <Field label="Family name" icon="home">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Sharmas"
                  autoFocus
                />
              </Field>

              <Field label="Base currency" icon="wallet">
                <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setStep('choice')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  busy={busy}
                  disabled={!name.trim()}
                  onClick={() => void run(() => createHousehold(name.trim(), currency))}
                >
                  Create family
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <Field label="Invite code" icon="copy" hint="Six characters, from the family owner.">
                <TextInput
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="A1B2C3"
                  maxLength={6}
                  autoFocus
                  className="font-mono tracking-[0.3em]"
                />
              </Field>

              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setStep('choice')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  busy={busy}
                  disabled={code.trim().length < 6}
                  onClick={() => void run(() => joinHousehold(code))}
                >
                  Join family
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}