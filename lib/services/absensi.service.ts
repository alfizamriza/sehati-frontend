import api from "@/lib/api";

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: unknown;
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

/* =====================================================
    TYPES
===================================================== */
export interface SiswaAbsensi {
  nis: string;
  nama: string;
  streak: number;
  coins: number;
  sudahAbsen: boolean;
  izinHariIni?: {
    ada: boolean;
    tipe: string | null;
    catatan: string | null;
  };
}

export interface KelasItem {
  id: number;
  nama: string;
  tingkat: number;
  jenjang: string;
}

export interface AbsensiMeta {
  total: number;
  sudahAbsen: number;
  belumAbsen: number;
  tanggal: string;
}

export interface HasilAbsensi {
  nis: string;
  nama: string;
  coinsEarned: number;
  streakBonus: number;
  totalCoins: number;
  newStreak: number;
  method: "scan" | "manual";
}

export interface BulkResult {
  berhasil: string[];
  gagal: { nis: string; alasan: string }[];
}

/* =====================================================
    CACHE — kelas list tidak berubah sering, cache 10 menit
    siswa per kelas di-cache 1 menit (bisa berubah saat absen)
===================================================== */
const KELAS_CACHE_KEY = "sehati_kelas_list";
const KELAS_CACHE_DURATION = 10 * 60 * 1000; // 10 menit

const SISWA_CACHE_KEY = (kelasId: number) => `sehati_siswa_kelas_${kelasId}`;
const SISWA_CACHE_DURATION = 60 * 1000; // 1 menit

interface CacheEntry<T> { data: T; timestamp: number }

function getCache<T>(key: string, duration: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < duration) return parsed.data;
  } catch {}
  return null;
}

function setCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function clearSiswaCache(kelasId?: number): void {
  try {
    if (kelasId) {
      sessionStorage.removeItem(SISWA_CACHE_KEY(kelasId));
    } else {
      // Hapus semua cache siswa
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("sehati_siswa_kelas_"))
        .forEach((k) => sessionStorage.removeItem(k));
    }
  } catch {}
}

/* =====================================================
    API: SCAN QR
===================================================== */
export async function scanAbsensi(nis: string): Promise<HasilAbsensi> {
  const res = await api.post("/absensi/scan", { nis });
  if (!res.data?.success) throw new Error(res.data?.message || "Gagal scan absensi");
  // Clear cache kelas yang bersangkutan agar status ter-refresh
  clearSiswaCache();
  return unwrapEnvelope(res.data) as HasilAbsensi;
}

/* =====================================================
    API: ABSEN MANUAL 1 SISWA
===================================================== */
export async function manualAbsensi(nis: string): Promise<HasilAbsensi> {
  const res = await api.post("/absensi/manual", { nis });
  if (!res.data?.success) throw new Error(res.data?.message || "Gagal absensi manual");
  return unwrapEnvelope(res.data) as HasilAbsensi;
}

/* =====================================================
    API: ABSEN MANUAL BULK
===================================================== */
export async function bulkManualAbsensi(
  nisList: string[],
  kelasId: number
): Promise<BulkResult> {
  const res = await api.post("/absensi/manual/bulk", { nisList });
  if (!res.data?.success) throw new Error("Gagal bulk absensi");
  // Clear cache kelas ini agar list terupdate
  clearSiswaCache(kelasId);
  const payload = unwrapEnvelope(res.data);
  const result = (payload && typeof payload === "object" ? payload : {}) as Partial<BulkResult>;
  return {
    berhasil: Array.isArray(result.berhasil) ? result.berhasil : [],
    gagal: Array.isArray(result.gagal) ? result.gagal : [],
  };
}

/* =====================================================
    API: GET DAFTAR KELAS
===================================================== */
export async function getKelasList(): Promise<KelasItem[]> {
  const cached = getCache<KelasItem[]>(KELAS_CACHE_KEY, KELAS_CACHE_DURATION);
  if (cached) return cached;

  const res = await api.get("/absensi/kelas");
  if (!res.data?.success) throw new Error("Gagal mengambil daftar kelas");
  const payload = unwrapEnvelope(res.data);
  const kelas = Array.isArray(payload) ? (payload as KelasItem[]) : [];
  setCache(KELAS_CACHE_KEY, kelas);
  return kelas;
}

/* =====================================================
    API: GET SISWA PER KELAS + STATUS ABSEN HARI INI
===================================================== */
export async function getSiswaByKelas(
  kelasId: number,
  forceRefresh = false
): Promise<{ siswa: SiswaAbsensi[]; meta: AbsensiMeta }> {
  if (!forceRefresh) {
    const cached = getCache<{ siswa: SiswaAbsensi[]; meta: AbsensiMeta }>(
      SISWA_CACHE_KEY(kelasId),
      SISWA_CACHE_DURATION
    );
    if (cached) return cached;
  }

  const res = await api.get(`/absensi/kelas/${kelasId}/siswa`);
  if (!res.data?.success) throw new Error("Gagal mengambil data siswa");
  const siswaPayload = unwrapEnvelope(res.data);
  const payloadObj = siswaPayload && typeof siswaPayload === "object" ? (siswaPayload as Record<string, unknown>) : null;
  const siswa = Array.isArray(siswaPayload)
    ? (siswaPayload as SiswaAbsensi[])
    : Array.isArray(payloadObj?.siswa)
      ? (payloadObj.siswa as SiswaAbsensi[])
      : [];

  const nestedMeta =
    payloadObj?.meta && typeof payloadObj.meta === "object"
      ? (payloadObj.meta as AbsensiMeta)
      : null;
  const topLevel = res.data as ApiEnvelope;
  const meta = (topLevel?.meta && typeof topLevel.meta === "object"
    ? topLevel.meta
    : nestedMeta ?? { total: siswa.length, sudahAbsen: 0, belumAbsen: siswa.length, tanggal: "" }) as AbsensiMeta;

  const result = { siswa, meta };
  setCache(SISWA_CACHE_KEY(kelasId), result);
  return result;
}

/* =====================================================
    API: GET STATUS ABSEN HARI INI (1 SISWA)
===================================================== */
export async function getStatusHariIni(
  nis: string
): Promise<{ sudahAbsen: boolean; detail: any }> {
  const res = await api.get(`/absensi/status/${nis}`);
  if (!res.data?.success) throw new Error("Gagal cek status");
  return unwrapEnvelope(res.data) as { sudahAbsen: boolean; detail: any };
}


/* =====================================================
    API: GET INFO HARI INI
    Cek apakah hari ini libur sebelum buka halaman absensi
===================================================== */
export async function getInfoHariIni(): Promise<{
  isLibur: boolean;
  keterangan: string | null;
  tanggal: string;
}> {
  const res = await api.get("/absensi/info-hari-ini");
  if (!res.data?.success) throw new Error("Gagal cek info hari ini");
  const payload = unwrapEnvelope(res.data) as Partial<{
    isLibur: boolean;
    keterangan: string | null;
    tanggal: string;
  }> | null;
  return {
    isLibur: Boolean(payload?.isLibur),
    keterangan: payload?.keterangan ?? null,
    tanggal: payload?.tanggal ?? "",
  };
}

/* =====================================================
    HELPER: Parse error dari backend
    Backend mengirim JSON string di dalam message
    untuk error HARI_LIBUR
===================================================== */
export interface LiburError {
  code: "HARI_LIBUR";
  keterangan: string;
  message: string;
}

export function parseAbsensiError(err: any): {
  isLibur: boolean;
  liburInfo?: LiburError;
  message: string;
} {
  const rawMsg = err?.response?.data?.message || err?.message || "";

  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.code === "HARI_LIBUR") {
      return { isLibur: true, liburInfo: parsed, message: parsed.message };
    }
  } catch {}

  return { isLibur: false, message: rawMsg || "Terjadi kesalahan" };
}
