'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiFetch, clearAccessToken, storeAccessToken } from './api-client';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse extends TokenPair {
  user: User;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const REFRESH_TOKEN_KEY = 'veridion_refresh_token';
const USER_KEY = 'veridion_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const storeSession = useCallback((tokens: TokenPair, nextUser: User) => {
    if (typeof window !== 'undefined') {
      storeAccessToken(tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      clearAccessToken();
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setUser(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;

    if (!refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const tokens = await apiFetch<TokenPair>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      storeAccessToken(tokens.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  // Restore session on mount
  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch {
        // Ignore malformed stored user
      }
    }
    void refreshAuth();
  }, [refreshAuth]);

  // Periodically refresh the token while authenticated
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(
      () => {
        void refreshAuth();
      },
      10 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [user, refreshAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      storeSession(response, response.user);
    },
    [storeSession],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const response = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      storeSession(response, response.user);
    },
    [storeSession],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout failures — clear the local session regardless
    }
    clearSession();
    router.push('/login');
  }, [clearSession, router]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshAuth,
    }),
    [user, isLoading, login, register, logout, refreshAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
