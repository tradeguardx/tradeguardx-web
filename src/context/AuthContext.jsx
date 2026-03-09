import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tradeguardx_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((email, _password) => {
    const u = { email, plan: 'pro', name: email.split('@')[0] };
    setUser(u);
    localStorage.setItem('tradeguardx_user', JSON.stringify(u));
  }, []);

  const signup = useCallback((email, _password, name) => {
    const u = { email, name: name || email.split('@')[0], plan: 'pro' };
    setUser(u);
    localStorage.setItem('tradeguardx_user', JSON.stringify(u));
  }, []);

  const loginWithGoogle = useCallback(() => {
    const u = { email: "demo.google.com", plan: "pro", name: "Google User" };
    setUser(u);
    localStorage.setItem("tradeguardx_user", JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('tradeguardx_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
