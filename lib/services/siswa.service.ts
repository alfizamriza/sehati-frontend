import api from '@/lib/api';

// Types
export interface Siswa {
  nis: string;
  nama: string;
  kelas: string;           // Format: "XI-RPL"
  kelasId: number | null;
  statusAktif: boolean;
  permissions?: string[];
  coins: number;
  streak: number;
  createdAt?: string;
  lastStreakDate?: string;
}

export interface CreateSiswaDto {
  nis: string;
  nama: string;
  kelasId: number;
  password: string;
  statusAktif?: boolean;
  permissions?: string[];
}

export interface UpdateSiswaDto {
  nama?: string;
  kelasId?: number;
  password?: string;
  statusAktif?: boolean;
  permissions?: string[];
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    nis: string;
    error: string;
  }>;
}

// Cache
let cachedSiswa: Siswa[] | null = null;

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

function tingkatToRoman(tingkat: number): string {
  if (tingkat === 1) return 'I';
  if (tingkat === 2) return 'II';
  if (tingkat === 3) return 'III';
  if (tingkat === 4) return 'IV';
  if (tingkat === 5) return 'V';
  if (tingkat === 6) return 'VI';
  if (tingkat === 7) return 'VII';
  if (tingkat === 8) return 'VIII';
  if (tingkat === 9) return 'IX';
  if (tingkat === 10) return 'X';
  if (tingkat === 11) return 'XI';
  if (tingkat === 12) return 'XII';
  return String(tingkat);
}

function formatKelasLabel(rawKelas: string): string {
  const trimmed = (rawKelas || '').trim();
  if (!trimmed) return trimmed;

  // Match "8-RPL", "8 RPL", or just "8"
  const match = trimmed.match(/^(\d{1,2})([-\s].*)?$/);
  if (!match) return trimmed;

  const tingkat = Number(match[1]);
  const suffix = match[2] ?? '';
  return `${tingkatToRoman(tingkat)}${suffix}`;
}

function normalizeSiswa(item: Siswa): Siswa {
  return {
    ...item,
    kelas: formatKelasLabel(item.kelas),
  };
}

/**
 * Get cached siswa from memory
 */
export function getCachedSiswa(): Siswa[] | null {
  return cachedSiswa;
}

/**
 * Get all siswa
 */
export async function getSiswa(options?: { forceRefresh?: boolean }): Promise<Siswa[]> {
  // Return cache if exists and not forcing refresh
  if (!options?.forceRefresh && cachedSiswa) {
    return cachedSiswa;
  }

  try {
    const response = await api.get('/siswa');
    
    if (response.data.success) {
      const payload = unwrapEnvelope(response.data);
      const data: Siswa[] = Array.isArray(payload)
        ? payload.map((item: Siswa) => normalizeSiswa(item))
        : [];
      cachedSiswa = data;
      return data;
    }

    throw new Error('Gagal mengambil data siswa');
  } catch (error: any) {
    console.error('Error fetching siswa:', error);
    throw new Error(error.response?.data?.message || 'Gagal mengambil data siswa');
  }
}

/**
 * Get siswa by NIS
 */
export async function getSiswaByNis(nis: string): Promise<Siswa> {
  try {
    const response = await api.get(`/siswa/${nis}`);
    
    if (response.data.success) {
      const payload = unwrapEnvelope(response.data);
      return normalizeSiswa(payload as Siswa);
    }

    throw new Error('Siswa tidak ditemukan');
  } catch (error: any) {
    console.error('Error fetching siswa:', error);
    throw new Error(error.response?.data?.message || 'Gagal mengambil data siswa');
  }
}

/**
 * Create new siswa
 */
export async function createSiswa(data: CreateSiswaDto): Promise<Siswa> {
  try {
    const response = await api.post('/siswa', data);
    
    if (response.data.success) {
      // Invalidate cache
      cachedSiswa = null;
      const payload = unwrapEnvelope(response.data);
      return payload as Siswa;
    }

    throw new Error('Gagal menambahkan siswa');
  } catch (error: any) {
    console.error('Error creating siswa:', error);
    
    // Handle specific errors
    if (error.response?.status === 409) {
      throw new Error(`NIS ${data.nis} sudah terdaftar`);
    }
    if (error.response?.status === 404) {
      throw new Error('Kelas tidak ditemukan');
    }
    
    throw new Error(error.response?.data?.message || 'Gagal menambahkan siswa');
  }
}

/**
 * Update siswa
 */
export async function updateSiswa(nis: string, data: UpdateSiswaDto): Promise<void> {
  try {
    const response = await api.put(`/siswa/${nis}`, data);
    
    if (response.data.success) {
      // Invalidate cache
      cachedSiswa = null;
      return;
    }

    throw new Error('Gagal mengupdate siswa');
  } catch (error: any) {
    console.error('Error updating siswa:', error);
    
    // Handle specific errors
    if (error.response?.status === 404) {
      throw new Error('Siswa atau kelas tidak ditemukan');
    }
    
    throw new Error(error.response?.data?.message || 'Gagal mengupdate siswa');
  }
}

/**
 * Delete siswa
 */
export async function deleteSiswa(nis: string): Promise<void> {
  try {
    const response = await api.delete(`/siswa/${nis}`);
    
    if (response.data.success) {
      // Invalidate cache
      cachedSiswa = null;
      return;
    }

    throw new Error('Gagal menghapus siswa');
  } catch (error: any) {
    console.error('Error deleting siswa:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Siswa tidak ditemukan');
    }
    
    throw new Error(error.response?.data?.message || 'Gagal menghapus siswa');
  }
}

/**
 * Import siswa from Excel
 */
export async function importSiswa(file: File): Promise<ImportResult> {
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await api.post('/siswa/import', formData);
    
    if (response.data.success) {
      // Invalidate cache
      cachedSiswa = null;
      const payload = unwrapEnvelope(response.data);
      return payload as ImportResult;
    }

    throw new Error(response.data?.message || 'Gagal import siswa');
  } catch (error: any) {
    console.error('Error importing siswa:', error);
    throw new Error(error.response?.data?.message || 'Gagal import siswa');
  }
}

/**
 * Download Excel template
 */
export async function downloadTemplate(): Promise<void> {
  try {
    const response = await api.get('/siswa/import-template', {
      responseType: 'blob',
    });
    const contentType =
      (response.headers['content-type'] as string | undefined) ||
      response.data?.type ||
      'application/octet-stream';
    const blob = new Blob([response.data], {
      type: contentType,
    });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const disposition = response.headers['content-disposition'] as
      | string
      | undefined;
    const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);
    const fallbackFilename =
      contentType.includes('text/csv') || contentType.includes('application/csv')
        ? 'template_import_siswa.csv'
        : 'template_import_siswa.xlsx';
    link.download = filenameMatch?.[1] || fallbackFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error creating template excel:', error);
    const axiosError = error as any;
    const blobData = axiosError?.response?.data;
    if (blobData instanceof Blob) {
      const text = await blobData.text();
      try {
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || 'Gagal download template');
      } catch {
        throw new Error(text || 'Gagal download template');
      }
    }
    throw new Error(axiosError?.response?.data?.message || 'Gagal download template');
  }
}
