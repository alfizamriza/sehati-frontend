import api from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface ProfilSiswa {
  nis: string;
  nama: string;
  kelas: string;
  tingkat: number;
  namaKelas: string;
  coins: number;
  streak: number;
  lastStreakDate: string | null;
  joinDate: string;
  fotoUrl: string | null;
  rankingKelas: number;
  rankingSekolah: number;
  totalTumbler: number;
  totalPelanggaran: number;
}

export interface ProfilAchievement {
  id: number;
  nama: string;
  deskripsi: string | null;
  tipe: string;
  icon: string;
  badgeColor: string;
  unlockedAt: string;
}

export interface ProfilVoucher {
  id: string;
  kodeVoucher: string;
  namaVoucher: string;
  tanggalBerlaku: string;
  tanggalBerakhir: string;
  nominalVoucher: number;
  tipeVoucher: "fixed" | "percentage";
  status: string;
  usedAt: string | null;
}

export interface ProfilData {
  profil: ProfilSiswa;
  achievements: ProfilAchievement[];
  vouchers: ProfilVoucher[];
}

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 menit
let _cache: { data: ProfilData; ts: number } | null = null;

export function clearProfilCache() { _cache = null; }
export function isProfilCached() {
  return !!_cache && Date.now() - _cache.ts < CACHE_TTL;
}

// ─── API ─────────────────────────────────────────────────────────────────────
export async function getProfil(forceRefresh = false): Promise<ProfilData> {
  if (!forceRefresh && _cache && Date.now() - _cache.ts < CACHE_TTL) {
    return _cache.data;
  }
  const res = await api.get("/profil");
  if (!res.data?.success) throw new Error("Gagal mengambil profil");

  let payload: any = res.data;
  while (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    payload = (payload as ApiEnvelope).data;
  }

  const normalized: ProfilData = {
    profil: {
      nis: payload?.profil?.nis ?? "",
      nama: payload?.profil?.nama ?? "-",
      kelas: payload?.profil?.kelas ?? "-",
      tingkat: Number(payload?.profil?.tingkat ?? 0),
      namaKelas: payload?.profil?.namaKelas ?? "-",
      coins: Number(payload?.profil?.coins ?? 0),
      streak: Number(payload?.profil?.streak ?? 0),
      lastStreakDate: payload?.profil?.lastStreakDate ?? null,
      joinDate: payload?.profil?.joinDate ?? "-",
      fotoUrl: payload?.profil?.fotoUrl ?? null,
      rankingKelas: Number(payload?.profil?.rankingKelas ?? 0),
      rankingSekolah: Number(payload?.profil?.rankingSekolah ?? 0),
      totalTumbler: Number(payload?.profil?.totalTumbler ?? 0),
      totalPelanggaran: Number(payload?.profil?.totalPelanggaran ?? 0),
    },
    achievements: Array.isArray(payload?.achievements) ? payload.achievements : [],
    vouchers: Array.isArray(payload?.vouchers)
      ? payload.vouchers.map((v: any) => ({
          id: String(v?.id ?? ""),
          kodeVoucher: v?.kodeVoucher ?? "-",
          namaVoucher: v?.namaVoucher ?? "-",
          tanggalBerlaku: v?.tanggalBerlaku ?? "-",
          tanggalBerakhir: v?.tanggalBerakhir ?? "-",
          nominalVoucher: Number(v?.nominalVoucher ?? 0),
          tipeVoucher: v?.tipeVoucher === "percentage" ? "percentage" : "fixed",
          status: v?.status ?? "available",
          usedAt: v?.usedAt ?? null,
        }))
      : [],
  };

  _cache = { data: normalized, ts: Date.now() };
  return normalized;
}

/**
 * Upload foto:
 * 1. Minta signed URL dari backend
 * 2. PUT file langsung ke Supabase Storage
 * 3. PATCH URL ke backend
 */
export async function uploadFotoProfil(file: File): Promise<string> {
  // Step 1: signed URL
  const mime = file.type || "image/jpeg";
  const urlRes = await api.get(`/profil/upload-url?mime=${encodeURIComponent(mime)}`);
  if (!urlRes.data?.success) throw new Error("Gagal mendapatkan URL upload");
  const { uploadUrl, publicUrl } = urlRes.data.data;

  // Step 2: upload langsung ke Supabase Storage
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Gagal upload foto ke storage");

  // Step 3: simpan URL ke database
  const patchRes = await api.patch("/profil/foto", { fotoUrl: publicUrl });
  if (!patchRes.data?.success) throw new Error("Gagal menyimpan URL foto");

  // Update cache
  if (_cache) {
    _cache.data.profil.fotoUrl = publicUrl;
    _cache.ts = Date.now();
  }

  return publicUrl;
}

export async function updatePassword(passwordLama: string, passwordBaru: string): Promise<void> {
  const res = await api.patch("/profil/password", { passwordLama, passwordBaru });
  if (!res.data?.success) throw new Error(res.data?.message || "Gagal mengubah password");
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function formatJoinDate(dateStr: string): string {
  if (!dateStr || dateStr === "-") return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } catch { return dateStr; }
}

export function getBadgeStyle(color: string): { bg: string; border: string; text: string } {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    blue:   { bg: "rgba(23,158,255,0.12)",  border: "rgba(23,158,255,0.3)",  text: "#179EFF" },
    green:  { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#10b981" },
    yellow: { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  text: "#F59E0B" },
    red:    { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   text: "#EF4444" },
    purple: { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)",  text: "#8B5CF6" },
    orange: { bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)",  text: "#F97316" },
  };
  return map[color] ?? map.blue;
}
