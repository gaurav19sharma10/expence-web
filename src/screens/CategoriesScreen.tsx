import React, { useState } from 'react';
import { useHousehold } from './contexts/HouseholdContext';
import { formatMoney } from './utils/format';

export function CategoriesScreen() {
  const { categories, addCategory, updateCategory, deleteCategory, household } = useHousehold();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState('#3d6b4f');
  const [budget, setBudget] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      icon,
      color,
      order: categories.length,
      isSystem: false,
      monthlyBudgetMinor: budget ? Math.round(parseFloat(budget) * 100) : 0,
    };
    if (editing) {
      await updateCategory(editing.id, data);
    } else {
      await addCategory(data);
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setIcon('🏷️');
    setColor('#3d6b4f');
    setBudget('');
  };

  const handleEdit = (cat: any) => {
    setEditing(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setBudget(cat.monthlyBudgetMinor ? String(cat.monthlyBudgetMinor / 100) : '');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this category?')) {
      await deleteCategory(id);
    }
  };

  return (
    <div className="categories-screen">
      <h2>Categories</h2>
      <button className="btn-primary full-width" onClick={() => { setEditing(null); setShowModal(true); }}>
        + Add Category
      </button>
      
      <ul className="category-list">
        {categories.map(cat => (
          <li key={cat.id} className="category-item">
            <div className="category-avatar" style={{ backgroundColor: cat.color }}>
              {cat.icon}
            </div>
            <div className="category-info">
              <strong>{cat.name}</strong>
              {cat.monthlyBudgetMinor > 0 && (
                <span className="budget-badge">{formatMoney(cat.monthlyBudgetMinor)} budget</span>
              )}
            </div>
            <div className="category-actions">
              <button className="btn-secondary small" onClick={() => handleEdit(cat)}>Edit</button>
              <button className="btn-danger small" onClick={() => handleDelete(cat.id)}>Delete</button>
            </div>
          </li>
        ))}
        {categories.length === 0 && <p className="empty-state">No categories yet. Add your first category!</p>}
      </ul>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Edit Category' : 'New Category'}</h3>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Category name" autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Icon</label>
                <input type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏷️" maxLength={2} />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Monthly Budget (optional)</label>
              <input type="number" step="0.01" placeholder="0.00" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}