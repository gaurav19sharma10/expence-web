import React, { useState, useEffect } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';

export function AddExpenseScreen({ onDone }: { onDone?: () => void } = {}) {
  const { household, members, categories, addExpense } = useHousehold();
  const { user: currentUser } = useAuth();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [payer, setPayer] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (members.length > 0 && !payer) {
      setPayer(currentUser?.uid || '');
      setParticipants(members.map(m => m.uid));
    }
  }, [members, currentUser]);

  const handleSave = async () => {
    if (!amount || !category || !payer || participants.length === 0) return;

    setLoading(true);
    setError('');
    const amountMinor = Math.round(parseFloat(amount) * 100);
    if (amountMinor <= 0) return;

    // Equal split: the remainder is handed out one unit at a time so the
    // shares always add up to the amount, which the rules check.
    const baseShare = Math.floor(amountMinor / participants.length);
    const remainder = amountMinor - baseShare * participants.length;
    const splits: Record<string, number> = {};
    participants.forEach((uid, i) => {
      splits[uid] = baseShare + (i < remainder ? 1 : 0);
    });

    try {
      await addExpense({
        description: description || 'Expense',
        notes: notes || null,
        amountMinor,
        currency: household?.baseCurrency || 'INR',
        fxRate: 1,
        baseAmountMinor: amountMinor,
        paidBy: payer,
        splitMode: 'EQUAL',
        splits,
        participantIds: participants,
        splitTotalMinor: amountMinor,
        categoryId: category,
        dateEpochDay: Math.floor(Date.now() / 86400000),
        receiptPath: null,
        merchant: merchant || null,
        recurringId: null,
        sequence: null,
      });
      onDone?.();
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      setError(error?.message || 'Could not save the expense. Please try again.');
    } finally {
      setLoading(false);
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

      {error && <div className="error-message">{error}</div>}

      <button className="btn-primary full-width" onClick={handleSave} disabled={loading || !description || !amount || !category || !payer || participants.length === 0}>
        {loading ? 'Saving...' : 'Save Expense'}
      </button>
    </div>
  );
}