import api from "@/lib/api";

/* =========================================================
   TYPES
========================================================= */

export type VoucherStatus = "available" | "used" | "expired";
export type TipeVoucher   = "percentage" | "fixed";

export interface Voucher {
  id: number;
  kodeVoucher: string;
  namaVoucher: string;
  tanggalBerlaku: string;
  tanggalBerakhir: string;
  penerima: { nis: string; nama: string; kelas: string | null } | null;
  nominalVoucher: number;
  tipeVoucher: TipeVoucher;
  status: VoucherStatus;
  usedAt: string | null;
  createdAt: string;
}

export interface VoucherStats {
  tersedia: number;
  sudahDitukar: number;
  kadaluarsa: number;
}

export interface VoucherListResponse {
  vouchers: Voucher[];
  stats: VoucherStats;
}

export interface CreateVoucherDto {
  namaVoucher: string;
  nis: string;
  tanggalBerlaku: string;
  tanggalBerakhir: string;
  nominalVoucher: number;
  tipeVoucher: TipeVoucher;
}

export interface UpdateVoucherDto {
  namaVoucher?: string;
  tanggalBerlaku?: string;
  tanggalBerakhir?: string;
  nominalVoucher?: number;
  tipeVoucher?: TipeVoucher;
  status?: VoucherStatus;
}

export interface SiswaDropdown {
  nis: string;
  nama: string;
  kelas: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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

function normalizeVoucherList(payload: unknown): VoucherListResponse {
  const source = (payload && typeof payload === "object" ? payload : {}) as Partial<VoucherListResponse>;
  return {
    vouchers: Array.isArray(source.vouchers) ? source.vouchers : [],
    stats: {
      tersedia: Number(source.stats?.tersedia ?? 0),
      sudahDitukar: Number(source.stats?.sudahDitukar ?? 0),
      kadaluarsa: Number(source.stats?.kadaluarsa ?? 0),
    },
  };
}

/* =========================================================
   CACHE
   - TTL 2 menit untuk voucher list (data relatif stabil)
   - TTL 5 menit untuk siswa dropdown (jarang berubah)
   - Cache otomatis invalid setelah mutasi (create/update/delete)
========================================================= */

const VOUCHER_TTL_MS = 2 * 60 * 1000; // 2 menit
const SISWA_TTL_MS   = 5 * 60 * 1000; // 5 menit

let voucherCache: { data: VoucherListResponse; at: number } | null = null;
let voucherInFlight: Promise<VoucherListResponse> | null = null;

let siswaCache: { data: SiswaDropdown[]; at: number } | null = null;
let siswaInFlight: Promise<SiswaDropdown[]> | null = null;

function isVoucherCacheValid() {
  return voucherCache !== null && Date.now() - voucherCache.at < VOUCHER_TTL_MS;
}

function isSiswaCacheValid() {
  return siswaCache !== null && Date.now() - siswaCache.at < SISWA_TTL_MS;
}

/** Buang cache voucher — dipanggil setelah mutasi */
function invalidateVoucherCache() {
  voucherCache = null;
  voucherInFlight = null;
}

/* =========================================================
   GET ALL VOUCHERS + STATS
========================================================= */

export async function getVouchers(forceRefresh = false): Promise<VoucherListResponse> {
  // Kembalikan cache kalau masih segar dan tidak dipaksa refresh
  if (!forceRefresh && isVoucherCacheValid()) {
    return voucherCache!.data;
  }

  // Deduplicate: kalau sudah ada request terbang, tunggu itu
  if (voucherInFlight) return voucherInFlight;

  voucherInFlight = api
    .get<ApiResponse<VoucherListResponse>>("/voucher")
    .then((res) => {
      if (!res.data.success) throw new Error("Gagal mengambil data voucher");
      const payload = unwrapEnvelope(res.data);
      const normalized = normalizeVoucherList(payload);
      voucherCache = { data: normalized, at: Date.now() };
      return normalized;
    })
    .catch((err: any) => {
      throw new Error(err.response?.data?.message || "Gagal mengambil data voucher");
    })
    .finally(() => {
      voucherInFlight = null;
    });

  return voucherInFlight;
}

/** Versi sinkron — ambil dari cache kalau ada, null kalau tidak */
export function getCachedVouchers(): VoucherListResponse | null {
  return isVoucherCacheValid() ? voucherCache!.data : null;
}

/* =========================================================
   GET DETAIL
========================================================= */

export async function getVoucherDetail(id: number): Promise<Voucher> {
  try {
    const res = await api.get<ApiResponse<Voucher>>(`/voucher/${id}`);
    if (!res.data.success) throw new Error("Voucher tidak ditemukan");
    return unwrapEnvelope(res.data) as Voucher;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Gagal mengambil detail voucher");
  }
}

/* =========================================================
   CREATE — invalid cache setelah berhasil
========================================================= */

export async function createVoucher(data: CreateVoucherDto): Promise<void> {
  try {
    const res = await api.post<ApiResponse<any>>("/voucher", data);
    if (!res.data.success) throw new Error("Gagal membuat voucher");
    invalidateVoucherCache();
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Gagal membuat voucher");
  }
}

/* =========================================================
   UPDATE — invalid cache setelah berhasil
========================================================= */

export async function updateVoucher(id: number, data: UpdateVoucherDto): Promise<void> {
  try {
    const res = await api.put<ApiResponse<any>>(`/voucher/${id}`, data);
    if (!res.data.success) throw new Error("Gagal mengupdate voucher");
    invalidateVoucherCache();
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Gagal mengupdate voucher");
  }
}

/* =========================================================
   DELETE — invalid cache setelah berhasil
========================================================= */

export async function deleteVoucher(id: number): Promise<void> {
  try {
    const res = await api.delete<ApiResponse<any>>(`/voucher/${id}`);
    if (!res.data.success) throw new Error("Gagal menghapus voucher");
    invalidateVoucherCache();
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Gagal menghapus voucher");
  }
}

/* =========================================================
   GET SISWA DROPDOWN — cache 5 menit
========================================================= */

export async function getSiswaDropdown(): Promise<SiswaDropdown[]> {
  if (isSiswaCacheValid()) return siswaCache!.data;
  if (siswaInFlight) return siswaInFlight;

  siswaInFlight = api
    .get<ApiResponse<SiswaDropdown[]>>("/voucher/siswa-dropdown")
    .then((res) => {
      if (!res.data.success) throw new Error("Gagal mengambil data siswa");
      const payload = unwrapEnvelope(res.data);
      const normalized = Array.isArray(payload) ? (payload as SiswaDropdown[]) : [];
      siswaCache = { data: normalized, at: Date.now() };
      return normalized;
    })
    .catch((err: any) => {
      throw new Error(err.response?.data?.message || "Gagal mengambil data siswa");
    })
    .finally(() => {
      siswaInFlight = null;
    });

  return siswaInFlight;
}
