import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { CategoryFormData } from '../types';

interface HouseholdContextType {
  householdId: string | null;
  household: any | null;
  members: any[];
  categories: any[];
  expenses: any[];
  settlements: any[];
  topups: any[];
  activity: any[];
  loading: boolean;
  error: string | null;
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
  addTopup: (data: any) => Promise<string>;
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
  const { profile } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [household, setHousehold] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
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
    setTopups([]);
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
    feed('topups', setTopups, orderBy('dateEpochDay', 'desc'), limit(100));
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

  const requireUser = () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');
    return user;
  };

  const uid = () => requireUser().uid;

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
      displayName: displayName || user.displayName || 'User',
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
      displayName: displayName || user.displayName || 'User',
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
      displayName: displayName || user.displayName || 'User',
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

  const addExpense = async (expenseData: any) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const payload = {
      ...expenseData,
      householdId,
      createdBy: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      deletedAt: null,
    };
    assertNoUndefined(payload, 'expense');
    const ref = await addDoc(collection(db, 'households', householdId, 'expenses'), payload);
    void logActivity('EXPENSE_ADDED', `Added ${expenseData.description}`, expenseData.baseAmountMinor, ref.id);
    return ref.id;
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

  const addTopup = async (data: any) => {
    if (!householdId) throw new Error('No household selected');
    const user = requireUser();
    const clean: Record<string, number> = {};
    let total = 0;
    Object.entries(data.contributions || {}).forEach(([uid, minor]) => {
      const value = Number(minor) || 0;
      if (value > 0) {
        clean[uid] = value;
        total += value;
      }
    });
    if (total === 0) throw new Error('Nobody contributed.');

    const payload = {
      ...data,
      contributions: clean,
      baseAmountMinor: total,
      householdId,
      createdAt: Date.now(),
      createdBy: user.uid,
    };
    assertNoUndefined(payload, 'topup');
    const ref = await addDoc(collection(db, 'households', householdId, 'topups'), payload);
    void logActivity('TOPUP_ADDED', 'Added to the family pot', total, ref.id);
    return ref.id;
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
        actorName: displayName || user.displayName || 'Someone',
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
        topups,
        activity,
        loading,
        error,
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
        addTopup,
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