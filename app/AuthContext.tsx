'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface JwtPayload {
  username?: string;
  sub?: string;
  exp?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  username: string;
  checkAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

  const parseJwt = (token: string): JwtPayload => {
    try {
      const part = token.split('.')[1];
      return JSON.parse(atob(part));
    } catch (e) {
      return {};
    }
  };

  const checkAuthStatus = (): void => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setUsername('');
      return;
    }

    try {
      const payload = parseJwt(token);
      if (payload && payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUsername('');
      } else {
        setIsAuthenticated(true);
        setUsername(payload.username || payload.sub || 'User');
      }
    } catch (e) {
      console.error('Auth check error:', e);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
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
