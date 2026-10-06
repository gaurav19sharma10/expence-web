import React, { useState, useEffect } from 'react';
import { useHousehold } from './contexts/HouseholdContext';
import { useAuth } from './contexts/AuthContext';
import { formatMoney } from './utils/format';

export function TopUpScreen() {
  const { household, topups, addTopup, members } = useHousehold();
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [contributions, setContributions] = useState<Record<string, number>>({});

  const totalPot = topups.reduce((sum, t) => sum + (t.baseAmountMinor || 0), 0);

  useEffect(() => {
    if (currentUser) {
      setContributions({ [currentUser.uid]: 0 });
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!amount) return;
    const amountMinor = Math.round(parseFloat(amount) * 100);
    if (amountMinor <= 0) return;
    
    // Simple equal contribution
    const contributionsMap: Record<string, number> = {};
    members.forEach(m => contributionsMap[m.uid] = 0);
    contributionsMap[currentUser?.uid || ''] = parseFloat(amount) * 100;

    await window.__FB?.firestore?.collection(`households/${window.__FB?.householdId}/topups`).add({
      contributions: contributionsMap,
      baseAmountMinor: parseFloat(amount) * 100,
      currencyCode: window.__FB?.household?.baseCurrency || 'INR',
      note: note || null,
      dateEpochDay: Math.floor(Date.now() / 86400000),
      createdAt: Date.now(),
      createdBy: currentUser?.uid,
    });
    
    setShowModal(false);
    setAmount('');
    setNote('');
  };

  const totalPotAmount = topups.reduce((sum, t) => sum + (t.baseAmountMinor || 0), 0);

  return (
    <div className="topup-screen">
      <h2>Family Pot</h2>
      
      <div className="card">
        <div className="muted small">Total in Pot</div>
        <div className="big">{formatMoney(totalPotAmount)}</div>
        <button className="btn-primary full-width" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
          + Add Money
        </button>
      </div>

      <h3>Contributions</h3>
      <div className="list">
        {topups.map(t => (
          <div key={t.id} className="topup-item">
            <div className="topup-info">
              <span>{t.note || 'Contribution'}</span>
              <span className="muted small">{new Date(t.dateEpochDay * 86400000).toLocaleDateString()}</span>
            </div>
            <span className="amt">{formatMoney(t.baseAmountMinor)}</span>
          </div>
        ))}
        {topups.length === 0 && <p className="empty-state">No contributions yet</p>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add to Family Pot</h3>
            <div className="form-group">
              <label>Amount</label>
              <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Note (optional)</label>
              <input type="text" placeholder="What's this for?" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Add</button>
            </div>
          </div>
          </div>
        )}
    </div>
  );
}