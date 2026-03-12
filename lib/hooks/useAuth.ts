'use client';

import { useEffect, useState } from 'react';
import { isAuthenticated, getAuthToken, getUserRole } from '@/lib/services/shared';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  role: string | null;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    role: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = getAuthToken();
    const role = getUserRole();

    setAuthState({
      isAuthenticated: !!token,
      token,
      role,
      isLoading: false,
    });
  }, []);

  return authState;
}
