import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || "AIzaSyBr3jEmFnTn9-go8qmDDtx5-sA381E4Vhc",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "expence-rvs.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "expence-rvs",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "expence-rvs.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "654418160294",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || "1:654418160294:web:fbcc1fd2e537534b63a267",
};

let app: FirebaseApp;
let _auth: Auth;
let _db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getAuthInstance(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

export function getFirestoreInstance(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
  }
  return _db;
}

export const auth = getAuthInstance();
export const db = getFirestoreInstance();