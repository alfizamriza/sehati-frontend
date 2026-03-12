import api from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface KantinStatHarian {
  totalPendapatan: number;
  totalTransaksi: number;
  totalItemTerjual: number;
  coinsDigunakan: number;
  rataRataPerTransaksi: number;
}

export interface KantinStatMingguan {
  totalPendapatan: number;
  totalTransaksi: number;
  chartHarian: {
    tanggal: string;
    label: string;
    pendapatan: number;
    transaksi: number;
  }[];
}

export interface ProdukTerlaris {
  produkId: number;
  nama: string;
  totalTerjual: number;
  totalPendapatan: number;
  stokSaat: number;
  kategori: string;
  jenisKemasan: string | null;
}

export interface TransaksiTerbaru {
  id: number;
  kodeTransaksi: string;
  namaSiswa: string;
  nis: string;
  totalBayar: number;
  coinsUsed: number;
  paymentMethod: string;
  createdAt: string;
  jumlahItem: number;
}

export interface ProdukStokRendah {
  id: number;
  nama: string;
  stok: number;
  kategori: string;
}

export interface KantinDashboardData {
  statHarian: KantinStatHarian;
  statMingguan: KantinStatMingguan;
  produkTerlaris: ProdukTerlaris[];
  transaksiTerbaru: TransaksiTerbaru[];
  stokRendah: ProdukStokRendah[];
  kantinNama: string;
}

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function normalizeDashboardPayload(raw: any): KantinDashboardData {
  let payload = raw;
  while (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    payload = (payload as ApiEnvelope).data;
  }

  return {
    statHarian: {
      totalPendapatan: Number(payload?.statHarian?.totalPendapatan ?? 0),
      totalTransaksi: Number(payload?.statHarian?.totalTransaksi ?? 0),
      totalItemTerjual: Number(payload?.statHarian?.totalItemTerjual ?? 0),
      coinsDigunakan: Number(payload?.statHarian?.coinsDigunakan ?? 0),
      rataRataPerTransaksi: Number(payload?.statHarian?.rataRataPerTransaksi ?? 0),
    },
    statMingguan: {
      totalPendapatan: Number(payload?.statMingguan?.totalPendapatan ?? 0),
      totalTransaksi: Number(payload?.statMingguan?.totalTransaksi ?? 0),
      chartHarian: Array.isArray(payload?.statMingguan?.chartHarian)
        ? payload.statMingguan.chartHarian.map((c: any) => ({
            tanggal: c?.tanggal ?? "",
            label: c?.label ?? "-",
            pendapatan: Number(c?.pendapatan ?? 0),
            transaksi: Number(c?.transaksi ?? 0),
          }))
        : [],
    },
    produkTerlaris: Array.isArray(payload?.produkTerlaris)
      ? payload.produkTerlaris.map((p: any) => ({
          produkId: Number(p?.produkId ?? 0),
          nama: p?.nama ?? "-",
          totalTerjual: Number(p?.totalTerjual ?? 0),
          totalPendapatan: Number(p?.totalPendapatan ?? 0),
          stokSaat: Number(p?.stokSaat ?? 0),
          kategori: p?.kategori ?? "-",
          jenisKemasan: p?.jenisKemasan ?? null,
        }))
      : [],
    transaksiTerbaru: Array.isArray(payload?.transaksiTerbaru)
      ? payload.transaksiTerbaru.map((t: any) => ({
          id: Number(t?.id ?? 0),
          kodeTransaksi: t?.kodeTransaksi ?? "-",
          namaSiswa: t?.namaSiswa ?? "-",
          nis: t?.nis ?? "-",
          totalBayar: Number(t?.totalBayar ?? 0),
          coinsUsed: Number(t?.coinsUsed ?? 0),
          paymentMethod: t?.paymentMethod ?? "tunai",
          createdAt: t?.createdAt ?? "",
          jumlahItem: Number(t?.jumlahItem ?? 0),
        }))
      : [],
    stokRendah: Array.isArray(payload?.stokRendah)
      ? payload.stokRendah.map((s: any) => ({
          id: Number(s?.id ?? 0),
          nama: s?.nama ?? "-",
          stok: Number(s?.stok ?? 0),
          kategori: s?.kategori ?? "-",
        }))
      : [],
    kantinNama: payload?.kantinNama ?? "Kantin",
  };
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
const CACHE_TTL = 2 * 60 * 1000; // 2 menit (data transaksi berubah cepat)
let _cache: { data: KantinDashboardData; ts: number } | null = null;

export function clearKantinDashboardCache() { _cache = null; }
export function isKantinDashboardCached() {
  return !!_cache && Date.now() - _cache.ts < CACHE_TTL;
}

// ─── API ─────────────────────────────────────────────────────────────────────
export async function getKantinDashboard(
  forceRefresh = false,
): Promise<KantinDashboardData> {
  if (!forceRefresh && _cache && Date.now() - _cache.ts < CACHE_TTL) {
    return _cache.data;
  }
  const res = await api.get("/kantin/dashboard");
  if (!res.data?.success) throw new Error("Gagal mengambil dashboard kantin");
  const normalized = normalizeDashboardPayload(res.data);
  _cache = { data: normalized, ts: Date.now() };
  return normalized;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function formatRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function formatRupiahFull(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n);
}

export function formatWaktu(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch { return "-"; }
}

export function labelPayment(method: string): { label: string; color: string } {
  return {
    coins:   { label: "Koin",    color: "#F59E0B" },
    voucher: { label: "Voucher", color: "#8B5CF6" },
    tunai:   { label: "Tunai",   color: "#10b981" },
  }[method] ?? { label: method, color: "#179EFF" };
}

export function stokLevel(stok: number): "danger" | "warning" | "ok" {
  if (stok === 0)  return "danger";
  if (stok <= 5)   return "warning";
  return "ok";
}
