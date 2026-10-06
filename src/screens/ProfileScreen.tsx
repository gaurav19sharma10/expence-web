import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useHousehold } from './contexts/HouseholdContext';

export function ProfileScreen() {
  const { profile, user, updateProfile, signOut } = useAuth();
  const { householdId } = useHousehold();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dob, setDob] = useState(profile?.dateOfBirth || '');
  const [mobile, setMobile] = useState(profile?.mobile || '');
  const [country, setCountry] = useState(profile?.countryIso || 'IN');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.__FB?.updateProfile({
        displayName: name,
        dateOfBirth: dob,
        mobile,
        mobileCountryIso: country,
        completed: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-screen">
      <h2>Profile</h2>
      
      <div className="card profile-header">
        <div className="avatar-large" style={{ backgroundColor: '#3d6b4f' }}>
          {(profile?.displayName || 'U')[0].toUpperCase()}
        </div>
        <h3>{profile?.displayName || 'Your Name'}</h3>
        <p className="muted">{user?.email}</p>
      </div>

      <div className="card">
        <h3>Personal Information</h3>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editing}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled
          />
        </div>
        <div className="form-group">
          <label>Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            disabled={!editing}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Mobile</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              disabled={!editing}
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={!editing}>
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AE">UAE</option>
              <option value="SG">Singapore</option>
            </select>
          </div>
        </div>

        {editing ? (
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <button className="btn-primary full-width" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}

        {saved && <div className="toast-success">Profile saved!</div>}
      </div>

      <div className="card danger-zone">
        <h3>Danger Zone</h3>
        <button className="btn-danger full-width" onClick={() => window.__FB?.auth?.signOut()}>
          Sign Out
        </button>
      </div>
    </div>
  );
}