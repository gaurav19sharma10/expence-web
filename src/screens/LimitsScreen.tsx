import React, { useMemo, useState } from 'react';
import { VectorIcon } from '../components/vector/VectorIcons';
import { Banner } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { SkeletonGroup } from '../components/ui/Skeleton';
import { formatMoney } from '../utils/format';

/**
 * Per-person, per-category spending caps, set by the head of the family.
 *
 * Shown as a running total against the cap rather than as a number, because a
 * limit nobody can see coming is a limit that surprises people. Progress is read
 * from the expenses already on screen, so it updates as they are logged on any
 * device without anything extra being written.
 *
 * A cap is advisory here, not enforced at save time. The wallet already refuses
 * to lie about money, and the alternative -- silently dropping an expense that
 * crosses a line -- would mean the real purchase is not recorded anywhere.
 */
export function LimitsScreen() {
  const { user } = useAuth();
  const { household, members, categories, expenses, limits, setLimit, error, loading } = useHousehold();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const currency = household?.baseCurrency || 'INR';
  const isOwner = household?.ownerUid === user?.uid;

  const spentIn = useMemo(() => {
    const map = new Map<string, number>();
    expenses
      .filter((e: any) => !e.deletedAt)
      .forEach((e: any) => {
        const uid = e.paidBy;
        const key = `${uid}|${e.categoryId}`;
        map.set(key, (map.get(key) || 0) + (e.baseAmountMinor || 0));
      });
    return map;
  }, [expenses]);

  const capFor = (uid: string, categoryId: string) =>
    limits.find((l: any) => l.uid === uid && l.categoryId === categoryId)?.capMinor ?? 0;

  const save = async () => {
    if (!editing) return;
    const [uid, categoryId] = editing.split('|');
    setBusy(true);
    setProblem(null);
    try {
      await setLimit(uid, categoryId, Math.round(parseFloat(draft || '0') * 100) || 0);
      setEditing(null);
      setDraft('');
    } catch (err: any) {
      setProblem(err?.message || 'Could not save that limit.');
    } finally {
      setBusy(false);
    }
  };

  // A blank screen while the lists arrive reads as broken. The skeletons
  // hold the shape of the per-person sections until they do.
  if (loading && (members.length === 0 || categories.length === 0)) {
    return (
      <div className="space-y-5">
        <SkeletonGroup title="Spending limits" count={3} />
        <SkeletonGroup title="Members" count={4} />
      </div>
    );
  }

  if (members.length === 0 || categories.length === 0) return null;

  return (
    <div className="space-y-5">
      {error && <Banner tone="error">{error}</Banner>}

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
          Spending limits
        </span>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {isOwner
            ? 'A cap per person, per category. Members can see their own progress.'
            : 'Caps the head of the family has set for this family.'}
        </p>
      </section>

      {members.map((m: any) => (
        <section key={m.uid} className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              {(m.displayName || m.email || '?').slice(0, 1).toUpperCase()}
            </span>
            <p className="text-sm font-bold text-body">
              {m.displayName || m.email}
              {m.uid === user?.uid && <span className="ml-1.5 text-[10px] font-bold text-faint">YOU</span>}
            </p>
          </div>

          <div className="space-y-1.5">
            {categories.map((c: any) => {
              const cap = capFor(m.uid, c.id);
              const spent = spentIn.get(`${m.uid}|${c.id}`) || 0;
              const over = cap > 0 && spent > cap;
              const pct = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0;

              return (
                <div key={c.id} className="rounded-xl border border-line bg-surface-sunken px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-body">
                      <VectorIcon name={c.icon || c.name} size={13} color={c.color} />
                      <span className="truncate">{c.name}</span>
                    </span>

                    {isOwner ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(`${m.uid}|${c.id}`);
                          setDraft(cap > 0 ? String(cap / 100) : '');
                          setProblem(null);
                        }}
                        className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${
                          cap > 0 ? 'bg-surface text-brand shadow-sm' : 'text-faint hover:text-brand'
                        }`}
                      >
                        {cap > 0 ? formatMoney(cap, currency) : 'Set'}
                      </button>
                    ) : (
                      <span className="shrink-0 text-[11px] font-bold text-muted">
                        {cap > 0 ? formatMoney(cap, currency) : '—'}
                      </span>
                    )}
                  </div>

                  {cap > 0 && (
                    <div className="mt-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full rounded-full transition-all ${over ? 'bg-negative' : 'bg-brand'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className={`mt-1 text-[10px] font-medium ${over ? 'text-negative' : 'text-faint'}`}>
                        {formatMoney(spent, currency)} of {formatMoney(cap, currency)}
                        {over ? ` · ${formatMoney(spent - cap, currency)} over` : ''}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-xl">
            <h3 className="text-base font-bold text-body">Set a limit</h3>
            <p className="mt-1 text-xs text-muted">
              {members.find((m: any) => m.uid === editing.split('|')[0])?.displayName} ·{' '}
              {categories.find((c: any) => c.id === editing.split('|')[1])?.name}
            </p>

            {problem && <div className="mt-3"><Banner tone="error">{problem}</Banner></div>}

            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="mt-4 w-full rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-sm outline-none focus:border-brand"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-body"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save limit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
