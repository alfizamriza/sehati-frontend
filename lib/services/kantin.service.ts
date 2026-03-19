import api from '@/lib/api';

// ============================================
// TYPES
// ============================================

export type JenisKemasan = 'plastik' | 'kertas' | 'tanpa_kemasan';

export interface Produk {
  id: number;
  nama: string;
  harga: number;
  stok: number;
  kategori: string;
  jenisKemasan: JenisKemasan | null;
  statusAktif: boolean;
  createdAt?: string;
}

export interface Kantin {
  id: number;
  nama: string;
  username: string;
  noHp: string | null;
  statusAktif: boolean;
  jumlahProduk: number;
  createdAt?: string;
}

export interface KantinDetail extends Omit<Kantin, 'jumlahProduk'> {
  produk: Produk[];
}

export interface CreateKantinDto {
  nama: string;
  username: string;
  password: string;
  noHp?: string;
  statusAktif?: boolean;
}

export interface UpdateKantinDto {
  nama?: string;
  username?: string;
  password?: string;
  noHp?: string;
  statusAktif?: boolean;
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
    typeof current === 'object' &&
    'success' in current &&
    'data' in current
  ) {
    current = (current as ApiEnvelope).data;
  }
  return current;
}

// ============================================
// CACHE
// ============================================

let cachedKantin: Kantin[] | null = null;

export function getCachedKantin(): Kantin[] | null {
  return cachedKantin;
}

// ============================================
// API FUNCTIONS
// ============================================

export async function getKantin(options?: { forceRefresh?: boolean }): Promise<Kantin[]> {
  if (!options?.forceRefresh && cachedKantin) {
    return cachedKantin;
  }

  try {
    const res = await api.get<ApiResponse<Kantin[]>>('/kantin');

    if (!res.data.success) {
      throw new Error('Gagal mengambil data kantin');
    }

    const payload = unwrapEnvelope(res.data);
    cachedKantin = Array.isArray(payload) ? (payload as Kantin[]) : [];
    return cachedKantin;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Gagal mengambil data kantin');
  }
}

export async function getKantinDetail(id: number): Promise<KantinDetail> {
  try {
    const res = await api.get(`/kantin/${id}`);
    if (res.data.success) {
      const payload = unwrapEnvelope(res.data);
      return payload as KantinDetail;
    }
    throw new Error('Kantin tidak ditemukan');
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Gagal mengambil detail kantin');
  }
}

export async function createKantin(data: CreateKantinDto): Promise<void> {
  try {
    const res = await api.post('/kantin', data);
    if (res.data.success) {
      cachedKantin = null;
      return;
    }
    throw new Error('Gagal menambahkan kantin');
  } catch (err: any) {
    if (err.response?.status === 409) {
      throw new Error(`Username "${data.username}" sudah digunakan`);
    }
    throw new Error(err.response?.data?.message || 'Gagal menambahkan kantin');
  }
}

export async function updateKantin(id: number, data: UpdateKantinDto): Promise<void> {
  try {
    const res = await api.put(`/kantin/${id}`, data);
    if (res.data.success) {
      cachedKantin = null;
      return;
    }
    throw new Error('Gagal mengupdate kantin');
  } catch (err: any) {
    if (err.response?.status === 409) {
      throw new Error('Username sudah digunakan akun lain');
    }
    throw new Error(err.response?.data?.message || 'Gagal mengupdate kantin');
  }
}

export async function deleteKantin(id: number): Promise<void> {
  try {
    const res = await api.delete(`/kantin/${id}`);
    if (res.data.success) {
      cachedKantin = null;
      return;
    }
    throw new Error('Gagal menghapus kantin');
  } catch (err: any) {
    throw new Error(err.response?.data?.message || 'Gagal menghapus kantin');
  }
}

export async function updateKantinPassword(passwordLama: string, passwordBaru: string): Promise<void> {
  try {
    const response = await api.patch('/kantin/password', {
      passwordLama,
      passwordBaru,
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Gagal mengubah password kantin');
    }
  } catch (error: any) {
    console.error('Error updating kantin password:', error);
    throw new Error(
      error.response?.data?.message || error.message || 'Gagal mengubah password kantin',
    );
  }
}
