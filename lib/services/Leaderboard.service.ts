// services/leaderboard.service.ts
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapData<T>(payload: unknown): T {
  const body = payload as ApiEnvelope<T>;
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }
  return payload as T;
}

// ─────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────
export interface LeaderboardSiswaRow {
  rank: number;
  nis: string;
  nama: string;
  kelas: string;
  jenjang: string;
  coins: number;
  streak: number;
  is_me: boolean;
  fotoUrl: string | null;
}

export interface LeaderboardKelasRow {
  rank: number;
  kelas_id: number;
  nama_kelas: string;
  tingkat: string;
  jenjang: string;
  total_coins: number;
  avg_coins: number;
  jumlah_siswa: number;
  is_my_class: boolean;
}

export interface LeaderboardJenjangRow {
  rank: number;
  jenjang: string;
  avg_coins: number;
  total_siswa: number;
  total_coins: number;
}

// ─────────────────────────────────────────────
// ADDITIONAL ACTIONS
// ─────────────────────────────────────────────
export async function exportLeaderboardPdf(params: { type: string; kelas_id?: string; jenjang?: string; }) {
  const { type, kelas_id, jenjang } = params;
  const response = await api.get('/leaderboard/export', {
    params: { type, kelas_id, jenjang },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leaderboard_${type}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// QUERY KEYS
// ─────────────────────────────────────────────
export const leaderboardKeys = {
  all:               ['leaderboard'] as const,
  kelasSaya:         ()              => [...leaderboardKeys.all, 'kelas-saya']              as const,
  antarKelas:        (jenjang?: string) => [...leaderboardKeys.all, 'antar-kelas', jenjang] as const,
  sekolah:           ()              => [...leaderboardKeys.all, 'sekolah']                 as const,
  antarJenjang:      ()              => [...leaderboardKeys.all, 'antar-jenjang']           as const,
  siswaAntarJenjang: (jenjang?: string) => [...leaderboardKeys.all, 'siswa-antar-jenjang', jenjang] as const,
};

// ─────────────────────────────────────────────
// FETCH FUNCTIONS — semua pakai instance `api` dari @/lib/api
// Token JWT otomatis disertakan via request interceptor yang sudah ada
// ─────────────────────────────────────────────
const fetchKelasSaya = async (): Promise<LeaderboardSiswaRow[]> => {
  const res = await api.get('/leaderboard/kelas-saya');
  const data = unwrapData<LeaderboardSiswaRow[]>(res.data);
  return data;
};

const fetchAntarKelas = async (jenjang?: string): Promise<LeaderboardKelasRow[]> => {
  const res = await api.get('/leaderboard/antar-kelas', {
    params: jenjang ? { jenjang } : undefined,
  });
  const data = unwrapData<LeaderboardKelasRow[]>(res.data);
  return data;
};

const fetchSekolah = async (): Promise<LeaderboardSiswaRow[]> => {
  const res = await api.get('/leaderboard/sekolah');
  const data = unwrapData<LeaderboardSiswaRow[]>(res.data);
  return data;
};

const fetchAntarJenjang = async (): Promise<LeaderboardJenjangRow[]> => {
  const res = await api.get('/leaderboard/antar-jenjang');
  const data = unwrapData<LeaderboardJenjangRow[]>(res.data);
  return data;
};

const fetchSiswaAntarJenjang = async (jenjang?: string): Promise<LeaderboardSiswaRow[]> => {
  const res = await api.get('/leaderboard/siswa-antar-jenjang', {
    params: jenjang ? { jenjang } : undefined,
  });
  const data = unwrapData<LeaderboardSiswaRow[]>(res.data);
  return data;
};

// ─────────────────────────────────────────────
// TANSTACK QUERY HOOKS
// ─────────────────────────────────────────────

/** Tab: Kelas Saya — siswa sekelas, posisi diri ditandai via is_me */
export const useLeaderboardKelasSaya = () =>
  useQuery({
    queryKey: leaderboardKeys.kelasSaya(),
    queryFn:  fetchKelasSaya,
    staleTime: 1000 * 60 * 2, // cache 2 menit
  });

/** Tab: Antar Kelas — ranking kelas berdasarkan avg coins */
export const useLeaderboardAntarKelas = (jenjang?: string) =>
  useQuery({
    queryKey: leaderboardKeys.antarKelas(jenjang),
    queryFn:  () => fetchAntarKelas(jenjang),
    staleTime: 1000 * 60 * 2,
  });

/** Tab: Sekolah — semua siswa aktif se-sekolah */
export const useLeaderboardSekolah = () =>
  useQuery({
    queryKey: leaderboardKeys.sekolah(),
    queryFn:  fetchSekolah,
    staleTime: 1000 * 60 * 2,
  });

/** Tab: Antar Jenjang — ranking SD/SMP/SMA berdasarkan avg coins */
export const useLeaderboardAntarJenjang = () =>
  useQuery({
    queryKey: leaderboardKeys.antarJenjang(),
    queryFn:  fetchAntarJenjang,
    staleTime: 1000 * 60 * 5, // 5 menit, data jarang berubah
  });

/** Tab: Siswa Se-Jenjang — semua siswa dalam jenjang yang sama dengan login */
export const useLeaderboardSiswaAntarJenjang = () =>
  useQuery({
    queryKey: leaderboardKeys.siswaAntarJenjang(),
    queryFn:  () => fetchSiswaAntarJenjang(),
    staleTime: 1000 * 60 * 2,
  });

/** Tab: Siswa Se-Jenjang (admin/guru) — wajib kirim jenjang */
export const useLeaderboardSiswaByJenjang = (jenjang: string) =>
  useQuery({
    queryKey: leaderboardKeys.siswaAntarJenjang(jenjang),
    queryFn: () => fetchSiswaAntarJenjang(jenjang),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(jenjang),
  });
