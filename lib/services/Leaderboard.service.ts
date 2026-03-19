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
  showcaseNote: {
    achievementId: number;
    achievementName: string;
    achievementIcon: string;
    achievementBadgeColor: string;
    noteText: string | null;
    createdAt: string | null;
  } | null;
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
export async function exportLeaderboardPdf(params: {
  type: string;
  kelas_id?: string;
  jenjang?: string;
  data: any[];
}) {
  const { type, data } = params;

  // Fetch info sekolah
  let infoSekolah = { namaSekolah: "Sekolah SEHATI", npsn: "-", alamat: "-" };
  try {
    const res = await api.get("/pengaturan");
    const rows: any[] = res.data?.data ?? [];
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value; });
    infoSekolah = {
      namaSekolah: map["nama_sekolah"] ?? "Sekolah SEHATI",
      npsn:        map["npsn"]         ?? "-",
      alamat:      map["alamat"]       ?? "-",
    };
  } catch (e) {
    console.error("Gagal mengambil info sekolah", e);
  }

  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();
  const M   = 16;
  const DARK:   [number,number,number] = [10,  14, 40];
  const BLUE:   [number,number,number] = [23, 158,255];
  const LGRAY:  [number,number,number] = [248,250,255];

  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 42, "F");

  // Garis aksen kiri biru
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 5, 42, "F");

  // Nama sekolah
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(infoSekolah.namaSekolah.toUpperCase(), 12, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 180, 220);
  doc.text(
    [infoSekolah.alamat, `NPSN: ${infoSekolah.npsn}`].filter(Boolean).join("   ·   "),
    12, 22,
  );

  // Judul laporan kanan
  let judulKategori = "Leaderboard";
  if (type === "kelas") judulKategori = "Kelas Saya";
  else if (type === "antarKelas") judulKategori = "Antar Kelas";
  else if (type === "sekolah") judulKategori = "Sekolah";
  else if (type === "antarJenjang") judulKategori = "Antar Jenjang";
  else if (type === "siswaAntarJenjang") judulKategori = "Siswa Se-Jenjang";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("LAPORAN LEADERBOARD", W - M, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 180, 220);
  doc.text(`Kategori: ${judulKategori}`, W - M, 22, { align: "right" });
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, W - M, 29, { align: "right" });

  // Garis bawah kop
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(0, 42, W, 42);

  let y = 50;

  let head: string[][] = [];
  let body: any[][] = [];

  if (type === "antarJenjang") {
    head = [["Rank", "Jenjang", "Rata-rata Coins", "Total Siswa", "Total Coins"]];
    body = data.map((r: any) => [
      String(r.rank),
      `Jenjang ${r.jenjang}`,
      Math.round(Number(r.avg_coins)).toLocaleString("id-ID"),
      r.total_siswa.toLocaleString("id-ID"),
      Number(r.total_coins).toLocaleString("id-ID"),
    ]);
  } else if (type === "antarKelas") {
    head = [["Rank", "Kelas", "Jenjang", "Rata-rata Coins", "Total Coins", "Jumlah Siswa"]];
    body = data.map((r: any) => [
      String(r.rank),
      r.nama_kelas,
      r.jenjang,
      Math.round(Number(r.avg_coins)).toLocaleString("id-ID"),
      Number(r.total_coins).toLocaleString("id-ID"),
      r.jumlah_siswa.toLocaleString("id-ID"),
    ]);
  } else {
    head = [["Rank", "Nama Siswa", "Kelas", "Jenjang", "Coins", "Streak (Hari)"]];
    body = data.map((r: any) => [
      String(r.rank),
      r.nama,
      r.kelas,
      r.jenjang,
      r.coins.toLocaleString("id-ID"),
      String(r.streak),
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: head,
    body: body,
    headStyles: { fillColor: DARK, textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 0) {
        const rank = parseInt(hook.cell.raw as string);
        if (rank === 1) hook.cell.styles.fillColor = [255, 215, 0];
        if (rank === 2) hook.cell.styles.fillColor = [192, 192, 192];
        if (rank === 3) hook.cell.styles.fillColor = [205, 127, 50];
      }
    },
  });

  // Footer
  doc.setFillColor(...DARK);
  doc.rect(0, H - 12, W, 12, "F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7);
  doc.setTextColor(160,180,220);
  doc.text(
    `${infoSekolah.namaSekolah}  ·  Leaderboard: ${judulKategori}  ·  Total: ${data.length}`,
    W / 2, H - 5, { align: "center" },
  );

  const filename = `Leaderboard_${type}_${Date.now()}.pdf`;
  doc.save(filename);
}

// ─────────────────────────────────────────────
// QUERY KEYS
// ─────────────────────────────────────────────
export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  kelasSaya: (kelasId?: string) => [...leaderboardKeys.all, 'kelas-saya', kelasId] as const,
  antarKelas: (jenjang?: string) => [...leaderboardKeys.all, 'antar-kelas', jenjang] as const,
  sekolah: () => [...leaderboardKeys.all, 'sekolah'] as const,
  antarJenjang: () => [...leaderboardKeys.all, 'antar-jenjang'] as const,
  siswaAntarJenjang: (jenjang?: string) => [...leaderboardKeys.all, 'siswa-antar-jenjang', jenjang] as const,
};

// ─────────────────────────────────────────────
// FETCH FUNCTIONS — semua pakai instance `api` dari @/lib/api
// Token JWT otomatis disertakan via request interceptor yang sudah ada
// ─────────────────────────────────────────────
const fetchKelasSaya = async (kelasId?: string): Promise<LeaderboardSiswaRow[]> => {
  const res = await api.get('/leaderboard/kelas-saya', {
    params: kelasId ? { kelas_id: kelasId } : undefined,
  });
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
export const useLeaderboardKelasSaya = (kelasId?: string) =>
  useQuery({
    queryKey: leaderboardKeys.kelasSaya(kelasId),
    queryFn: () => fetchKelasSaya(kelasId),
    staleTime: 1000 * 60 * 2, // cache 2 menit
    refetchInterval: 10000,
  });

/** Tab: Antar Kelas — ranking kelas berdasarkan avg coins */
export const useLeaderboardAntarKelas = (jenjang?: string) =>
  useQuery({
    queryKey: leaderboardKeys.antarKelas(jenjang),
    queryFn: () => fetchAntarKelas(jenjang),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 10000,
  });

/** Tab: Sekolah — semua siswa aktif se-sekolah */
export const useLeaderboardSekolah = () =>
  useQuery({
    queryKey: leaderboardKeys.sekolah(),
    queryFn: fetchSekolah,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 10000,
  });

/** Tab: Antar Jenjang — ranking SD/SMP/SMA berdasarkan avg coins */
export const useLeaderboardAntarJenjang = () =>
  useQuery({
    queryKey: leaderboardKeys.antarJenjang(),
    queryFn: fetchAntarJenjang,
    staleTime: 1000 * 60 * 5, // 5 menit, data jarang berubah
    refetchInterval: 10000,
  });

/** Tab: Siswa Se-Jenjang — semua siswa dalam jenjang yang sama dengan login */
export const useLeaderboardSiswaAntarJenjang = () =>
  useQuery({
    queryKey: leaderboardKeys.siswaAntarJenjang(),
    queryFn: () => fetchSiswaAntarJenjang(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 10000,
  });

/** Tab: Siswa Se-Jenjang (admin/guru) — wajib kirim jenjang */
export const useLeaderboardSiswaByJenjang = (jenjang: string) =>
  useQuery({
    queryKey: leaderboardKeys.siswaAntarJenjang(jenjang),
    queryFn: () => fetchSiswaAntarJenjang(jenjang),
    staleTime: 1000 * 60 * 2,
    enabled: Boolean(jenjang),
    refetchInterval: 10000,
  });
