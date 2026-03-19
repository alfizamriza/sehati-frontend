// lib/services/settings.service.ts
import api from "@/lib/api";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Pengaturan {
  key: string;
  value: string;
  label?: string;
  tipe?: "text" | "number" | "boolean" | "date";
  deskripsi?: string;
  updated_at?: string;
}

export interface TanggalLibur {
  id: number;
  tanggal: string;
  keterangan: string;
  is_active: boolean;
  created_at?: string;
}

export interface JenisPelanggaran {
  id: number;
  nama: string;
  kategori: "ringan" | "sedang" | "berat";
  bobot_coins: number;
  deskripsi?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Achievement {
  id: number;
  nama: string;
  deskripsi?: string;
  tipe: "streak" | "coins" | "tumbler" | "pelanggaran" | "transaksi";
  target_value: number;
  pelanggaran_mode?: "count" | "no_violation_days" | null;
  pelanggaran_period_days?: number | null;
  icon?: string;
  badge_color?: string;
  coins_reward: number;
  is_active: boolean;
  created_at?: string;
  // === BARU ===
  voucher_reward: boolean;
  voucher_nominal?: number | null;
  voucher_tipe_voucher?: "percentage" | "fixed" | null;
}

type AchievementPayload = {
  nama: string;
  deskripsi?: string;
  tipe: "streak" | "coins" | "tumbler" | "pelanggaran" | "transaksi";
  target_value: number;
  pelanggaran_mode?: "count" | "no_violation_days" | null;
  pelanggaran_period_days?: number | null;
  icon?: string;
  badge_color?: string;
  coins_reward?: number;
  is_active?: boolean;
  voucher_reward?: boolean;
  voucher_nominal?: number | null;
  voucher_tipe_voucher?: "percentage" | "fixed" | null;
};

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────

const cache: {
  pengaturan?: Pengaturan[];
  libur?: TanggalLibur[];
  pelanggaran?: JenisPelanggaran[];
  achievement?: Achievement[];
} = {};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export function invalidateCache(key?: keyof typeof cache) {
  if (key) {
    delete cache[key];
  } else {
    delete cache.pengaturan;
    delete cache.libur;
    delete cache.pelanggaran;
    delete cache.achievement;
  }
}

// ─── HELPER ──────────────────────────────────────────────────────────────────

function extractError(error: unknown): string {
  const err = error as any;
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Terjadi kesalahan"
  );
}

function unwrapData<T>(payload: unknown): T {
  const body = payload as ApiEnvelope<T>;
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }
  return payload as T;
}

// ─── PENGATURAN (key-value) ───────────────────────────────────────────────────

export async function getAllPengaturan(force = false): Promise<Pengaturan[]> {
  if (!force && cache.pengaturan) return cache.pengaturan;
  try {
    const res = await api.get("/pengaturan");
    const data = unwrapData<Pengaturan[]>(res.data);
    cache.pengaturan = data;
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function updatePengaturan(key: string, value: string): Promise<Pengaturan> {
  try {
    const res = await api.patch(`/pengaturan/${key}`, { value });
    const data = unwrapData<Pengaturan>(res.data);
    if (cache.pengaturan) {
      cache.pengaturan = cache.pengaturan.map((s) =>
        s.key === key ? { ...s, value, updated_at: new Date().toISOString() } : s
      );
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function bulkUpdatePengaturan(
  items: { key: string; value: string }[]
): Promise<{ updated: number }> {
  try {
    const res = await api.patch("/pengaturan", { items });
    const data = unwrapData<{ updated: number }>(res.data);
    if (cache.pengaturan) {
      const map = Object.fromEntries(items.map((i) => [i.key, i.value]));
      cache.pengaturan = cache.pengaturan.map((s) =>
        map[s.key] !== undefined
          ? { ...s, value: map[s.key], updated_at: new Date().toISOString() }
          : s
      );
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

// ─── TANGGAL LIBUR ────────────────────────────────────────────────────────────

export async function getAllLibur(force = false): Promise<TanggalLibur[]> {
  if (!force && cache.libur) return cache.libur;
  try {
    const res = await api.get("/pengaturan/libur/list");
    const data = unwrapData<TanggalLibur[]>(res.data);
    cache.libur = data;
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function createLibur(dto: {
  tanggal: string;
  keterangan: string;
}): Promise<TanggalLibur> {
  try {
    const res = await api.post("/pengaturan/libur", {
      ...dto,
      is_active: true,
    });
    const data = unwrapData<TanggalLibur>(res.data);
    if (cache.libur) {
      cache.libur = [...cache.libur, data].sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
      );
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function updateLibur(
  id: number,
  dto: Partial<Omit<TanggalLibur, "id" | "created_at">>
): Promise<TanggalLibur> {
  try {
    const res = await api.patch(`/pengaturan/libur/${id}`, dto);
    const data = unwrapData<TanggalLibur>(res.data);
    if (cache.libur) {
      cache.libur = cache.libur
        .map((h) => (h.id === id ? data : h))
        .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function toggleLiburActive(id: number): Promise<TanggalLibur> {
  try {
    const res = await api.patch(`/pengaturan/libur/${id}/toggle`);
    const data = unwrapData<TanggalLibur>(res.data);
    if (cache.libur) {
      cache.libur = cache.libur.map((h) => (h.id === id ? data : h));
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function deleteLibur(id: number): Promise<{ message: string }> {
  try {
    const res = await api.delete(`/pengaturan/libur/${id}`);
    const data = unwrapData<{ message: string }>(res.data);
    if (cache.libur) {
      cache.libur = cache.libur.filter((h) => h.id !== id);
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

// ─── JENIS PELANGGARAN ────────────────────────────────────────────────────────

export async function getAllPelanggaran(
  kategori?: string,
  force = false
): Promise<JenisPelanggaran[]> {
  if (!kategori) {
    if (!force && cache.pelanggaran) return cache.pelanggaran;
    try {
      const res = await api.get("/pengaturan/pelanggaran/list");
      const data = unwrapData<JenisPelanggaran[]>(res.data);
      cache.pelanggaran = data;
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  }
  if (!force && cache.pelanggaran) {
    return cache.pelanggaran.filter((p) => p.kategori === kategori);
  }
  try {
    const res = await api.get(
      "/pengaturan/pelanggaran/list",
      { params: { kategori } }
    );
    const data = unwrapData<JenisPelanggaran[]>(res.data);
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function createPelanggaran(
  dto: Omit<JenisPelanggaran, "id" | "created_at">
): Promise<JenisPelanggaran> {
  try {
    const res = await api.post("/pengaturan/pelanggaran", dto);
    const data = unwrapData<JenisPelanggaran>(res.data);
    if (cache.pelanggaran) {
      cache.pelanggaran = [...cache.pelanggaran, data];
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function updatePelanggaran(
  id: number,
  dto: Partial<Omit<JenisPelanggaran, "id" | "created_at">>
): Promise<JenisPelanggaran> {
  try {
    const res = await api.patch(`/pengaturan/pelanggaran/${id}`, dto);
    const data = unwrapData<JenisPelanggaran>(res.data);
    if (cache.pelanggaran) {
      cache.pelanggaran = cache.pelanggaran.map((p) => (p.id === id ? data : p));
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function togglePelanggaranActive(id: number): Promise<JenisPelanggaran> {
  try {
    const res = await api.patch(`/pengaturan/pelanggaran/${id}/toggle`);
    const data = unwrapData<JenisPelanggaran>(res.data);
    if (cache.pelanggaran) {
      cache.pelanggaran = cache.pelanggaran.map((p) => (p.id === id ? data : p));
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function deletePelanggaran(id: number): Promise<{ message: string }> {
  try {
    const res = await api.delete(`/pengaturan/pelanggaran/${id}`);
    const data = unwrapData<{ message: string }>(res.data);
    if (cache.pelanggaran) {
      cache.pelanggaran = cache.pelanggaran.filter((p) => p.id !== id);
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

// ─── ACHIEVEMENT ──────────────────────────────────────────────────────────────

export async function getAllAchievement(
  tipe?: string,
  force = false
): Promise<Achievement[]> {
  if (!tipe) {
    if (!force && cache.achievement) return cache.achievement;
    try {
      const res = await api.get("/pengaturan/achievement/list");
      const data = unwrapData<Achievement[]>(res.data);
      cache.achievement = data;
      return data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  }
  if (!force && cache.achievement) {
    return cache.achievement.filter((a) => a.tipe === tipe);
  }
  try {
    const res = await api.get("/pengaturan/achievement/list", {
      params: { tipe },
    });
    const data = unwrapData<Achievement[]>(res.data);
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function createAchievement(
  dto: Omit<Achievement, "id" | "created_at">
): Promise<Achievement> {
  try {
    const payload: AchievementPayload = {
      nama: dto.nama,
      deskripsi: dto.deskripsi,
      tipe: dto.tipe,
      target_value: Number(dto.target_value ?? 0),
      icon: dto.icon,
      badge_color: dto.badge_color,
      coins_reward: Number(dto.coins_reward ?? 0),
      voucher_reward: Boolean(dto.voucher_reward),
      voucher_nominal: dto.voucher_reward ? Number(dto.voucher_nominal ?? 0) : null,
      voucher_tipe_voucher: dto.voucher_reward ? (dto.voucher_tipe_voucher ?? null) : null,
      pelanggaran_mode: dto.tipe === "pelanggaran" ? (dto.pelanggaran_mode ?? "count") : null,
      pelanggaran_period_days:
        dto.tipe === "pelanggaran" && (dto.pelanggaran_mode ?? "count") === "no_violation_days"
          ? Number(dto.pelanggaran_period_days ?? 0)
          : null,
    };
    if (dto.is_active !== undefined) payload.is_active = dto.is_active;
    const res = await api.post("/pengaturan/achievement", payload);
    const data = unwrapData<Achievement>(res.data);
    if (cache.achievement) {
      cache.achievement = [...cache.achievement, data];
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function updateAchievement(
  id: number,
  dto: Partial<Omit<Achievement, "id" | "created_at">>
): Promise<Achievement> {
  try {
    const payload: Partial<AchievementPayload> = {};
    if (dto.nama !== undefined) payload.nama = dto.nama;
    if (dto.deskripsi !== undefined) payload.deskripsi = dto.deskripsi;
    if (dto.tipe !== undefined) payload.tipe = dto.tipe;
    if (dto.target_value !== undefined) payload.target_value = Number(dto.target_value);
    if (dto.icon !== undefined) payload.icon = dto.icon;
    if (dto.badge_color !== undefined) payload.badge_color = dto.badge_color;
    if (dto.coins_reward !== undefined) payload.coins_reward = Number(dto.coins_reward);
    if (dto.is_active !== undefined) payload.is_active = Boolean(dto.is_active);
    if (dto.voucher_reward !== undefined) payload.voucher_reward = Boolean(dto.voucher_reward);
    if (dto.voucher_nominal !== undefined) payload.voucher_nominal = dto.voucher_nominal;
    if (dto.voucher_tipe_voucher !== undefined) payload.voucher_tipe_voucher = dto.voucher_tipe_voucher;
    if (dto.pelanggaran_mode !== undefined) payload.pelanggaran_mode = dto.pelanggaran_mode;
    if (dto.pelanggaran_period_days !== undefined) payload.pelanggaran_period_days = dto.pelanggaran_period_days;

    const res = await api.patch(`/pengaturan/achievement/${id}`, payload);
    const data = unwrapData<Achievement>(res.data);
    if (cache.achievement) {
      cache.achievement = cache.achievement.map((a) => (a.id === id ? data : a));
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function toggleAchievementActive(id: number): Promise<Achievement> {
  try {
    const res = await api.patch(`/pengaturan/achievement/${id}/toggle`);
    const data = unwrapData<Achievement>(res.data);
    if (cache.achievement) {
      cache.achievement = cache.achievement.map((a) => (a.id === id ? data : a));
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}

export async function deleteAchievement(id: number): Promise<{ message: string }> {
  try {
    const res = await api.delete(`/pengaturan/achievement/${id}`);
    const data = unwrapData<{ message: string }>(res.data);
    if (cache.achievement) {
      cache.achievement = cache.achievement.filter((a) => a.id !== id);
    }
    return data;
  } catch (e) {
    throw new Error(extractError(e));
  }
}
