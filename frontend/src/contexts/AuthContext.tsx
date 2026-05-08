'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'Director' | 'Teacher' | 'Parent' | 'Donor';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: UserRole | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

function persistToken(token: string) {
  localStorage.setItem('token', token);
  document.cookie = `token=${token}; path=/; SameSite=Lax`;
}

function clearPersistedToken() {
  localStorage.removeItem('token');
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function getUserIdFromToken(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as Record<string, unknown>;
    const id = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    return typeof id === 'string' && id.length > 0 ? id : '0';
  } catch {
    return '0';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
          setToken(token);
          document.cookie = `token=${token}; path=/; SameSite=Lax`;
        } catch {
          clearPersistedToken();
          localStorage.removeItem('user');
          setToken(null);
        }
      }
    } catch {
      // Ignore storage access issues (private mode/webview restrictions) and continue unauthenticated.
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    const isDemoEmail = email.startsWith('demo.') && email.endsWith('@adventurers.local');

    try {
      const res = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      if (!res.ok) {
        if (isDemoEmail) {
          // Demo account — fall through to mock login below
          throw new Error('__demo__');
        }
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Invalid email or password.');
      }

      const data = await res.json();
      const mappedUser: AuthUser = data.user ?? {
        id: getUserIdFromToken(data.token),
        name: data.name ?? 'User',
        email,
        role: (data.role ?? role) as UserRole,
      };

      persistToken(data.token);
      localStorage.setItem('user', JSON.stringify(mappedUser));
      setUser(mappedUser);
      setToken(data.token);
      router.push(`/${mappedUser.role.toLowerCase()}/dashboard`);
    } catch (err) {
      const isDemoFallback = err instanceof Error && err.message === '__demo__';
      const isNetworkError = err instanceof Error && err.name === 'AbortError';

      if (isDemoFallback || (isDemoEmail && isNetworkError)) {
        // Offline / demo mode — use mock login only for demo accounts
        const mockUser: AuthUser = { id: '1', name: 'Demo User', email, role };
        persistToken('mock-token');
        localStorage.setItem('user', JSON.stringify(mockUser));
        setUser(mockUser);
        setToken('mock-token');
        router.push(`/${role.toLowerCase()}/dashboard`);
        return;
      }

      // Re-throw for real users so the login page can display the error
      throw err;
    }
  };

  const logout = () => {
    clearPersistedToken();
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
