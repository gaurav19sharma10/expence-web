import React, { useState } from 'react';
import { VectorIcon } from '../components/vector/VectorIcons';
import { Modal } from '../components/ui/Modal';
import { Banner, Button, Field, TextInput } from '../components/ui/Field';
import { useHousehold } from '../contexts/HouseholdContext';

const COLORS = [
  '#0D6745', '#158055', '#2563EB', '#0E7490', '#7C3AED', '#B45309',
  '#BE185D', '#4D7C0F', '#C2410C', '#2F9B6B', '#9AD3B4', '#E5484D',
];

/**
 * Category management.
 *
 * A category cannot be hard-deleted while expenses point at it — the rules make
 * it a soft delete, and the screen says so rather than letting the write fail
 * silently. Kept off the main navigation because it is a once-in-a-while screen.
 */
export function CategoriesScreen() {
  const { categories, expenses, addCategory, updateCategory, deleteCategory } = useHousehold();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usage = new Map<string, number>();
  expenses
    .filter((e: any) => !e.deletedAt)
    .forEach((e: any) => usage.set(e.categoryId, (usage.get(e.categoryId) || 0) + 1));

  const create = async () => {
    if (!name.trim()) {
      setError('Give the category a name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addCategory({
        name: name.trim(),
        icon: name.trim(),
        color,
        isSystem: false,
        monthlyBudgetMinor: Math.round(parseFloat(budget || '0') * 100) || 0,
      });
      setOpen(false);
      setName('');
      setBudget('');
    } catch (err: any) {
      setError(err?.message || 'Could not create the category.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {categories.length} categories · {categories.filter((c: any) => usage.has(c.id)).length} in use
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <VectorIcon name="plus" size={13} />
          New
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {categories.map((cat: any) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${cat.color}1f`, color: cat.color }}
            >
              <VectorIcon name={cat.icon || cat.name} size={16} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-body">{cat.name}</p>
              <p className="text-[11px] text-muted">
                {usage.get(cat.id) || 0} expense{usage.get(cat.id) === 1 ? '' : 's'}
                {cat.monthlyBudgetMinor ? ' · budgeted' : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (usage.has(cat.id)) {
                  if (!window.confirm(`"${cat.name}" is used by expenses. Archive it instead?`)) return;
                }
                void deleteCategory(cat.id);
              }}
              aria-label={`Remove ${cat.name}`}
              className="shrink-0 rounded-full p-1.5 text-faint transition-colors hover:bg-negative/10 hover:text-negative"
            >
              <VectorIcon name="trash" size={15} />
            </button>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New category">
        <div className="space-y-4">
          {error && <Banner tone="error">{error}</Banner>}

          <Field label="Name" icon="palette">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Groceries"
              autoFocus
            />
          </Field>

          <Field label="Monthly cap (optional)">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              Colour
            </p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`Colour ${hex}`}
                  className={`size-8 rounded-full transition-transform ${
                    color === hex ? 'ring-2 ring-brand ring-offset-2' : ''
                  }`}
                  style={{ background: hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button busy={busy} onClick={() => void create()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}