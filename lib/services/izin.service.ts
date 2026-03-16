import api from "@/lib/api";

export type IzinStatus = "pending" | "approved" | "rejected";
export type IzinTipe = "sakit" | "izin" | "tanpa_keterangan";

export interface IzinRecord {
  id: number;
  nis: string;
  tanggal: string;
  tipe: IzinTipe;
  status: IzinStatus;
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;
  siswa_nama?: string;
  kelas_label?: string;
}

export interface SiswaItem {
  nis: string;
  nama: string;
}

export interface KelasItem {
  id: number;
  nama: string;
  tingkat: number;
  jenjang?: string;
}

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  let current: any = payload;
  while (
    current &&
    typeof current === "object" &&
    "success" in current &&
    "data" in current
  ) {
    current = (current as ApiEnvelope<T>).data;
  }
  return current as T;
}

export async function listKelas(): Promise<KelasItem[]> {
  const res = await api.get("/izin/kelas");
  return unwrapEnvelope<KelasItem[]>(res.data) || [];
}

export async function listSiswaBelumAbsen(
  kelasId: number,
  tanggal: string
): Promise<SiswaItem[]> {
  const res = await api.get(
    `/izin/siswa-belum-absen?kelas_id=${kelasId}&tanggal=${tanggal}`
  );
  return unwrapEnvelope<SiswaItem[]>(res.data) || [];
}

export async function listIzin(params?: {
  from?: string;
  to?: string;
  status?: IzinStatus | "all";
}): Promise<IzinRecord[]> {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.status && params.status !== "all") search.set("status", params.status);

  const url = `/izin${search.toString() ? `?${search.toString()}` : ""}`;
  const res = await api.get(url);
  return unwrapEnvelope<IzinRecord[]>(res.data) || [];
}

export async function createIzinBatch(payload: {
  nis_list: string[];
  tanggal: string;
  tipe: IzinTipe;
  catatan?: string;
}): Promise<{ count: number }> {
  const res = await api.post("/izin/batch", payload);
  const envelope = res.data as ApiEnvelope<{ count: number }>;
  if (envelope.success === false) {
    throw new Error(envelope.message || "Gagal membuat izin");
  }
  return { count: envelope.data?.count ?? payload.nis_list.length };
}

export async function createIzin(payload: {
  nis: string;
  tanggal: string;
  tipe: IzinTipe;
  catatan?: string;
}): Promise<void> {
  const res = await api.post("/izin", payload);
  const ok = (res.data as ApiEnvelope).success ?? true;
  if (!ok) {
    throw new Error((res.data as ApiEnvelope).message || "Gagal membuat izin");
  }
}

export async function updateIzinStatus(
  id: number,
  status: IzinStatus
): Promise<void> {
  const res = await api.patch(`/izin/${id}`, { status });
  const ok = (res.data as ApiEnvelope).success ?? true;
  if (!ok) {
    throw new Error(
      (res.data as ApiEnvelope).message || "Gagal memperbarui status"
    );
  }
}