'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parseJwt, isTokenExpired, getLocalStorage, clearAuthTokens } from '@/lib/utils';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string;
  checkAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

  const checkAuthStatus = (): void => {
    const token = getLocalStorage('token');
    if (!token) {
      setIsAuthenticated(false);
      setUsername('');
      return;
    }

    try {
      if (isTokenExpired(token)) {
        clearAuthTokens();
        setIsAuthenticated(false);
        setUsername('');
      } else {
        const payload = parseJwt(token);
        setIsAuthenticated(true);
        setUsername(payload.username || payload.sub || 'User');
      }
    } catch (e) {
      console.error('Auth check error:', e);
      clearAuthTokens();
      setIsAuthenticated(false);
      setUsername('');
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Optional: Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'refreshToken') {
        checkAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
