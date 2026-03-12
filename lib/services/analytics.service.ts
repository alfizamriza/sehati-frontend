import api from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = "today" | "week" | "month" | "year" | "custom";

export interface StatCard {
  key: string;
  label: string;
  value: number;
  valueFormatted: string;
  change: number;
  changeText: string;
  negative: boolean;
  sparkline: number[];
  unit: string;
}

export interface TrendPoint {
  date: string;
  transaksi: number;
  coins: number;
  pelanggaran: number;
  siswaAktif: number;
}

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface RankingItem {
  rank: number;
  id: string;
  name: string;
  sub: string;
  value: number;
  valueLabel: string;
  avatarInitials: string;
}

export interface ClassProgress {
  id: number;
  name: string;
  tingkat: string;
  kepatuhanPct: number;
  totalSiswa: number;
  pelanggar: number;
  coinsRata: number;
}

export interface AnalyticsData {
  period: AnalyticsPeriod;
  range: { start: string; end: string };
  stats: StatCard[];
  trend: TrendPoint[];
  donutMetodeBayar: DonutSlice[];
  donutKemasan: DonutSlice[];
  topSiswa: RankingItem[];
  topProduk: RankingItem[];
  progressKelas: ClassProgress[];
  lastUpdated: string;
}

type AnalyticsCacheEntry = {
  data: AnalyticsData;
  ts: number;
};

const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;
const analyticsMemoryCache = new Map<string, AnalyticsCacheEntry>();

function getCacheKey(
  period: AnalyticsPeriod,
  startDate?: string,
  endDate?: string,
): string {
  return `${period}|${startDate ?? ""}|${endDate ?? ""}`;
}

function readSessionCache(key: string): AnalyticsCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`analytics-cache:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalyticsCacheEntry;
    if (!parsed?.data || typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, entry: AnalyticsCacheEntry) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`analytics-cache:${key}`, JSON.stringify(entry));
  } catch {}
}

function readAnalyticsCache(key: string): AnalyticsData | null {
  const now = Date.now();
  const memory = analyticsMemoryCache.get(key);
  if (memory && now - memory.ts < ANALYTICS_CACHE_TTL_MS) {
    return memory.data;
  }

  const session = readSessionCache(key);
  if (session && now - session.ts < ANALYTICS_CACHE_TTL_MS) {
    analyticsMemoryCache.set(key, session);
    return session.data;
  }

  return null;
}

// ─── FETCH ────────────────────────────────────────────────────────────────────

export async function fetchAnalytics(
  period: AnalyticsPeriod,
  startDate?: string,
  endDate?: string,
): Promise<AnalyticsData> {
  const params = new URLSearchParams({ period });
  if (period === "custom" && startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }
  const res = await api.get(`/analytics?${params}`, { timeout: 30000 });
  if (!res.data?.success) throw new Error(res.data?.message ?? "Gagal mengambil analytics");
  return res.data.data;
}

export async function fetchAnalyticsCached(
  period: AnalyticsPeriod,
  startDate?: string,
  endDate?: string,
  options: { force?: boolean } = {},
): Promise<AnalyticsData> {
  const key = getCacheKey(period, startDate, endDate);

  if (!options.force) {
    const cached = readAnalyticsCache(key);
    if (cached) return cached;
  }

  const data = await fetchAnalytics(period, startDate, endDate);
  const entry: AnalyticsCacheEntry = { data, ts: Date.now() };
  analyticsMemoryCache.set(key, entry);
  writeSessionCache(key, entry);
  return data;
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────

export function formatPeriodLabel(
  period: AnalyticsPeriod,
  start: string,
  end: string,
): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const monthOpts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
  const s = new Date(start).toLocaleDateString("id-ID", opts);
  const e = new Date(end).toLocaleDateString("id-ID", opts);
  switch (period) {
    case "today":  return `Hari Ini, ${s}`;
    case "week":   return `7 Hari Terakhir (${s} – ${e})`;
    case "month":  return `Bulan Ini (${new Date(start).toLocaleDateString("id-ID", monthOpts)})`;
    case "year":   return `Tahun ${new Date(start).getFullYear()}`;
    case "custom": return `${s} – ${e}`;
    default: return s;
  }
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────

export async function exportAnalyticsPDF(
  data: AnalyticsData,
  infoSekolah: { namaSekolah: string; npsn: string; alamat: string },
): Promise<void> {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();
  const M   = 16;

  const DARK:   [number,number,number] = [10,  14, 40];
  const BLUE:   [number,number,number] = [23, 158,255];
  const GREEN:  [number,number,number] = [16, 185,129];
  const PURPLE: [number,number,number] = [139, 92,246];
  const AMBER:  [number,number,number] = [245,158, 11];
  const RED:    [number,number,number] = [239, 68, 68];
  const LGRAY:  [number,number,number] = [248,250,255];
  const GRAY:   [number,number,number] = [100,116,139];

  const periodLabel = formatPeriodLabel(data.period, data.range.start, data.range.end);

  // ════════════════════════════════════════════════
  // HALAMAN 1: RINGKASAN EKSEKUTIF
  // ════════════════════════════════════════════════

  // ── KOP ──────────────────────────────────────────
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("LAPORAN ANALITIK SEHATI", W - M, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 180, 220);
  doc.text(periodLabel, W - M, 22, { align: "right" });
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, W - M, 29, { align: "right" });

  // Garis bawah kop
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.4);
  doc.line(0, 42, W, 42);

  // ── STAT CARDS (2×3 grid) ─────────────────────────
  let y = 50;
  const colW = (W - M * 2 - 8) / 3;
  const cardH = 28;
  const cardColors: [number,number,number][] = [BLUE, GREEN, PURPLE, AMBER, RED, GREEN];

  data.stats.slice(0, 6).forEach((s, i) => {
    const col  = i % 3;
    const row  = Math.floor(i / 3);
    const cx   = M + col * (colW + 4);
    const cy   = y + row * (cardH + 6);
    const clr  = cardColors[i];

    // Card background
    doc.setFillColor(...LGRAY);
    doc.roundedRect(cx, cy, colW, cardH, 3, 3, "F");
    doc.setDrawColor(...clr);
    doc.setLineWidth(0.5);
    doc.roundedRect(cx, cy, colW, cardH, 3, 3, "S");

    // Warna strip kiri
    doc.setFillColor(...clr);
    doc.roundedRect(cx, cy, 4, cardH, 3, 3, "F");
    doc.rect(cx + 2, cy, 2, cardH, "F");

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(s.label, cx + 8, cy + 8);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text(s.valueFormatted, cx + 8, cy + 19);

    // Change
    const changeClr: [number,number,number] = s.negative
      ? (s.change > 0 ? RED : GREEN)
      : (s.change >= 0 ? GREEN : RED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...changeClr);
    doc.text(`${s.change >= 0 ? "▲" : "▼"} ${s.changeText}`, cx + 8, cy + 25);
  });

  y += cardH * 2 + 20;

  // ── SECTION: Top Produk (tabel) ───────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Produk Terlaris", M, y);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.5);
  doc.line(M, y + 2, M + 28, y + 2);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["#", "Nama Produk", "Unit Terjual"]],
    body: data.topProduk.slice(0, 5).map((p) => [
      String(p.rank), p.name, String(p.value),
    ]),
    headStyles: { fillColor: DARK, textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { cellWidth: 12, halign: "center" }, 2: { halign: "right" } },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── SECTION: Top Siswa (tabel) ────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Top Siswa — Koin Tertinggi", M, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1.5);
  doc.line(M, y + 2, M + 48, y + 2);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["#", "Nama Siswa", "Kelas", "Koin"]],
    body: data.topSiswa.slice(0, 6).map((s) => [
      String(s.rank), s.name, s.sub, String(s.value),
    ]),
    headStyles: { fillColor: DARK, textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0: { cellWidth: 12, halign: "center" }, 3: { halign: "right" } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 0) {
        const rank = parseInt(hook.cell.raw as string);
        if (rank === 1) hook.cell.styles.fillColor = [255, 215, 0];
        if (rank === 2) hook.cell.styles.fillColor = [192, 192, 192];
        if (rank === 3) hook.cell.styles.fillColor = [205, 127, 50];
      }
    },
  });

  // Footer hal 1
  drawFooter(doc, W, H, M, infoSekolah.namaSekolah, 1, DARK);

  // ════════════════════════════════════════════════
  // HALAMAN 2: PROGRESS KELAS + METODE BAYAR
  // ════════════════════════════════════════════════

  doc.addPage();
  drawPageHeader(doc, W, M, DARK, BLUE, "ANALITIK — KEPATUHAN & DISTRIBUSI", periodLabel);

  let y2 = 50;

  // Progress kelas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Kepatuhan per Kelas", M, y2);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.5);
  doc.line(M, y2 + 2, M + 38, y2 + 2);
  y2 += 8;

  autoTable(doc, {
    startY: y2,
    margin: { left: M, right: M },
    head: [["Kelas", "Tingkat", "Total Siswa", "Pelanggar", "Kepatuhan", "Rata Koin"]],
    body: data.progressKelas.map((k) => [
      k.name, k.tingkat,
      String(k.totalSiswa),
      String(k.pelanggar),
      `${k.kepatuhanPct}%`,
      `${k.coinsRata.toLocaleString("id-ID")} 🪙`,
    ]),
    headStyles: { fillColor: DARK, textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right" },
    },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 4) {
        const pct = parseInt(hook.cell.raw as string);
        hook.cell.styles.textColor = pct >= 80 ? GREEN : pct >= 60 ? AMBER : RED;
        hook.cell.styles.fontStyle = "bold";
      }
    },
  });

  y2 = (doc as any).lastAutoTable.finalY + 14;

  // Distribusi metode bayar (teks tabel)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Distribusi Metode Pembayaran", M, y2);
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(1.5);
  doc.line(M, y2 + 2, M + 56, y2 + 2);
  y2 += 8;

  const totalMetode = data.donutMetodeBayar.reduce((s, d) => s + d.value, 0) || 1;

  autoTable(doc, {
    startY: y2,
    margin: { left: M, right: M },
    head: [["Metode", "Jumlah Transaksi", "Persentase"]],
    body: data.donutMetodeBayar.map((d) => [
      d.name,
      String(d.value),
      `${Math.round((d.value / totalMetode) * 100)}%`,
    ]),
    headStyles: { fillColor: DARK, textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
  });

  y2 = (doc as any).lastAutoTable.finalY + 14;

  // Distribusi kemasan
  if (data.donutKemasan.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text("Distribusi Penggunaan Kemasan", M, y2);
    doc.setDrawColor(...RED);
    doc.setLineWidth(1.5);
    doc.line(M, y2 + 2, M + 56, y2 + 2);
    y2 += 8;

    const totalKemasan = data.donutKemasan.reduce((s, d) => s + d.value, 0) || 1;

    autoTable(doc, {
      startY: y2,
      margin: { left: M, right: M },
      head: [["Jenis Kemasan", "Jumlah Item", "Persentase"]],
      body: data.donutKemasan.map((d) => [
        d.name, String(d.value),
        `${Math.round((d.value / totalKemasan) * 100)}%`,
      ]),
      headStyles: { fillColor: DARK, textColor: [255,255,255], fontSize: 8, cellPadding: 4 },
      bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: DARK },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 0) {
          const name = String(hook.cell.raw);
          if (name === "Plastik")       hook.cell.styles.textColor = RED;
          if (name === "Kertas")        hook.cell.styles.textColor = AMBER;
          if (name === "Tanpa Kemasan") hook.cell.styles.textColor = GREEN;
        }
      },
    });
  }

  drawFooter(doc, W, H, M, infoSekolah.namaSekolah, 2, DARK);

  // ── Simpan ────────────────────────────────────────
  const filename = `Laporan_Analitik_SEHATI_${data.range.start}_sd_${data.range.end}.pdf`;
  doc.save(filename);
}

// ─── PDF HELPERS ──────────────────────────────────────────────────────────────

function drawPageHeader(
  doc: any, W: number, M: number,
  dark: [number,number,number], blue: [number,number,number],
  title: string, sub: string,
) {
  doc.setFillColor(...dark); doc.rect(0, 0, W, 38, "F");
  doc.setFillColor(...blue); doc.rect(0, 0, 5, 38, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.setTextColor(255,255,255);
  doc.text(title, 12, 16);
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  doc.setTextColor(160,180,220);
  doc.text(sub, 12, 26);
  doc.setDrawColor(...blue); doc.setLineWidth(0.4);
  doc.line(0, 38, W, 38);
}

function drawFooter(
  doc: any, W: number, H: number, M: number,
  namaSekolah: string, page: number,
  dark: [number,number,number],
) {
  doc.setFillColor(...dark);
  doc.rect(0, H - 12, W, 12, "F");
  doc.setFont("helvetica","normal"); doc.setFontSize(7);
  doc.setTextColor(160,180,220);
  doc.text(
    `${namaSekolah}  ·  Laporan Analitik SEHATI  ·  Halaman ${page}`,
    W / 2, H - 5, { align: "center" },
  );
}
