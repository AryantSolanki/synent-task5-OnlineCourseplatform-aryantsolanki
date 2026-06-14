import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  /* Restore session on mount */
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('lms_token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await authApi.getMe();
      // Backend returns { success, user } from protect middleware
      setUser(data.user ?? data);
    } catch {
      localStorage.removeItem('lms_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('lms_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await authApi.register(formData);
    // Some backends return token immediately; others require email verify first
    if (data.token) {
      localStorage.setItem('lms_token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('lms_token');
    setUser(null);
  };

  const updateUser = (updates) =>
    setUser((prev) => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
