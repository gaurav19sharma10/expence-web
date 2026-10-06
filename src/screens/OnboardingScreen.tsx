import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { createHousehold, joinHousehold } = useHousehold();
  const [step, setStep] = useState<'choice' | 'create' | 'join'>('choice');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

  const handleCreate = async () => {
    if (!name.trim()) { setError('Enter a family name'); return; }
    setBusy(true);
    try {
      await createHousehold(name.trim(), currency);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) { setError('Enter an invite code'); return; }
    setBusy(true);
    try {
      await joinHousehold(code.trim().toUpperCase());
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'choice') {
    return (
      <div className="onboarding-screen">
        <div className="center-card">
          <h2>Welcome to Expence</h2>
          <p className="subtitle">Track shared expenses with your family</p>
          
          <button className="btn-primary big" onClick={() => setStep('create')}>
            Create a Family
          </button>
          <button className="btn big" onClick={() => setStep('join')}>
            Join with Code
          </button>
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="onboarding-screen">
        <div className="center-card">
          <button className="back-btn" onClick={() => setStep('choice')}>←</button>
          <h2>Create a Family</h2>
          
          <div className="form-group">
            <label>Family Name</label>
            <input
              type="text"
              placeholder="The Sharmas"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Base Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button className="btn-primary big" onClick={handleCreate} disabled={busy || !name.trim()}>
            {busy ? 'Creating...' : 'Create Family'}
          </button>
          <button className="btn-ghost" onClick={() => setStep('choice')}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-screen">
      <div className="center-card">
        <button className="back-btn" onClick={() => setStep('choice')}>←</button>
        <h2>Join a Family</h2>
        <p className="subtitle">Enter the 6-character invite code</p>
        
        <div className="form-group">
          <label>Invite Code</label>
          <input
            type="text"
            placeholder="A1B2C3"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ textTransform: 'uppercase', letterSpacing: '4px' }}
            autoFocus
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button className="btn-primary big" onClick={handleJoin} disabled={busy || !code.trim()}>
          {busy ? 'Joining...' : 'Join Family'}
        </button>
        <button className="btn-ghost" onClick={() => setStep('choice')}>Back</button>
      </div>
    </div>
  );
}