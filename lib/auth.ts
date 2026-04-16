import api from './api';

type ProfileResponse = {
  success?: boolean;
  data?: {
    role?: string | null;
    nama?: string | null;
  } | null;
};

const TOKEN_KEY = 'auth_token';
const PROFILE_KEY = 'auth_profile';
const PROFILE_TS_KEY = 'auth_profile_ts';
const PROFILE_TTL_MS = 60 * 60 * 1000;
let inMemoryProfile: ProfileResponse["data"] | null = null;
let profileRequestPromise: Promise<ProfileResponse> | null = null;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export const authService = {
  async getProfile(): Promise<ProfileResponse> {
    try {
      const res = await api.get('/auth/profile');
      return res.data as ProfileResponse;
    } catch (error) {
      console.error('getProfile error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch profile');
    }
  },

  async getProfileOnce(forceRefresh = false): Promise<ProfileResponse> {
    if (!forceRefresh) {
      const cached = this.getCachedProfile();
      if (cached) {
        return { success: true, data: cached };
      }
      if (profileRequestPromise) {
        return profileRequestPromise;
      }
    }

    profileRequestPromise = this.getProfile()
      .then((res) => {
        if (res?.success && res?.data) {
          this.saveProfile(res.data).catch(() => undefined);
        }
        return res;
      })
      .finally(() => {
        profileRequestPromise = null;
      });

    return profileRequestPromise;
  },

  getToken(): string | null {
    return getCookie(TOKEN_KEY);
  },

  removeToken() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROFILE_TS_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
    document.cookie = `auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
    inMemoryProfile = null;
    profileRequestPromise = null;
  },

  async saveProfile(profile: ProfileResponse["data"]) {
    if (typeof window === 'undefined') return;
    try {
      inMemoryProfile = profile ?? null;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(PROFILE_TS_KEY, String(Date.now()));
    } catch {
      // ignore storage failures
    }
  },

  getCachedProfile(): ProfileResponse["data"] | null {
    if (typeof window === 'undefined') return null;
    if (inMemoryProfile) return inMemoryProfile;
    const serialized = localStorage.getItem(PROFILE_KEY);
    const tsRaw = localStorage.getItem(PROFILE_TS_KEY);
    const ts = tsRaw ? Number(tsRaw) : 0;

    if (!serialized) return null;

    if (ts && Date.now() - ts > PROFILE_TTL_MS) {
      this.removeToken();
      return null;
    }

    try {
      inMemoryProfile = JSON.parse(serialized);
      return inMemoryProfile;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken() || !!getCookie('auth_role');
  },

  logout() {
    this.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  },
};

export default authService;
