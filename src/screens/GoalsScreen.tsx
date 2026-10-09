import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Banner, Button, Field, SelectInput, TextInput } from '../components/ui/Field';
import { SkeletonGroup } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { formatMoney } from '../utils/format';

/**
 * What the family is saving for.
 *
 * Replaces the family pot. A pot was one number everybody drew from and nobody
 * owned: it could not say what the money was for, who was saving toward it, or
 * how close anybody was. A goal answers all three.
 *
 * Everything here comes from the goals collection the provider is already
 * subscribed to, which is filtered by the Firestore rules to what this person may
 * read. There is no client-side privacy filter and none is needed: a private
 * goal is not merely hidden, it is not sent to this device at all.
 */
type Filter = 'ALL' | 'MINE' | 'SHARED' | 'DONE';

/** The five steps, in the order somebody actually answers them. */
const WIZARD_STEPS = [
  { title: 'What are you saving for?', hint: 'Something specific. "New bike" beats "Savings" every time.' },
  { title: 'Pick a picture', hint: 'One you will recognise at a glance beats an icon you have to read.' },
  { title: 'How much, and by when?', hint: 'A target makes it a goal. A date makes it a plan.' },
  { title: 'Who is saving with you?', hint: "Somebody else's money needs their yes before it is spent." },
  { title: 'How should it fill up?', hint: 'Automatic saving is the kind that actually happens.' },
];

/**
 * Starting points, so nobody has to invent a goal from a blank screen.
 *
 * Only the shape is preset. The amount is always the user's, because a target
 * that came from a list is a number they did not choose.
 */
const TEMPLATES = [
  { emoji: '\u{1F6B2}', title: 'A bike', category: 'TRANSPORT', suggestionMinor: 8000000 },
  { emoji: '\u{1F393}', title: 'School fees', category: 'EDUCATION', suggestionMinor: 6000000 },
  { emoji: '\u{1F3E0}', title: 'A home deposit', category: 'HOME', suggestionMinor: 40000000 },
  { emoji: '\u{2708}\u{FE0F}', title: 'A holiday', category: 'TRAVEL', suggestionMinor: 4000000 },
  { emoji: '\u{1F697}', title: 'A car', category: 'TRANSPORT', suggestionMinor: 50000000 },
  { emoji: '\u{1F4BB}', title: 'A laptop or phone', category: 'OTHER', suggestionMinor: 6000000 },
  { emoji: '\u{1F48D}', title: 'A wedding or ring', category: 'OTHER', suggestionMinor: 10000000 },
  { emoji: '\u{1FA91}', title: 'Furniture', category: 'HOME', suggestionMinor: 5000000 },
  { emoji: '\u{1F476}', title: 'A baby', category: 'FAMILY', suggestionMinor: 8000000 },
  { emoji: '\u{1F434}', title: 'A pet', category: 'FAMILY', suggestionMinor: 3000000 },
  { emoji: '\u{1F3E5}', title: 'Medical', category: 'HEALTH', suggestionMinor: 5000000 },
  { emoji: '\u{1F381}', title: 'A gift', category: 'OTHER', suggestionMinor: 1000000 },
];

/**
 * "You need about \u20b98,334/month to reach this by then."
 *
 * Shown on the date step rather than only later, because this is where somebody
 * decides whether the target they typed is realistic.
 */
function monthlyNeededText(targetMajor: string, dueIso: string, currency: string): JSX.Element | null {
  const amount = Number(targetMajor) || 0;
  if (amount <= 0 || !dueIso) return null;
  const ms = new Date(`${dueIso}T00:00:00`).getTime() - Date.now();
  if (ms <= 0) return null;
  const months = Math.max(1, Math.floor(ms / (30 * 86400000)));
  const perMonth = Math.round(amount / months);
  if (perMonth <= 0) return null;
  return (
    <p className="text-sm text-brand">
      You need about {formatMoney(perMonth * 100, currency)} a month to reach this by then.
    </p>
  );
}

const EMOJI = [
  '\u{1F3AF}', '\u{1F6B2}', '\u{1F393}', '\u{1F3E0}', '\u{2708}\u{FE0F}', '\u{1F48D}', '\u{1F697}', '\u{1F4F1}',
  '\u{1F3B8}', '\u{1FA91}', '\u{1F4BB}', '\u{1F476}', '\u{1F434}', '\u{1F3E5}', '\u{1F381}', '\u{1F436}',
];

/** Plain-English cadence. "DAILY" alone tells nobody anything. */
const SAVE_MODE_LABEL: Record<string, string> = {
  MANUAL: 'When I choose',
  DAILY: 'A set amount every day',
  MONTHLY: 'A set amount every month',
  ROUND_UP: 'Spare change from my spending',
};

function reached(goal: any): boolean {
  return Number(goal.targetMinor) > 0 && Number(goal.savedMinor) >= Number(goal.targetMinor);
}

function remaining(goal: any): number {
  return Math.max(0, Number(goal.targetMinor) - Number(goal.savedMinor));
}

/** How far along, as a whole percent. A goal with no target reads as met. */
function percent(goal: any): number {
  if (Number(goal.targetMinor) <= 0) return 100;
  return Math.max(0, Math.min(100, Math.floor((Number(goal.savedMinor) * 100) / Number(goal.targetMinor))));
}

export function GoalsScreen() {
  const { user } = useAuth();
  const { observeGoalTxns, goalTxns } = useHousehold();
  const {
    household,
    members,
    goals,
    goalSettings,
    wallets,
    createGoal,
    contributeToGoal,
    saveGoalSettings,
    updateGoalDetails,
    deleteGoal,
  } = useHousehold();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The open goal's ledger. Started when a goal is opened and torn down when it
  // closes, so the list is never listening to a goal nobody is looking at.
  useEffect(() => {
    if (!household?.id || !selectedId) return;
    return observeGoalTxns(household.id, selectedId);
  }, [household?.id, selectedId, observeGoalTxns]);

  const currency = household?.baseCurrency || 'INR';
  const myWallet = wallets.find((w: any) => w.uid === user?.uid);

  const visible = useMemo(() => {
    const mine = goals.filter((g: any) => g.ownerUid === user?.uid);
    switch (filter) {
      case 'MINE':
        return mine;
      case 'SHARED':
        // Somebody else's, and shared. A goal you created alone is not "shared".
        return goals.filter((g: any) => (g.participantIds || []).length > 1 && g.ownerUid !== user?.uid);
      case 'DONE':
        return goals.filter((g: any) => g.status === 'COMPLETED' || g.status === 'CLOSED');
      default:
        return goals;
    }
  }, [goals, filter, user?.uid]);

  const selected = goals.find((g: any) => g.id === selectedId) || null;

  // The provider keeps the open goal's ledger, so the detail screen reads it
  // rather than owning a second subscription that could drift.
  const selectedTxns = useMemo(
    () => (selectedId ? goalTxns.filter((t: any) => t.goalId === selectedId) : []),
    [goalTxns, selectedId],
  );

  const nameOf = (uid: string) => members.find((m: any) => m.uid === uid)?.displayName || 'Member';

  if (selected) {
    return (
      <GoalDetail
        goal={selected}
        txns={selectedTxns}
        members={members}
        currency={currency}
        myBalance={Number(myWallet?.balanceMinor) || 0}
        error={error}
        busy={busy}
        onBack={() => {
          setSelectedId(null);
          setError(null);
        }}
        // Handlers, not the parent's own props: `onEdit` and `onBack` are
        // parameters of GoalDetail, not in scope here. `onBack` in particular is
        // the parent's, so calling it would clear this screen instead of going
        // back to the list.
        onEdit={(goal) => setEditingId(goal.id)}
        onDelete={async (id) => {
          setBusy(true);
          setError(null);
          try {
            await deleteGoal(id);
            setSelectedId(null);
          } catch (err: any) {
            setError(err?.message || 'Could not delete that goal.');
          } finally {
            setBusy(false);
          }
        }}
        onContribute={async (amountMinor, note) => {
          setBusy(true);
          setError(null);
          try {
            await contributeToGoal(selected.id, amountMinor, note);
          } catch (err: any) {
            setError(err?.message || 'Could not add that.');
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  if (editingId) {
    const goal = goals.find((g: any) => g.id === editingId);
    if (!goal) {
      setEditingId(null);
      return null;
    }
    return (
      <EditGoal
        goal={goal}
        currency={currency}
        busy={busy}
        error={error}
        onCancel={() => setEditingId(null)}
        onSave={async (details: any) => {
          setBusy(true);
          setError(null);
          try {
            await updateGoalDetails(goal.id, details);
            setEditingId(null);
          } catch (err: any) {
            setError(err?.message || 'Could not save those changes.');
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  if (creating) {
    return (
      <CreateGoalWizard
        members={members}
        currency={currency}
        myBalance={Number(myWallet?.balanceMinor) || 0}
        onCancel={() => setCreating(false)}
        onCreate={async (values) => {
          setBusy(true);
          setError(null);
          try {
            const id = await createGoal(values);
            setCreating(false);
            setSelectedId(id);
          } catch (err: any) {
            setError(err?.message || 'Could not create the goal.');
          } finally {
            setBusy(false);
          }
        }}
        error={error}
        busy={busy}
      />
    );
  }

  const totalSaved = goals.reduce((sum: number, g: any) => sum + (Number(g.savedMinor) || 0), 0);
  const totalTarget = goals.reduce((sum: number, g: any) => sum + (Number(g.targetMinor) || 0), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Goals</h1>
          <p className="text-sm text-muted">
            {goals.length === 0
              ? 'What you are saving for, alone or together'
              : `Across ${goals.length} goal${goals.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Start a goal</Button>
      </header>

      {goals.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Saved so far</p>
          <p className="mt-1 text-3xl font-semibold">{formatMoney(totalSaved, currency)}</p>
          <ProgressBar value={totalTarget > 0 ? Math.floor((totalSaved * 100) / totalTarget) : 0} />
          <p className="mt-1 text-xs text-muted">
            {totalTarget > 0
              ? `${Math.floor((totalSaved * 100) / totalTarget)}% of ${formatMoney(totalTarget, currency)} you are aiming for`
              : 'Add a target to see how far along you are'}
          </p>
        </section>
      )}

      {goals.length > 0 && (
        <GoalSettingsCard
          settings={goalSettings}
          goals={goals}
          currency={currency}
          onSave={saveGoalSettings}
        />
      )}

      <div className="flex gap-2">
        {(['ALL', 'MINE', 'SHARED', 'DONE'] as Filter[]).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === option ? 'bg-brand text-white' : 'border border-line text-muted'
            }`}
          >
            {option === 'ALL' ? 'All' : option === 'MINE' ? 'Mine' : option === 'SHARED' ? 'Shared' : 'Done'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        goals.length === 0 ? (
          <div className="rounded-lg border border-line p-8 text-center">
            <p className="text-lg font-medium">Nothing to save for yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Name what you are saving towards, set a target, and watch it fill up.
            </p>
            <Button className="mt-4" onClick={() => setCreating(true)}>
              Start a goal
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-line p-8 text-center text-sm text-muted">
            No goals match this filter.
          </div>
        )
      ) : (
        <div className="space-y-3">
          {visible.map((goal: any) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              participantNames={(goal.participantIds || []).map(nameOf)}
              onOpen={() => setSelectedId(goal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

/**
 * One goal, at a glance.
 *
 * Shows the amount still needed rather than a percentage: the number that makes
 * somebody act is "&eacute;4,200 to go", not "38%".
 */
function GoalCard({
  goal,
  currency,
  participantNames,
  onOpen,
}: {
  goal: any;
  currency: string;
  participantNames: string[];
  onOpen: () => void;
}) {
  const isPrivate = (goal.participantIds || []).length === 0;
  const togo = remaining(goal);

  return (
    <button
      onClick={onOpen}
      className="w-full rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-sunken"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {goal.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{goal.name}</p>
          <p className="truncate text-xs text-muted">{whoLine(goal, participantNames, isPrivate)}</p>
        </div>
        {goal.status === 'PAUSED' && <span className="text-xs text-muted">Paused</span>}
      </div>

      <ProgressBar value={percent(goal)} />

      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span>
          <span className="font-medium">{formatMoney(goal.savedMinor, currency)}</span>
          {Number(goal.targetMinor) > 0 && (
            <span className="text-muted"> of {formatMoney(goal.targetMinor, currency)}</span>
          )}
        </span>
        {!isPrivate && participantNames.length > 1 && (
          <span className="text-xs text-muted">
            {participantNames.length} saving
          </span>
        )}
      </div>

      {togo > 0 && goal.status === 'ACTIVE' && (
        <p className="mt-1 text-xs text-brand">{formatMoney(togo, currency)} to go</p>
      )}
      {reached(goal) && <p className="mt-1 text-xs text-brand">Reached</p>}
    </button>
  );
}

/** "Just you", or who else is in on it. */
function whoLine(goal: any, names: string[], isPrivate: boolean): string {
  if (isPrivate || names.length === 0) return 'Just you';
  if (names.length <= 2) return `With ${names.join(' and ')}`;
  return `With ${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}

function GoalDetail({
  goal,
  txns,
  members,
  currency,
  myBalance,
  busy,
  error,
  onBack,
  onContribute,
  onEdit,
  onDelete,
}: {
  goal: any;
  txns: any[];
  members: any[];
  currency: string;
  myBalance: number;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onContribute: (amountMinor: number, note?: string | null) => void;
  onEdit: (goal: any) => void;
  onDelete: (goalId: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameOf = (uid: string) => members.find((m: any) => m.uid === uid)?.displayName || 'Member';
  const isPrivate = (goal.participantIds || []).length === 0;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-muted hover:underline">
        &larr; Goals
      </button>

      <section className="rounded-lg border border-line bg-surface p-4">
        <span className="text-3xl" aria-hidden>
          {goal.emoji}
        </span>
        <h1 className="mt-1 text-2xl font-semibold">{goal.name}</h1>
        <p className="mt-1 text-3xl font-semibold">{formatMoney(goal.savedMinor, currency)}</p>
        <ProgressBar value={percent(goal)} />
        <p className="mt-1 text-xs text-muted">
          {Number(goal.targetMinor) > 0
            ? remaining(goal) > 0
              ? `${formatMoney(remaining(goal), currency)} to go of ${formatMoney(goal.targetMinor, currency)}`
              : `${formatMoney(Number(goal.savedMinor) - Number(goal.targetMinor), currency)} past the target`
            : 'No target set yet'}
        </p>
      </section>

      {!isPrivate && (
        <section className="rounded-lg border border-line p-4">
          <p className="text-sm text-muted">
            {(goal.participantIds || []).length > 1
              ? "Spending from this goal needs everybody's yes. One no and it does not move."
              : 'This goal is shared.'}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {(goal.participantIds || []).map((uid: string) => (
              <li key={uid} className="flex items-center justify-between">
                <span>{nameOf(uid)}</span>
                {uid === goal.ownerUid && <span className="text-xs text-muted">Created it</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2 rounded-lg border border-line p-4">
        <p className="font-medium">Add money</p>
        <TextInput
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Amount"
        />
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
        <p className="text-xs text-muted">From your wallet: {formatMoney(myBalance, currency)}</p>
        {error && <Banner tone="error">{error}</Banner>}
        <Button
          disabled={busy || !(Number(amount) > 0)}
          onClick={() => onContribute(Math.round(Number(amount) * 100), note.trim() || null)}
        >
          {busy ? 'Adding...' : 'Add'}
        </Button>
      </section>

      <InsightFor goal={goal} currency={currency} />

      <section className="space-y-2 rounded-lg border border-line p-4">
        <h2 className="font-medium">Manage this goal</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onEdit(goal)}>
            Edit goal
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Delete goal
          </Button>
        </div>
        {confirmDelete && (
          <div className="mt-2 space-y-2 rounded-xl border border-line p-3">
            <p className="text-sm">
              {Number(goal.savedMinor) > 0
                ? `This goal holds ${formatMoney(goal.savedMinor, currency)}. It will be deleted; its history stays in your records, but take the money out first if you want it back.`
                : 'This goal has no money in it, so nothing is lost.'}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => onDelete(goal.id)}>
                Delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Activity</h2>
        {txns.length === 0 ? (
          <p className="rounded-lg border border-line p-6 text-center text-sm text-muted">
            Nothing in yet. Money you add shows up here, with who added it and why.
          </p>
        ) : (
          txns.map((txn) => (
            <div key={txn.id} className="rounded-lg border border-line bg-surface p-3">
              <div className="flex items-center justify-between text-sm">
                <span>{TXN_LABEL[txn.type] || 'Movement'}</span>
                <span className={Number(txn.amountMinor) < 0 ? 'text-negative' : ''}>
                  {Number(txn.amountMinor) < 0 ? '-' : '+'}
                  {formatMoney(Math.abs(Number(txn.amountMinor)), currency)}
                </span>
              </div>
              <p className="text-xs text-muted">{nameOf(txn.actorUid)}</p>
              {txn.note && <p className="mt-1 text-xs text-muted">{txn.note}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

const TXN_LABEL: Record<string, string> = {
  MANUAL_CONTRIBUTION: 'Added money',
  DAILY_CONTRIBUTION: 'Daily saving',
  MONTHLY_CONTRIBUTION: 'Monthly saving',
  ROUND_UP: 'Spare change',
  WITHDRAWAL: 'Spent from the goal',
  REFUND: 'Returned to the goal',
  ADJUSTMENT: 'Adjusted',
};

/**
 * One sentence about where this is heading (§17).
 *
 * Deliberately not a chart. With a deadline the useful statement is what a month
 * of saving would achieve; without one there is nothing honest to project, so it
 * says nothing rather than inventing a number.
 */
function InsightFor({ goal, currency }: { goal: any; currency: string }) {
  const percent = Number(goal.targetMinor) > 0
    ? Math.min(100, Math.floor((Number(goal.savedMinor) * 100) / Number(goal.targetMinor)))
    : 100;
  if (percent >= 100) return null;

  let text: string | null = null;
  if (goal.targetDateEpochDay) {
    const daysLeft = Number(goal.targetDateEpochDay) - Math.floor(Date.now() / 86400000);
    if (daysLeft <= 0) {
      text = "This goal's date has passed. You can change it or keep saving.";
    } else {
      const months = Math.max(1, Math.floor(daysLeft / 30));
      const perMonth = Math.round(remaining(goal) / months);
      text = `To reach ${goal.name} by then, save about ${formatMoney(perMonth, currency)} a month.`;
    }
  } else if (percent >= 80) {
    text = `You're ${100 - percent}% away from ${goal.name}. Keep it up.`;
  }
  if (!text) return null;
  return (
    <div className="rounded-xl bg-surface-sunken p-3 text-sm text-muted">
      {text}
    </div>
  );
}

/** Editing the parts of a goal that may change. */
function EditGoal({
  goal,
  currency,
  busy,
  error,
  onCancel,
  onSave,
}: {
  goal: any;
  currency: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (details: any) => void;
}) {
  const [name, setName] = useState(goal.name || '');
  const [target, setTarget] = useState(String((Number(goal.targetMinor) || 0) / 100));
  const [due, setDue] = useState(
    goal.targetDateEpochDay
      ? new Date(Number(goal.targetDateEpochDay) * 86400000).toISOString().slice(0, 10)
      : '',
  );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <button onClick={onCancel} className="text-sm text-muted hover:underline">
        &larr; Cancel
      </button>
      <h1 className="text-2xl font-semibold">Edit goal</h1>

      <Field label="Goal name">
        <input
          className="w-full bg-transparent text-sm outline-none"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Target amount">
        <input
          className="w-full bg-transparent text-sm outline-none"
          value={target}
          inputMode="decimal"
          onChange={(e) => setTarget(e.target.value)}
        />
      </Field>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">By when?</label>
        <input
          type="date"
          value={due}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDue(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-sm"
        />
        <Button variant="subtle" size="sm" className="mt-2" onClick={() => setDue('')}>
          No deadline
        </Button>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <Button
        disabled={busy || !name.trim() || !(Number(target) > 0)}
        onClick={() =>
          onSave({
            name: name.trim(),
            emoji: goal.emoji,
            category: goal.category,
            targetMinor: Math.round(Number(target) * 100),
            targetDateEpochDay: due ? Math.floor(new Date(`${due}T00:00:00`).getTime() / 86400000) : null,
          })
        }
      >
        {busy ? 'Saving...' : 'Save changes'}
      </Button>
    </div>
  );
}

/** Automatic saving. Every control says what it does in money. */
/**
 * Automatic savings: how money reaches a goal without anybody thinking about it.
 *
 * This is where the round-up level is chosen, so it is the screen that makes the
 * headline feature configurable at all. Everything is spelled in money rather than
 * as percentages and configuration keys, because the whole point is that a
 * first-time user can set it without reading anything.
 */
function GoalSettingsCard({
  settings,
  goals,
  currency,
  onSave,
}: {
  settings: any;
  goals: any[];
  currency: string;
  onSave: (next: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  if (!settings) return <SkeletonGroup title="Saving" count={4} />;

  const fundable = goals.filter((g: any) => g.status === 'ACTIVE' && !reached(g));
  const roundTo = settings.roundUpCustomMinor || settings.roundUpToMinor || 0;

  return (
    <section className="rounded-lg border border-line p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="font-medium">Save your spare change automatically</span>
        <span className="text-sm text-muted">{open ? 'Hide' : 'Change'}</span>
      </button>

      {!open && (
        <p className="mt-1 text-xs text-muted">
          {settings.roundUpEnabled
            ? `Rounding up to the nearest ${formatMoney(roundTo, currency)}`
            : 'No automatic saving on'}
          {settings.dailyEnabled ? `, ${formatMoney(settings.dailyAmountMinor, currency)} a day` : ''}
          {settings.monthlyEnabled ? `, ${formatMoney(settings.monthlyAmountMinor, currency)} a month` : ''}
          .
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-4">
          {fundable.length === 0 && (
            <p className="text-xs text-muted">Start a goal first, then automatic saving has somewhere to go.</p>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(settings.roundUpEnabled)}
              onChange={(e) => onSave({ roundUpEnabled: e.target.checked })}
            />
            Round up my spending
          </label>

          {settings.roundUpEnabled && (
            <>
              <Field label="Round up to the nearest">
                <SelectInput
                  value={settings.roundUpCustomMinor ? 'custom' : String(roundTo)}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      onSave({ roundUpCustomMinor: roundTo });
                      setCustom(String(roundTo / 100));
                    } else {
                      onSave({ roundUpToMinor: Number(e.target.value), roundUpCustomMinor: null });
                      setCustom('');
                    }
                  }}
                >
                  <option value="1000">{formatMoney(1000, currency)}</option>
                  <option value="5000">{formatMoney(5000, currency)}</option>
                  <option value="10000">{formatMoney(10000, currency)}</option>
                  <option value="50000">{formatMoney(50000, currency)}</option>
                  <option value="custom">Something else</option>
                </SelectInput>
              </Field>

              {settings.roundUpCustomMinor && (
                <Field label="Your round number">
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    value={custom}
                    inputMode="decimal"
                    onChange={(e) => {
                      setCustom(e.target.value);
                      const minor = Math.round(Number(e.target.value) * 100);
                      if (minor > 0) onSave({ roundUpCustomMinor: minor });
                    }}
                  />
                </Field>
              )}

              {/* The worked example from the spec: the only way to tell
                  "₹20 from ₹480" from "₹500 from ₹480" without doing the sum. */}
              <p className="text-xs text-muted">
                For example, a {formatMoney(48000, currency)} expense becomes {formatMoney(Math.ceil(48000 / roundTo) * roundTo, currency)},
                and the extra {formatMoney(Math.ceil(48000 / roundTo) * roundTo - 48000, currency)} goes to your goal.
              </p>

              <Field label="Send it to">
                <SelectInput
                  value={settings.roundUpGoalId || ''}
                  onChange={(e) => onSave({ roundUpGoalId: e.target.value || null })}
                >
                  <option value="">Spread across my goals</option>
                  {fundable.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji} {g.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {/* Allocation percentages, only when there is a choice to make. */}
              {fundable.length > 1 && !settings.roundUpGoalId && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Split between goals</p>
                  {fundable.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm">
                        {g.emoji} {g.name}
                      </span>
                      <SelectInput
                        className="w-28"
                        value={String(settings.roundUpWeights?.[g.id] ?? 1)}
                        onChange={(e) =>
                          onSave({
                            roundUpWeights: {
                              ...(settings.roundUpWeights || {}),
                              [g.id]: Number(e.target.value),
                            },
                          })
                        }
                      >
                        <option value="1">20%</option>
                        <option value="2">40%</option>
                        <option value="3">60%</option>
                        <option value="5">100%</option>
                      </SelectInput>
                    </div>
                  ))}
                  <p className="text-xs text-muted">
                    It is divided by these shares, so they do not have to add up to 100.
                  </p>
                </div>
              )}
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(settings.dailyEnabled)}
              onChange={(e) => onSave({ dailyEnabled: e.target.checked })}
            />
            Save every day
          </label>
          {settings.dailyEnabled && (
            <>
              <Field label="How much each day">
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  inputMode="decimal"
                  defaultValue={String((settings.dailyAmountMinor || 0) / 100)}
                  onBlur={(e) => onSave({ dailyAmountMinor: Math.round(Number(e.target.value) * 100) })}
                />
              </Field>
              <p className="text-xs text-muted">
                That is about {formatMoney((settings.dailyAmountMinor || 0) * 30, currency)} a month.
              </p>
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(settings.monthlyEnabled)}
              onChange={(e) => onSave({ monthlyEnabled: e.target.checked })}
            />
            Save every month
          </label>
          {settings.monthlyEnabled && (
            <Field label="How much each month">
              <input
                className="w-full bg-transparent text-sm outline-none"
                inputMode="decimal"
                defaultValue={String((settings.monthlyAmountMinor || 0) / 100)}
                onBlur={(e) => onSave({ monthlyAmountMinor: Math.round(Number(e.target.value) * 100) })}
              />
            </Field>
          )}

          {/* One switch to stop everything, because somebody who wants it all to
              stop should not have to find three toggals to turn off. */}
          <Button
            variant="ghost"
            onClick={() => onSave({ roundUpEnabled: false, dailyEnabled: false, monthlyEnabled: false })}
          >
            Pause all automatic saving
          </Button>

          <p className="text-xs text-muted">
            Automatic savings only move money you have already chosen to move, and every one is written to
            the goal's history so you can see exactly what went in and when.
          </p>
        </div>
      )}
    </section>
  );
}

function CreateGoalWizard({
  members,
  currency,
  myBalance,
  busy,
  error,
  onCancel,
  onCreate,
}: {
  members: any[];
  currency: string;
  myBalance: number;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onCreate: (values: any) => void;
}) {
  const [picked, setPicked] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('\u{1F3AF}');
  const [target, setTarget] = useState('');
  const [due, setDue] = useState('');
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [participants, setParticipants] = useState<string[]>([]);
  const [saveMode, setSaveMode] = useState('MANUAL');
  const [auto, setAuto] = useState('');
  const { user } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const targetMinor = Math.round((Number(target) || 0) * 100);
  const chosen = useMemo(
    () => WIZARD_STEPS[step] ?? { title: '', hint: '' },
    [step],
  );

  const next = () => {
    setLocalError(null);
    if (step === 0 && !name.trim()) {
      setLocalError('Give the goal a name.');
      return;
    }
    if (step === 2 && targetMinor <= 0) {
      setLocalError('Set how much you are saving for.');
      return;
    }
    if (step < WIZARD_STEPS.length) {
      setStep(step + 1);
      return;
    }
    onCreate({
      name: name.trim(),
      emoji,
      targetMinor,
      targetDateEpochDay: due ? Math.floor(new Date(`${due}T00:00:00`).getTime() / 86400000) : null,
      participantIds: participants,
      saveMode,
      autoAmountMinor: Math.round((Number(auto) || 0) * 100),
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <button onClick={onCancel} className="text-sm text-muted hover:underline">
        &larr; Cancel
      </button>

      {!picked && (
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-semibold">What are you saving for?</h1>
            <p className="text-sm text-muted">
              Most savings are one of these. Pick one to start from, and change the amount to suit you.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.title}
                onClick={() => {
                  setName(template.title);
                  setEmoji(template.emoji);
                  if (!target) setTarget(String(template.suggestionMinor / 100));
                  setPicked(true);
                }}
                className="flex items-center gap-3 rounded-lg border border-line p-3 text-left hover:bg-surface-sunken"
              >
                <span className="text-2xl" aria-hidden>
                  {template.emoji}
                </span>
                <span>{template.title}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Back
            </Button>
            <Button variant="subtle" onClick={() => setPicked(true)}>
              Something else
            </Button>
          </div>
        </div>
      )}

      {picked && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Step {step + 1} of {WIZARD_STEPS.length}
          </p>
          <h1 className="text-2xl font-semibold">{chosen.title}</h1>
          <p className="text-sm text-muted">{chosen.hint}</p>
        </div>
      )}

      {picked && step === 0 && (
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="Goal name"
        />
      )}

      {picked && step === 1 && (
        <div className="grid grid-cols-8 gap-2">
          {EMOJI.map((option) => (
            <button
              key={option}
              onClick={() => setEmoji(option)}
              className={`rounded-lg border p-2 text-xl ${
                option === emoji ? 'border-brand bg-brand-light' : 'border-line'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {picked && step === 2 && (
        <div className="space-y-3">
          <TextInput
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="decimal"
            placeholder="Target amount"
          />
          {/* A real date control, not a typed one. "By when" feeds the insight that
              says how much a month would take to get there, and nobody can compute
              that from a date they had to guess the format of. */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
              By when?
            </label>
            <input
              type="date"
              value={due}
              min={todayIso}
              onChange={(e) => setDue(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-sm"
            />
            <Button variant="subtle" size="sm" className="mt-2" onClick={() => setDue('')}>
              No deadline
            </Button>
            <p className="mt-1 text-xs text-muted">
              {due ? 'Saving up to this date.' : 'No deadline \u2014 save whenever you can.'}
            </p>
          </div>
          {monthlyNeededText(target, due, currency)}
        </div>
      )}

      {picked && step === 3 && (
        <div className="space-y-2">
          <p className="rounded-lg border border-line p-3 text-xs text-muted">
            Keeping it to just you keeps it private. Nobody else in the family will be able to see it,
            not even on a shared screen.
          </p>
          {members
            .filter((m: any) => m.uid !== user?.uid)
            .map((member: any) => {
              const on = participants.includes(member.uid);
              return (
                <button
                  key={member.uid}
                  onClick={() =>
                    setParticipants(on ? participants.filter((p) => p !== member.uid) : [...participants, member.uid])
                  }
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                    on ? 'border-brand bg-brand-light' : 'border-line'
                  }`}
                >
                  <span>{member.displayName}</span>
                  <span className="text-xs text-muted">{on ? 'Added' : 'Add'}</span>
                </button>
              );
            })}
        </div>
      )}

      {picked && step === 4 && (
        <div className="space-y-3">
          {Object.keys(SAVE_MODE_LABEL).map((mode) => (
            <button
              key={mode}
              onClick={() => setSaveMode(mode)}
              className={`w-full rounded-lg border p-3 text-left ${
                saveMode === mode ? 'border-brand bg-brand-light' : 'border-line'
              }`}
            >
              {SAVE_MODE_LABEL[mode]}
            </button>
          ))}
          {saveMode !== 'MANUAL' && (
            <TextInput
              value={auto}
              onChange={(e) => setAuto(e.target.value)}
              inputMode="decimal"
              placeholder="How much each time"
            />
          )}
          <p className="text-xs text-muted">
            Contributions come out of your own wallet, so anybody can see what is going in and out.
          </p>
        </div>
      )}

      {picked && (localError || error) && <Banner tone="error">{localError || error}</Banner>}

          {picked && step === WIZARD_STEPS.length && (
        <div className="rounded-lg border border-line p-4">
          <p className="text-2xl">
            {emoji} {name}
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Target</dt>
              <dd>{formatMoney(targetMinor, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">By</dt>
              <dd>{due ? new Date(`${due}T00:00:00`).toLocaleDateString() : 'No deadline'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Saving with</dt>
              <dd>
                {participants.length <= 1
                  ? 'Just you'
                  : participants.map((uid) => members.find((m: any) => m.uid === uid)?.displayName || 'Member').join(', ')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">How it fills</dt>
              <dd>
                {SAVE_MODE_LABEL[saveMode]}
                {(saveMode === 'DAILY' || saveMode === 'MONTHLY') &&
                  ` of ${formatMoney(Math.round(Number(auto || 0) * 100), currency)}`}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">
            You can change any of this later, and stop automatic saving whenever you want.
          </p>
        </div>
      )}

      {picked && (
      <div className="flex items-center gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button className="ml-auto" disabled={busy} onClick={next}>
          {busy ? 'Saving...' : step === WIZARD_STEPS.length ? 'Create goal' : 'Next'}
        </Button>
      </div>
      )}
    </div>
  );
}