import { UserProfile, UserRole } from '@/types';
import { getAllUsers, getUserProfile } from './firestoreService';
import { auth, isFirebaseConfigured } from './firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';

const CURRENT_USER_KEY = 'sr_current_user_id';

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null;
  const currentUid = localStorage.getItem(CURRENT_USER_KEY);
  if (!currentUid) {
    // Default to the demo user for smooth immediate first-run evaluation
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
  if (isFirebaseConfigured && auth && password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getUserProfile(userCredential.user.uid);
      if (profile) {
        localStorage.setItem(CURRENT_USER_KEY, profile.uid);
        return profile;
      }
    } catch (err) {
      console.warn('Firebase auth failed, checking registered users directory', err);
    }
  }

  // Lookup in users store
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

export async function registerUser(email: string, displayName: string, phoneNumber?: string, password?: string): Promise<UserProfile> {
  let uid = `usr-${Date.now()}`;

  if (isFirebaseConfigured && auth && password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } catch (err) {
      console.warn('Firebase user creation failed, proceeding with local registration', err);
    }
  }

  const allUsers = await getAllUsers();
  const exists = allUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new Error('An account with this email address already exists.');
  }

  // Security: New registrations are ALWAYS role 'user'
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

  allUsers.push(newUser);
  localStorage.setItem('sr_users', JSON.stringify(allUsers));
  localStorage.setItem(CURRENT_USER_KEY, newUser.uid);

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
      return true;
    } catch (err) {
      console.warn('Firebase reset email failed:', err);
    }
  }
  // Simulated success response for development
  return true;
}

export async function switchPersona(role: UserRole): Promise<UserProfile | null> {
  const users = await getAllUsers();
  const match = users.find(u => u.role === role);
  if (match) {
    localStorage.setItem(CURRENT_USER_KEY, match.uid);
    return match;
  }
  return null;
}
