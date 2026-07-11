import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import * as authApi from '../api/auth';
import { getStoredTokens, setStoredTokens } from '../api/client';
import type { LoginRequest, RegisterRequest, JwtPayload } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: JwtPayload | null;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const tokens = getStoredTokens();
  const [isLoading, setIsLoading] = useState(!!tokens?.accessToken);
  const [user, setUser] = useState<JwtPayload | null>(null);

  // On mount: if we have a stored token, verify it against the server
  useEffect(() => {
    const stored = getStoredTokens();
    if (!stored?.accessToken) {
      setIsLoading(false);
      return;
    }
    authApi.iam()
      .then((res) => {
        setUser({ sub: res.sub, role: res.role });
      })
      .catch(() => {
        // Token expired/revoked — clear stale state
        setStoredTokens(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const isAuthenticated = !!user;

  const login = useCallback(async (req: LoginRequest) => {
    setIsLoading(true);
    try {
      const newTokens = await authApi.login(req);
      setStoredTokens(newTokens);
      // Verify to get full user info
      const iam = await authApi.iam();
      setUser({ sub: iam.sub, role: iam.role });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (req: RegisterRequest) => {
    setIsLoading(true);
    try {
      const newTokens = await authApi.register(req);
      setStoredTokens(newTokens);
      const iam = await authApi.iam();
      setUser({ sub: iam.sub, role: iam.role });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Token may already be invalid — still clear local state
    }
    setStoredTokens(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
