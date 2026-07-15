import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthAPI, getToken, setSession, clearSession } from '../api/client';

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
      // AuthAPI.me() already retries once through a silent token
      // refresh if the access token has expired (see api/client.js) —
      // by the time this rejects, the session is genuinely gone.
      const profile = await AuthAPI.me();
      setUser({ ...profile, verified: profile?.verified_at != null });
    } catch {
      clearSession();
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
    setSession(data);
    await loadProfile();
    return data;
  }, [loadProfile]);

  const signup = useCallback(async (payload) => {
    const data = await AuthAPI.signup(payload);
    if (data?.access_token) {
      setSession(data);
      await loadProfile();
    }
    return data;
  }, [loadProfile]);

  const logout = useCallback(() => {
    clearSession();
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
