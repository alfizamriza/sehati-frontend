import api from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface RiwayatTumbler {
  id: string;
  tanggal: string;
  waktu: string;
  createdAt: string;
  coinsReward: number;
  streakBonus: number;
  method: string;
  dicatatOleh: string;
  kelas: string;
}

export interface DetailBelanja {
  namaProduk: string;
  harga: number;
  qty: number;
  subtotal: number;
  jenisKemasan: string;
}

export interface RiwayatBelanja {
  id: string;
  kodeTransaksi: string;
  tanggal: string;
  waktu: string;
  createdAt: string;
  totalHarga: number;
  totalDiskon: number;
  totalBayar: number;
  coinsUsed: number;
  coinsReward: number;
  coinsPenalty: number;
  paymentMethod: string;
  isByoc: boolean;           // ← baru: bawa wadah sendiri
  items: DetailBelanja[];
  adaProdukPlastik: boolean; // true hanya jika plastik DAN bukan BYOC
  jumlahItemPlastik: number;
  dicatatOleh: string;
  verifiedAt: string | null;
  status: "pending" | "approved" | "rejected";
}

export interface RiwayatPelanggaran {
  id: number;
  tanggal: string;
  waktu: string;
  createdAt: string;
  namaJenis: string;
  kategori: "ringan" | "sedang" | "berat";
  coinsPenalty: number;
  catatan: string | null;
  buktiUrl: string | null;
  dicatatOleh: string;
  verifiedAt: string | null;
  status: "pending" | "approved" | "rejected";
}

export interface RiwayatSummary {
  totalTumbler: number;
  totalBelanja: number;
  totalPelanggaran: number;
  totalCoinsDidapat: number;
  totalCoinsKeluar: number;
  jumlahPlastik: number;       // plastik NON-BYOC (pelanggaran)
  jumlahPlastikByoc: number;   // ← baru: plastik BYOC (bukan pelanggaran)
}

export interface RiwayatAll {
  tumbler: RiwayatTumbler[];
  belanja: RiwayatBelanja[];
  pelanggaran: RiwayatPelanggaran[];
  summary: RiwayatSummary;
}

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function formatTanggal(dateStr: string): string {
  if (!dateStr || dateStr === "-") return "-";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return dateStr; }
}

export function formatWaktu(timeStr: string): string {
  if (!timeStr || timeStr === "-") return "-";
  return timeStr.substring(0, 5);
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n);
}

export function labelPaymentMethod(m: string): string {
  return { coins: "Koin", voucher: "Voucher", tunai: "Tunai" }[m] ?? m;
}

export function labelMethod(m: string): string {
  return { scan: "Scan QR", manual: "Manual" }[m] ?? m;
}

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
const CACHE_DURATION = 3 * 60 * 1000;

interface CacheEntry { data: RiwayatAll; timestamp: number }
let _cache: CacheEntry | null = null;

function getCached(): RiwayatAll | null {
  if (!_cache) return null;
  if (Date.now() - _cache.timestamp > CACHE_DURATION) { _cache = null; return null; }
  return _cache.data;
}

function setCached(data: RiwayatAll): void {
  _cache = { data, timestamp: Date.now() };
}

export function clearRiwayatCache(): void { _cache = null; }
export function isRiwayatCached(): boolean { return !!getCached(); }

// ─── API CALLS ────────────────────────────────────────────────────────────────
export async function getRiwayatAll(
  limit = 50,
  forceRefresh = false,
): Promise<RiwayatAll> {
  if (!forceRefresh) {
    const cached = getCached();
    if (cached) return cached;
  }
  const res = await api.get("/riwayat/semua", { params: { limit } });
  if (!res.data?.success) throw new Error("Gagal mengambil riwayat");

  let payload: any = res.data;
  while (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    payload = (payload as ApiEnvelope).data;
  }

  const normalized: RiwayatAll = {
    tumbler: Array.isArray(payload?.tumbler) ? payload.tumbler : [],
    belanja: Array.isArray(payload?.belanja) ? payload.belanja : [],
    pelanggaran: Array.isArray(payload?.pelanggaran) ? payload.pelanggaran : [],
    summary: {
      totalTumbler: Number(payload?.summary?.totalTumbler ?? 0),
      totalBelanja: Number(payload?.summary?.totalBelanja ?? 0),
      totalPelanggaran: Number(payload?.summary?.totalPelanggaran ?? 0),
      totalCoinsDidapat: Number(payload?.summary?.totalCoinsDidapat ?? 0),
      totalCoinsKeluar: Number(payload?.summary?.totalCoinsKeluar ?? 0),
      jumlahPlastik: Number(payload?.summary?.jumlahPlastik ?? 0),
      jumlahPlastikByoc: Number(payload?.summary?.jumlahPlastikByoc ?? 0),
    },
  };

  setCached(normalized);
  return normalized;
}

export async function getRiwayatTumbler(
  limit = 50,
  forceRefresh = false,
): Promise<RiwayatTumbler[]> {
  const data = await getRiwayatAll(limit, forceRefresh);
  return data.tumbler;
}

export async function getRiwayatBelanja(
  limit = 50,
  forceRefresh = false,
): Promise<RiwayatBelanja[]> {
  const data = await getRiwayatAll(limit, forceRefresh);
  return data.belanja;
}

export async function getRiwayatPelanggaran(
  limit = 50,
  forceRefresh = false,
): Promise<RiwayatPelanggaran[]> {
  const data = await getRiwayatAll(limit, forceRefresh);
  return data.pelanggaran;
}
