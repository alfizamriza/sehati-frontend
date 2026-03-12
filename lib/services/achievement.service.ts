import api from "@/lib/api";

/* =====================================================
    TYPES
===================================================== */
export interface Achievement {
  id: number;
  nama: string;
  deskripsi: string;
  tipe: "streak" | "coins" | "tumbler" | "pelanggaran" | "transaksi";
  targetValue: number;
  icon: string;
  badgeColor: string;
  coinsReward: number;
  isActive: boolean;
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: string;
  isDisplayed: boolean;
}

/* =====================================================
    CACHING
    - undisplayed: jangan di-cache (harus selalu fresh,
      karena popup hanya muncul sekali)
    - unlocked (profile page): cache 5 menit
===================================================== */
const CACHE_DURATION = 5 * 60 * 1000;
const UNLOCKED_CACHE_KEY = "sehati_achievements_unlocked";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getUnlockedCached(): UnlockedAchievement[] | null {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheEntry<UnlockedAchievement[]> = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_DURATION) return parsed.data;
  } catch {}
  return null;
}

function setUnlockedCached(data: UnlockedAchievement[]): void {
  try {
    sessionStorage.setItem(
      UNLOCKED_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
}

export function clearAchievementCache(): void {
  try {
    sessionStorage.removeItem(UNLOCKED_CACHE_KEY);
  } catch {}
}

/* =====================================================
    API CALLS
===================================================== */

/**
 * Ambil achievement yang belum ditampilkan popup.
 * Sengaja TIDAK di-cache — harus selalu fresh dari server.
 */
export async function getUndisplayedAchievements(): Promise<Achievement[]> {
  try {
    const res = await api.get("/achievement/undisplayed");
    if (!res.data?.success) return [];
    return res.data.data as Achievement[];
  } catch (error) {
    console.error("Gagal mengambil undisplayed achievements:", error);
    return [];
  }
}

/**
 * Mark achievement sebagai sudah ditampilkan ke user.
 * Dipanggil setelah user klik "Tutup" di popup.
 * Otomatis clear cache unlocked agar data profile ikut refresh.
 */
export async function markAchievementsAsDisplayed(
  achievementIds: number[]
): Promise<void> {
  if (achievementIds.length === 0) return;

  try {
    await api.post("/achievement/mark-displayed", { achievementIds });
    // Clear cache supaya halaman profile reload data terbaru
    clearAchievementCache();
  } catch (error) {
    console.error("Gagal mark achievements as displayed:", error);
  }
}

/**
 * Ambil semua achievement yang sudah di-unlock (untuk halaman profil).
 * Di-cache 5 menit. Gunakan forceRefresh=true untuk paksa fetch ulang.
 */
export async function getUnlockedAchievements(
  forceRefresh = false
): Promise<UnlockedAchievement[]> {
  if (!forceRefresh) {
    const cached = getUnlockedCached();
    if (cached) return cached;
  }

  try {
    const res = await api.get("/achievement/unlocked");
    if (!res.data?.success) return [];

    const data = res.data.data as UnlockedAchievement[];
    setUnlockedCached(data);
    return data;
  } catch (error) {
    console.error("Gagal mengambil unlocked achievements:", error);
    return [];
  }
}