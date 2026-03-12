import { getAuthToken, getUserRole } from '@/lib/services/shared';

export function checkAuth() {
  const token = getAuthToken();
  return {
    isAuthenticated: !!token,
    token,
  };
}

export function checkRole(requiredRoles: string[]): boolean {
  const role = getUserRole();
  return role ? requiredRoles.includes(role) : false;
}
