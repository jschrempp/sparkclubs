import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from './api';
import { getToken, setToken, clearToken } from './tokenStore';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The access token is kept in memory only (never in localStorage/
    // sessionStorage) to reduce XSS exposure, so it does not survive a full
    // page reload. If one is already present (e.g. hot reload during dev),
    // validate it; otherwise the user simply needs to log in again.
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

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
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
