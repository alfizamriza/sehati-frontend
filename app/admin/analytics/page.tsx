"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Sector,
} from "recharts";
import {
  BarChart3, TrendingUp, TrendingDown, Users, Coins,
  AlertTriangle, CreditCard, Download, RefreshCw,
  Loader2, Calendar, Ticket, Leaf,
  Trophy, Package, Activity,
} from "lucide-react";
import {
  fetchAnalyticsCached, exportAnalyticsPDF, formatPeriodLabel,
  type AnalyticsData, type AnalyticsPeriod, type StatCard,
} from "@/lib/services/analytics.service";
import api, { type ApiClientError } from "@/lib/api";
import "./analytics.css";

// ─── HEATMAP GRID + RICH TOOLTIP ─────────────────────────────────────────────

interface HeatmapTooltipState {
  visible: boolean;
  x: number;
  y: number;
  day: number;
  hour: number;
  count: number;
  max: number;
}

function HeatmapGrid({ data }: { data: any[] }) {
  const [tip, setTip] = useState<HeatmapTooltipState>({
    visible: false, x: 0, y: 0, day: 0, hour: 0, count: 0, max: 1,
  });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const safeData = Array.isArray(data) ? data : [];

  const grid = React.useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    safeData.forEach((c: any) => {
      const d = Number.isFinite(c?.day) ? Math.min(6, Math.max(0, c.day)) : null;
      const h = Number.isFinite(c?.hour) ? Math.min(23, Math.max(0, c.hour)) : null;
      if (d === null || h === null) return;
      g[d][h] = Number(c?.count ?? 0);
    });
    return g;
  }, [safeData]);

  const max = React.useMemo(
    () => Math.max(...safeData.map((c: any) => Number(c?.count ?? 0)), 1),
    [safeData],
  );

  function handleMouseEnter(
    e: React.MouseEvent<HTMLDivElement>,
    day: number, hour: number, count: number,
  ) {
    const rect = containerRef.current?.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();
    if (!rect) return;
    setTip({
      visible: true,
      x: cellRect.left - rect.left + cellRect.width / 2,
      y: cellRect.top - rect.top,
      day, hour, count, max,
    });
  }

  function handleMouseLeave() {
    setTip((prev) => ({ ...prev, visible: false }));
  }

  const intensityLevel = tip.count === 0 ? "Tidak ada"
    : tip.count / tip.max < 0.33 ? "Rendah"
      : tip.count / tip.max < 0.66 ? "Sedang"
        : "Tinggi";

  const intensityColor = tip.count === 0 ? "var(--txt-muted)"
    : tip.count / tip.max < 0.33 ? "#f59e0b"
      : tip.count / tip.max < 0.66 ? "#f87171"
        : "#ef4444";

  const hourLabel = `${String(tip.hour).padStart(2, "0")}:00–${String(tip.hour + 1).padStart(2, "0")}:00`;

  // Bar inside tooltip: 5 mini bars showing hour vs adjacent hours
  const adjacentCounts = [-2, -1, 0, 1, 2].map((offset) => {
    const h = tip.hour + offset;
    if (h < 0 || h > 23) return 0;
    return grid[tip.day]?.[h] ?? 0;
  });
  const adjMax = Math.max(...adjacentCounts, 1);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Hour axis labels */}
      <div className="an-heatmap-hours">
        {Array.from({ length: 24 }, (_, h) => h)
          .filter((h) => h % 3 === 0)
          .map((h) => (
            <div key={h} className="an-heatmap-hour">
              {String(h).padStart(2, "0")}
            </div>
          ))}
      </div>

      {/* Grid rows */}
      <div className="an-heatmap-grid">
        {grid.map((row, day) => (
          <div key={day} className="an-heatmap-row">
            <div className="an-heatmap-day">{DAY_LABELS[day]}</div>
            <div className="an-heatmap-cells">
              {row.map((v, hour) => {
                const intensity = v === 0 ? 0 : 0.18 + 0.82 * (v / max);
                const isActive = tip.visible && tip.day === day && tip.hour === hour;
                return (
                  <div
                    key={hour}
                    className={`an-heatmap-cell${isActive ? " an-heatmap-cell--active" : ""}`}
                    style={{
                      background: v === 0
                        ? "var(--border)"
                        : `rgba(248,113,113,${intensity.toFixed(3)})`,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, day, hour, v)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Rich tooltip */}
      {tip.visible && (
        <div
          className="an-heatmap-tip"
          style={{
            left: tip.x,
            top: tip.y,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          {/* Header */}
          <div className="an-heatmap-tip-header">
            <span className="an-heatmap-tip-day">{DAY_LABELS[tip.day]}</span>
            <span className="an-heatmap-tip-hour">{hourLabel}</span>
          </div>

          {/* Count */}
          <div className="an-heatmap-tip-count">
            <span
              className="an-heatmap-tip-num"
              style={{ color: intensityColor }}
            >
              {tip.count}
            </span>
            <span className="an-heatmap-tip-unit">pelanggaran</span>
          </div>

          {/* Intensity badge */}
          <div
            className="an-heatmap-tip-badge"
            style={{ color: intensityColor, background: `${intensityColor}18` }}
          >
            {intensityLevel}
          </div>

          {/* Mini sparkbars: current hour vs ±2 */}
          <div className="an-heatmap-tip-bars">
            {adjacentCounts.map((v, i) => (
              <div key={i} className="an-heatmap-tip-bar-wrap">
                <div
                  className="an-heatmap-tip-bar"
                  style={{
                    height: `${Math.max(3, (v / adjMax) * 28)}px`,
                    background: i === 2 ? intensityColor : "var(--border-strong)",
                  }}
                />
                <div className="an-heatmap-tip-bar-label">
                  {String(tip.hour - 2 + i).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>

          {/* Caret */}
          <div className="an-heatmap-tip-caret" />
        </div>
      )}
    </div>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "Minggu Ini" },
  { key: "month", label: "Bulan Ini" },
  { key: "year", label: "Tahun Ini" },
  { key: "custom", label: "Custom" },
];

const TREND_LINES = [
  { key: "transaksi", label: "Transaksi", color: "#3B9EFF" },
  { key: "kemasanPlastik", label: "Kemasan Plastik", color: "#f87171" },
  { key: "kemasanKertas", label: "Kemasan Kertas", color: "#f59e0b" },
  { key: "pelanggaran", label: "Pelanggaran", color: "#a78bfa" },
];

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const STAT_ICONS: Record<string, React.ReactNode> = {
  pendapatan: <TrendingUp size={16} />,
  transaksi: <CreditCard size={16} />,
  siswa: <Users size={16} />,
  coins: <Coins size={16} />,
  pelanggaran: <AlertTriangle size={16} />,
  voucher: <Ticket size={16} />,
};

const STAT_COLORS: Record<string, string> = {
  pendapatan: "#3B9EFF",
  transaksi: "#22c55e",
  siswa: "#a78bfa",
  coins: "#f59e0b",
  pelanggaran: "#f87171",
  voucher: "#22d3ee",
};

// ─── MINI SPARKLINE ───────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 72, H = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline
        points={pts} fill="none" stroke={color}
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        opacity={0.9}
      />
      <polyline
        points={`0,${H} ${pts} ${W},${H}`}
        fill={`${color}1a`} stroke="none"
      />
      {(() => {
        const last = data[data.length - 1];
        const x = W;
        const y = H - (last / max) * H;
        return <circle cx={x} cy={y} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCardComp({ s }: { s: StatCard }) {
  const color = STAT_COLORS[s.key] ?? "#3B9EFF";
  const icon = STAT_ICONS[s.key] ?? <BarChart3 size={16} />;
  const isUp = s.change >= 0;
  const good = s.negative ? !isUp : isUp;
  const clrChange = s.change === 0
    ? "var(--txt-muted)"
    : good ? "var(--green)" : "var(--red)";
  const bgChange = s.change === 0
    ? "rgba(255,255,255,0.05)"
    : good ? "var(--green-bg)" : "var(--red-bg)";

  return (
    <div className="an-stat-card" style={{ "--accent": color } as React.CSSProperties}>
      <div className="an-stat-top">
        <div className="an-stat-icon" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        <div className="an-stat-texts">
          <div className="an-stat-label">{s.label}</div>
          <div className="an-stat-value">{s.valueFormatted}</div>
          <div className="an-stat-change" style={{ color: clrChange, background: bgChange }}>
            {s.change !== 0 && (isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />)}
            {s.changeText}
          </div>
        </div>
        <div className="an-stat-spark">
          <Sparkline data={s.sparkline} color={color} />
        </div>
      </div>
      <div className="an-stat-bar">
        <div
          className="an-stat-bar-fill"
          style={{
            width: `${Math.min(100, Math.max(5, Math.abs(s.value / 100)))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.length > 1
    ? payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0)
    : null;
  return (
    <div className="an-tooltip">
      <div className="an-tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="an-tooltip-row">
          <span
            className="an-tooltip-dot"
            style={{ background: p.color, color: p.color }}
          />
          <span className="an-tooltip-name">{p.name}</span>
          <span className="an-tooltip-val">{p.value?.toLocaleString("id-ID")}</span>
        </div>
      ))}
      {total !== null && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 14px 10px", borderTop: "1px solid var(--border)",
          fontSize: "0.7rem", color: "var(--txt-muted)", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          <span>Total</span>
          <span style={{
            fontFamily: "'Sora', sans-serif", fontSize: "0.82rem",
            fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums",
          }}>
            {total.toLocaleString("id-ID")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── DONUT LABEL ──────────────────────────────────────────────────────────────
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 800 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── RANKING ROW ──────────────────────────────────────────────────────────────
function RankRow({ item, color, isTop3 }: { item: any; color: string; isTop3?: boolean }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="an-rank-row">
      <div className="an-rank-num" style={{ color: isTop3 ? color : "var(--txt-muted)" }}>
        {item.rank <= 3 ? medals[item.rank - 1] : item.rank}
      </div>
      <div className="an-rank-avatar" style={{ background: `${color}20`, color }}>
        {item.avatarInitials}
      </div>
      <div className="an-rank-info">
        <div className="an-rank-name">{item.name}</div>
        <div className="an-rank-sub">{item.sub}</div>
      </div>
      <div className="an-rank-value" style={{ color }}>{item.valueLabel}</div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="an-loading">
      <div className="an-empty-icon">
        <BarChart3 size={22} />
      </div>
      <span>{text}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeLines, setActiveLines] = useState<string[]>([
    "transaksi", "kemasanPlastik", "kemasanKertas", "pelanggaran",
  ]);
  const [infoSekolah, setInfoSekolah] = useState({
    namaSekolah: "Sekolah SEHATI", npsn: "-", alamat: "-",
  });

  useEffect(() => {
    api.get("/pengaturan").then((res) => {
      const rows: any[] = res.data?.data ?? [];
      const map: Record<string, string> = {};
      rows.forEach((r) => { map[r.key] = r.value; });
      setInfoSekolah({
        namaSekolah: map["nama_sekolah"] ?? "Sekolah SEHATI",
        npsn: map["npsn"] ?? "-",
        alamat: map["alamat"] ?? "-",
      });
    }).catch(() => { });
  }, []);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    const start = period === "custom" ? customStart : undefined;
    const end = period === "custom" ? customEnd : undefined;

    if (period === "custom") {
      if (!start || !end || start > end) {
        setData(null);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetchAnalyticsCached(period, start, end, options);
      setData(res);
    } catch (e) {
      const err = e as ApiClientError;
      setData(null);
      setErrorMsg(err.message || "Gagal mengambil data analitik.");
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    if (!data || exporting) return;
    setExporting(true);
    try { await exportAnalyticsPDF(data, infoSekolah); }
    catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  function toggleLine(key: string) {
    setActiveLines((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const periodLabel = data
    ? formatPeriodLabel(data.period, data.range.start, data.range.end)
    : "";

  const canQuery = period !== "custom" ||
    (customStart && customEnd && customStart <= customEnd);

  const totalKemasan = data?.donutKemasan?.reduce((s: number, d: any) => s + d.value, 0) ?? 0;
  const totalProduk = data?.topProduk?.reduce((s: number, d: any) => s + d.value, 0) ?? 0;

  return (
    <div className="an-page">

      {/* ══ TOPBAR ═══════════════════════════════════════════ */}
      <div className="an-topbar">
        <div className="an-topbar-left">
          <div className="an-title-block">
            <div className="an-title-icon-wrap">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="an-title">Dasbor Analitik</h1>
              <p className="an-subtitle">{periodLabel || "Memuat data..."}</p>
            </div>
          </div>
        </div>
        <div className="an-topbar-right">
          <button
            className="an-btn-icon"
            onClick={() => load({ force: true })}
            disabled={loading}
            title="Perbarui data"
          >
            <RefreshCw
              size={15}
              style={{ animation: loading ? "spin .7s linear infinite" : "none" }}
            />
          </button>
          <button
            className="an-btn-export"
            onClick={handleExport}
            disabled={exporting || loading || !data}
          >
            {exporting
              ? <><Loader2 size={14} style={{ animation: "spin .6s linear infinite" }} /> Mengekspor…</>
              : <><Download size={14} /> Laporan PDF</>}
          </button>
        </div>
      </div>

      {/* ══ PERIOD FILTER ════════════════════════════════════ */}
      <div className="an-filter-row">
        <span className="an-filter-label">Periode</span>
        <div className="an-period-group">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`an-period-btn ${period === p.key ? "active" : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="an-date-range">
            <Calendar size={13} style={{ color: "var(--txt-muted)", flexShrink: 0 }} />
            <input
              type="date" className="an-date-inp" value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span style={{ color: "var(--txt-muted)", fontSize: "0.75rem" }}>—</span>
            <input
              type="date" className="an-date-inp" value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
            <button
              className="an-btn-refresh"
              onClick={() => load({ force: true })}
              disabled={!customStart || !customEnd || customStart > customEnd || loading}
            >
              Terapkan
            </button>
          </div>
        )}
      </div>

      {/* ══ VALIDATION MESSAGES ══════════════════════════════ */}
      {period === "custom" && (!customStart || !customEnd) && (
        <EmptyState text="Pilih tanggal awal dan akhir untuk menampilkan data." />
      )}
      {period === "custom" && customStart && customEnd && customStart > customEnd && (
        <EmptyState text="Tanggal akhir harus sama atau setelah tanggal awal." />
      )}
      {!loading && errorMsg && canQuery && (
        <EmptyState text={errorMsg} />
      )}

      {/* ══ CONTENT ══════════════════════════════════════════ */}
      {!canQuery ? null : loading ? (
        <div className="an-loading">
          <Loader2
            size={38}
            style={{ animation: "spin .8s linear infinite", color: "var(--accent)" }}
          />
          <span>Mengambil data analitik…</span>
        </div>
      ) : errorMsg ? null : !data ? (
        <EmptyState text="Gagal memuat data." />
      ) : (
        <>
          {/* ── Section: Ringkasan ──────────────────────────── */}
          <div className="an-section-header">
            <BarChart3 size={12} /> Ringkasan
          </div>

          {/* ── STAT CARDS ─────────────────────────────────── */}
          <div className="an-stats-grid">
            {data.stats.map((s) => <StatCardComp key={s.key} s={s} />)}
          </div>

          {/* ── Section: Tren ───────────────────────────────── */}
          <div className="an-section-header">
            <TrendingUp size={12} /> Tren &amp; Distribusi
          </div>

          {/* ── TREND CHART ────────────────────────────────── */}
          <div className="an-card an-card-full">
            <div className="an-card-header">
              <div className="an-card-title">
                <TrendingUp size={15} />
                Tren Periode
              </div>
              <div className="an-legend-toggles">
                {TREND_LINES.map((l) => (
                  <button
                    key={l.key}
                    className={`an-legend-btn ${activeLines.includes(l.key) ? "active" : ""}`}
                    style={{ "--lc": l.color } as React.CSSProperties}
                    onClick={() => toggleLine(l.key)}
                  >
                    <span className="an-legend-dot" style={{ background: l.color }} />
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="an-chart-wrap">
              <ResponsiveContainer width="100%" height={230} minWidth={0}>
                <AreaChart data={data.trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    {TREND_LINES.map((l) => (
                      <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={l.color} stopOpacity={0.20} />
                        <stop offset="95%" stopColor={l.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--txt-muted)", fontSize: 10, fontFamily: "DM Sans" }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--txt-muted)", fontSize: 10, fontFamily: "DM Sans" }}
                    tickLine={false} axisLine={false} width={38}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {TREND_LINES.map((l) =>
                    activeLines.includes(l.key) ? (
                      <Area
                        key={l.key} type="monotone" dataKey={l.key}
                        name={l.label} stroke={l.color} strokeWidth={2.2}
                        dot={false} fill={`url(#grad-${l.key})`}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ) : null,
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── HEATMAP / HOURLY PELANGGARAN ───────────────── */}
          <div className="an-card an-card-full">
            <div className="an-card-header">
              <div className="an-card-title">
                <Activity size={15} />
                {period === "today" ? "Pelanggaran per Jam — Hari Ini" : "Heatmap Pelanggaran"}
              </div>
              <div className="an-card-subtext">
                {period === "today"
                  ? "Distribusi pelanggaran berdasarkan jam"
                  : "Semakin gelap = lebih banyak pelanggaran · arahkan kursor ke sel untuk detail"}
              </div>
            </div>

            {period === "today" ? (
              <div className="an-chart-wrap">
                <ResponsiveContainer width="100%" height={180} minWidth={0}>
                  <BarChart
                    data={Array.from({ length: 24 }, (_, h) => {
                      const count = data.heatmapPelanggaran
                        .filter((c: any) => c.hour === h)
                        .reduce((s: number, c: any) => s + c.count, 0);
                      return { jam: `${String(h).padStart(2, "0")}:00`, count };
                    })}
                    margin={{ top: 4, right: 10, left: -18, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="jam"
                      tick={{ fill: "var(--txt-muted)", fontSize: 9 }}
                      tickLine={false} axisLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fill: "var(--txt-muted)", fontSize: 9 }}
                      tickLine={false} axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(v: any) => [v, "pelanggaran"]}
                      labelFormatter={(l) => `Pukul ${l}`}
                      content={<ChartTooltip />}
                    />
                    <Bar dataKey="count" name="Pelanggaran" radius={[4, 4, 0, 0]}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <Cell key={i} fill={`rgba(248,113,113,${0.35 + 0.65 * (i / 23)})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <HeatmapGrid data={data.heatmapPelanggaran} />
            )}
          </div>

          {/* ── DISTRIBUSI KEMASAN (full width) ────────────── */}
          <div className="an-card an-card-full">
            <div className="an-card-header">
              <div className="an-card-title">
                <Leaf size={15} />
                Distribusi Kemasan
              </div>
              {totalKemasan > 0 && (
                <span style={{ fontSize: "0.75rem", color: "var(--txt-muted)", fontWeight: 600 }}>
                  Total: {totalKemasan.toLocaleString("id-ID")} item
                </span>
              )}
            </div>
            <div className="an-chart-wrap" style={{ height: 210, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={
                      data.donutKemasan.length > 0
                        ? data.donutKemasan
                        : [{ name: "Belum ada data", value: 1, color: "#334155" }]
                    }
                    cx="50%" cy="50%"
                    innerRadius={58} outerRadius={88}
                    paddingAngle={3} dataKey="value"
                    labelLine={false}
                    label={data.donutKemasan.length > 0 ? renderDonutLabel : undefined}
                    strokeWidth={0}
                    activeShape={({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }: any) => (
                      <Sector
                        cx={cx} cy={cy}
                        innerRadius={innerRadius - 3}
                        outerRadius={outerRadius + 8}
                        startAngle={startAngle}
                        endAngle={endAngle}
                        fill={fill}
                        opacity={1}
                        stroke={fill}
                        strokeWidth={1.5}
                        strokeOpacity={0.35}
                      />
                    )}
                  >
                    {(data.donutKemasan.length > 0
                      ? data.donutKemasan
                      : [{ color: "#334155" }]
                    ).map((d: any, i: number) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      const val = d.value as number;
                      const pct = totalKemasan > 0
                        ? (val / totalKemasan * 100).toFixed(1)
                        : "0";
                      const color = (d.payload as any)?.color ?? "#334155";
                      return (
                        <div className="an-tooltip">
                          <div className="an-tooltip-label">{d.name}</div>
                          <div className="an-tooltip-row">
                            <span className="an-tooltip-dot" style={{ background: color, color }} />
                            <span className="an-tooltip-name">Jumlah</span>
                            <span className="an-tooltip-val">{val.toLocaleString("id-ID")} item</span>
                          </div>
                          <div className="an-tooltip-row">
                            <span className="an-tooltip-dot" style={{ background: "var(--accent)", color: "var(--accent)" }} />
                            <span className="an-tooltip-name">Porsi</span>
                            <span className="an-tooltip-val">{pct}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => (
                      <span style={{ fontSize: 11, color: "var(--txt)", fontWeight: 500 }}>
                        {v}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              {totalKemasan > 0 && (
                <div className="an-donut-center">
                  <div className="an-donut-center-val">{totalKemasan.toLocaleString("id-ID")}</div>
                  <div className="an-donut-center-lbl">Total</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Section: Peringkat & Kelas ──────────────────── */}
          <div className="an-section-header">
            <Trophy size={12} /> Peringkat &amp; Kepatuhan
          </div>

          {/* ── RANKING + PRODUCTS + PROGRESS ──────────────── */}
          <div className="an-row-3col">

            {/* Top Siswa */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title">
                  <Trophy size={15} />
                  Top Siswa — Coins
                </div>
              </div>
              <div className="an-rank-list">
                {data.topSiswa.slice(0, 7).map((s: any) => (
                  <RankRow key={s.id} item={s} color="#f59e0b" isTop3={s.rank <= 3} />
                ))}
              </div>
            </div>

            {/* Produk Terlaris */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title">
                  <Package size={15} />
                  Produk Terlaris
                </div>
              </div>
              <div className="an-chart-wrap" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={data.topProduk.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 0, right: 14, left: 0, bottom: 0 }}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3" stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: "var(--txt-muted)", fontSize: 9 }}
                      tickLine={false} axisLine={false}
                    />
                    <YAxis
                      type="category" dataKey="name" width={88}
                      tick={{ fill: "var(--txt)", fontSize: 9 }}
                      tickLine={false} axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--surface-raised)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0];
                        const idx = data.topProduk.findIndex((p: any) => p.name === d?.payload?.name);
                        const color = `hsl(${215 - idx * 20}, 78%, 62%)`;
                        const pct = totalProduk > 0
                          ? ((d.value as number) / totalProduk * 100).toFixed(1)
                          : "0";
                        return (
                          <div className="an-tooltip">
                            <div className="an-tooltip-label">{d?.payload?.name}</div>
                            <div className="an-tooltip-row">
                              <span className="an-tooltip-dot" style={{ background: color, color }} />
                              <span className="an-tooltip-name">Unit terjual</span>
                              <span className="an-tooltip-val">{(d.value as number).toLocaleString("id-ID")}</span>
                            </div>
                            <div className="an-tooltip-row">
                              <span className="an-tooltip-dot" style={{ background: "var(--accent)", color: "var(--accent)" }} />
                              <span className="an-tooltip-name">Porsi</span>
                              <span className="an-tooltip-val">{pct}%</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" name="Unit" radius={[0, 5, 5, 0]}>
                      {data.topProduk.slice(0, 6).map((_: any, i: number) => (
                        <Cell key={i} fill={`hsl(${215 - i * 20}, 78%, 62%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kepatuhan per Kelas */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title">
                  <BarChart3 size={15} />
                  Kepatuhan per Kelas
                </div>
              </div>
              <div className="an-progress-list">
                {data.progressKelas.slice(0, 8).map((k: any) => {
                  const clr =
                    k.kepatuhanPct >= 80 ? "#22c55e"
                      : k.kepatuhanPct >= 60 ? "#f59e0b"
                        : "#f87171";
                  const bgClr =
                    k.kepatuhanPct >= 80 ? "var(--green-bg)"
                      : k.kepatuhanPct >= 60 ? "var(--amber-bg)"
                        : "var(--red-bg)";
                  return (
                    <div key={k.id} className="an-progress-row">
                      <div className="an-progress-header">
                        <span className="an-progress-name">
                          {k.tingkat} {k.name}
                        </span>
                        <span
                          className="an-progress-badge"
                          style={{ color: clr, background: bgClr }}
                        >
                          {k.kepatuhanPct}%
                        </span>
                      </div>
                      <div className="an-progress-track">
                        <div
                          className="an-progress-fill"
                          style={{ width: `${k.kepatuhanPct}%`, background: clr }}
                        />
                      </div>
                      <div className="an-progress-meta">
                        <Users size={9} style={{ marginRight: 2 }} />
                        {k.totalSiswa} siswa
                        <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
                        <AlertTriangle size={9} style={{ marginRight: 2 }} />
                        {k.pelanggar} pelanggaran
                        <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
                        <Coins size={9} style={{ marginRight: 2 }} />
                        rata {k.coinsRata.toLocaleString("id-ID")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
