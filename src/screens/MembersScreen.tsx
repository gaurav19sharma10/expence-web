import React from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { formatMoney } from '../utils/format';

export function MembersScreen() {
  const { members, household } = useHousehold();

  return (
    <div className="members-screen">
      <h2>Members</h2>
      
      <div className="card">
        <div className="muted small">Invite Code</div>
        <div className="big code">{household?.inviteCode || '—'}</div>
        <div className="row gap" style={{ marginTop: '12px' }}>
          <button className="btn" onClick={() => navigator.clipboard.writeText(household?.inviteCode || '')}>
            Copy
          </button>
          <button className="btn" onClick={() => navigator.share?.({ text: `Join my family on Expence with code ${household?.inviteCode}` })}>
            Share
          </button>
        </div>
      </div>

      <h3>Members ({members.length})</h3>
      <div className="member-list">
        {members.map(member => (
          <div key={member.uid} className="member-item">
            <div className="member-avatar" style={{ backgroundColor: '#3d6b4f' }}>
              {(member.displayName || member.email || 'M')[0].toUpperCase()}
            </div>
            <div className="member-info">
              <strong>{member.displayName || member.email}</strong>
              <span className="tag">{member.role === 'OWNER' ? 'Owner' : 'Member'}</span>
            </div>
            <div className="muted small">{member.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}