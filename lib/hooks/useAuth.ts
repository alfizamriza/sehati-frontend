'use client';

import { useState } from 'react';
import { getAuthToken, getUserRole } from '@/lib/services/shared';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  role: string | null;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [authState] = useState<AuthState>(() => {
    const role = getUserRole();

    return {
      isAuthenticated: !!role,
      token: null,
      role,
      isLoading: false,
    };
  });

  return authState;
}
