import api from "@/lib/api";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapData<T>(payload: unknown): T {
  let current: any = payload;
  while (
    current &&
    typeof current === "object" &&
    "success" in current &&
    "data" in current
  ) {
    current = (current as ApiEnvelope<unknown>).data;
  }
  return current as T;
}

const CACHE_TTL_MS = {
  kelas: 5 * 60 * 1000,
  siswaByKelas: 2 * 60 * 1000,
  jenis: 5 * 60 * 1000,
  riwayatSaya: 90 * 1000,
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

    const ss = getStorageCache<T>(key, ttl);
    if (ss !== null) {
      memCache.set(key, { data: ss, ts: Date.now() });
      return ss;
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
    .finally(() => inflightMap.delete(key));

  inflightMap.set(key, req);
  return req;
}

export function clearGuruPelanggaranCache(): void {
  memCache.clear();
  inflightMap.clear();
  if (!isBrowser()) return;
  try {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith("sehati_guru_pelanggaran_"));
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface KelasItem {
  id: number;
  nama: string;
  tingkat: number;
  jenjang: string;
  label: string;
}

export interface SiswaItem {
  nis: string;
  nama: string;
}

export interface JenisPelanggaranItem {
  id: number;
  nama: string;
  kategori: "ringan" | "sedang" | "berat";
  bobot_coins: number;
  deskripsi?: string | null;
}

export interface CreatePelanggaranPayload {
  nis: string;
  jenis_pelanggaran_id: number;
  catatan?: string;
  bukti_foto_url?: string;
}

export interface UpdatePelanggaranPayload {
  jenis_pelanggaran_id?: number;
  catatan?: string;
}

export interface PelanggaranCreated {
  id: number;
  tanggal: string;
  waktu: string;
  status: "pending" | "approved" | "rejected";
  coinspenalty: number;
  catatan: string | null;
  buktiUrl: string | null;
  siswa: { nis: string; nama: string };
  jenisPelanggaran: { id: number; nama: string; kategori: string };
  guru: { nip: string; nama: string };
}

export interface RiwayatPelanggaranGuruItem {
  id: number;
  tanggal: string;
  status: "pending" | "approved" | "rejected";
  coinspenalty: number;
  catatan: string | null;
  buktiUrl: string | null;
  siswa: { nis: string; nama: string; kelasLabel: string };
  jenisPelanggaran: { id: number; nama: string; kategori: string };
}

// ─── DROPDOWN DATA ─────────────────────────────────────────────────────────────

/**
 * Ambil semua kelas untuk dropdown
 */
export async function getKelasList(forceRefresh = false): Promise<KelasItem[]> {
  return getWithCache(
    "sehati_guru_pelanggaran_kelas",
    CACHE_TTL_MS.kelas,
    async () => {
      const res = await api.get("/pelanggaran/kelas");
      const payload = unwrapData<unknown>(res.data);
      return Array.isArray(payload) ? (payload as KelasItem[]) : [];
    },
    forceRefresh
  );
}

/**
 * Ambil siswa aktif berdasarkan kelas ID
 */
export async function getSiswaByKelas(kelasId: number, forceRefresh = false): Promise<SiswaItem[]> {
  return getWithCache(
    `sehati_guru_pelanggaran_siswa_${kelasId}`,
    CACHE_TTL_MS.siswaByKelas,
    async () => {
      const res = await api.get(`/pelanggaran/kelas/${kelasId}/siswa`);
      const payload = unwrapData<unknown>(res.data);
      return Array.isArray(payload) ? (payload as SiswaItem[]) : [];
    },
    forceRefresh
  );
}

/**
 * Ambil jenis pelanggaran aktif untuk dropdown
 */
export async function getJenisPelanggaranAktif(forceRefresh = false): Promise<JenisPelanggaranItem[]> {
  return getWithCache(
    "sehati_guru_pelanggaran_jenis",
    CACHE_TTL_MS.jenis,
    async () => {
      const res = await api.get("/pelanggaran/jenis");
      const payload = unwrapData<unknown>(res.data);
      return Array.isArray(payload) ? (payload as JenisPelanggaranItem[]) : [];
    },
    forceRefresh
  );
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Buat laporan pelanggaran baru.
 * Coins belum dikurangi — status default: pending, menunggu approval konselor.
 */
export async function createPelanggaran(
  payload: CreatePelanggaranPayload
): Promise<{ message: string; data: PelanggaranCreated }> {
  const res = await api.post("/pelanggaran", payload);
  const payloadData = unwrapData<PelanggaranCreated>(res.data);
  clearGuruPelanggaranCache();
  return {
    message: (res.data as ApiEnvelope<PelanggaranCreated>)?.message || "Berhasil",
    data: payloadData,
  };
}

/**
 * Edit jenis pelanggaran atau catatan.
 * Hanya bisa jika status masih pending & laporan milik guru sendiri.
 */
export async function updatePelanggaran(
  pelanggaranId: number,
  payload: UpdatePelanggaranPayload
): Promise<void> {
  await api.patch(`/pelanggaran/${pelanggaranId}`, payload);
  clearGuruPelanggaranCache();
}

/**
 * Hapus laporan pelanggaran.
 * Hanya bisa jika status masih pending & laporan milik guru sendiri.
 */
export async function deletePelanggaran(pelanggaranId: number): Promise<void> {
  await api.delete(`/pelanggaran/${pelanggaranId}`);
  clearGuruPelanggaranCache();
}

/**
 * Update bukti foto URL setelah berhasil upload ke Supabase Storage.
 */
export async function updateBuktiFoto(
  pelanggaranId: number,
  buktiUrl: string
): Promise<void> {
  await api.patch(`/pelanggaran/${pelanggaranId}/bukti`, {
    bukti_foto_url: buktiUrl,
  });
  clearGuruPelanggaranCache();
}

/**
 * Ambil riwayat pelanggaran yang dicatat oleh guru yang sedang login.
 */
export async function getRiwayatPelanggaranSaya(
  limit = 100,
  forceRefresh = false
): Promise<RiwayatPelanggaranGuruItem[]> {
  return getWithCache(
    `sehati_guru_pelanggaran_riwayat_${limit}`,
    CACHE_TTL_MS.riwayatSaya,
    async () => {
      const res = await api.get("/pelanggaran/riwayat/saya", {
        params: { limit },
      });
      const payload = unwrapData<unknown>(res.data);
      return Array.isArray(payload) ? (payload as RiwayatPelanggaranGuruItem[]) : [];
    },
    forceRefresh
  );
}

// ─── IMAGE COMPRESS UTIL ──────────────────────────────────────────────────────

/**
 * Validasi tipe file. Hanya JPG dan PNG.
 */
export function validateImageFile(file: File): void {
  const allowedTypes = ["image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Hanya file JPG dan PNG yang diperbolehkan");
  }
}

/**
 * Kompres gambar hingga di bawah maxSizeMB.
 * Jika sudah di bawah batas, file dikembalikan apa adanya.
 * Menggunakan Canvas API — hanya bisa dipanggil di sisi client (browser).
 */
export async function compressImage(
  file: File,
  maxSizeMB = 2
): Promise<File> {
  validateImageFile(file);

  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size <= maxBytes) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Skala dimensi proporsional agar ukuran file turun
      const ratio = Math.sqrt(maxBytes / file.size);
      width  = Math.floor(width  * ratio);
      height = Math.floor(height * ratio);

      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context tidak tersedia"));

      ctx.drawImage(img, 0, 0, width, height);

      // Turunkan quality secara iteratif sampai ukuran di bawah batas
      let quality = 0.85;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Gagal mengkompres gambar"));

            if (blob.size <= maxBytes || quality <= 0.3) {
              resolve(
                new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
              );
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          file.type,
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat gambar untuk dikompres"));
    };

    img.src = url;
  });
}
