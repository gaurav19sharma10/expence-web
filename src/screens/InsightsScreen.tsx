import React, { useState, useEffect } from 'react';
import { useHousehold } from './contexts/HouseholdContext';
import { useAuth } from './contexts/AuthContext';
import { formatMoney } from './utils/format';

export function InsightsScreen() {
  const { expenses, categories, household } = useHousehold();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const currentMonthExpenses = expenses.filter(e => 
    !e.deletedAt && e.dateEpochDay >= new Date(month + '-01').getTime() / 86400000
  );

  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + (e.baseAmountMinor || 0), 0);
  
  const byCategory: Record<string, number> = {};
  currentMonthExpenses.forEach(e => {
    const catName = e.categoryId || 'Uncategorised';
    byCategory[catName] = (byCategory[catName] || 0) + (e.baseAmountMinor || 0);
  });

  const sortedCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([catId, amount]) => ({
      name: categories.find(c => c.id === catId)?.name || 'Uncategorised',
      amount,
      color: categories.find(c => c.id === catId)?.color || '#3d6b4f'
    }));

  return (
    <div className="insights-screen">
      <h2>Insights</h2>
      
      <div className="month-selector">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="summary-cards">
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">{formatMoney(totalSpent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{expenses.filter(e => !e.deletedAt).length}</div>
        </div>
      </div>

      <h3>By Category</h3>
      <div className="category-breakdown">
        {byCategory.length === 0 ? (
          <p className="empty-state">No expenses this month</p>
        ) : (
          byCategory.map(({ name, amount, color }) => (
            <div key={name} className="category-row">
              <div className="category-info">
                <span className="category-color" style={{ backgroundColor: color }}></span>
                <span>{name}</span>
              </div>
              <div className="category-amount">
                <span className="bar" style={{ width: `${(amount / (total || 1)) * 100}%`, backgroundColor: color }}></span>
                <span className="amount">{formatMoney(amount)}</span>
              </div>
            </div>
          ))}
        )}
      </div>
    </div>
  );
}