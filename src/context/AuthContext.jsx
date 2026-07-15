import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthAPI, getToken, setToken, clearToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await AuthAPI.me();
      // /api/auth/me returns the raw users row (select "*"), so it has
      // verified_at (a timestamp or null) rather than a "verified" boolean.
      // Normalize it here once so every screen can just read user.verified.
      setUser({ ...profile, verified: profile?.verified_at != null });
    } catch {
      // token invalid/expired
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    const data = await AuthAPI.login({ email, password });
    if (data?.access_token) setToken(data.access_token);
    await loadProfile();
    return data;
  }, [loadProfile]);

  const signup = useCallback(async (payload) => {
    const data = await AuthAPI.signup(payload);
    if (data?.access_token) {
      setToken(data.access_token);
      await loadProfile();
    }
    return data;
  }, [loadProfile]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
