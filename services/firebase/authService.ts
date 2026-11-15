import { UserProfile, UserRole } from '@/types';
import { createUserProfile, getAllUsers, getUserProfile } from './firestoreService';
import { auth, isDemoMode, isFirebaseConfigured } from './firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';

// Demo mode only: id of the "signed-in" local user
const CURRENT_USER_KEY = 'sr_current_user_id';

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null;

  if (isFirebaseConfigured) {
    // The signed-in user comes from Firebase Auth (restored from its own session store)
    if (!auth) return null;
    await auth.authStateReady();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    const profile = await getUserProfile(firebaseUser.uid);
    if (!profile || profile.status === 'suspended') {
      await signOut(auth);
      return null;
    }
    return profile;
  }

  const currentUid = localStorage.getItem(CURRENT_USER_KEY);
  if (!currentUid) {
    // Demo only: default to the demo user for smooth immediate first-run evaluation
    const users = await getAllUsers();
    const defaultUser = users.find(u => u.role === 'user') || users[0];
    if (defaultUser) {
      localStorage.setItem(CURRENT_USER_KEY, defaultUser.uid);
      return defaultUser;
    }
    return null;
  }
  return getUserProfile(currentUid);
}

export async function loginUser(email: string, password?: string): Promise<UserProfile> {
  if (isFirebaseConfigured) {
    // Real auth configured: the password MUST be verified. No fallback.
    if (!auth || !password) throw new Error('Invalid email or password credentials.');
    let uid: string;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      uid = userCredential.user.uid;
    } catch {
      throw new Error('Invalid email or password credentials.');
    }
    const profile = await getUserProfile(uid);
    if (!profile) {
      await signOut(auth);
      throw new Error('No profile found for this account.');
    }
    if (profile.status === 'suspended') {
      await signOut(auth);
      throw new Error('Account suspended. Please contact administrator.');
    }
    return profile;
  }

  // Demo mode only: lookup in local users store (no password check)
  const allUsers = await getAllUsers();
  const match = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (match) {
    if (match.status === 'suspended') {
      throw new Error('Account suspended. Please contact administrator.');
    }
    localStorage.setItem(CURRENT_USER_KEY, match.uid);
    return match;
  }

  throw new Error('Invalid email or password credentials.');
}

const FIREBASE_REGISTER_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email address already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
};

export async function registerUser(email: string, displayName: string, phoneNumber?: string, password?: string): Promise<UserProfile> {
  let uid = `usr-${Date.now()}`;

  if (isFirebaseConfigured) {
    if (!auth || !password) throw new Error('A password is required to register.');
    // Firebase Auth itself rejects duplicate emails
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      throw new Error(FIREBASE_REGISTER_ERRORS[code] ?? 'Registration failed. Please try again.');
    }
  } else {
    // Demo mode: check the local store for duplicates
    const allUsers = await getAllUsers();
    if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email address already exists.');
    }
  }

  // Security: New registrations are ALWAYS role 'user' (also enforced by Firestore rules)
  const newUser: UserProfile = {
    uid,
    email,
    displayName,
    phoneNumber: phoneNumber || '',
    role: 'user', // Non-escalatable
    status: 'active',
    emergencyContacts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await createUserProfile(newUser);
  if (!isFirebaseConfigured) localStorage.setItem(CURRENT_USER_KEY, newUser.uid);

  return newUser;
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase signout error:', err);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  if (isFirebaseConfigured && auth) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      // Don't reveal whether the email exists
      console.warn('Firebase reset email failed:', err);
    }
    return true;
  }
  // Simulated success response for development
  return true;
}

export async function switchPersona(role: UserRole): Promise<UserProfile | null> {
  if (!isDemoMode) throw new Error('Persona switching is disabled when real authentication is configured.');
  const users = await getAllUsers();
  const match = users.find(u => u.role === role);
  if (match) {
    localStorage.setItem(CURRENT_USER_KEY, match.uid);
    return match;
  }
  return null;
}
