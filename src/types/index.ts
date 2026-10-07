export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  displayCurrency: string;
  householdIds: string[];
  profileCompleted: boolean;
  countryIso?: string | null;
  dateOfBirth?: string | null;
  mobile?: string | null;
  mobileCountryIso?: string | null;
  avatarPath?: string | null;
  themeMode?: 'light' | 'dark' | 'system';
  darkIntensity?: number;
}

/**
 * The wire name of a role. Persisted so the security rules can compare it
 * against the literal string, and kept in one place so an enum round trip
 * cannot drift between the two clients.
 */
export type MemberRole = 'OWNER' | 'MEMBER' | 'MEMBER_LEFT';

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  isSystem?: boolean;
  monthlyBudgetMinor: number;
}

export interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: number;
  defaultWeight: number;
  monthlyBudgetMinor: number;
  inviteCode?: string;
}

export interface Category {
  id: string;
  householdId: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  isSystem: boolean;
  monthlyBudgetMinor: number;
}

export interface Expense {
  id: string;
  householdId: string;
  description: string;
  notes?: string;
  amountMinor: number;
  currency: string;
  fxRate: number;
  baseAmountMinor: number;
  paidBy: string;
  createdBy: string;
  splitMode: 'EQUAL' | 'PERCENT' | 'WEIGHT' | 'EXACT';
  splits: Record<string, number>;
  participantIds: string[];
  splitTotalMinor: number;
  categoryId: string;
  dateEpochDay: number;
  createdAt: number;
  updatedAt: number;
  version: number;
  receiptPath?: string;
  merchant?: string;
  recurringId?: string;
  sequence?: number;
  deletedAt?: number;
}

export interface Settlement {
  id: string;
  householdId: string;
  fromUid: string;
  toUid: string;
  baseAmountMinor: number;
  currency: string;
  method: 'CASH' | 'UPI' | 'BANK' | 'OTHER';
  note?: string;
  dateEpochDay: number;
  createdAt: number;
  createdBy: string;
  deletedAt?: number;
}

export interface TopUp {
  id: string;
  householdId: string;
  contributions: Record<string, number>;
  baseAmountMinor: number;
  currencyCode: string;
  note?: string;
  dateEpochDay: number;
  createdAt: number;
  createdBy: string;
}

export interface ActivityEntry {
  id: string;
  householdId: string;
  kind: ActivityKind;
  actorUid: string;
  actorName: string;
  summary: string;
  amountMinor?: number;
  targetId?: string;
  at: number;
}

export type ActivityKind = 
  | 'EXPENSE_ADDED' 
  | 'EXPENSE_EDITED' 
  | 'EXPENSE_DELETED' 
  | 'SETTLEMENT_ADDED' 
  | 'MEMBER_JOINED' 
  | 'MEMBER_LEFT' 
  | 'MEMBER_REMOVED' 
  | 'SETTINGS_CHANGED' 
  | 'CATEGORY_CHANGED' 
  | 'RECURRING_ADDED' 
  | 'RECURRING_PAUSED' 
  | 'RECURRING_RESUMED' 
  | 'RECURRING_DELETED';

export interface Household {
  id: string;
  name: string;
  baseCurrency: string;
  ownerUid: string;
  inviteCode: string;
  monthlyBudgetMinor: number;
}

export interface TopUpRepository {
  id: string;
  contributions: Record<string, number>;
  baseAmountMinor: number;
  currencyCode: string;
  note?: string;
  dateEpochDay: number;
  createdAt: number;
  createdBy: string;
}

export interface TopUpState {
  topups: TopUp[];
  loading: boolean;
  error: string | null;
}

export interface HouseholdState {
  household: Household | null;
  members: Member[];
  categories: Category[];
  expenses: Expense[];
  settlements: Settlement[];
  topups: TopUp[];
  activity: ActivityEntry[];
  loading: boolean;
  error: string | null;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  themeMode: ThemeMode;
  darkIntensity: number;
  appLockEnabled: boolean;
  appLockPin?: string;
}