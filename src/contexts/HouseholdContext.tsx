import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { formatMoney } from '../utils/format';
import { CategoryFormData, GoalSettings } from '../types';

interface HouseholdContextType {
  householdId: string | null;
  household: any | null;
  members: any[];
  categories: any[];
  expenses: any[];
  settlements: any[];
  goals: any[];
  goalSettings: GoalSettings;
  wallets: any[];
  walletTxns: any[];
  limits: any[];
  walletRequests: any[];
  /** Ask the head of the family for money. Members only. */
  requestMoney: (amountMinor: number, note: string | null) => Promise<void>;
  /** Answer a pending request. Head of the family only. */
  decideRequest: (requestId: string, approve: boolean) => Promise<void>;
  /** True while any write is still waiting on the network. */
  offline: boolean;
  setLimit: (uid: string, categoryId: string, capMinor: number) => Promise<void>;
  activity: any[];
  loading: boolean;
  error: string | null;
  creditWallet: (uid: string, amountMinor: number, note: string | null) => Promise<void>;
  transferWallet: (fromUid: string, toUid: string, amountMinor: number, note: string | null) => Promise<void>;
  createHousehold: (name: string, baseCurrency: string) => Promise<string>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  addCategory: (data: CategoryFormData) => Promise<string>;
  updateCategory: (id: string, data: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addExpense: (expense: any) => Promise<string>;
  updateExpense: (id: string, data: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addSettlement: (data: any) => Promise<string>;
  createGoal: (data: any) => Promise<string>;
  contributeToGoal: (goalId: string, amountMinor: number, note?: string | null) => Promise<void>;
  applyRoundUp: (expenseId: string, baseAmountMinor: number) => Promise<number>;
  requestGoalSpending: (goalId: string, amountMinor: number, reason: string, participantIds: string[], note?: string | null) => Promise<string>;
  answerGoalSpending: (goalId: string, requestId: string, approve: boolean) => Promise<void>;
  saveGoalSettings: (settings: Partial<GoalSettings>) => Promise<void>;
  logActivity: (kind: string, summary: string, amountMinor?: number, targetId?: string) => Promise<void>;
  refreshData: () => void;
}

/**
 * The seventeen categories a new family starts with.
 *
 * Seeded rather than left empty, because a family that has to configure
 * categories before its first expense gets logged will not configure them, and
 * the first expense is the one that gets somebody to try the app.
 *
 * Mirrors the Android client so both apps show the same household the same way.
 */
const DEFAULT_CATEGORIES: CategoryFormData[] = [
  { name: 'Groceries', icon: 'groceries', color: '#0D6745', monthlyBudgetMinor: 0 },
  { name: 'Food & dining', icon: 'food', color: '#158055', monthlyBudgetMinor: 0 },
  { name: 'Transport', icon: 'transport', color: '#2563EB', monthlyBudgetMinor: 0 },
  { name: 'Home', icon: 'home', color: '#0E7490', monthlyBudgetMinor: 0 },
  { name: 'Shopping', icon: 'shopping', color: '#7C3AED', monthlyBudgetMinor: 0 },
  { name: 'Bills & utilities', icon: 'utilities', color: '#B45309', monthlyBudgetMinor: 0 },
  { name: 'Health', icon: 'health', color: '#BE185D', monthlyBudgetMinor: 0 },
  { name: 'Education', icon: 'education', color: '#4D7C0F', monthlyBudgetMinor: 0 },
  { name: 'Entertainment', icon: 'entertainment', color: '#C2410C', monthlyBudgetMinor: 0 },
  { name: 'Travel', icon: 'travel', color: '#2F9B6B', monthlyBudgetMinor: 0 },
  { name: 'Family', icon: 'family', color: '#9AD3B4', monthlyBudgetMinor: 0 },
  { name: 'Gifts', icon: 'gift', color: '#E5484D', monthlyBudgetMinor: 0 },
  { name: 'Pets', icon: 'pets', color: '#8E9AAF', monthlyBudgetMinor: 0 },
  { name: 'Insurance', icon: 'other', color: '#64748B', monthlyBudgetMinor: 0 },
  { name: 'Phone & internet', icon: 'phone', color: '#0EA5E9', monthlyBudgetMinor: 0 },
  { name: 'Savings', icon: 'other', color: '#10B981', monthlyBudgetMinor: 0 },
  { name: 'Other', icon: 'other', color: '#7C877F', monthlyBudgetMinor: 0 },
];

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

const CACHE_KEY = 'expence_household_id';

/**
 * Refuses a payload Firestore would reject anyway, naming the offending path.
 *
 * Firestore validates a write before it reaches the network and throws
 * "Unsupported field value: undefined". That message is unusable in one common
 * case: when the undefined sits inside an array it names only the document, not
 * the field, so the reader is left with no idea what to look at. The check here
 * walks the payload and reports the exact path.
 *
 * `Object.getPrototypeOf(value) === Object.prototype` is what keeps it from
 * walking into Firestore's own value objects.
 */
/**
 * Folds one goals listener's rows into the list the other one is filling.
 *
 * The two queries overlap: a goal the user created *and* was added to comes back
 * from both, and both carries the fresher copy because each write lands on both
 * subscriptions. Merging by id rather than replacing means the list does not
 * flicker between two partial halves.
 */
function mergeGoals(previous: any[], rows: any[]): any[] {
  const byId = new Map(previous.map((goal) => [goal.id, goal]));
  rows.forEach((row) => byId.set(row.id, { ...byId.get(row.id), ...row }));
  return Array.from(byId.values()).sort(goalOrdering);
}

/** Active first, then nearest the target, then by name: a list you act on. */
function goalOrdering(a: any, b: any): number {
  const finished = (g: any) => (g.status === 'ACTIVE' ? 0 : 1);
  if (finished(a) !== finished(b)) return finished(a) - finished(b);
  const remainingA = a.targetMinor > 0 ? a.targetMinor - a.savedMinor : Number.MAX_SAFE_INTEGER;
  const remainingB = b.targetMinor > 0 ? b.targetMinor - b.savedMinor : Number.MAX_SAFE_INTEGER;
  if (remainingA !== remainingB) return remainingA - remainingB;
  return String(a.name || '').localeCompare(String(b.name || ''));
}

/** The next multiple of `roundTo` above `amount`; zero if it is already on one. */
function nextRoundUp(amountMinor: number, roundTo: number): number {
  if (amountMinor <= 0 || roundTo <= 0) return 0;
  const remainder = amountMinor % roundTo;
  return remainder === 0 ? 0 : roundTo - remainder;
}

function reached(goal: any): boolean {
  return Number(goal?.targetMinor) > 0 && Number(goal?.savedMinor) >= Number(goal.targetMinor);
}

const EMPTY_GOAL_SETTINGS: GoalSettings = {
  uid: '',
  roundUpEnabled: true,
  roundUpToMinor: 100,
  roundUpCustomMinor: null,
  roundUpGoalId: null,
  roundUpWeights: {},
  dailyEnabled: false,
  dailyAmountMinor: 0,
  dailyGoalId: null,
  monthlyEnabled: false,
  monthlyAmountMinor: 0,
  monthlyDayOfMonth: 1,
  monthlyGoalId: null,
};

function assertNoUndefined(value: unknown, path = 'document'): void {
  if (value === undefined) {
    throw new Error(`Cannot save: ${path} has no value.`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefined(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) {
        throw new Error(`Cannot save: ${path}.${key} has no value.`);
      }
      assertNoUndefined(entry, `${path}.${key}`);
    }
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [household, setHousehold] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalSettings, setGoalSettings] = useState<GoalSettings | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [limits, setLimits] = useState<any[]>([]);
  const [walletRequests, setWalletRequests] = useState<any[]>([]);
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine === false : false,
  );
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listeners = useRef<Unsubscribe[]>([]);
  const displayName = profile?.displayName || '';

  const clearData = () => {
    listeners.current.forEach((off) => off());
    listeners.current = [];
    setHousehold(null);
    setMembers([]);
    setCategories([]);
    setExpenses([]);
    setSettlements([]);
    setGoals([]);
    setGoalSettings(null);
    setWallets([]);
    setWalletTxns([]);
    setLimits([]);
    setWalletRequests([]);
    setActivity([]);
  };

  const closeListeners = () => {
    listeners.current.forEach((off) => off());
    listeners.current = [];
  };

  /**
   * Subscribes to one household and keeps the subscriptions alive until the next
   * one replaces them.
   *
   * They used to be returned from an async function nobody awaited, so every
   * switch of family left its previous listeners attached -- and the reads they
   * performed belonged to a household the user had already left.
   */
  const subscribe = (hid: string) => {
    closeListeners();

    // Resolved once and guarded, rather than dereferenced inside each listener.
    // Every goals and settings subscription is scoped to this person, so with
    // nobody signed in there is nothing to subscribe to.
    const uid = user?.uid;
    if (!uid) return;

    listeners.current.push(
      onSnapshot(
        doc(db, 'households', hid),
        (snap) => {
          if (snap.exists()) setHousehold({ id: snap.id, ...snap.data() });
          else clearData();
        },
        (err) => {
          console.error('Household read failed:', err);
          setError('Could not read this family. It may have been removed.');
        },
      ),
    );

    const feed = (
      path: string,
      apply: (rows: any[]) => void,
      ...constraints: any[]
    ) => {
      listeners.current.push(
        onSnapshot(
          query(collection(db, 'households', hid, path), ...constraints),
          (snap) => apply(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          (err) => console.error(`${path} read failed:`, err),
        ),
      );
    };

    // Members are the one collection whose identity is the path rather than a
    // field: the document is `members/{uid}` and the document itself never
    // repeats the uid. Mapping the snapshot to `{ id }` alone left every member
    // with an undefined `uid`, which is the key used by `splits`, by
    // `participantIds`, by every balance map and by the Firestore rules' own
    // membership checks.
    //
    // The visible symptom was a save that Firestore rejected with "Unsupported
    // field value: undefined" naming no field at all, because the undefined sat
    // inside `participantIds` -- and Firestore does not name a field for a bad
    // array element. Everything else failed quietly behind it: no member names
    // next to expenses, and "who owes whom" always empty.
    feed(
      'members',
      (rows) => setMembers(rows.map((row) => ({ ...row, uid: row.id ?? row.uid }))),
      orderBy('joinedAt'),
    );
    feed('categories', setCategories, orderBy('order'));
    feed('expenses', setExpenses, orderBy('dateEpochDay', 'desc'), limit(500));
    feed('settlements', setSettlements, orderBy('dateEpochDay', 'desc'), limit(200));
    // Goals are read twice on purpose. The rule is "you may read this if you own
    // it *or* you participate in it", and one query asking for the whole
    // collection is denied outright -- Firestore has to be able to prove that
    // every document coming back is one the caller may see, and it cannot reason
    // about a disjunction it has not been told about. Constraining each half
    // separately makes each query provable. A goal the user both created and was
    // added to arrives twice and is de-duplicated below.
    feed('goals', (rows) => {
      setGoals((previous) => mergeGoals(previous, rows));
    }, where('ownerUid', '==', uid));
    feed('goals', (rows) => {
      setGoals((previous) => mergeGoals(previous, rows));
    }, where('participantIds', 'array-contains', uid));

    // Preferences are private to the signed-in person: nobody else in the family
    // has a say in how their spare change is saved.
    listeners.current.push(
      onSnapshot(
        doc(db, 'households', hid, 'goalSettings', uid),
        // uid last: putting it before the spreads let the document's own copy win,
        // which TypeScript flags because a key written twice is a mistake even
        // when the duplicate happens to agree.
        (snap) =>
          setGoalSettings(
            snap.exists()
              ? ({ ...EMPTY_GOAL_SETTINGS, ...snap.data(), uid } as GoalSettings)
              : { ...EMPTY_GOAL_SETTINGS, uid },
          ),
        (err) => console.error('goalSettings read failed:', err),
      ),
    );

    feed('wallets', setWallets);
    feed('limits', setLimits);
    feed('walletRequests', setWalletRequests, orderBy('createdAt', 'desc'), limit(60));
    feed('walletTxns', setWalletTxns, orderBy('at', 'desc'), limit(100));
    feed('activity', setActivity, orderBy('at', 'desc'), limit(60));
  };

  const selectHousehold = (hid: string | null) => {
    if (hid) {
      localStorage.setItem(CACHE_KEY, hid);
      setHouseholdId(hid);
      subscribe(hid);
    } else {
      localStorage.removeItem(CACHE_KEY);
      setHouseholdId(null);
      clearData();
    }
    setLoading(false);
  };

  /**
   * Picks the household to show.
   *
   * It is taken from the profile rather than from the cached id, because the
   * cache is only a hint: a fresh browser has none, and a stale one would read
   * a family the user is no longer in -- which the rules refuse, leaving the
   * screen permanently empty with no error anywhere.
   */
  useEffect(() => {
    const ids = profile?.householdIds || [];
    const cached = localStorage.getItem(CACHE_KEY);
    const next = ids.find((id) => id === cached) || ids[0] || null;

    if (next === householdId) {
      setLoading(false);
      return;
    }
    selectHousehold(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.householdIds?.join(','), profile?.profileCompleted]);

  useEffect(() => closeListeners, []);

  /*
   * The name typed in the app has to be the name the family reads.
   *
   * Member rows are seeded once, when the household is created or joined, and
   * until the user edits their profile they name them by the email local part --
   * or, for an account added from Google, by the Google account name. Nobody
   * ever touches them again, so every household label for that person stays
   * wrong until being signed out. The profile document is the only mutable
   * copy, so this effect stamps it onto the member row in each household the
   * person belongs to, and re-stamps it whenever it changes.
   */
  const activeName = profile?.displayName?.trim();
  const householdKey = (profile?.householdIds ?? []).join(',');
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !activeName) return;
    for (const hid of profile?.householdIds ?? []) {
      updateDoc(doc(db, 'households', hid, 'members', uid), {
        displayName: activeName,
      }).catch(() => {
        /* corrected the next time the profile saves */
      });
    }
    // householdKey tracks the joined list; displayName edits bump the effect too.
  }, [user?.uid, activeName, householdKey]);

  /**
   * Whether the device is offline.
   *
   * Firestore already queues writes while the connection is down and replays them
   * on reconnect, so nothing here is being held back -- the flag exists so the
   * user is told, because a note that "did not save" and a note that saved but
   * has not synced yet look identical otherwise.
   */
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  /**
   * Asks the head of the family for money.
   *
   * Members only. The head tops their own wallet up directly with `creditWallet`,
   * because asking yourself for permission is a tap that would always be answered
   * yes. The rules pin `requestedBy` to the caller and `status` to PENDING, so a
   * client cannot write itself an approved request.
   */
  const requestMoney = async (amountMinor: number, note: string | null) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const amount = Math.trunc(amountMinor);
    if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');

    await addDoc(collection(db, 'households', householdId, 'walletRequests'), {
      requestedBy: user.uid,
      amountMinor: amount,
      note: note?.trim() || null,
      status: 'PENDING',
      decidedBy: null,
      decidedAt: null,
      createdAt: Date.now(),
    });

    void logActivity('WALLET_REQUESTED', `Asked ${formatMinor(amount)} from the head of the family`, amount);
  };

  /**
   * Answers a pending request. Head of the family only.
   *
   * Approval moves the money and answers the question in **one batch**: the head's
   * wallet debited, the asker's credited, the request marked APPROVED, all
   * atomically. Three separate writes would allow the worst outcome -- money taken
   * from one person and never arriving, with the request still pending.
   *
   * The head may be overdrawn by approving. They are the one who decides, and
   * refusing their own decision would leave the request stuck forever rather than
   * resolved; the negative balance is what makes the overdraft visible.
   */
  const decideRequest = async (requestId: string, approve: boolean) => {
    if (!householdId) throw new Error('No household selected');
    const owner = requireOwner();
    const request = walletRequests.find((r: any) => r.id === requestId);
    if (!request) throw new Error('That request is gone.');
    // Already answered: doing nothing is right, so a double tap cannot debit twice.
    if (request.status !== 'PENDING') return;

    const batch = writeBatch(db);

    if (approve) {
      const toUid = request.requestedBy as string;
      const amount = Math.trunc(Number(request.amountMinor) || 0);
      // Both sides increment. The requester's credit is applied to whatever is
      // actually stored, not to a number captured before the batch was built.
      batch.set(
        doc(db, 'households', householdId, 'wallets', owner.uid),
        { uid: owner.uid, balanceMinor: increment(-amount), updatedAt: Date.now(), updatedBy: owner.uid },
        { merge: true },
      );
      batch.set(
        doc(db, 'households', householdId, 'wallets', toUid),
        {
          uid: toUid,
          balanceMinor: increment(amount),
          updatedAt: Date.now(),
          updatedBy: owner.uid,
          grantedBy: owner.uid,
        },
        { merge: true },
      );
      batch.set(doc(collection(db, 'households', householdId, 'walletTxns')), {
        householdId,
        kind: 'CREDIT',
        actorUid: owner.uid,
        toUid,
        amountMinor: amount,
        note: request.note || 'Approved request',
        at: Date.now(),
      });
    }

    batch.update(doc(db, 'households', householdId, 'walletRequests', requestId), {
      status: approve ? 'APPROVED' : 'DECLINED',
      decidedBy: owner.uid,
      decidedAt: Date.now(),
    });

    await batch.commit();

    void logActivity(
      approve ? 'WALLET_REQUEST_APPROVED' : 'WALLET_REQUEST_DECLINED',
      approve
        ? `Approved ${formatMinor(request.amountMinor)} for ${nameFor(request.requestedBy)}`
        : `Declined a request from ${nameFor(request.requestedBy)}`,
      approve ? Math.trunc(Number(request.amountMinor) || 0) : undefined,
    );
  };

  /** The head sets a cap on what a person may spend on a category. */
  const setLimit = async (uid: string, categoryId: string, capMinor: number) => {
    if (!householdId) throw new Error('No household selected');
    const owner = requireOwner();
    const cap = Math.max(0, Math.trunc(capMinor));
    await setDoc(
      doc(db, 'households', householdId, 'limits', `${uid}_${categoryId}`),
      { uid, categoryId, capMinor: cap, setBy: owner.uid, setAt: Date.now() },
      { merge: true },
    );
    void logActivity('LIMIT_CHANGED', `Set a ${formatMinor(cap)} limit for a category`);
  };

  const requireUser = () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');
    return user;
  };

  const uid = () => requireUser().uid;

  /**
   * The rules only let the household owner credit or transfer a wallet, so the
   * client says so before the write rather than after a PERMISSION_DENIED.
   */
  const requireOwner = () => {
    const user = requireUser();
    if (!isOwner(user.uid)) {
      throw new Error('Only the head of the family can move money between wallets.');
    }
    return user;
  };

  const isOwner = (uidToCheck: string) => household?.ownerUid === uidToCheck;

  const formatMinor = (minor: number) =>
    formatMoney(Math.abs(minor), household?.baseCurrency || 'INR');

  /**
   * One batch, because a household whose owner document is missing is a
   * household nobody can administer.
   *
   * The profile write is an `update` naming three fields rather than a `set`:
   * the rules diff an update against the stored document, so a `set` would
   * carry every field it does not name in that diff and be rejected.
   */
  const createHousehold = async (name: string, baseCurrency: string): Promise<string> => {
    const user = requireUser();
    const hid = doc(collection(db, 'households')).id;
    const code = generateInviteCode();
    const now = Date.now();

    const batch = writeBatch(db);

    batch.set(doc(db, 'households', hid), {
      name,
      baseCurrency,
      ownerUid: user.uid,
      inviteCode: code,
      monthlyBudgetMinor: 0,
    });

    batch.set(doc(db, 'households', hid, 'members', user.uid), {
      displayName: displayName || (user?.email || '').split('@')[0] || 'User',
      email: user.email,
      photoURL: null,
      role: 'OWNER',
      joinedAt: now,
      defaultWeight: 1,
      monthlyBudgetMinor: 0,
      inviteCode: null,
    });

    batch.set(doc(db, 'invites', code), {
      householdId: hid,
      householdName: name,
      active: true,
      createdBy: user.uid,
    });

    batch.update(doc(db, 'users', user.uid), {
      displayName: displayName || (user?.email || '').split('@')[0] || 'User',
      displayCurrency: baseCurrency,
      householdIds: arrayUnion(hid),
    });

    await batch.commit();

    selectHousehold(hid);
    await seedCategories(hid);
    return hid;
  };

  /**
   * Writes the defaults once.
   *
   * Guarded by checking whether any category already exists, so opening the app
   * a second time does not produce a second set -- and a family who has
   * deliberately deleted some of the defaults does not get them all back.
   */
  const seedCategories = async (hid: string) => {
    try {
      const existing = await getDocs(collection(db, 'households', hid, 'categories'));
      if (!existing.empty) return;

      const batch = writeBatch(db);
      DEFAULT_CATEGORIES.forEach((cat, index) => {
        batch.set(doc(collection(db, 'households', hid, 'categories')), {
          ...cat,
          isSystem: true,
          householdId: hid,
          order: index,
        });
      });
      await batch.commit();
    } catch (err) {
      // Non-fatal: the family exists, and Categories can add the rest by hand.
      console.error('Could not seed default categories:', err);
    }
  };

  /**
   * Joins by writing the caller's own member document.
   *
   * The code travels on that document for exactly one write. It is *not* retired
   * here: retiring an invite is an owner-only write, so including it made the
   * whole batch fail with PERMISSION_DENIED and nobody could ever join a
   * family.
   */
  const joinHousehold = async (rawCode: string) => {
    const user = requireUser();
    const code = rawCode.trim().toUpperCase();

    const inv = await getDoc(doc(db, 'invites', code));
    if (!inv.exists() || inv.data().active !== true) {
      throw new Error('That code is not valid any more. Ask for a new one.');
    }
    const hid = inv.data().householdId as string;

    await setMemberAndJoin(hid, code);

    selectHousehold(hid);
  };

  /**
   * Takes the invite code off the caller's own member row.
   *
   * The code has to be present for the write that creates the row, because that
   * is what the rules check against the invite document. Leaving it there
   * afterwards is not harmless: it keeps a live code on a document every member
   * can read, which is what the field exists to avoid. Best effort -- a member
   * whose row cannot be cleared has lost nothing that matters.
   */
  const clearOwnInviteCode = async (hid: string) => {
    try {
      const member = await getDoc(doc(db, 'households', hid, 'members', uid()));
      if (!member.exists() || member.data()?.inviteCode == null) return;
      await updateDoc(doc(db, 'households', hid, 'members', uid()), { inviteCode: null });
    } catch (err) {
      console.error('Could not clear the invite code from the member row:', err);
    }
  };

  const setMemberAndJoin = async (hid: string, code: string | null) => {
    const user = requireUser();
    const batch = writeBatch(db);

    batch.set(doc(db, 'households', hid, 'members', user.uid), {
      displayName: displayName || (user?.email || '').split('@')[0] || 'User',
      email: user.email,
      photoURL: null,
      role: 'MEMBER',
      joinedAt: Date.now(),
      defaultWeight: 1,
      monthlyBudgetMinor: 0,
      inviteCode: code,
    });

    batch.update(doc(db, 'users', user.uid), {
      householdIds: arrayUnion(hid),
    });

    await batch.commit();
    await clearOwnInviteCode(hid);
  };

  const leaveHousehold = async () => {
    if (!householdId) return;
    const user = requireUser();

    const batch = writeBatch(db);

    // An owner hands the household to the next-longest-standing member before
    // going, or the family is left with nobody who can administer it.
    const memberSnap = await getDoc(doc(db, 'households', householdId, 'members', user.uid));
    if (memberSnap.data()?.role === 'OWNER') {
      const roster = await getDocs(
        query(
          collection(db, 'households', householdId, 'members'),
          orderBy('joinedAt'),
        ),
      );
      const heir = roster.docs.find((d) => d.id !== user.uid);
      if (heir) {
        batch.update(heir.ref, { role: 'OWNER' });
        batch.update(doc(db, 'households', householdId), { ownerUid: heir.id });
      }
    }

    batch.delete(doc(db, 'households', householdId, 'members', user.uid));
    batch.update(doc(db, 'users', user.uid), {
      householdIds: arrayRemove(householdId),
    });
    await batch.commit();

    selectHousehold(null);
  };

  const addCategory = async (data: CategoryFormData) => {
    if (!householdId) throw new Error('No household selected');
    const payload = { ...data, householdId, order: categories.length };
    assertNoUndefined(payload, 'category');
    const ref = await addDoc(collection(db, 'households', householdId, 'categories'), payload);
    return ref.id;
  };

  const updateCategory = async (id: string, data: any) => {
    if (!householdId) throw new Error('No household selected');
    await updateDoc(doc(db, 'households', householdId, 'categories', id), data);
  };

  const deleteCategory = async (id: string) => {
    if (!householdId) throw new Error('No household selected');
    await deleteDoc(doc(db, 'households', householdId, 'categories', id));
  };

  /**
   * Adds an expense and moves every charged member's wallet in the same commit.
   *
   * One batch, not two writes, for the obvious reason: if the expense lands and
   * the wallet does not, the allowance silently stops matching what was spent and
   * nobody finds out until the balance is wrong. Firestore applies a batch
   * atomically, so either both happened or neither did.
   *
   * The balances are *decreased* rather than blocked at zero, which is a product
   * decision: a member who is out of allowance may still log what they actually
   * spent, and their balance goes negative and is flagged to whoever runs the
   * family. Refusing the expense would mean the real purchase is not recorded
   * anywhere, which is worse for a ledger.
   *
   * The rules permit exactly this and nothing more: a member may lower their own
   * balance and may not raise it, so a client cannot mint its own allowance.
   */
  const addExpense = async (expenseData: any) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();

    const expenseRef = doc(collection(db, 'households', householdId, 'expenses'));
    const batch = writeBatch(db);

    batch.set(expenseRef, {
      ...expenseData,
      householdId,
      createdBy: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      deletedAt: null,
    });

    const splits: Record<string, number> = expenseData.splits || {};
    let walletMoves = 0;

    for (const [uid, share] of Object.entries(splits)) {
      const amount = Math.trunc(Number(share) || 0);
      if (amount === 0) continue;
      const walletRef = doc(db, 'households', householdId, 'wallets', uid);
      // An increment, not the absolute figure the last snapshot produced. Read-
      // then-write silently discards anything that landed in between; this cannot.
      batch.set(
        walletRef,
        { uid, balanceMinor: increment(-amount), updatedAt: Date.now(), updatedBy: user.uid },
        { merge: true },
      );
      walletMoves++;
    }

    if (walletMoves > 0) {
      batch.set(doc(collection(db, 'households', householdId, 'walletTxns')), {
        householdId,
        kind: 'SPEND',
        actorUid: user.uid,
        description: expenseData.description,
        amountMinor: Math.abs(expenseData.baseAmountMinor || 0),
        detail: splits,
        at: Date.now(),
      });
    }

    const payload = { ...expenseData, householdId, createdBy: user.uid };
    assertNoUndefined(payload, 'expense');
    assertNoUndefined(splits, 'expense.splits');

    await batch.commit();

    const spentOn: string[] = [];
    for (const [uid, share] of Object.entries(splits)) {
      const after = (Number(wallets.find((w: any) => w.uid === uid)?.balanceMinor) || 0) - Math.trunc(Number(share) || 0);
      if (after < 0) spentOn.push(uid);
    }

    void logActivity(
      'EXPENSE_ADDED',
      `Added expense: ${expenseData.description}`,
      expenseData.baseAmountMinor,
      expenseRef.id,
    );

    // The alert the head is meant to see. Written as activity so it lands in the
    // same realtime feed the head already watches, rather than depending on a
    // push channel this project does not have.
    if (spentOn.length > 0) {
      void logActivity(
        'WALLET_OVERSPENT',
        `${spentOn.map((uid) => nameFor(uid)).join(', ')} went over their allowance on "${expenseData.description}"`,
      );
    }

    // The round-up runs after the expense is committed, never inside its batch:
    // the expense is what the user actually asked to record, and a failed
    // round-up must not turn a saved meal into an error. So it is swallowed here
    // and reported through the goal ledger if it succeeds.
    void applyRoundUp(expenseRef.id, Number(expenseData.baseAmountMinor) || 0).catch((err) => {
      console.error('Round-up failed:', err);
    });

    return expenseRef.id;
  };

  const nameFor = (uid: string) =>
    members.find((m: any) => m.uid === uid)?.displayName || 'Someone';

  /**
   * Puts money into a member's wallet. Owner only.
   *
   * Credit and ledger row in one batch for the same reason as above: a balance
   * that moved without a row explaining it cannot be audited.
   */
  const creditWallet = async (uid: string, amountMinor: number, note: string | null) => {
    if (!householdId) throw new Error('No household selected');
    const owner = requireOwner();
    const amount = Math.trunc(amountMinor);
    if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');

    const batch = writeBatch(db);
    batch.set(
      doc(db, 'households', householdId, 'wallets', uid),
      { uid, balanceMinor: increment(amount), updatedAt: Date.now(), updatedBy: owner.uid, grantedBy: owner.uid },
      { merge: true },
    );
    batch.set(doc(collection(db, 'households', householdId, 'walletTxns')), {
      householdId,
      kind: 'CREDIT',
      actorUid: owner.uid,
      toUid: uid,
      amountMinor: amount,
      note: note?.trim() || null,
      at: Date.now(),
    });
    await batch.commit();

    void logActivity('WALLET_CREDITED', `Added ${formatMinor(amount)} to ${nameFor(uid)}'s wallet`, amount);
  };

  /**
   * Moves money from one member's wallet to another. Owner only.
   *
   * Both balances and both ledger rows go in one batch, so a transfer is never
   * half-applied.
   */
  const transferWallet = async (fromUid: string, toUid: string, amountMinor: number, note: string | null) => {
    if (!householdId) throw new Error('No household selected');
    const owner = requireOwner();
    const amount = Math.trunc(amountMinor);
    if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');
    if (fromUid === toUid) throw new Error('Pick two different people.');

    const batch = writeBatch(db);
    batch.set(
      doc(db, 'households', householdId, 'wallets', fromUid),
      { uid: fromUid, balanceMinor: increment(-amount), updatedAt: Date.now(), updatedBy: owner.uid },
      { merge: true },
    );
    batch.set(
      doc(db, 'households', householdId, 'wallets', toUid),
      { uid: toUid, balanceMinor: increment(amount), updatedAt: Date.now(), updatedBy: owner.uid, grantedBy: owner.uid },
      { merge: true },
    );
    batch.set(doc(collection(db, 'households', householdId, 'walletTxns')), {
      householdId,
      kind: 'TRANSFER',
      actorUid: owner.uid,
      fromUid,
      toUid,
      amountMinor: amount,
      note: note?.trim() || null,
      at: Date.now(),
    });
    await batch.commit();

    void logActivity(
      'WALLET_TRANSFERED',
      `Moved ${formatMinor(amount)} from ${nameFor(fromUid)} to ${nameFor(toUid)}`,
      amount,
    );
  };

  const updateExpense = async (id: string, data: any) => {
    if (!householdId) throw new Error('No household selected');
    assertNoUndefined(data, 'expense');
    await updateDoc(doc(db, 'households', householdId, 'expenses', id), {
      ...data,
      updatedAt: Date.now(),
    });
  };

  const deleteExpense = async (id: string) => {
    if (!householdId) throw new Error('No household selected');
    await updateDoc(doc(db, 'households', householdId, 'expenses', id), {
      deletedAt: Date.now(),
    });
  };

  const addSettlement = async (data: any) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const payload = {
      ...data,
      householdId,
      createdAt: Date.now(),
      createdBy: user.uid,
      deletedAt: null,
    };
    assertNoUndefined(payload, 'settlement');
    const ref = await addDoc(collection(db, 'households', householdId, 'settlements'), payload);
    void logActivity('SETTLEMENT_ADDED', 'Recorded a settlement', data.baseAmountMinor, ref.id);
    return ref.id;
  };

  const createGoal = async (data: any) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Give the goal a name.');
    const targetMinor = Math.trunc(Number(data.targetMinor) || 0);
    if (targetMinor <= 0) throw new Error('Set a target greater than zero.');

    // The creator is always a participant. A goal whose participant list excluded
    // its owner would be invisible to everybody, which is a quiet way to lose
    // somebody's money -- the rules check this too.
    const participantIds = Array.from(
      new Set([...(data.participantIds || []), user.uid].filter(Boolean)),
    );

    const payload: Record<string, any> = {
      householdId,
      name: name.slice(0, 60),
      emoji: data.emoji || '\u{1F3AF}',
      category: data.category || 'OTHER',
      targetMinor,
      targetDateEpochDay: data.targetDateEpochDay ?? null,
      participantIds,
      ownerUid: user.uid,
      savedMinor: 0,
      status: 'ACTIVE',
      saveMode: data.saveMode || 'MANUAL',
      autoAmountMinor: Math.max(0, Math.trunc(Number(data.autoAmountMinor) || 0)),
      autoDayOfMonth: 1,
      currency: household?.baseCurrency || 'INR',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    assertNoUndefined(payload, 'goal');
    const ref = await addDoc(collection(db, 'households', householdId, 'goals'), payload);
    void logActivity('GOAL_CREATED', `Started the goal ${name}`, targetMinor, ref.id);
    return ref.id;
  };

  /**
   * Puts money into a goal, out of the contributor's own wallet.
   *
   * Three documents move together in one transaction: the wallet goes down, the
   * goal goes up, and a ledger row says why. Without that last row a balance is a
   * number rather than a record, and without the transaction the goal can be
   * funded by money that was never taken.
   */
  const contributeToGoal = async (goalId: string, amountMinor: number, note?: string | null) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const amount = Math.trunc(Number(amountMinor) || 0);
    if (amount <= 0) throw new Error('Enter an amount greater than zero.');

    const goalRef = doc(db, 'households', householdId, 'goals', goalId);
    const walletRef = doc(db, 'households', householdId, 'wallets', user.uid);
    const txnRef = doc(collection(goalRef, 'goalTxns'));
    const now = Date.now();

    // All reads before all writes: Firestore rejects a transaction that reads
    // after it has written, and fails it at runtime rather than at compile time.
    await runTransaction(db, async (tx) => {
      const [goalSnap, walletSnap] = await Promise.all([tx.get(goalRef), tx.get(walletRef)]);
      const goal = goalSnap.data() as any;
      if (!goal) throw new Error('That goal no longer exists.');
      if (goal.status === 'CLOSED' || goal.status === 'CANCELLED') {
        throw new Error('This goal is closed, so it cannot take money.');
      }
      if (goal.ownerUid !== user.uid && !(goal.participantIds || []).includes(user.uid)) {
        throw new Error('You are not part of this goal.');
      }
      if (!walletSnap.exists()) throw new Error('You do not have a wallet to save from yet.');

      tx.update(walletRef, { balanceMinor: increment(-amount), updatedAt: now, updatedBy: user.uid });
      tx.update(goalRef, {
        savedMinor: increment(amount),
        lastTxnId: txnRef.id,
        updatedAt: now,
      });
      tx.set(txnRef, {
        goalId,
        householdId,
        actorUid: user.uid,
        amountMinor: amount,
        type: 'MANUAL_CONTRIBUTION',
        sourceExpenseId: null,
        note: note || null,
        at: now,
      });
    });
    void logActivity('GOAL_FUNDED', `Saved towards a goal`, amount, goalId);
  };

  /**
   * Banks the spare change from an expense.
   *
   * Only the payer's wallet, and only what they paid themselves: rounding up the
   * total of a shared dinner into one person's savings would take money from
   * people who were never charged in the first place.
   */
  const applyRoundUp = async (expenseId: string, baseAmountMinor: number) => {
    if (!householdId) return 0;
    const user = requireUser();
    // Falls back to the defaults rather than treating "not loaded yet" as
    // "turned off". The two are indistinguishable from here, and the second one
    // silently swallows the spare change.
    const settings = goalSettings ?? EMPTY_GOAL_SETTINGS;
    if (!settings.roundUpEnabled) return 0;
    const roundTo = settings.roundUpCustomMinor || settings.roundUpToMinor || 0;
    if (roundTo <= 0) return 0;

    const spare = nextRoundUp(baseAmountMinor, roundTo);
    if (spare <= 0) return 0;

    const targets = goals.filter((g: any) => g.status === 'ACTIVE' && !reached(g));
    if (targets.length === 0) return 0;
    const chosen = settings.roundUpGoalId
      ? targets.filter((g: any) => g.id === settings.roundUpGoalId)
      : targets;
    const pool = chosen.length > 0 ? chosen : targets;

    // Weights are a share, not a trusted percentage: normalised below, so 30/70
    // and 3/7 mean the same thing.
    const weights: Record<string, number> =
      pool.length > 1 && Object.keys(settings.roundUpWeights || {}).length > 0
        ? settings.roundUpWeights
        : Object.fromEntries(pool.map((g: any) => [g.id, 1]));
    const totalWeight = pool.reduce((sum: number, g: any) => sum + Math.max(1, weights[g.id] || 1), 0);

    let allocated = 0;
    const parts = pool.map((goal: any, index: number) => {
      // The last goal takes the remainder, so a split never leaves paise behind.
      const share =
        index === pool.length - 1
          ? spare - allocated
          : Math.trunc((spare * Math.max(1, weights[goal.id] || 1)) / totalWeight) || 0;
      allocated += share;
      return { goalId: goal.id, share };
    }).filter((p: any) => p.share > 0);

    if (parts.length === 0) return 0;

    const walletRef = doc(db, 'households', householdId, 'wallets', user.uid);
    const now = Date.now();
    const txnRefs = parts.map((p: any) => doc(collection(doc(db, 'households', householdId, 'goals', p.goalId), 'goalTxns')));

    await runTransaction(db, async (tx) => {
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists()) return;
      tx.update(walletRef, { balanceMinor: increment(-spare), updatedAt: now, updatedBy: user.uid });
      parts.forEach((p: any, index: number) => {
        tx.update(doc(db, 'households', householdId, 'goals', p.goalId), {
          savedMinor: increment(p.share),
          lastTxnId: txnRefs[index].id,
          updatedAt: now,
          lastAutoRunEpochDay: Math.floor(now / 86400000),
        });
        tx.set(txnRefs[index], {
          goalId: p.goalId,
          householdId,
          actorUid: user.uid,
          amountMinor: p.share,
          type: 'ROUND_UP',
          sourceExpenseId: expenseId,
          note: 'Spare change from an expense',
          at: now,
        });
      });
    });
    return spare;
  };

  /**
   * Asks to spend from a shared goal. No money moves here: it waits for everybody.
   *
   * `requiredCount` excludes the asker, who cannot approve their own request.
   */
  const requestGoalSpending = async (
    goalId: string,
    amountMinor: number,
    reason: string,
    participantIds: string[],
    note?: string | null,
  ) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const amount = Math.trunc(Number(amountMinor) || 0);
    if (amount <= 0) throw new Error('Enter an amount greater than zero.');
    const everyone = Array.from(new Set(participantIds || [])).filter(Boolean);
    if (everyone.length < 2) {
      throw new Error('A shared goal needs more than one person to approve spending.');
    }

    const requestRef = doc(collection(doc(db, 'households', householdId, 'goals', goalId), 'goalSpendRequests'));
    const now = Date.now();
    const batch = writeBatch(db);
    batch.set(requestRef, {
      goalId,
      householdId,
      requestedByUid: user.uid,
      requestedByName: profile?.displayName || 'Someone',
      amountMinor: amount,
      reason: String(reason || '').trim(),
      note: note || null,
      status: 'PENDING',
      participantIds: everyone,
      requiredCount: everyone.length - 1,
      approvedCount: 0,
      rejectedCount: 0,
      createdAt: now,
      releasedAt: null,
      resolvedAt: null,
    });
    // An explicit "has not voted" document per person, so the screen can show who
    // is holding it up without inferring from a missing row.
    everyone.forEach((uid: string) => {
      batch.set(doc(collection(requestRef, 'approvals'), uid), {
        goalId,
        uid,
        displayName: uid,
        state: 'PENDING',
        decidedAt: null,
      });
    });
    await batch.commit();
    return requestRef.id;
  };

  /**
   * Answers a request. The money moves only if this was the last vote.
   *
   * The rules own the arithmetic -- they require the tally to move by exactly one
   * and to match this participant's own vote document -- so this does not
   * recompute unanimity, it casts the vote and lets the rules accept or refuse
   * the resulting tally. Two people tapping at once cannot both release it,
   * because `releasedAt` is checked inside the transaction.
   */
  const answerGoalSpending = async (goalId: string, requestId: string, approve: boolean) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const requestRef = doc(
      collection(doc(db, 'households', householdId, 'goals', goalId), 'goalSpendRequests'),
      requestId,
    );
    const voteRef = doc(collection(requestRef, 'approvals'), user.uid);
    const goalRef = doc(db, 'households', householdId, 'goals', goalId);
    const txnRef = doc(collection(goalRef, 'goalTxns'));
    const now = Date.now();
    const state = approve ? 'APPROVED' : 'REJECTED';

    await runTransaction(db, async (tx) => {
      const [reqSnap, goalSnap] = await Promise.all([tx.get(requestRef), tx.get(goalRef)]);
      const req = reqSnap.data() as any;
      const goal = goalSnap.data() as any;
      if (!req) throw new Error('That request no longer exists.');
      if (req.status !== 'PENDING') throw new Error('This request has already been answered.');
      const participants: string[] = req.participantIds || [];
      if (participants.length < 2) {
        throw new Error('A shared goal needs more than one person to approve spending.');
      }
      if (req.requestedByUid === user.uid) {
        throw new Error('You asked for this one, so somebody else has to approve it.');
      }
      if (!participants.includes(user.uid)) throw new Error('You are not part of this goal.');

      const savedMinor = Number(goal?.savedMinor) || 0;
      const oldApproved = Math.trunc(Number(req.approvedCount) || 0);
      const oldRejected = Math.trunc(Number(req.rejectedCount) || 0);
      const required = Math.trunc(Number(req.requiredCount) || 0) || participants.length - 1;

      const newApproved = oldApproved + (approve ? 1 : 0);
      const newRejected = oldRejected + (approve ? 0 : 1);
      const release = newRejected > 0;
      const unanimous = !release && newApproved >= required;

      const patch: Record<string, any> = { approvedCount: newApproved, rejectedCount: newRejected };
      if (release || unanimous) {
        patch.status = release ? 'REJECTED' : 'APPROVED';
        patch.resolvedAt = now;
      }
      if (!release && unanimous && req.releasedAt == null) {
        const amount = Math.trunc(Number(req.amountMinor) || 0);
        if (amount > savedMinor) throw new Error('This goal no longer has that much in it.');
        patch.releasedAt = now;
        tx.update(goalRef, { savedMinor: increment(-amount), lastTxnId: txnRef.id, updatedAt: now });
        tx.set(txnRef, {
          goalId,
          householdId,
          actorUid: user.uid,
          amountMinor: -amount,
          type: 'WITHDRAWAL',
          sourceExpenseId: null,
          note: req.reason || null,
          at: now,
        });
      }
      tx.set(voteRef, { goalId, uid: user.uid, displayName: user.uid, state, decidedAt: now });
      tx.update(requestRef, patch);
    });
  };

  const saveGoalSettings = async (settings: Partial<GoalSettings>) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const payload = { ...(goalSettings ?? EMPTY_GOAL_SETTINGS), ...settings, uid: user.uid };
    await setDoc(doc(db, 'households', householdId, 'goalSettings', user.uid), payload, { merge: true });
  };

  /**
   * The audit trail is best-effort.
   *
   * Refusing to record an expense because a log line failed would be a much
   * worse outcome than a missing log line, so a rejection here is swallowed.
   */
  const logActivity = async (
    kind: string,
    summary: string,
    amountMinor?: number,
    targetId?: string,
  ) => {
    if (!householdId) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      await addDoc(collection(db, 'households', householdId, 'activity'), {
        householdId,
        kind,
        actorUid: user.uid,
        actorName: displayName || (user?.email || '').split('@')[0] || 'Someone',
        summary,
        amountMinor: amountMinor ?? null,
        targetId: targetId ?? null,
        at: Date.now(),
      });
    } catch (err) {
      console.error('Activity log failed:', err);
    }
  };

  const refreshData = () => {
    if (householdId) subscribe(householdId);
  };

  return (
    <HouseholdContext.Provider
      value={{
        householdId,
        household,
        members,
        categories,
        expenses,
        settlements,
        goals,
    goalSettings: goalSettings ?? EMPTY_GOAL_SETTINGS,
        wallets,
        walletTxns,
        limits,
        walletRequests,
        offline,
        requestMoney,
        decideRequest,
        setLimit,
        activity,
        loading,
        error,
        creditWallet,
        transferWallet,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        addCategory,
        updateCategory,
        deleteCategory,
        addExpense,
        updateExpense,
        deleteExpense,
        addSettlement,
        createGoal,
        contributeToGoal,
        applyRoundUp,
        requestGoalSpending,
        answerGoalSpending,
        saveGoalSettings,
        logActivity,
        refreshData,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}