import api from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface ProdukItem {
  coinsPenaltyPerItem: number;
  id: number;
  nama: string;
  harga: number;
  stok: number;
  kategori: string;
  jenisKemasan: "plastik" | "kertas" | "tanpa_kemasan" | null;
  isPinned?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isTitipan: boolean;
  stokHarian: number | null;
  stokSisa: number | null;
  terjualHarian: number | null;
}

export interface StatsProduk {
  totalProduk: number;
  totalAktif: number;
  stokRendah: number;
  stokHabis: number;
  totalTitipan: number;
  titipanTerjual: number;
}

export interface CreateProdukPayload {
  nama: string;
  harga: number;
  stok: number;
  kategori: string;
  jenisKemasan?: "plastik" | "kertas" | "tanpa_kemasan" | null;
  isTitipan?: boolean;
  stokHarian?: number;
}

export interface UpdateProdukPayload extends Partial<CreateProdukPayload> {
  isActive?: boolean;
}

export interface QueryProduk {
  kategori?: string;
  search?: string;
  isActive?: boolean;
  isTitipan?: boolean;
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
const TTL = 3 * 60 * 1000;
let _cache: { data: ProdukItem[]; ts: number } | null = null;
let _statsCache: { data: StatsProduk; ts: number } | null = null;
let _kategoriCache: { data: string[]; ts: number } | null = null;

function unwrapResponseData<T>(raw: any): T | null {
  const lvl1 = raw?.data;
  if (lvl1 === undefined) return null;
  if (lvl1 && typeof lvl1 === "object" && "success" in lvl1) {
    return (lvl1 as any).data ?? null;
  }
  return lvl1 as T;
}

export function clearProdukCache() {
  _cache = null;
  _statsCache = null;
  _kategoriCache = null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getAllProduk(
  query: QueryProduk = {},
  force = false,
): Promise<ProdukItem[]> {
  // Cache hanya untuk query kosong (tampilan default)
  const isDefaultQuery = !query.kategori && !query.search && query.isActive === undefined && query.isTitipan === undefined;
  if (isDefaultQuery && !force && _cache && Date.now() - _cache.ts < TTL) {
    return _cache.data;
  }

  const params = new URLSearchParams();
  if (query.kategori) params.set("kategori", query.kategori);
  if (query.search) params.set("search", query.search);
  if (query.isActive !== undefined) params.set("isActive", String(query.isActive));
  if (query.isTitipan !== undefined) params.set("isTitipan", String(query.isTitipan));

  const url = `/produk${params.toString() ? "?" + params.toString() : ""}`;
  const res = await api.get(url);
  if (!res.data?.success) throw new Error("Gagal mengambil produk");
  const data = unwrapResponseData<ProdukItem[]>(res.data);
  if (!Array.isArray(data)) {
    console.error("Format data produk tidak valid:", res.data);
    return [];
  }

  if (isDefaultQuery) _cache = { data, ts: Date.now() };
  return data;
}

export async function getStatsProduk(force = false): Promise<StatsProduk> {
  if (!force && _statsCache && Date.now() - _statsCache.ts < TTL) {
    return _statsCache.data;
  }
  const res = await api.get("/produk/stats");
  if (!res.data?.success) throw new Error("Gagal mengambil statistik");
  const data = unwrapResponseData<StatsProduk>(res.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format statistik produk tidak valid");
  }
  _statsCache = { data, ts: Date.now() };
  return data;
}

export async function getKategoriProduk(): Promise<string[]> {
  if (_kategoriCache && Date.now() - _kategoriCache.ts < TTL) {
    return _kategoriCache.data;
  }
  const res = await api.get("/produk/kategori");
  if (!res.data?.success) throw new Error("Gagal mengambil kategori");
  const data = unwrapResponseData<string[]>(res.data);
  if (!Array.isArray(data)) {
    console.error("Format kategori produk tidak valid:", res.data);
    return [];
  }
  _kategoriCache = { data, ts: Date.now() };
  return data;
}

export async function createProduk(payload: CreateProdukPayload): Promise<ProdukItem> {
  const res = await api.post("/produk", payload);
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal menambah produk");
  const data = unwrapResponseData<ProdukItem>(res.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format data produk tidak valid");
  }
  clearProdukCache();
  return data;
}

export async function updateProduk(id: number, payload: UpdateProdukPayload): Promise<ProdukItem> {
  const res = await api.patch(`/produk/${id}`, payload);
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal update produk");
  const data = unwrapResponseData<ProdukItem>(res.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format data produk tidak valid");
  }
  clearProdukCache();
  return data;
}

export async function patchStok(id: number, stok: number): Promise<void> {
  const res = await api.patch(`/produk/${id}/stok`, { stok });
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal update stok");
  clearProdukCache();
}

export async function resetStokHarian(id: number, stokHarian: number): Promise<ProdukItem> {
  const res = await api.patch(`/produk/${id}/reset-harian`, { stokHarian });
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal reset stok harian");
  const data = unwrapResponseData<ProdukItem>(res.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format data produk tidak valid");
  }
  clearProdukCache();
  return data;
}

export async function deleteProduk(id: number): Promise<void> {
  const res = await api.delete(`/produk/${id}`);
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal hapus produk");
  clearProdukCache();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function stokStatus(stok: number): "habis" | "rendah" | "cukup" {
  if (stok === 0) return "habis";
  if (stok <= 10) return "rendah";
  return "cukup";
}

export function stokColor(stok: number): string {
  const s = stokStatus(stok);
  return s === "habis" ? "#ef4444" : s === "rendah" ? "#f59e0b" : "#10b981";
}

export function stokPct(stok: number, max = 50): number {
  return Math.min(100, Math.round((stok / max) * 100));
}

export function kemasanLabel(k: string | null): string {
  return { plastik: "Plastik 🛍️", kertas: "Kertas 📦", tanpa_kemasan: "Tanpa Kemasan ✅" }[k ?? ""] ?? "-";
}

export function titipanPct(terjual: number | null, total: number | null): number {
  if (!total || !terjual) return 0;
  return Math.min(100, Math.round((terjual / total) * 100));
}

// Filter produk di sisi client (untuk search & tab instant)
export function filterProduk(
  list: ProdukItem[],
  { search, kategori, showInaktif }: { search: string; kategori: string; showInaktif: boolean },
): ProdukItem[] {
  if (!Array.isArray(list)) return [];
  return list.filter((p) => {
    const matchSearch = !search || p.nama.toLowerCase().includes(search.toLowerCase());
    const matchKat = !kategori || kategori === "semua" || p.kategori === kategori;
    const matchAktif = showInaktif ? true : p.isActive;
    return matchSearch && matchKat && matchAktif;
  });
}
