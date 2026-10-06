import React, { useState, useEffect } from 'react';
import { useHousehold } from './contexts/HouseholdContext';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { formatMoney, formatDateShort } from './utils/format';
import { formatRelativeTime } from './utils/format';
import { EmptyState, ExpenseCard, SettlementCard } from './components/Common';

export function HomeScreen() {
  const { household, members, expenses, topups } = useHousehold();
  const { profile } = useAuth();
  const { themeMode } = useSettings();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    setGreeting(greet);
  }, []);

  const totalSpent = expenses
    .filter(e => !e.deletedAt)
    .reduce((sum, e) => sum + (e.baseAmountMinor || 0), 0);

  const potTotal = topups.reduce((sum, t) => sum + (t.baseAmountMinor || 0), 0);

  return (
    <div className="home-screen">
      <section className="hero">
        <h1>{greeting},</h1>
        <h2>{useAuth().profile?.displayName || 'You'}</h2>
        <p className="subtitle">Let's talk about today's expense.</p>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value">{formatMoney(
            expenses.filter(e => !e.deletedAt && isThisMonth(e.dateEpochDay))
              .reduce((sum, e) => sum + (e.baseAmountMinor || 0), 0)
          )}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Family Pot</div>
          <div className="stat-value">{formatMoney(
            topups.reduce((sum, t) => sum + (t.baseAmountMinor || 0), 0)
          )}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Members</div>
          <div className="stat-value">{members.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Invite Code</div>
          <div className="invite-code">{household?.inviteCode || '—'}</div>
        </div>
      </div>

      <h3>Recent Expenses</h3>
      <div className="expense-list">
        {expenses
          .filter(e => !e.deletedAt)
          .slice(0, 5)
          .map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              members={[]}
              currency={household?.baseCurrency || 'INR'}
              onClick={() => {}}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          ))}
        {expenses.filter(e => !e.deletedAt).length === 0 && (
          <div className="empty-state">
            <p>No expenses yet. Add your first expense!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function isThisMonth(epochDay: number): boolean {
  const d = new Date(epochDay * 86400000);
  const now = new Date();
  return d.getUTCFullYear() === new Date().getUTCFullYear() && 
         d.getUTCMonth() === new Date().getUTCMonth();
}