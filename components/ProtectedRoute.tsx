"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace('/auth');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const roleFromStorage =
        typeof window !== "undefined" ? localStorage.getItem("auth_role") : null;
      const cached = authService.getCachedProfile();
      const currentRole = roleFromStorage || cached?.role || null;

      if (!currentRole || !allowedRoles.includes(currentRole)) {
        router.replace('/unauthorized');
        return;
      }
    }
  }, [router, allowedRoles]);

  return <>{children}</>;
}
