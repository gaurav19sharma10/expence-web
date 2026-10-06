import React, { useState, useEffect } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../utils/format';
import { genCode } from '../utils/helpers';

export function FamilyScreen() {
  const { household, members, topups, settlements, activity } = useHousehold();
  const { currentUser } = useAuth();
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNote, setTopupNote] = useState('');

  const totalPot = topups.reduce((sum, t) => sum + (t.baseAmountMinor || 0), 0);

  const handleAddTopup = async () => {
    if (!topupAmount) return;
    const amount = Math.round(parseFloat(topupAmount) * 100);
    if (amount <= 0) return;
    
    // Add topup
    window.history.back();
    setShowTopupModal(false);
    setTopupAmount('');
    setTopupNote('');
  };

  return (
    <div className="family-screen">
      <h2>Family</h2>
      
      <div className="card">
        <div className="muted small">Invite Code</div>
        <div className="big code">{household?.inviteCode || '—'}</div>
        <div className="row gap">
          <button className="btn" onClick={() => navigator.clipboard.writeText(household?.inviteCode || '')}>
            Copy
          </button>
          <button className="btn" onClick={() => navigator.share({ text: `Join my family on Expence with code ${household?.inviteCode}` })}>
            Share
          </button>
        </div>
      </div>

      <h3>Members ({members.length})</h3>
      <div className="member-list">
        {members.map(member => (
          <div key={member.uid} className="member-item">
            <div className="member-avatar" style={{ backgroundColor: '#3d6b4f' }}>
              {(member.displayName || 'M')[0].toUpperCase()}
            </div>
            <div className="member-info">
              <strong>{member.displayName || member.email}</strong>
              <span className="tag">{member.role === 'OWNER' ? 'Owner' : 'Member'}</span>
            </div>
            <div className="muted small">{member.email}</div>
          </div>
        ))}
      </div>

      <h3>Family Pot</h3>
      <div className="card">
        <div className="big">{formatMoney(totalPot)}</div>
        <button className="btn" onClick={() => setShowTopupModal(true)}>Add Money</button>
      </div>

      <h3>Activity</h3>
      <div className="activity-list">
        {activity.slice(0, 10).map((a: any) => (
          <div key={a.id} className="activity-item">
            <div className="activity-icon">{a.kind}</div>
            <div className="activity-info">
              <strong>{a.summary}</strong>
              <div className="muted small">{a.actorName} • {new Date(a.at).toLocaleString()}</div>
            </div>
            {a.amountMinor != null && <span className="amount">{formatMoney(a.amountMinor)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}