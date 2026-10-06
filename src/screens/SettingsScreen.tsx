import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useHousehold } from './contexts/HouseholdContext';
import { useSettings } from './contexts/SettingsContext';
import { formatMoney } from './utils/format';

export function SettingsScreen() {
  const { currentUser, signOut, profile } = useAuth();
  const { household, members } = useHousehold();
  const { themeMode, darkIntensity, setThemeMode, setDarkIntensity, appLockEnabled, setAppLockEnabled, verifyPin } = useSettings();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavePin, setLeavePin] = useState('');
  const [leaveError, setLeaveError] = useState('');

  const handleLeave = async () => {
    if (!verifyPin(leavePin)) {
      setLeaveError('Incorrect PIN');
      return;
    }
    // Leave household logic
    window.history.back();
    setShowLeaveConfirm(false);
  };

  return (
    <div className="settings-screen">
      <h2>Settings</h2>

      <section className="section">
        <h3>Account</h3>
        <div className="card">
          <div className="profile-row">
            <div className="avatar-large" style={{ backgroundColor: '#3d6b4f' }}>
              {(profile?.displayName || 'U')[0].toUpperCase()}
            </div>
            <div>
              <strong>{profile?.displayName || 'User'}</strong>
              <div className="muted small">{profile?.email}</div>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => window.history.pushState(null, '', '/profile')}>
            Edit Profile
          </button>
        </div>
      </section>

      <section className="section">
        <h3>Appearance</h3>
        <div className="card">
          <h4>Theme</h4>
          <div className="segmented-control">
            {['system', 'light', 'dark'].map(mode => (
              <button
                key={mode}
                className={`segment ${themeMode === mode ? 'active' : ''}`}
                onClick={() => setThemeMode(mode as any)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="slider-row">
            <label>Dark Intensity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={darkIntensity}
              onChange={(e) => setDarkIntensity(parseFloat(e.target.value))}
            />
            <span>{Math.round(darkIntensity * 100)}%</span>
          </div>
        </div>
      </section>

      <section className="section">
        <h3>App Lock</h3>
        <div className="card">
          <label className="toggle">
            <input
              type="checkbox"
              checked={appLockEnabled}
              onChange={(e) => setAppLockEnabled(e.target.checked)}
            />
            <span>Require PIN to open app</span>
          </label>
        </div>
      </section>

      <section className="section">
        <h3>Family</h3>
        <div className="card">
          <div className="setting-row">
            <span>Invite Code</span>
            <div className="code">{household?.inviteCode}</div>
          </div>
          <div className="setting-row">
            <span>Members</span>
            <span className="muted">{members.length}</span>
          </div>
          <button className="btn-danger" onClick={() => setShowLeaveConfirm(true)}>
            Leave Family
          </button>
        </div>
      </section>

      <section className="section">
        <h3>Data</h3>
        <div className="card">
          <button className="btn-secondary" onClick={() => {
            // Export CSV logic
          }}>
            Export CSV
          </button>
        </div>
      </section>

      <section className="section">
        <h3>Account</h3>
        <div className="card">
          <button className="btn-danger" onClick={() => window.__FB?.auth?.signOut()}>
            Sign Out
          </button>
        </div>
      </section>
    </div>
  );
}