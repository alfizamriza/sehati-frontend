import api from "@/lib/api";

/* =====================================================
    TYPES
===================================================== */
export type DashboardMode = "month"; // week dihapus

export type DayStatus = "hadir" | "pelanggaran" | "plastik" | "libur" | "izin" | "kosong";

export interface CalendarDay {
  date: string;
  label: string;
  dayName: string;
  status: DayStatus;
  isToday: boolean;
  isWeekend: boolean;
  hadir: boolean;
  pelanggaranCount: number;
  plastikCount: number;
  izin?: { tipe: string; catatan?: string | null } | null;
}

export interface ComplianceChartItem {
  name: string; date: string;
  plastic: number; compliance: number; isToday: boolean;
}

export interface RecentHistoryItem {
  title: string; date: string; amount: number;
  type: "plus" | "minus";
  category: "tumbler" | "pelanggaran" | "transaksi";
}

export interface LeaderboardItem {
  rank: number; nis: string; nama: string; kelas: string;
  streak: number; coins: number;
  medal: "gold" | "silver" | "bronze" | "none"; isMe: boolean; fotoUrl?: string | null;
}

export interface SiswaDashboard {
  profile: { nama: string; nis: string; kelas: string; coins: number; fotoUrl: string | null };
  streak: { current: number; isActiveToday: boolean; shouldShowFaded: boolean };
  ranking: { position: number; totalSiswa: number };
  pelanggaran: number;
  leaderboard: LeaderboardItem[];
  recentHistory: RecentHistoryItem[];
  complianceChart: ComplianceChartItem[];
  calendarDays: CalendarDay[];
}

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

/* =====================================================
    CACHING
    Cache key menyertakan year-month agar navigasi
    antar bulan tidak saling overwrite
===================================================== */
const CACHE_DURATION  = 5 * 60 * 1000;
const STALE_THRESHOLD = 60 * 1000;

// Key sekarang include year-month supaya tiap bulan cache terpisah
const CACHE_KEY = (m: DashboardMode, y?: number, mo?: number) =>
  `sehati_dash_${m}_${y ?? "cur"}_${mo ?? "cur"}`;
const TS_KEY = (m: DashboardMode, y?: number, mo?: number) =>
  `sehati_dash_ts_${m}_${y ?? "cur"}_${mo ?? "cur"}`;

const AUTH_KEYS_LOCALSTORAGE  = ["auth_token", "auth_user", "auth_profile", "user_data", "sehati_user"];
const AUTH_KEYS_SESSION       = ["sehati_auth", "current_user"];

interface CacheEntry { data: SiswaDashboard; timestamp: number }

// In-memory cache pakai key string
const memCache = new Map<string, CacheEntry>();

function isBrowser() { return typeof window !== "undefined"; }

function getStorageSafe(type: "local" | "session"): Storage | null {
  if (!isBrowser()) return null;
  try { return type === "local" ? localStorage : sessionStorage; }
  catch { return null; }
}

function getCacheFromStorage(
  mode: DashboardMode, year?: number, month?: number, storage?: Storage | null
): CacheEntry | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_KEY(mode, year, month));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.timestamp < CACHE_DURATION) return parsed;
  } catch {}
  return null;
}

export function isDashboardCached(mode: DashboardMode, year?: number, month?: number): boolean {
  const key = CACHE_KEY(mode, year, month);
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_DURATION) return true;
  return !!(
    getCacheFromStorage(mode, year, month, getStorageSafe("local")) ||
    getCacheFromStorage(mode, year, month, getStorageSafe("session"))
  );
}

function getCached(mode: DashboardMode, year?: number, month?: number): SiswaDashboard | null {
  if (!isBrowser()) return null;
  const key = CACHE_KEY(mode, year, month);
  const now = Date.now();
  const mem = memCache.get(key);
  if (mem && now - mem.timestamp < CACHE_DURATION) return mem.data;

  const localEntry = getCacheFromStorage(mode, year, month, getStorageSafe("local"));
  if (localEntry) { memCache.set(key, localEntry); return localEntry.data; }

  const sessionEntry = getCacheFromStorage(mode, year, month, getStorageSafe("session"));
  if (sessionEntry) { memCache.set(key, sessionEntry); return sessionEntry.data; }

  return null;
}

function setCached(mode: DashboardMode, data: SiswaDashboard, year?: number, month?: number): void {
  const key = CACHE_KEY(mode, year, month);
  const entry: CacheEntry = { data, timestamp: Date.now() };
  memCache.set(key, entry);
  [getStorageSafe("local"), getStorageSafe("session")].forEach((storage) => {
    if (!storage) return;
    try {
      storage.setItem(CACHE_KEY(mode, year, month), JSON.stringify(entry));
      storage.setItem(TS_KEY(mode, year, month), String(entry.timestamp));
    } catch {}
  });
}

export function clearDashboardCache(): void {
  memCache.clear();
  if (!isBrowser()) return;
  try {
    AUTH_KEYS_LOCALSTORAGE.forEach((k) => localStorage.removeItem(k));
    AUTH_KEYS_SESSION.forEach((k) => sessionStorage.removeItem(k));
    [localStorage, sessionStorage].forEach((storage) => {
      Object.keys(storage)
        .filter((k) => k.includes("sehati") || k.includes("auth") || k.includes("user"))
        .forEach((k) => storage.removeItem(k));
    });
  } catch {}
}

export function isCacheStale(mode: DashboardMode, year?: number, month?: number): boolean {
  if (!isBrowser()) return true;
  try {
    for (const storage of [getStorageSafe("local"), getStorageSafe("session")]) {
      if (!storage) continue;
      const ts = storage.getItem(TS_KEY(mode, year, month));
      if (ts) return Date.now() - Number(ts) > STALE_THRESHOLD;
    }
    return true;
  } catch { return true; }
}

/* =====================================================
    API CALL
    year & month optional — jika tidak dikirim, backend
    akan pakai bulan saat ini
===================================================== */
export async function getDashboardSiswa(
  mode: DashboardMode = "month",
  forceRefresh = false,
  year?: number,
  month?: number,
): Promise<SiswaDashboard> {
  if (!forceRefresh) {
    const cached = getCached(mode, year, month);
    if (cached) return cached;
  }

  const res = await api.get("/dashboard/siswa", {
    params: {
      mode,
      // Kirim year & month ke backend jika ada (navigasi bulan lain)
      ...(year !== undefined && month !== undefined ? { year, month } : {}),
    },
  });

  if (!res.data?.success) throw new Error("Gagal mengambil dashboard siswa");

  let payload: any = res.data;
  while (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    payload = (payload as ApiEnvelope).data;
  }

  const normalized: SiswaDashboard = {
    profile: {
      nama:   payload?.profile?.nama   ?? "-",
      nis:    payload?.profile?.nis    ?? "",
      kelas:  payload?.profile?.kelas  ?? "-",
      coins:  Number(payload?.profile?.coins ?? 0),
      fotoUrl:payload?.profile?.foto_url ?? null,
    },
    streak: {
      current:        Number(payload?.streak?.current ?? 0),
      isActiveToday:  Boolean(payload?.streak?.isActiveToday),
      shouldShowFaded:Boolean(payload?.streak?.shouldShowFaded),
    },
    ranking: {
      position:   Number(payload?.ranking?.position   ?? 0),
      totalSiswa: Number(payload?.ranking?.totalSiswa ?? 0),
    },
    pelanggaran:    Number(payload?.pelanggaran ?? 0),
    leaderboard: Array.isArray(payload?.leaderboard)
      ? payload.leaderboard.map((item: any) => ({
          rank: Number(item?.rank ?? 0),
          nis: item?.nis ?? "",
          nama: item?.nama ?? "-",
          kelas: item?.kelas ?? "-",
          streak: Number(item?.streak ?? 0),
          coins: Number(item?.coins ?? 0),
          medal: item?.medal ?? "none",
          isMe: Boolean(item?.isMe),
          fotoUrl: item?.foto_url ?? null,
        }))
      : [],
    recentHistory:  Array.isArray(payload?.recentHistory)  ? payload.recentHistory  : [],
    complianceChart:Array.isArray(payload?.complianceChart)? payload.complianceChart: [],
    calendarDays:   Array.isArray(payload?.calendarDays)   ? payload.calendarDays   : [],
  };

  setCached(mode, normalized, year, month);
  return normalized;
}
