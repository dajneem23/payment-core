import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
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

function parseJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const tokens = getStoredTokens();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<JwtPayload | null>(() => {
    if (tokens?.accessToken) {
      return parseJwt(tokens.accessToken);
    }
    return null;
  });

  const isAuthenticated = !!user;

  const login = useCallback(async (req: LoginRequest) => {
    setIsLoading(true);
    try {
      const tokens = await authApi.login(req);
      setStoredTokens(tokens);
      setUser(parseJwt(tokens.accessToken));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (req: RegisterRequest) => {
    setIsLoading(true);
    try {
      const tokens = await authApi.register(req);
      setStoredTokens(tokens);
      setUser(parseJwt(tokens.accessToken));
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
