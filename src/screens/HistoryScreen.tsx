import React, { useState, useEffect } from 'react';
import { useHousehold } from './contexts/HouseholdContext';
import { formatMoney, formatDateShort, formatRelativeTime } from './utils/format';
import { EmptyState } from './components/Common';

export function HistoryScreen() {
  const { expenses, settlements, members, household } = useHousehold();
  const [filter, setFilter] = useState<'all' | 'expenses' | 'settlements'>('all');
  const [search, setSearch] = useState('');

  const filteredExpenses = expenses
    .filter(e => !e.deletedAt)
    .filter(e => {
      const matchesSearch = e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.merchant?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || filter === 'expenses';
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => (b.dateEpochDay || 0) - (a.dateEpochDay || 0));

  const filteredSettlements = settlements
    .filter(s => !s.deletedAt)
    .filter(s => {
      const matchesSearch = s.note?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || filter === 'settlements';
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => (b.dateEpochDay || 0) - (a.dateEpochDay || 0));

  return (
    <div className="history-screen">
      <h2>History</h2>
      
      <input
        type="text"
        placeholder="Search expenses..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
        placeholder="Search..."
      />

      <div className="filter-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
        <button className={filter === 'expenses' ? 'active' : ''} onClick={() => setFilter('expenses')}>Expenses</button>
        <button className={filter === 'settlements' ? 'active' : ''} onClick={() => setFilter('settlements')}>Settlements</button>
      </div>

      <div className="history-list">
        {expenses.length === 0 && settlements.length === 0 ? (
          <div className="empty-state">
            <p>No history yet</p>
          </div>
        ) : (
          <>
            {expenses.length > 0 && (
              <div>
                <h3>Expenses</h3>
                <ul>
                  {expenses
                    .filter(e => !e.deletedAt)
                    .sort((a, b) => (b.dateEpochDay || 0) - (a.dateEpochDay || 0))
                    .slice(0, 20)
                    .map(expense => (
                      <li key={expense.id} className="history-item">
                        <div className="expense-info">
                          <span className="expense-title">{expense.description || expense.merchant || 'Expense'}</span>
<span className="expense-meta">{formatDateShort(expense.dateEpochDay)} • {formatMoney(expense.baseAmountMinor)}</span>
                          </div>
                        <span className="expense-amount">{formatMoney(expense.baseAmountMinor)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}