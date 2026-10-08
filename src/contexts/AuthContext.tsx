import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  clearIndexedDbPersistence,
  terminate,
} from 'firebase/firestore';
import { getAuthInstance, db } from '../services/firebase';
import { UserProfile } from '../types';

/**
 * The profile form asks for these, and the rules allowlist them on
 * `users/{uid}`. A field that is not on the list is a write the rules reject,
 * so they are declared here once rather than spelled out per screen.
 */
export interface ProfileInput {
  displayName?: string;
  displayCurrency?: string;
  countryIso?: string;
  dateOfBirth?: string | null;
  mobile?: string | null;
  mobileCountryIso?: string | null;
  profileCompleted?: boolean;
  avatarPath?: string | null;
  themeMode?: 'light' | 'dark' | 'system';
  darkIntensity?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: ProfileInput) => Promise<void>;
  saveProfile: (data: ProfileInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * A profile that is safe to render before the document has been read.
 *
 * The screen gates on `profileCompleted`, so a missing document has to read as
 * "not finished yet" rather than as undefined -- otherwise a brand new account
 * would fall through the gate and land on a home screen with no household
 * behind it.
 */
function profileFromUser(user: User): UserProfile {
  return {
    uid: user.uid,
    displayName: (user.email || '').split('@')[0] || 'You',
    email: user.email || '',
    displayCurrency: 'INR',
    householdIds: [],
    profileCompleted: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  /**
   * Reads `users/{uid}`.
   *
   * The uid is a parameter rather than read from state because the auth listener
   * fires the moment a user appears, before React has committed the state
   * update -- reading it from state here closed over the previous (null) value
   * and never loaded anything.
   */
  const loadProfile = useCallback(async (authUser: User) => {
    setProfileLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', authUser.uid));
      if (snap.exists()) {
        setProfile({ ...(snap.data() as UserProfile), uid: authUser.uid });
      } else {
        setProfile(profileFromUser(authUser));
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfile(profileFromUser(authUser));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuthInstance(), (authUser) => {
      if (authUser) {
        setUser(authUser);
        loadProfile(authUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getAuthInstance(), email.trim(), password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(getAuthInstance(), email.trim(), password);
  };

  const signOut = async () => {
    await firebaseSignOut(getAuthInstance());
    // Clear the local Firestore cache so the next person signed into this
    // browser inherits a cold, empty start instead of the previous account's
    // household. Best-effort: the account is signed out either way.
    // The Firestore instance cannot be used again once terminated, so clearing
    // the cache is a one-off. Cold-start afterwards: the signed-in screen asks
    // for an account, and the next account starts from an empty local store
    // rather than a cache of the previous one.
    try {
      await terminate(db);
      await clearIndexedDbPersistence(db);
    } catch {
      /* already terminated, or no persistence layer to clear */
    }
    window.location.reload();
  };

  /**
   * Merges into the existing document rather than replacing it.
   *
   * A `set` with only the fields on screen would be evaluated as an update and
   * diffed against what is stored, so any field it does not name would be
   * dropped -- including the household ids, which nothing on the profile form
   * knows about.
   */
  const updateProfile = async (data: ProfileInput) => {
    const authUser = getAuthInstance().currentUser;
    if (!authUser) throw new Error('Not signed in');
    setProfileLoading(true);
    try {
      await setDoc(doc(db, 'users', authUser.uid), data, { merge: true });
      setProfile((current) =>
        current ? { ...current, ...data } : profileFromUser(authUser),
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = updateProfile;

  const refreshProfile = async () => {
    const authUser = getAuthInstance().currentUser;
    if (authUser) await loadProfile(authUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        saveProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}