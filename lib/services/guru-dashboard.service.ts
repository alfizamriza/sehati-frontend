import api from "@/lib/api"; // axios instance

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapEnvelope(payload: unknown): unknown {
  let current: any = payload;
  while (
    current &&
    typeof current === "object" &&
    "success" in current &&
    "data" in current
  ) {
    current = (current as ApiEnvelope).data;
  }
  return current;
}

const CACHE_TTL_MS = {
  profil: 5 * 60 * 1000,
  kelas: 5 * 60 * 1000,
  statistik: 60 * 1000,
  topSiswa: 60 * 1000,
  pelanggaranTerbaru: 45 * 1000,
  jenisPelanggaran: 5 * 60 * 1000,
  riwayatKonselor: 90 * 1000,
};

type CacheEntry<T> = { data: T; ts: number };
const memCache = new Map<string, CacheEntry<unknown>>();
const inflightMap = new Map<string, Promise<unknown>>();

function isBrowser() {
  return typeof window !== "undefined";
}

function getStorageCache<T>(key: string, ttl: number): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.ts > ttl) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setStorageCache<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

async function getWithCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  forceRefresh = false
): Promise<T> {
  if (!forceRefresh) {
    const mem = memCache.get(key) as CacheEntry<T> | undefined;
    if (mem && Date.now() - mem.ts <= ttl) return mem.data;

    const fromStorage = getStorageCache<T>(key, ttl);
    if (fromStorage !== null) {
      memCache.set(key, { data: fromStorage, ts: Date.now() });
      return fromStorage;
    }
  }

  const existing = inflightMap.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const req = fetcher()
    .then((data) => {
      memCache.set(key, { data, ts: Date.now() });
      setStorageCache(key, data);
      return data;
    })
    .finally(() => {
      inflightMap.delete(key);
    });

  inflightMap.set(key, req);
  return req;
}

export function clearGuruDashboardCache(): void {
  memCache.clear();
  inflightMap.clear();
  if (!isBrowser()) return;
  try {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith("sehati_guru_"));
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function convertToRomanNumeral(num: number): string {
  const romanNumerals = [
    { value: 12, numeral: 'XII' },
    { value: 11, numeral: 'XI' },
    { value: 10, numeral: 'X' },
    { value: 9, numeral: 'IX' },
    { value: 8, numeral: 'VIII' },
    { value: 7, numeral: 'VII' },
    { value: 6, numeral: 'VI' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 3, numeral: 'III' },
    { value: 2, numeral: 'II' },
    { value: 1, numeral: 'I' },
  ];

  let result = '';
  let remaining = num;

  for (const { value, numeral } of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result || String(num);
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ProfilGuru {
  nip: string;
  nama: string;
  mataPelajaran: string | null;
  peran: "guru_mapel" | "wali_kelas" | "konselor";
  isKonselor: boolean;
  isWaliKelas: boolean;
  kelasWali: {
    id: number;
    nama: string;
    tingkat: string;
    jenjang: string;
    label: string;
  } | null;
}

export interface KelasItem {
  id: number;
  nama: string;
  tingkat: string;
  jenjang: string;
}

export interface StatistikKelas {
  totalSiswa: number;
  hadirHariIni: number;
  persentaseHadir: number;
  rataRataCoins: number;
  rataRataStreak: number;
  tanggal: string;
}

export interface TopSiswa {
  rank: number;
  nis: string;
  nama: string;
  coins: number;
  streak: number;
  medal: "gold" | "silver" | "bronze" | "none";
}

export interface PelanggaranItem {
  id: number;
  tanggal: string;
  status: string;
  siswa: { nama: string; kelasLabel: string };
  pelanggaran: { nama: string; kategori: string; bobotCoins: number };
}

export interface JenisPelanggaran {
  id: number;
  nama: string;
  kategori: "ringan" | "sedang" | "berat";
  bobot_coins: number;
  deskripsi: string | null;
  is_active: boolean;
}

export interface RiwayatPelanggaranKonselorItem {
  id: number;
  tanggal: string;
  status: string;
  siswa: { nis: string; nama: string; kelasLabel: string };
  jenisPelanggaran: { id: number | null; nama: string; kategori: string };
  guru: { nip: string; nama: string };
  bobotCoins: number;
  buktiUrl: string | null;
}

// ─── API FUNCTIONS ────────────────────────────────────────────────────────────

export async function getProfilGuru(forceRefresh = false): Promise<ProfilGuru> {
  return getWithCache(
    "sehati_guru_profil",
    CACHE_TTL_MS.profil,
    async () => {
      const res = await api.get("/guru/dashboard/profil");
      return unwrapEnvelope(res.data) as ProfilGuru;
    },
    forceRefresh
  );
}

export async function getKelasList(forceRefresh = false): Promise<KelasItem[]> {
  return getWithCache(
    "sehati_guru_kelas",
    CACHE_TTL_MS.kelas,
    async () => {
      const res = await api.get("/guru/dashboard/kelas");
      const payload = unwrapEnvelope(res.data);
      const kelas = Array.isArray(payload) ? (payload as KelasItem[]) : [];
      return kelas.map((item) => ({
        ...item,
        tingkat: Number.isFinite(Number(item.tingkat))
          ? convertToRomanNumeral(Number(item.tingkat))
          : String(item.tingkat),
      }));
    },
    forceRefresh
  );
}

export async function getStatistikKelas(kelasId: number, forceRefresh = false): Promise<StatistikKelas> {
  return getWithCache(
    `sehati_guru_statistik_${kelasId}`,
    CACHE_TTL_MS.statistik,
    async () => {
      const res = await api.get(`/guru/dashboard/statistik/${kelasId}`);
      const payload = unwrapEnvelope(res.data) as Partial<StatistikKelas> | null;
      return {
        totalSiswa: Number(payload?.totalSiswa ?? 0),
        hadirHariIni: Number(payload?.hadirHariIni ?? 0),
        persentaseHadir: Number(payload?.persentaseHadir ?? 0),
        rataRataCoins: Number(payload?.rataRataCoins ?? 0),
        rataRataStreak: Number(payload?.rataRataStreak ?? 0),
        tanggal: payload?.tanggal ?? "",
      };
    },
    forceRefresh
  );
}

export async function getTopSiswa(kelasId: number, limit = 5, forceRefresh = false): Promise<TopSiswa[]> {
  return getWithCache(
    `sehati_guru_top_${kelasId}_${limit}`,
    CACHE_TTL_MS.topSiswa,
    async () => {
      const res = await api.get(`/guru/dashboard/top-siswa/${kelasId}?limit=${limit}`);
      const payload = unwrapEnvelope(res.data);
      return Array.isArray(payload) ? (payload as TopSiswa[]) : [];
    },
    forceRefresh
  );
}

export async function getPelanggaranTerbaru(kelasId?: number, limit = 5, forceRefresh = false): Promise<PelanggaranItem[]> {
  const key = `sehati_guru_pel_${kelasId ?? "all"}_${limit}`;
  return getWithCache(
    key,
    CACHE_TTL_MS.pelanggaranTerbaru,
    async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (kelasId) params.set("kelasId", String(kelasId));
      const res = await api.get(`/guru/dashboard/pelanggaran-terbaru?${params}`);
      const payload = unwrapEnvelope(res.data);
      return Array.isArray(payload) ? (payload as PelanggaranItem[]) : [];
    },
    forceRefresh
  );
}

// ─── KONSELOR: JENIS PELANGGARAN ──────────────────────────────────────────────

// ✅ Tetap pakai ini (dipanggil HANYA setelah cek isKonselor di page)
export async function getJenisPelanggaran(forceRefresh = false): Promise<JenisPelanggaran[]> {
  return getWithCache(
    "sehati_guru_jenis_pelanggaran",
    CACHE_TTL_MS.jenisPelanggaran,
    async () => {
      const res = await api.get("/guru/dashboard/jenis-pelanggaran");
      const payload = unwrapEnvelope(res.data);
      return Array.isArray(payload) ? (payload as JenisPelanggaran[]) : [];
    },
    forceRefresh
  );
}

export async function createJenisPelanggaran(dto: {
  nama: string;
  kategori: "ringan" | "sedang" | "berat";
  bobot_coins: number;
  deskripsi?: string;
}): Promise<JenisPelanggaran> {
  const res = await api.post("/guru/dashboard/jenis-pelanggaran", dto);
  clearGuruDashboardCache();
  return unwrapEnvelope(res.data) as JenisPelanggaran;
}
export async function getJenisPelanggaranSafe(): Promise<JenisPelanggaran[]> {
  try {
    const res = await api.get("/guru/dashboard/jenis-pelanggaran");
    const payload = unwrapEnvelope(res.data);
    return Array.isArray(payload) ? (payload as JenisPelanggaran[]) : [];
  } catch (e: any) {
    if (e?.response?.status === 403) return []; // bukan konselor, kembalikan array kosong
    throw e;
  }
}

export async function updateJenisPelanggaran(
  id: number,
  dto: Partial<JenisPelanggaran>
): Promise<JenisPelanggaran> {
  const res = await api.put(`/guru/dashboard/jenis-pelanggaran/${id}`, dto);
  clearGuruDashboardCache();
  return unwrapEnvelope(res.data) as JenisPelanggaran;
}

export async function deleteJenisPelanggaran(id: number): Promise<void> {
  await api.delete(`/guru/dashboard/jenis-pelanggaran/${id}`);
  clearGuruDashboardCache();
}

export async function toggleJenisPelanggaran(id: number): Promise<JenisPelanggaran> {
  const res = await api.patch(`/guru/dashboard/jenis-pelanggaran/${id}/toggle`);
  clearGuruDashboardCache();
  return unwrapEnvelope(res.data) as JenisPelanggaran;
}

export async function getRiwayatPelanggaranKonselor(limit = 200, forceRefresh = false): Promise<RiwayatPelanggaranKonselorItem[]> {
  return getWithCache(
    `sehati_guru_riwayat_konselor_${limit}`,
    CACHE_TTL_MS.riwayatKonselor,
    async () => {
      const res = await api.get(`/guru/dashboard/riwayat-pelanggaran?limit=${limit}`);
      const payload = unwrapEnvelope(res.data);
      return Array.isArray(payload) ? (payload as RiwayatPelanggaranKonselorItem[]) : [];
    },
    forceRefresh
  );
}

export async function updatePelanggaranStatus(id: number, status: 'approved' | 'rejected'): Promise<any> {
  const res = await api.patch(`/guru/dashboard/pelanggaran/${id}/status`, { status });
  clearGuruDashboardCache();
  return unwrapEnvelope(res.data);
}
