import React, { useState, useEffect } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../utils/format';
import { genCode } from '../utils/helpers';

export function AddExpenseScreen() {
  const { household, members, categories } = useHousehold();
  const { user: currentUser } = useAuth();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [payer, setPayer] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (members.length > 0 && !payer) {
      setPayer(currentUser?.uid || '');
      setParticipants(members.map(m => m.uid));
    }
  }, [members, currentUser]);

  const handleSave = async () => {
    if (!amount || !category || !payer || participants.length === 0) return;
    
    const amountMinor = Math.round(parseFloat(amount) * 100);
    if (amountMinor <= 0) return;

    // Equal split
    const n = participants.length;
    const baseShare = Math.floor(amountMinor / participants.length);
    let rem = amountMinor - baseShare * participants.length;
    const splits: Record<string, number> = {};
    participants.forEach((uid, i) => {
      splits[uid] = baseShare + (i < rem ? 1 : 0);
    });

    const householdId = window.__FB?.householdId;
    if (!householdId) return;

    try {
      const id = crypto.randomUUID();
      await window.__FB?.firestore?.collection(`households/${householdId}/expenses`).doc(id).set({
        description: description || 'Expense',
        notes: null,
        amountMinor: parseFloat(amount) * 100,
        currency: household?.baseCurrency || 'INR',
        fxRate: 1,
        baseAmountMinor: Math.round(parseFloat(amount) * 100),
        paidBy: payer,
        createdBy: window.__FB?.auth?.currentUser?.uid,
        splitMode: 'EQUAL',
        splits,
        participantIds: participants,
        splitTotalMinor: Math.round(parseFloat(amount) * 100),
        categoryId: category,
        dateEpochDay: Math.floor(Date.now() / 86400000),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        receiptPath: null,
        merchant: merchant || null,
        recurringId: null,
        sequence: null,
        deletedAt: null,
      });
      // Navigate back
      window.history.back();
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  return (
    <div className="add-expense-screen">
      <h2>New Expense</h2>
      
      <div className="form-group">
        <label>What was it?</label>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Who paid?</label>
        <select value={payer} onChange={(e) => setPayer(e.target.value)}>
          {members.map(m => (
            <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Split between</label>
        <div className="participant-list">
          {members.map(m => (
            <label key={m.uid} className="participant-item">
              <input
                type="checkbox"
                value={m.uid}
                checked={participants.includes(m.uid)}
                onChange={(e) => setParticipants(
                  e.target.checked 
                    ? [...participants, m.uid] 
                    : participants.filter(u => u !== m.uid)
                )}
              />
              <span>{m.displayName || m.email}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Merchant (optional)</label>
        <input
          type="text"
          placeholder="Merchant name"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes (optional)"
        />
      </div>

      <button className="btn-primary full-width" onClick={handleSave} disabled={!description || !amount || !category || !payer || participants.length === 0}>
        Save Expense
      </button>
    </div>
  );
}