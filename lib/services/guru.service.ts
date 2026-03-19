import api from '@/lib/api';

// ============================================
// TYPES
// ============================================

export type PeranGuru = 'guru_mapel' | 'wali_kelas' | 'konselor';

export interface KelasWali {
  id: number;
  nama: string;
  tingkat: number;
  label: string; // "XI-RPL"
}

export interface Guru {
  nip: string;
  nama: string;
  mataPelajaran: string | null;
  peran: PeranGuru;
  kelasWali: KelasWali | null;
  statusAktif: boolean;
  createdAt?: string;
}

export interface KelasOption {
  id: number;
  label: string;
  tingkat: number;
  nama: string;
}

export interface CreateGuruDto {
  nip: string;
  nama: string;
  password: string;
  mataPelajaran?: string;
  peran: PeranGuru;
  kelasWaliId?: number;
  statusAktif?: boolean;
}

export interface UpdateGuruDto {
  nama?: string;
  password?: string;
  mataPelajaran?: string;
  peran?: PeranGuru;
  kelasWaliId?: number | null;
  statusAktif?: boolean;
}

// ============================================
// CACHE
// ============================================

let cachedGuru: Guru[] | null = null;

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapEnvelope(payload: unknown): unknown {
  let current: any = payload;
  while (
    current &&
    typeof current === 'object' &&
    'success' in current &&
    'data' in current
  ) {
    current = (current as ApiEnvelope).data;
  }
  return current;
}

export function getCachedGuru(): Guru[] | null {
  return cachedGuru;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all guru
 */
export async function getGuru(options?: { forceRefresh?: boolean }): Promise<Guru[]> {
  if (!options?.forceRefresh && cachedGuru) {
    return cachedGuru;
  }

  try {
    const response = await api.get('/guru');

    if (response.data.success) {
      const payload = unwrapEnvelope(response.data);
      cachedGuru = Array.isArray(payload) ? (payload as Guru[]) : [];
      return cachedGuru;
    }

    throw new Error('Gagal mengambil data guru');
  } catch (error: any) {
    console.error('Error fetching guru:', error);
    throw new Error(error.response?.data?.message || 'Gagal mengambil data guru');
  }
}

/**
 * Get kelas yang belum punya wali kelas (untuk dropdown)
 * excludeKelasWaliId: ID kelas yang sudah dipegang guru ini (saat edit)
 */
export async function getKelasTersedia(excludeKelasWaliId?: number): Promise<KelasOption[]> {
  try {
    const params = excludeKelasWaliId
      ? `?excludeKelasWaliId=${excludeKelasWaliId}`
      : '';

    const response = await api.get(`/guru/kelas-tersedia${params}`);

    if (response.data.success) {
      const payload = unwrapEnvelope(response.data);
      return Array.isArray(payload) ? (payload as KelasOption[]) : [];
    }

    return [];
  } catch (error: any) {
    console.error('Error fetching kelas tersedia:', error);
    return [];
  }
}

/**
 * Create new guru
 */
export async function createGuru(data: CreateGuruDto): Promise<void> {
  try {
    const response = await api.post('/guru', data);

    if (response.data.success) {
      cachedGuru = null;
      return;
    }

    throw new Error('Gagal menambahkan guru');
  } catch (error: any) {
    console.error('Error creating guru:', error);

    if (error.response?.status === 409) {
      throw new Error(`NIP ${data.nip} sudah terdaftar`);
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Data tidak valid');
    }

    throw new Error(error.response?.data?.message || 'Gagal menambahkan guru');
  }
}

/**
 * Update guru
 */
export async function updateGuru(nip: string, data: UpdateGuruDto): Promise<void> {
  try {
    const response = await api.put(`/guru/${nip}`, data);

    if (response.data.success) {
      cachedGuru = null; // invalidate cache
      return;
    }

    throw new Error('Gagal mengupdate guru');
  } catch (error: any) {
    console.error('Error updating guru:', error);

    if (error.response?.status === 404) {
      throw new Error('Guru tidak ditemukan');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Data tidak valid');
    }

    throw new Error(error.response?.data?.message || 'Gagal mengupdate guru');
  }
}

/**
 * Delete guru
 */
export async function deleteGuru(nip: string): Promise<void> {
  try {
    const response = await api.delete(`/guru/${nip}`);

    if (response.data.success) {
      cachedGuru = null; // invalidate cache
      return;
    }

    throw new Error('Gagal menghapus guru');
  } catch (error: any) {
    console.error('Error deleting guru:', error);

    if (error.response?.status === 404) {
      throw new Error('Guru tidak ditemukan');
    }

    throw new Error(error.response?.data?.message || 'Gagal menghapus guru');
  }
}

export async function updateGuruPassword(passwordLama: string, passwordBaru: string): Promise<void> {
  try {
    const response = await api.patch('/guru/password', {
      passwordLama,
      passwordBaru,
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Gagal mengubah password guru');
    }
  } catch (error: any) {
    console.error('Error updating guru password:', error);
    throw new Error(error.response?.data?.message || error.message || 'Gagal mengubah password guru');
  }
}
