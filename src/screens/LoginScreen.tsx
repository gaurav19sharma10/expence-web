import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { themeMode } = useSettings();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await window.__FB?.auth?.createUserWithEmailAndPassword(email, password);
      } else {
        await window.__FB?.auth?.signInWithEmailAndPassword(email, password);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const toggleMode = () => setIsSignUp(!isSignUp);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="logo">E</div>
        <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
        <p className="subtitle">
          {isSignUp ? 'Create your Expence account' : 'Sign in to continue'}
        </p>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); }}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p className="switch-mode">
          {isSignUp ? 'Already have an account?' : 'Need an account?'}
          <button type="button" className="link" onClick={toggleMode}>
            {isSignUp ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </div>
  );
}