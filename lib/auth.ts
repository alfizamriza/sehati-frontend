import api from './api';

type ProfileResponse = any;

const TOKEN_KEY = 'auth_token';
const TOKEN_TS_KEY = 'auth_token_ts';
const PROFILE_KEY = 'auth_profile';
const PROFILE_TS_KEY = 'auth_profile_ts';
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 jam
const PROFILE_TTL_MS = 60 * 60 * 1000; // 1 jam
let inMemoryProfile: any | null = null;
let profileRequestPromise: Promise<ProfileResponse> | null = null;

export const authService = {
  async getProfile(): Promise<ProfileResponse> {
    try {
      const res = await api.get('/auth/profile');
      return res.data as ProfileResponse;
    } catch (error) {
      console.error('getProfile error:', error);
      // Don't throw 401 errors - let caller handle it with fallback
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
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    const tsRaw = localStorage.getItem(TOKEN_TS_KEY);
    const ts = tsRaw ? Number(tsRaw) : 0;
    if (token && !ts) {
      localStorage.setItem(TOKEN_TS_KEY, String(Date.now()));
      return token;
    }
    const now = Date.now();
    if (token && ts && now - ts > SESSION_TTL_MS) {
      this.removeToken();
      return null;
    }
    return token;
  },

  setToken(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_TS_KEY, String(Date.now()));
  },

  removeToken() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_TS_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROFILE_TS_KEY);
    inMemoryProfile = null;
    profileRequestPromise = null;
  },

  async saveProfile(profile: any) {
    if (typeof window === 'undefined') return;
    try {
      inMemoryProfile = profile;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(PROFILE_TS_KEY, String(Date.now()));
    } catch (e) {
      // ignore
    }
  },

  getCachedProfile(): any | null {
    if (typeof window === 'undefined') return null;
    if (inMemoryProfile) return inMemoryProfile;
    const s = localStorage.getItem(PROFILE_KEY);
    const tsRaw = localStorage.getItem(PROFILE_TS_KEY);
    const ts = tsRaw ? Number(tsRaw) : 0;
    if (!s) return null;
    if (!ts) {
      localStorage.setItem(PROFILE_TS_KEY, String(Date.now()));
      try {
        inMemoryProfile = JSON.parse(s);
        return inMemoryProfile;
      } catch {
        return null;
      }
    }
    if (Date.now() - ts > PROFILE_TTL_MS) {
      this.removeToken();
      return null;
    }
    try {
      inMemoryProfile = JSON.parse(s);
      return inMemoryProfile;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  logout() {
    this.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  },
};

export default authService;
