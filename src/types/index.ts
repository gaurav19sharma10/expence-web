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
  | 'GOAL_CREATED'
  | 'GOAL_FUNDED'
  | 'GOAL_SPENT'
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

/**
 * What somebody is saving for.
 *
 * Replaces the family pot. A pot was one number everybody drew from and nobody
 * owned, so it could not say what the money was for, who was saving, or how close
 * anybody was.
 *
 * `participantIds` empty means **private**: nobody else may read it, and the
 * Firestore rules enforce that rather than a filter in this file. Two or more
 * means **shared**, visible to exactly those people.
 */
export interface Goal {
  id: string;
  householdId: string;
  name: string;
  emoji: string;
  category: string;
  targetMinor: number;
  targetDateEpochDay: number | null;
  participantIds: string[];
  ownerUid: string;
  savedMinor: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CLOSED' | 'CANCELLED';
  saveMode: 'MANUAL' | 'DAILY' | 'MONTHLY' | 'ROUND_UP';
  autoAmountMinor: number;
  autoDayOfMonth: number;
  lastAutoRunEpochDay: number | null;
  lastTxnId: string | null;
  currency: string;
  createdAt: number;
  updatedAt: number;
}

/** One movement of money. Append-only: this is the audit trail. */
export interface GoalTxn {
  id: string;
  goalId: string;
  householdId: string;
  actorUid: string;
  amountMinor: number;
  type: GoalTxnType;
  sourceExpenseId?: string | null;
  note?: string | null;
  at: number;
}

export type GoalTxnType =
  | 'MANUAL_CONTRIBUTION'
  | 'DAILY_CONTRIBUTION'
  | 'MONTHLY_CONTRIBUTION'
  | 'ROUND_UP'
  | 'WITHDRAWAL'
  | 'REFUND'
  | 'ADJUSTMENT';

/** One participant's answer to a withdrawal. Final: it cannot be edited. */
export interface SpendApproval {
  uid: string;
  displayName: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedAt: number | null;
}

/**
 * A request to spend money a group put in.
 *
 * `requiredCount` excludes the asker, who cannot approve their own request. The
 * vote documents are the truth; the counters are a cached summary for display.
 */
export interface GoalSpendRequest {
  id: string;
  goalId: string;
  householdId: string;
  requestedByUid: string;
  requestedByName: string;
  amountMinor: number;
  reason: string;
  note?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvals: SpendApproval[];
  requiredCount: number;
  approvedCount: number;
  rejectedCount: number;
  createdAt: number;
  resolvedAt: number | null;
  releasedAt: number | null;
}

/** Per-user automatic saving preferences. Private to that user. */
export interface GoalSettings {
  uid: string;
  roundUpEnabled: boolean;
  roundUpToMinor: number;
  roundUpCustomMinor: number | null;
  roundUpGoalId: string | null;
  roundUpWeights: Record<string, number>;
  dailyEnabled: boolean;
  dailyAmountMinor: number;
  dailyGoalId: string | null;
  monthlyEnabled: boolean;
  monthlyAmountMinor: number;
  monthlyDayOfMonth: number;
  monthlyGoalId: string | null;
}

export interface HouseholdState {
  household: Household | null;
  members: Member[];
  categories: Category[];
  expenses: Expense[];
  settlements: Settlement[];
  goals: Goal[];
  goalSettings: GoalSettings;
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