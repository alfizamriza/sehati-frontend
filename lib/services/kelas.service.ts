

import api from "@/lib/api";
import type { Class } from "@/lib/dummy/types";

// ================================
// TYPES FROM BACKEND RESPONSE
// ================================
export interface KelasAPI {
  id: number;
  nama: string;
  jenjang: "SD" | "SMP" | "SMA";
  tingkat: number;
  kapasitasMaksimal: number;
  jumlahSiswa: number;
  waliKelas: {
    nip: string;
    nama: string;
    mataPelajaran: string;
  } | null;
  siswa: {
    nis: string;
    nama: string;
    coins: number;
  }[];
}

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

const KELAS_CACHE_KEY = "kelas_cache_v1";
const KELAS_CACHE_TTL_MS = 60_000;

let kelasCache: { data: Class[]; timestamp: number } | null = null;
let kelasInFlightPromise: Promise<Class[]> | null = null;

function tingkatToJenjang(tingkat: number): Class["jenjang"] {
  if (tingkat <= 6)
    return "SD";
  return tingkat >= 10 ? "SMA" : "SMP";
}

function tingkatToLabel(tingkat: number): Class["tingkat"] {
  // Mapping untuk SD
  if (tingkat === 1) return "I";
  if (tingkat === 2) return "II";
  if (tingkat === 3) return "III";
  if (tingkat === 4) return "IV";
  if (tingkat === 5) return "V";
  if (tingkat === 6) return "VI";
  if (tingkat === 7) return "VII";
  if (tingkat === 8) return "VIII";
  if (tingkat === 9) return "IX";
  if (tingkat === 10) return "X";
  if (tingkat === 11) return "XI";
  return "XII";
}

function normalizeKelas(item: any): Class {
  if (
    "namaKelas" in item &&
    "kapasitas" in item &&
    "siswaAktif" in item &&
    "tingkat" in item
  ) {
    return item as Class;
  }

  const tingkat = Number(item?.tingkat ?? 10);
  const siswa = Array.isArray(item?.siswa) ? item.siswa : [];
  const rawJenjang = item?.jenjang ?? item?.jejang;
  const jenjang: Class["jenjang"] =
    rawJenjang === "SMP" || rawJenjang === "SMA"
      ? rawJenjang
      : tingkatToJenjang(tingkat);

  return {
    id: String(item?.id ?? Date.now()),
    namaKelas: item?.nama ?? "-",
    jenjang,
    tingkat: tingkatToLabel(tingkat),
    waliKelas: item?.waliKelas?.nama ?? "",
    kapasitas: Number(item?.kapasitasMaksimal ?? item?.kapasitas_maksimal ?? 0),
    siswaAktif: Number(item?.jumlahSiswa ?? siswa.length ?? 0),
    peserta: siswa.map((s: any) => ({
      nama: s?.nama ?? "-",
      nis: s?.nis ?? "-",
    })),
  };
}

function setKelasCache(data: Class[]) {
  const payload = { data, timestamp: Date.now() };
  kelasCache = payload;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(KELAS_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore cache write errors
    }
  }
}

export function getCachedClasses(): Class[] | null {
  if (kelasCache && Date.now() - kelasCache.timestamp < KELAS_CACHE_TTL_MS) {
    return kelasCache.data;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(KELAS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: Class[]; timestamp: number };

    if (!parsed?.data || !parsed?.timestamp) return null;
    if (Date.now() - parsed.timestamp >= KELAS_CACHE_TTL_MS) return null;

    kelasCache = parsed;
    return parsed.data;
  } catch {
    return null;
  }
}

// ================================
// GET ALL KELAS
// ================================
export async function getClasses(options?: { forceRefresh?: boolean }) {
  const forceRefresh = options?.forceRefresh ?? false;

  if (!forceRefresh) {
    const cached = getCachedClasses();
    if (cached) return cached;
    if (kelasInFlightPromise) return kelasInFlightPromise;
  }

  kelasInFlightPromise = api
    .get("/kelas")
    .then((res) => {
      const payload = unwrapEnvelope(res.data);
      const rawData = Array.isArray(payload) ? payload : [];
      const normalized = rawData.map(normalizeKelas);
      setKelasCache(normalized);
      return normalized;
    })
    .finally(() => {
      kelasInFlightPromise = null;
    });

  return kelasInFlightPromise;
}

// ================================
// CREATE
// ================================
export async function createKelas(data: {
  nama: string;
  jenjang: "SD" | "SMP" | "SMA";
  tingkat: number;
  kapasitasMaksimal: number;
}) {
  const res = await api.post("/kelas", data);
  kelasCache = null;
  return res.data;
}

// ================================
// UPDATE
// ================================
export async function updateKelas(id: number, data: any) {
  const res = await api.put(`/kelas/${id}`, data);
  kelasCache = null;
  return res.data;
}

// ================================
// DELETE
// ================================
export async function deleteKelas(id: number) {
  const res = await api.delete(`/kelas/${id}`);
  kelasCache = null;
  return res.data;
}


/**
 * Get kelas for dropdown (nama + tingkat)
 */
export async function getKelasDropdown(): Promise<Array<{
  id: number;
  label: string;  // "XI-RPL (32/36)"
  value: number;
  tingkat: Class["tingkat"];
  nama: string;
  siswaAktif: number;
  kapasitas: number;
}>> {
  try {
    const classes = await getClasses({ forceRefresh: false });
    const tingkatOrder: Record<Class["tingkat"], number> = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10,
      XI: 11,
      XII: 12,
    };
    
    return classes.map(kelas => ({
      id: Number(kelas.id),
      label: `${kelas.tingkat}-${kelas.namaKelas} (${kelas.siswaAktif}/${kelas.kapasitas})`,
      value: Number(kelas.id),
      tingkat: kelas.tingkat,
      nama: kelas.namaKelas,
      siswaAktif: kelas.siswaAktif,
      kapasitas: kelas.kapasitas,
    })).sort((a, b) => tingkatOrder[a.tingkat] - tingkatOrder[b.tingkat]);
  } catch (error) {
    console.error('Error fetching kelas dropdown:', error);
    return [];
  }
}
