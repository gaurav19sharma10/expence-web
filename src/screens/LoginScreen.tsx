import React, { useState } from 'react';
import { RvsLogo } from '../components/vector/RvsLogo';
import { Banner, Button, Field, TextInput } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';

/**
 * Sign in and sign up, as one card with a tab switch.
 *
 * The two modes share every field except the label, so they are one component
 * rather than two screens with a link between them.
 */
export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter both your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const swap = (next: boolean) => {
    setIsSignUp(next);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-line bg-surface p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <RvsLogo size={58} />
          <h1 className="text-2xl font-black tracking-tight text-body">
            RVS <span className="text-brand">Expences</span>
          </h1>
          <p className="text-xs font-medium text-muted">Realtime Firestore sync · Web &amp; Android</p>
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-surface-sunken p-1">
          <TabButton active={!isSignUp} onClick={() => swap(false)}>
            Sign in
          </TabButton>
          <TabButton active={isSignUp} onClick={() => swap(true)}>
            Create account
          </TabButton>
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email address" icon="users">
            <TextInput
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoFocus
            />
          </Field>

          <Field
            label="Password"
            icon="lock"
            hint={isSignUp ? 'At least 6 characters.' : undefined}
          >
            <TextInput
              type="password"
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <Button type="submit" busy={busy} className="w-full py-3">
            {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-[11px] text-faint">
          Connected directly to the <strong>expence-rvs</strong> Firestore project.
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
        active ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-body'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Firebase's error codes are written for developers, so they are mapped to
 * something a person can act on. Left raw, "auth/invalid-credential" is what a
 * user sees when they mistyped their password.
 */
function friendlyAuthError(err: any): string {
  const code = String(err?.code || '');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'That email and password do not match an account.';
  }
  if (code.includes('email-already-in-use')) return 'An account already uses that email. Try signing in.';
  if (code.includes('weak-password')) return 'Choose a password with at least 6 characters.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait a minute and try again.';
  if (code.includes('unauthorized-domain')) {
    return 'This site is not authorised for sign-in yet. Add its domain in Firebase Auth settings.';
  }
  if (code.includes('network')) return 'No connection. Check your network and try again.';
  return err?.message || 'Could not sign you in. Please try again.';
}