import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { getFirestoreInstance } from '../services/firebase';
import {
  Household,
  Member,
  Category,
  Expense,
  Settlement,
  TopUp,
  ActivityEntry,
  MemberRole,
  CategoryFormData,
} from '../types';

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
  addCategory: (data: any) => Promise<string>;
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

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
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

  const db = window.__FB?.db;

  useEffect(() => {
    // Load household from localStorage or profile
    const savedId = localStorage.getItem('expence_household_id');
    if (savedId) {
      setHouseholdId(savedId);
      loadHouseholdData(savedId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadHouseholdData = async (hid: string) => {
    if (!db) return;
    try {
      setLoading(true);
      setHouseholdId(hid);
      localStorage.setItem('expence_household_id', hid);

      // Load household
      const householdSnap = await getDoc(doc(window.__FB?.db, 'households', hid));
      if (householdSnap.exists()) {
        setHousehold({ id: householdSnap.id, ...householdSnap.data() });
      }

      // Subscribe to real-time updates
      const unsubMembers = onSnapshot(
        query(collection(window.__FB?.db, 'households', hid, 'members'), orderBy('joinedAt')),
        (snapshot) => {
          setMembers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      );

      const unsubCategories = onSnapshot(
        query(collection(window.__FB?.db, 'households', hid, 'categories'), orderBy('order')),
        (snapshot) => {
          setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      );

      const unsubExpenses = onSnapshot(
        query(
          collection(window.__FB?.db, 'households', hid, 'expenses'),
          orderBy('dateEpochDay', 'desc'),
          limit(500)
        ),
        (snapshot) => {
          setExpenses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      );

      const unsubSettlements = onSnapshot(
        query(
          collection(window.__FB?.db, 'households', hid, 'settlements'),
          orderBy('dateEpochDay', 'desc'),
          limit(200)
        ),
        (snapshot) => {
          setSettlements(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      );

      const unsubTopups = onSnapshot(
        query(
          collection(window.__FB?.db, 'households', hid, 'topups'),
          orderBy('dateEpochDay', 'desc'),
          limit(100)
        ),
        (snapshot) => {
          setTopups(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      );

      const unsubActivity = onSnapshot(
        query(
          collection(window.__FB?.db, 'households', hid, 'activity'),
          orderBy('at', 'desc'),
          limit(60)
        ),
        (snapshot) => {
          setActivity(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      );

      setLoading(false);

      return () => {
        unsubMembers();
        unsubCategories();
        unsubExpenses();
        unsubSettlements();
        unsubTopups();
        unsubActivity();
      };
    } catch (error) {
      console.error('Error loading household:', error);
      setError('Failed to load household data');
      setLoading(false);
    }
  };

  const createHousehold = async (name: string, baseCurrency: string): Promise<string> => {
    const auth = window.__FB?.auth;
    const user = window.__FB?.auth?.currentUser;
    if (!user) throw new Error('Not authenticated');

    const hid = crypto.randomUUID();
    const code = generateInviteCode();
    const now = Date.now();

    const batch = writeBatch(window.__FB?.db);

    batch.set(doc(window.__FB?.db, 'households', hid), {
      name,
      baseCurrency,
      ownerUid: user.uid,
      inviteCode: code,
      monthlyBudgetMinor: 0,
    });

    batch.set(doc(window.__FB?.db, `households/${hid}/members/${user.uid}`), {
      displayName: window.__FB?.profile?.displayName || user.displayName || 'User',
      email: user.email,
      photoURL: null,
      role: 'OWNER',
      joinedAt: now,
      defaultWeight: 1,
      monthlyBudgetMinor: 0,
      inviteCode: null,
    });

    batch.set(doc(window.__FB?.db, 'invites', code), {
      householdId: hid,
      householdName: name,
      active: true,
      createdBy: user.uid,
    });

    batch.update(doc(window.__FB?.db, 'users', user.uid), {
      householdIds: [hid],
    });

    await batch.commit();

    setHouseholdId(hid);
    localStorage.setItem('expence_household_id', hid);
    loadHouseholdData(hid);

    return hid;
  };

  const joinHousehold = async (code: string) => {
    const user = window.__FB?.auth?.currentUser;
    if (!user) throw new Error('Not authenticated');

    const inv = await getDoc(doc(window.__FB?.db, 'invites', code.toUpperCase()));
    if (!inv.exists() || !inv.data().active) {
      throw new Error('Invalid or expired invite code');
    }

    const hid = inv.data().householdId;
    const now = Date.now();

    const batch = writeBatch(window.__FB?.db);
    batch.set(doc(window.__FB?.db, `households/${hid}/members/${user.uid}`), {
      displayName: window.__FB?.profile?.displayName || user.displayName || 'User',
      email: user.email,
      photoURL: null,
      role: 'MEMBER',
      joinedAt: now,
      defaultWeight: 1,
      monthlyBudgetMinor: 0,
      inviteCode: code,
    });

    batch.update(doc(window.__FB?.db, 'invites', code), { active: false });
    batch.update(doc(window.__FB?.db, 'users', user.uid), {
      householdIds: [hid],
    });

    await batch.commit();

    setHouseholdId(hid);
    localStorage.setItem('expence_household_id', hid);
    loadHouseholdData(hid);
  };

  const leaveHousehold = async () => {
    if (!householdId) return;
    const user = window.__FB?.auth?.currentUser;
    if (!user) return;

    await updateDoc(doc(window.__FB?.db, `households/${householdId}/members/${user.uid}`), {
      role: 'MEMBER_LEFT',
    });
    await updateDoc(doc(window.__FB?.db, 'users', user.uid), {
      householdIds: [],
    });

    setHouseholdId(null);
    localStorage.removeItem('expence_household_id');
    setHousehold(null);
    setMembers([]);
    setCategories([]);
    setExpenses([]);
    setSettlements([]);
    setTopups([]);
    setActivity([]);
  };

  const addCategory = async (data: CategoryFormData) => {
    if (!householdId) throw new Error('No household');
    const ref = await addDoc(collection(window.__FB?.db, `households/${householdId}/categories`), {
      ...data,
      householdId,
      order: categories.length,
    });
    return ref.id;
  };

  const updateCategory = async (id: string, data: any) => {
    if (!householdId) throw new Error('No household');
    await updateDoc(doc(window.__FB?.db, `households/${householdId}/categories`, id), data);
  };

  const deleteCategory = async (id: string) => {
    if (!householdId) throw new Error('No household');
    await updateDoc(doc(window.__FB?.db, `households/${householdId}/categories`, id), {
      deletedAt: Date.now(),
    });
  };

  const addExpense = async (expenseData: any) => {
    if (!householdId) throw new Error('No household');
    const ref = await addDoc(collection(window.__FB?.db, `households/${householdId}/expenses`), {
      ...expenseData,
      householdId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      deletedAt: null,
    });
    await logActivity('EXPENSE_ADDED', `Added expense: ${expenseData.description}`, expenseData.baseAmountMinor);
    return ref.id;
  };

  const updateExpense = async (id: string, data: any) => {
    if (!householdId) throw new Error('No household');
    await updateDoc(doc(window.__FB?.db, `households/${householdId}/expenses`, id), {
      ...data,
      updatedAt: Date.now(),
    });
  };

  const deleteExpense = async (id: string) => {
    if (!householdId) throw new Error('No household');
    await updateDoc(doc(window.__FB?.db, `households/${householdId}/expenses`, id), {
      deletedAt: Date.now(),
    });
  };

  const addSettlement = async (data: any) => {
    if (!householdId) throw new Error('No household');
    const ref = await addDoc(collection(window.__FB?.db, `households/${householdId}/settlements`), {
      ...data,
      householdId,
      createdAt: Date.now(),
      createdBy: window.__FB?.auth?.currentUser?.uid,
      deletedAt: null,
    });
    await logActivity('SETTLEMENT_ADDED', 'Recorded a settlement', data.baseAmountMinor);
    return ref.id;
  };

  const addTopup = async (data: any) => {
    if (!householdId) throw new Error('No household');
    const ref = await addDoc(collection(window.__FB?.db, `households/${householdId}/topups`), {
      ...data,
      householdId,
      createdAt: Date.now(),
      createdBy: window.__FB?.auth?.currentUser?.uid,
    });
    await logActivity('TOPUP_ADDED', 'Added to family pot', data.baseAmountMinor);
    return ref.id;
  };

  const logActivity = async (kind: string, summary: string, amountMinor?: number, targetId?: string) => {
    if (!householdId) return;
    await addDoc(collection(window.__FB?.db, `households/${householdId}/activity`), {
      householdId,
      kind,
      actorUid: window.__FB?.auth?.currentUser?.uid,
      actorName: window.__FB?.profile?.displayName || 'Unknown',
      summary,
      amountMinor: amountMinor || null,
      targetId: targetId || null,
      at: Date.now(),
    });
  };

  const refreshData = () => {
    if (householdId) loadHouseholdData(householdId);
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 32).toString(32).toUpperCase();
    return s;
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