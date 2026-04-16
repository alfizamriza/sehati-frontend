'use client';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_ROLE_KEY = 'auth_role';
const AUTH_USER_KEY = 'auth_user';
const AUTH_PROFILE_KEY = 'auth_profile';
const LOCAL_STORAGE_KEYS = [AUTH_TOKEN_KEY, AUTH_ROLE_KEY, AUTH_USER_KEY, AUTH_PROFILE_KEY];
const SESSION_KEY_PATTERNS = ['sehati_', 'auth', 'user'];

export interface LoginRequest {
  role: string;
  identifier: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      nama?: string;
      username?: string;
      role: string;
      permissions?: string[];
    };
    redirectTo: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function setCookie(name: string, value: string, days: number = 7): void {
  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + days * 24 * 60 * 60 * 1000);

  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secure = isSecure ? 'Secure;' : '';

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expiryDate.toUTCString()}; ${secure} SameSite=Strict`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }

  return null;
}

function clearCookie(name: string): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secure = isSecure ? 'Secure;' : '';

  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; ${secure} SameSite=Strict`;
}

function syncRoleCookie(role: string | null): void {
  if (!role) {
    clearCookie(AUTH_ROLE_KEY);
    return;
  }

  setCookie(AUTH_ROLE_KEY, role, 7);
}

function clearSessionArtifacts(): void {
  if (typeof window === 'undefined') return;

  try {
    LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    [localStorage, sessionStorage].forEach((storage) => {
      Object.keys(storage)
        .filter((key) => SESSION_KEY_PATTERNS.some((pattern) => key.includes(pattern)))
        .forEach((key) => storage.removeItem(key));
    });
  } catch (error) {
    console.error('Error clearing session artifacts:', error);
  }
}

export async function loginUser(loginRequest: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(loginRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login gagal. Silakan coba lagi.');
    }

    const data: LoginResponse = await response.json();

    if (data.success && data.data.token) {
      if (typeof window !== 'undefined') {
        clearSessionArtifacts();
        localStorage.setItem(AUTH_ROLE_KEY, data.data.user.role);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data.user));
        localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(data.data.user));
        localStorage.setItem(AUTH_TOKEN_KEY, data.data.token);
        syncRoleCookie(data.data.user.role);
      }
    } else {
      throw new Error(data.message || 'Login gagal without token');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Login gagal. Silakan coba lagi.');
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return getCookie(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.error('Error getting auth token:', e);
    return null;
  }
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return getCookie(AUTH_ROLE_KEY) || localStorage.getItem(AUTH_ROLE_KEY);
  } catch (e) {
    console.error('Error getting user role:', e);
    return null;
  }
}

export function isAuthenticated(): boolean {
  try {
    return !!getAuthToken() || !!getUserRole();
  } catch (e) {
    console.error('Error checking authentication:', e);
    return false;
  }
}

export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    clearSessionArtifacts();
    clearCookie(AUTH_ROLE_KEY);

    setTimeout(() => {
      window.location.href = '/auth';
    }, 100);
  } catch (error) {
    console.error('Error during logout:', error);
    window.location.href = '/auth';
  }
}

export function getUser() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error('Error getting user:', e);
    return null;
  }
}

export function hasPermission(permission: string): boolean {
  try {
    const user = getUser();
    if (!user || user.role !== 'siswa') return false;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  } catch {
    return false;
  }
}
