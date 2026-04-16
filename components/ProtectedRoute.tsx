"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    if (allowedRoles && allowedRoles.length > 0) {
      const roleFromStorage =
        typeof window !== "undefined" ? localStorage.getItem("auth_role") : null;
      const roleFromCookie = getCookie("auth_role");
      const cached = authService.getCachedProfile();
      const currentRole = roleFromStorage || roleFromCookie || cached?.role || null;

      if (!currentRole || !allowedRoles.includes(currentRole)) {
        router.replace('/unauthorized');
      }
    }
  }, [router, allowedRoles]);

  return <>{children}</>;
}
