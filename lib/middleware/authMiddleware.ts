import { getAuthToken, getUserRole } from '@/lib/services/shared';

export function checkAuth() {
  const role = getUserRole();
  return {
    isAuthenticated: !!role,
    role,
  };
}

export function checkRole(requiredRoles: string[]): boolean {
  const role = getUserRole();
  return role ? requiredRoles.includes(role) : false;
}
