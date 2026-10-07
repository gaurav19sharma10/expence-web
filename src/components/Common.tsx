import React, { useState } from 'react';
import { formatMoney, formatDateShort } from '../utils/format';

interface ExpenseCardProps {
  expense: any;
  members: any[];
  currency: string;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function ExpenseCard({ expense, members, currency, onClick, onDelete, onEdit }: ExpenseCardProps) {
  const payer = members.find(m => m.uid === expense.paidBy);
  const category = expense.categoryId;
  
  return (
    <div className="expense-card" onClick={onClick}>
      <div className="expense-header">
        <div className="expense-avatar" style={{ backgroundColor: expense.categoryColor || '#3d6b4f' }}>
          {(expense.categoryName || 'E')[0].toUpperCase()}
        </div>
        <div className="expense-info">
          <h4>{expense.description || expense.merchant || 'Expense'}</h4>
          <p className="expense-meta">
            Paid by {expense.members?.find((m: any) => m.uid === expense.paidBy)?.displayName || 'Unknown'}
            • {formatDateShort(expense.dateEpochDay)}
          </p>
        </div>
      </div>
      <div className="expense-amount">
        {formatMoney(expense.baseAmountMinor, currency)}
      </div>
      <div className="expense-actions">
        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); onEdit(); }}>Edit</button>
        <button className="btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>Delete</button>
      </div>
    </div>
  );
}

interface SettlementCardProps {
  settlement: any;
  members: any[];
  currency: string;
  onDelete: () => void;
}

export function SettlementCard({ settlement, members, currency, onDelete }: SettlementCardProps) {
  const from = members.find(m => m.uid === settlement.fromUid);
  const to = members.find(m => m.uid === settlement.toUid);
  
  return (
    <div className="settlement-card">
      <div className="settlement-flow">
        <span className="member-name">{from?.displayName || 'Unknown'}</span>
        <span className="arrow">→</span>
        <span className="member-name">{to?.displayName || 'Unknown'}</span>
      </div>
      <div className="settlement-details">
        <span>{formatMoney(settlement.baseAmountMinor, currency)}</span>
        <span className="method">{settlement.method}</span>
      </div>
      <button className="btn-danger small" onClick={onDelete}>Delete</button>
    </div>
  );
}

interface TopUpCardProps {
  topup: any;
  members: any[];
  currency: string;
  onDelete: () => void;
}

export function TopUpCard({ topup, members, currency, onDelete }: TopUpCardProps) {
  const contributors = Object.entries(topup.contributions || {})
    .map(([uid, amount]) => {
      const member = members.find((m: any) => m.uid === uid);
      return `${member?.displayName || uid}: ${formatMoney(Number(amount) || 0, currency)}`;
    })
    .join(', ');

  return (
    <div className="topup-card">
      <div className="topup-header">
        <span className="topup-note">{topup.note || 'Contribution'}</span>
        <span className="topup-amount">{formatMoney(topup.baseAmountMinor, currency)}</span>
      </div>
      <p className="topup-contributors">{contributors}</p>
      <p className="topup-date">{new Date(topup.dateEpochDay * 86400000).toLocaleDateString()}</p>
    </div>
  );
}

export function MemberAvatar({ name, size = 40, isOwner = false }: { name: string; size?: number; isOwner?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');

  return (
    <div 
      className={`member-avatar ${isOwner ? 'owner' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div className="spinner" style={{ width: size, height: size }} />
  );
}

export function EmptyState({ message, icon = '📭' }: { message: string; icon?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p>{message}</p>
    </div>
  );
}

export function ErrorDisplay({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button onClick={onDismiss}>&times;</button>
    </div>
  );
}

export function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => onCancel()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, type = 'info', onClose }: { message: string; type?: 'info' | 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button onClick={onClose}>&times;</button>
    </div>
  );
}