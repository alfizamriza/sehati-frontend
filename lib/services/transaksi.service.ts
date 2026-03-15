import api from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface VoucherInfo {
  id: number;
  kodeVoucher: string;
  namaVoucher: string;
  nominalVoucher: number;
  tipeVoucher: "percentage" | "fixed";
  tanggalBerakhir: string;
}

export interface SiswaInfo {
  nis: string;
  nama: string;
  kelas: string;
  coins: number;
  streak: number;
  fotoUrl: string | null;
  voucherAktif: VoucherInfo[];
}

export interface ProdukItem {
  id: number;
  nama: string;
  harga: number;
  stok: number;
  kategori: string;
  jenisKemasan: "plastik" | "kertas" | "tanpa_kemasan" | null;
  coinsPenaltyPerItem: number;
  isPinned?: boolean;
}

export interface CartItem extends ProdukItem {
  qty: number;
  isByoc: boolean;
}

export interface KemasPenaltyDetail {
  namaProduk: string;
  jenisKemasan: string;
  qty: number;
  penaltyPerItem: number;
  totalPenalty: number;
}

export interface TransaksiPayload {
  nis: string;
  items: { produkId: number; quantity: number; isByoc?: boolean }[];
  paymentMethod: "voucher" | "tunai";
  voucherId?: number;
}

export interface SiswaListItem {
  nis: string;
  nama: string;
  kelas: string;
  fotoUrl: string | null;
}

export interface TransaksiResult {
  id: number;
  kodeTransaksi: string;
  totalHarga: number;
  totalDiskon: number;
  totalBayar: number;
  coinsUsed: number;
  isByoc: boolean;
  coinsReward: number;
  coinsPenaltyTotal: number;
  coinsPenaltyDetail: KemasPenaltyDetail[];
  paymentMethod: string;
  createdAt: string;
}

export interface CekVoucherResult {
  valid: boolean;
  voucher?: VoucherInfo;
  message: string;
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
const PRODUK_CACHE_TTL = 5 * 60 * 1000;
let _produkCache: { data: ProdukItem[]; ts: number } | null = null;

export function clearProdukCache() { _produkCache = null; }

function unwrapResponseData<T>(raw: any): T | null {
  const lvl1 = raw?.data;
  if (lvl1 === undefined) return null;
  if (lvl1 && typeof lvl1 === "object" && "success" in lvl1) {
    return (lvl1 as any).data ?? null;
  }
  return lvl1 as T;
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

export async function lookupSiswa(nis: string): Promise<SiswaInfo> {
  const res = await api.get(`/transaksi/siswa?nis=${encodeURIComponent(nis)}`, {
    suppressErrorLog: true,
  } as any);
  if (!res.data?.success) throw new Error(res.data?.message ?? "Siswa tidak ditemukan");
  const data = unwrapResponseData<SiswaInfo>(res.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format data siswa tidak valid");
  }
  return data;
}

/**
 * listSiswa
 * Ambil semua siswa aktif — hanya field minimal untuk autocomplete kasir.
 * Di-cache 10 menit di NisSearchInput, jadi hanya dipanggil sekali per sesi.
 * Membutuhkan endpoint GET /transaksi/siswa/list di backend.
 */
export async function listSiswa(): Promise<SiswaListItem[]> {
  const res = await api.get("/transaksi/siswa/list");
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal mengambil daftar siswa");
  const data = unwrapResponseData<SiswaListItem[]>(res.data);
  if (!Array.isArray(data)) throw new Error("Format daftar siswa tidak valid");
  return data;
}

export async function cekVoucher(kode: string, nis: string): Promise<CekVoucherResult> {
  const res = await api.get(
    `/transaksi/voucher?kode=${encodeURIComponent(kode)}&nis=${encodeURIComponent(nis)}`
  );
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal cek voucher");
  const data = unwrapResponseData<CekVoucherResult>(res.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format data voucher tidak valid");
  }
  return data;
}

export async function getProdukKatalog(force = false): Promise<ProdukItem[]> {
  if (!force && _produkCache && Date.now() - _produkCache.ts < PRODUK_CACHE_TTL) {
    return _produkCache.data;
  }
  const res = await api.get("/transaksi/produk");
  if (!res.data?.success) throw new Error("Gagal mengambil katalog produk");
  const data = unwrapResponseData<ProdukItem[]>(res.data);
  if (!Array.isArray(data)) {
    console.error("Format katalog produk tidak valid:", res.data);
    return [];
  }
  _produkCache = { data, ts: Date.now() };
  return data;
}

export async function createTransaksi(payload: TransaksiPayload): Promise<TransaksiResult> {
  const res = await api.post("/transaksi", payload);
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal membuat transaksi");
  const data = unwrapResponseData<TransaksiResult>(res.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format data transaksi tidak valid");
  }
  clearProdukCache();
  return data;
}

// ─── CART HELPERS ─────────────────────────────────────────────────────────────

export function addToCart(cart: CartItem[], produk: ProdukItem): CartItem[] {
  const existing = cart.find((c) => c.id === produk.id);
  if (existing) {
    return cart.map((c) =>
      c.id === produk.id ? { ...c, qty: Math.min(c.qty + 1, c.stok) } : c
    );
  }
  return [...cart, { ...produk, qty: 1, isByoc: false }];
}

export function updateCartQty(cart: CartItem[], produkId: number, delta: number): CartItem[] {
  return cart
    .map((c) => c.id === produkId ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
    .filter((c) => c.qty > 0);
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((s, c) => s + c.harga * c.qty, 0);
}

export function toggleCartByoc(cart: CartItem[], produkId: number): CartItem[] {
  return cart.map((c) =>
    c.id === produkId ? { ...c, isByoc: !c.isByoc } : c
  );
}

export function getCartCoinsPenalty(cart: CartItem[]): {
  total: number;
  detail: { nama: string; kemasan: string; qty: number; perItem: number; total: number }[];
} {
  const detail: { nama: string; kemasan: string; qty: number; perItem: number; total: number }[] = [];
  let total = 0;

  cart.forEach((c) => {
    if (c.coinsPenaltyPerItem > 0 && !c.isByoc) {
      const t = c.coinsPenaltyPerItem * c.qty;
      total += t;
      detail.push({
        nama: c.nama,
        kemasan: c.jenisKemasan ?? "-",
        qty: c.qty,
        perItem: c.coinsPenaltyPerItem,
        total: t,
      });
    }
  });

  return { total, detail };
}

export function buildPayload(
  nis: string,
  cart: CartItem[],
  method: "voucher" | "tunai",
  extra?: { voucherId?: number }
): TransaksiPayload {
  return {
    nis,
    items: cart.map((c) => ({ produkId: c.id, quantity: c.qty, isByoc: c.isByoc })),
    paymentMethod: method,
    ...extra,
  };
}

// ─── DISPLAY HELPERS ──────────────────────────────────────────────────────────

export function hitungDiskon(voucher: VoucherInfo, total: number): number {
  if (voucher.tipeVoucher === "percentage") {
    return Math.min(Math.round((voucher.nominalVoucher / 100) * total), total);
  }
  return Math.min(voucher.nominalVoucher, total);
}

export function formatVoucherLabel(v: VoucherInfo): string {
  return v.tipeVoucher === "percentage"
    ? `${v.nominalVoucher}% off`
    : `Rp ${v.nominalVoucher.toLocaleString("id-ID")} off`;
}

export function kelompokkanProduk(produk: ProdukItem[]): Record<string, ProdukItem[]> {
  if (!Array.isArray(produk)) return {};
  return produk.reduce((acc, p) => {
    const key = p.kategori;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, ProdukItem[]>);
}

export function kemasanInfo(kemasan: string | null): {
  label: string; icon: string; color: string; warning: boolean;
} {
  switch (kemasan) {
    case "plastik": return { label: "Plastik", icon: "🛍️", color: "#EF4444", warning: true };
    case "kertas": return { label: "Kertas", icon: "📄", color: "#F59E0B", warning: true };
    case "tanpa_kemasan": return { label: "Eco", icon: "♻️", color: "#10b981", warning: false };
    default: return { label: "", icon: "", color: "transparent", warning: false };
  }
}

export function penaltyLabel(penalty: number, kemasan: string | null): string {
  if (!penalty || !kemasan) return "";
  const info = kemasanInfo(kemasan);
  return `-${penalty} koin/${info.label}`;
}
