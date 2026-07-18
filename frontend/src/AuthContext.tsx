import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { authAPI } from './api';
import { getToken, setToken, clearToken } from './tokenStore';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  zip_code: string;
  bio: string | null;
  user_type: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  club_creation_limit?: number;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isSiteAdmin: boolean;
  isMember: boolean;
  isPending: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      authAPI.me()
        .then(setUser)
        .catch(() => {
          clearToken();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData: User) => {
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isSuperAdmin: user?.user_type === 'super_admin',
    isSiteAdmin: user?.user_type === 'site_admin' || user?.user_type === 'super_admin',
    isMember: user?.user_type !== 'pending',
    isPending: user?.user_type === 'pending',
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};