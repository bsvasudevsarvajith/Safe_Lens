'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';
import { getCurrentUser, loginUser, logoutUser, registerUser, switchPersona } from '@/services/firebase/authService';
import { updateUserSelfProfile } from '@/services/firebase/firestoreService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, displayName: string, phoneNumber?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUserPersona: (role: UserRole) => Promise<void>;
  updateProfile: (updates: Pick<UserProfile, 'displayName' | 'phoneNumber' | 'photoURL' | 'emergencyContacts'>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch (err) {
      console.error('Failed to load current user:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const u = await loginUser(email, password);
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, displayName: string, phoneNumber?: string, password?: string) => {
    setLoading(true);
    try {
      const u = await registerUser(email, displayName, phoneNumber, password);
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const switchUserPersona = async (role: UserRole) => {
    setLoading(true);
    try {
      const u = await switchPersona(role);
      if (u) setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Pick<UserProfile, 'displayName' | 'phoneNumber' | 'photoURL' | 'emergencyContacts'>) => {
    if (!user) return;
    const updated = await updateUserSelfProfile(user.uid, updates);
    if (updated) {
      setUser(updated);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'safety_moderator' || user?.role === 'admin';
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isModerator,
        isAuthenticated,
        login,
        register,
        logout,
        switchUserPersona,
        updateProfile,
        refreshUser,
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
