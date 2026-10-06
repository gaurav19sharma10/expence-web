import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useHousehold } from './contexts/HouseholdContext';

export function ProfileSetupScreen({ onComplete }: { onComplete: () => void }) {
  const { profile, saveProfile } = useAuth();
  const [name, setName] = useState(profile?.displayName || '');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [country, setCountry] = useState('IN');
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const countries = [
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AE', name: 'UAE' },
    { code: 'SG', name: 'Singapore' },
  ];

  const handleSave = async (completed: boolean) => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      await saveProfile({
        displayName: name.trim(),
        dateOfBirth: dob || null,
        countryIso: country,
        mobile: mobile || null,
        mobileCountryIso: mobile ? country : null,
        completed,
      });
      // Refresh profile
      window.location.reload();
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  return (
    <div className="profile-setup-screen">
      <div className="center-card">
        <h2>{profile?.profileCompleted ? 'Edit Profile' : 'Complete Your Profile'}</h2>
        <p className="subtitle">
          {completed ? 'Update your information' : 'This helps personalize your experience'}
        </p>

        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Date of Birth (optional)</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Mobile (optional)</label>
          <div className="form-row">
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ width: '100px' }}>
              <option value="IN">🇮🇳 +91</option>
              <option value="US">🇺🇸 +1</option>
              <option value="GB">🇬🇧 +44</option>
              <option value="AE">🇦🇪 +971</option>
              <option value="SG">🇸🇬 +65</option>
            </select>
            <input
              type="tel"
              placeholder="Mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              inputMode="tel"
            />
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setSkip(true)}>
            {profile?.profileCompleted ? 'Cancel' : 'I\'ll do this later'}
          </button>
          <button className="btn-primary" onClick={() => handleSave(!skip)} disabled={!name.trim()}>
            {skip ? 'Skip' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}