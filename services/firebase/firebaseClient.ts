import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

// Demo mode: no real authentication backend. Persona switching and password-less
// local login are ONLY allowed here. Never deploy publicly in demo mode.
export const isDemoMode = !isFirebaseConfigured;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Initialised in the browser AND on the server (API routes). On the server there is
// no signed-in user, so API routes only get what the rules allow the public.
if (isFirebaseConfigured) {
  try {
    const isNew = !getApps().length;
    app = isNew ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // Firestore rejects `undefined` field values; drop them instead of failing writes
    db = isNew ? initializeFirestore(app, { ignoreUndefinedProperties: true }) : getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('Firebase initialization error, operating in resilient offline/sandbox mode', err);
  }
}

export { app, auth, db, storage };
