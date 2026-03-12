import api from './api';

type ProfileResponse = any;

const TOKEN_KEY = 'auth_token';
const PROFILE_KEY = 'auth_profile';
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
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    inMemoryProfile = null;
    profileRequestPromise = null;
  },

  async saveProfile(profile: any) {
    if (typeof window === 'undefined') return;
    try {
      inMemoryProfile = profile;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      // ignore
    }
  },

  getCachedProfile(): any | null {
    if (typeof window === 'undefined') return null;
    if (inMemoryProfile) return inMemoryProfile;
    const s = localStorage.getItem(PROFILE_KEY);
    if (!s) return null;
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
