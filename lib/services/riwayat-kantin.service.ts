import api from "@/lib/api";

export interface RiwayatItemDetail {
  nama: string;
  qty: number;
  harga: number;
  subtotal: number;
}
export interface RiwayatItem {
  id: number;
  kodeTransaksi: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  produkLabel: string;
  items: RiwayatItemDetail[];
  totalHarga: number;
  totalDiskon: number;
  totalBayar: number;
  coinsUsed: number;
  paymentMethod: "tunai" | "voucher" | "coins";
  createdAt: string;
}
export interface RiwayatStats {
  totalTransaksi: number;
  totalPendapatan: number;
  countTunai: number;
  countVoucher: number;
  countCoins: number;
  pctTunai: number;
  pctVoucher: number;
  pctCoins: number;
}
export interface InfoSekolah {
  namaSekolah: string;
  npsn: string;
  alamat: string;
  emailSekolah: string;
  nomorHp: string;
}
export interface InfoKantin {
  id: number;
  namaKantin: string;
  username: string;
  nomorHp: string;
}
export interface QueryRiwayat {
  period?: "today" | "week" | "month" | "all" | "custom";
  startDate?: string;
  endDate?: string;
  paymentMethod?: "tunai" | "voucher" | "coins" | "";
  search?: string;
  page?: number;
  limit?: number;
}
export interface RiwayatMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  startDate: string;
  endDate: string;
}

function resolveResponseRoot<T extends object>(payload: unknown): T {
  if (!payload || typeof payload !== "object") return {} as T;
  const root = payload as Record<string, unknown>;
  const nested = root.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as T;
  }
  return root as T;
}

function safeInfoSekolah(info: Partial<InfoSekolah> | null | undefined): InfoSekolah {
  return {
    namaSekolah: info?.namaSekolah ?? "Nama Sekolah",
    npsn: info?.npsn ?? "-",
    alamat: info?.alamat ?? "-",
    emailSekolah: info?.emailSekolah ?? "-",
    nomorHp: info?.nomorHp ?? "-",
  };
}

function safeInfoKantin(info: Partial<InfoKantin> | null | undefined): InfoKantin {
  return {
    id: Number(info?.id ?? 0),
    namaKantin: info?.namaKantin ?? "Kantin",
    username: info?.username ?? "-",
    nomorHp: info?.nomorHp ?? "-",
  };
}

export async function fetchRiwayat(query: QueryRiwayat) {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  const res = await api.get(`/riwayat?${p}`);
  if (!res.data?.success) throw new Error("Gagal");
  const payload = resolveResponseRoot<{
    data?: RiwayatItem[];
    stats?: RiwayatStats;
    meta?: RiwayatMeta;
  }>(res.data);
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const stats =
    payload?.stats ??
    ({
      totalTransaksi: data.length,
      totalPendapatan: data.reduce((sum, row) => sum + Number(row.totalBayar ?? 0), 0),
      countTunai: data.filter((row) => row.paymentMethod === "tunai").length,
      countVoucher: data.filter((row) => row.paymentMethod === "voucher").length,
      countCoins: data.filter((row) => row.paymentMethod === "coins").length,
      pctTunai: 0,
      pctVoucher: 0,
      pctCoins: 0,
    } as RiwayatStats);
  if (!payload?.stats && stats.totalTransaksi > 0) {
    stats.pctTunai = Math.round((stats.countTunai / stats.totalTransaksi) * 100);
    stats.pctVoucher = Math.round((stats.countVoucher / stats.totalTransaksi) * 100);
    stats.pctCoins = Math.round((stats.countCoins / stats.totalTransaksi) * 100);
  }
  const meta =
    payload?.meta ??
    ({
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 15),
      total: data.length,
      totalPages: 1,
      startDate: query.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: query.endDate ?? new Date().toISOString().slice(0, 10),
    } as RiwayatMeta);
  return { data, stats, meta };
}

export async function fetchExportData(query: QueryRiwayat) {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  const res = await api.get(`/riwayat/export?${p}`);
  if (!res.data?.success) throw new Error("Gagal export");
  const payload = resolveResponseRoot<{
    data?: RiwayatItem[];
    stats?: RiwayatStats;
    infoSekolah?: Partial<InfoSekolah>;
    infoKantin?: Partial<InfoKantin>;
    startDate?: string;
    endDate?: string;
  }>(res.data);
  const nested =
    payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as {
          data?: RiwayatItem[];
          stats?: RiwayatStats;
          infoSekolah?: Partial<InfoSekolah>;
          infoKantin?: Partial<InfoKantin>;
          startDate?: string;
          endDate?: string;
        })
      : null;
  const resolved = nested ?? payload ?? res.data;
  const data = Array.isArray(resolved?.data) ? resolved.data : [];
  const stats = resolved?.stats ?? {
    totalTransaksi: 0,
    totalPendapatan: 0,
    countTunai: 0,
    countVoucher: 0,
    countCoins: 0,
    pctTunai: 0,
    pctVoucher: 0,
    pctCoins: 0,
  };
  let infoSekolah = safeInfoSekolah(resolved?.infoSekolah);
  if (
    !resolved?.infoSekolah ||
    infoSekolah.namaSekolah === "Nama Sekolah" ||
    (infoSekolah.npsn === "-" && infoSekolah.emailSekolah === "-")
  ) {
    try {
      const infoRes = await api.get("/riwayat/info-sekolah");
      const infoRoot = resolveResponseRoot<{ data?: Partial<InfoSekolah> }>(infoRes.data);
      const infoCandidate =
        (infoRoot?.data && typeof infoRoot.data === "object"
          ? infoRoot.data
          : infoRoot) as Partial<InfoSekolah>;
      infoSekolah = safeInfoSekolah(infoCandidate);
    } catch {
      // keep existing fallback
    }
  }
  return {
    data,
    stats,
    infoSekolah,
    infoKantin: safeInfoKantin(resolved?.infoKantin),
    startDate: resolved?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: resolved?.endDate ?? new Date().toISOString().slice(0, 10),
  };
}

export async function generatePDF(payload: {
  data: RiwayatItem[];
  stats: RiwayatStats;
  infoSekolah?: InfoSekolah | null;
  infoKantin?: InfoKantin | null;
  startDate: string;
  endDate: string;
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { data, stats, startDate, endDate } = payload;
  const infoSekolah = safeInfoSekolah(payload.infoSekolah);
  const infoKantin = safeInfoKantin(payload.infoKantin);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const blue: [number, number, number] = [23, 158, 255];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];

  // KOP
  doc.setFillColor(...dark);
  doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(...blue);
  doc.rect(0, 0, 4, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(infoSekolah.namaSekolah.toUpperCase(), 10, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(
    [
      infoSekolah.alamat,
      `NPSN: ${infoSekolah.npsn} | Tel: ${infoSekolah.nomorHp} | ${infoSekolah.emailSekolah}`,
    ]
      .filter(Boolean)
      .join(" "),
    10,
    21,
  );
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LAPORAN RIWAYAT TRANSAKSI KANTIN", W - M, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(`Periode: ${formatTglRange(startDate, endDate)}`, W - M, 21, {
    align: "right",
  });
  doc.text(`Kantin: ${infoKantin.namaKantin}`, W - M, 25, {
    align: "right",
  });
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, W - M, 29, {
    align: "right",
  });
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.3);
  doc.line(M, 40, W - M, 40);

  // STATS BOXES
  let y = 46;
  const boxes = [
    { l: "Total Transaksi", v: String(stats.totalTransaksi) },
    {
      l: "Total Pendapatan",
      v: `Rp ${stats.totalPendapatan.toLocaleString("id-ID")}`,
    },
    { l: "Tunai", v: `${stats.countTunai} trx (${stats.pctTunai}%)` },
    { l: "Voucher", v: `${stats.countVoucher} trx (${stats.pctVoucher}%)` },
    { l: "Koin", v: `${stats.countCoins} trx (${stats.pctCoins}%)` },
  ];
  const bw = (W - M * 2 - 8) / boxes.length;
  boxes.forEach((b, i) => {
    const x = M + i * (bw + 2);
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(x, y, bw, 18, 2, 2, "F");
    doc.setDrawColor(220, 230, 255);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, bw, 18, 2, 2, "S");
    doc.setTextColor(...gray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(b.l, x + bw / 2, y + 6, { align: "center" });
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(b.v, x + bw / 2, y + 14, { align: "center" });
  });
  y += 24;

  // TABEL
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [
      [
        "No",
        "Kode Transaksi",
        "Nama Siswa",
        "Kelas",
        "Produk",
        "Total Bayar",
        "Diskon",
        "Potongan Koin",
        "Metode",
        "Waktu",
      ],
    ],
    body: data.map((t, i) => [
      String(i + 1),
      t.kodeTransaksi,
      t.namaSiswa,
      t.kelas,
      t.produkLabel,
      `Rp ${t.totalBayar.toLocaleString("id-ID")}`,
      t.totalDiskon > 0 ? `Rp ${t.totalDiskon.toLocaleString("id-ID")}` : "-",
      t.coinsUsed > 0 ? `-${t.coinsUsed.toLocaleString("id-ID")} koin` : "-",
      metodeLabel(t.paymentMethod),
      formatWaktu(t.createdAt),
    ]),
    headStyles: {
      fillColor: dark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 4,
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 3.5, textColor: dark },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 34 },
      2: { cellWidth: 36 },
      3: { cellWidth: 20 },
      4: { cellWidth: 52 },
      5: { cellWidth: 28 },
      6: { cellWidth: 22 },
      7: { cellWidth: 26 },
      8: { cellWidth: 22 },
      9: { cellWidth: 30 },
    },
    didDrawPage: (h) => {
      const pH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...dark);
      doc.rect(0, pH - 10, W, 10, "F");
      doc.setTextColor(180, 190, 210);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(
        `${infoSekolah.namaSekolah}  |  ${infoKantin.namaKantin}  |  Hal ${h.pageNumber}`,
        W / 2,
        pH - 4,
        { align: "center" },
      );
    },
  });
  doc.save(`Riwayat_Transaksi_${startDate}_sd_${endDate}.pdf`);
}

export function metodeLabel(m: string) {
  return m === "tunai"
    ? "Tunai"
    : m === "voucher"
      ? "Voucher"
      : m === "coins"
        ? "Koin"
        : m;
}
export function formatTglRange(s: string, e: string) {
  const opt: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const a = new Date(s).toLocaleDateString("id-ID", opt);
  const b = new Date(e).toLocaleDateString("id-ID", opt);
  return s === e ? a : `${a} – ${b}`;
}
export function formatWaktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function formatRupiah(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}
