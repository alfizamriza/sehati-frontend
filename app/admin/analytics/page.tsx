"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  BarChart3, TrendingUp, TrendingDown, Users, Coins,
  AlertTriangle, CreditCard, Download, RefreshCw,
  Loader2, Calendar, Ticket, Leaf,
  Trophy, Package,
} from "lucide-react";
import {
  fetchAnalyticsCached, exportAnalyticsPDF, formatPeriodLabel,
  type AnalyticsData, type AnalyticsPeriod, type StatCard,
} from "@/lib/services/analytics.service";
import api, { type ApiClientError } from "@/lib/api";
import "./analytics.css";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "week",  label: "7 Hari" },
  { key: "month", label: "Bulan Ini" },
  { key: "year",  label: "Tahun Ini" },
  { key: "custom",label: "Custom" },
];

const TREND_LINES = [
  { key: "transaksi",   label: "Transaksi",  color: "#179EFF" },
  { key: "coins",       label: "Coins",       color: "#F59E0B" },
  { key: "pelanggaran", label: "Pelanggaran",color: "#EF4444" },
];

const STAT_ICONS: Record<string, React.ReactNode> = {
  pendapatan:   <TrendingUp  size={18} />,
  transaksi:    <CreditCard  size={18} />,
  siswa:        <Users       size={18} />,
  coins:        <Coins       size={18} />,
  pelanggaran:  <AlertTriangle size={18} />,
  voucher:      <Ticket      size={18} />,
};

const STAT_COLORS: Record<string, string> = {
  pendapatan:  "#179EFF",
  transaksi:   "#10b981",
  siswa:       "#8B5CF6",
  coins:       "#F59E0B",
  pelanggaran: "#EF4444",
  voucher:     "#06b6d4",
};

// ─── MINI SPARKLINE ───────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max   = Math.max(...data, 1);
  const W     = 72;
  const H     = 28;
  const pts   = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline
        points={pts} fill="none"
        stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
        opacity={0.8}
      />
      <polyline
        points={`0,${H} ${pts} ${W},${H}`}
        fill={`${color}22`} stroke="none"
      />
    </svg>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCardComp({ s }: { s: StatCard }) {
  const color   = STAT_COLORS[s.key] ?? "#179EFF";
  const icon    = STAT_ICONS[s.key] ?? <BarChart3 size={18} />;
  const isUp    = s.change >= 0;
  const good    = s.negative ? !isUp : isUp;
  const clrChange = s.change === 0 ? "var(--txt-muted)"
    : good ? "var(--green)" : "var(--red)";

  return (
    <div className="an-stat-card" style={{ "--accent": color } as React.CSSProperties}>
      <div className="an-stat-top">
        <div className="an-stat-icon" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        <div className="an-stat-texts">
          <div className="an-stat-label">{s.label}</div>
          <div className="an-stat-value">{s.valueFormatted}</div>
          <div className="an-stat-change" style={{ color: clrChange }}>
            {s.change !== 0 && (isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
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
  return (
    <div className="an-tooltip">
      <div className="an-tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="an-tooltip-row">
          <span className="an-tooltip-dot" style={{ background: p.color }} />
          <span className="an-tooltip-name">{p.name}</span>
          <span className="an-tooltip-val">{p.value?.toLocaleString("id-ID")}</span>
        </div>
      ))}
    </div>
  );
}

// ─── DONUT LABEL ─────────────────────────────────────────────────────────────
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 10, fontWeight: 700 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── RANKING ITEM ─────────────────────────────────────────────────────────────
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data,     setData]     = useState<AnalyticsData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [exporting,setExporting]= useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [period,   setPeriod]   = useState<AnalyticsPeriod>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [activeLines, setActiveLines] = useState<string[]>(["transaksi", "coins", "pelanggaran"]);
  const [infoSekolah, setInfoSekolah] = useState({ namaSekolah: "Sekolah SEHATI", npsn: "-", alamat: "-" });

  // Fetch info sekolah sekali
  useEffect(() => {
    api.get("/pengaturan").then((res) => {
      const rows: any[] = res.data?.data ?? [];
      const map: Record<string, string> = {};
      rows.forEach((r) => { map[r.key] = r.value; });
      setInfoSekolah({
        namaSekolah: map["nama_sekolah"] ?? "Sekolah SEHATI",
        npsn:        map["npsn"]         ?? "-",
        alamat:      map["alamat"]       ?? "-",
      });
    }).catch(() => {});
  }, []);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    const start = period === "custom" ? customStart : undefined;
    const end = period === "custom" ? customEnd : undefined;

    if (period === "custom") {
      if (!start || !end) {
        setData(null);
        setLoading(false);
        return;
      }
      if (start > end) {
        setData(null);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetchAnalyticsCached(
        period,
        start,
        end,
        options,
      );
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
    try {
      await exportAnalyticsPDF(data, infoSekolah);
    } catch (e) { console.error(e); }
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
  const canQuery = period !== "custom" || (customStart && customEnd && customStart <= customEnd);

  return (
    <div className="an-page">
      {/* ── TOPBAR ─────────────────────────────────────────── */}
      <div className="an-topbar">
        <div className="an-topbar-left">
          <div className="an-title-block">
            <BarChart3 size={20} className="an-title-icon" />
            <div>
              <h1 className="an-title">Dasbor Analitik</h1>
              <p className="an-subtitle">{periodLabel || "Memuat..."}</p>
            </div>
          </div>
        </div>
        <div className="an-topbar-right">
          <button className="an-btn-refresh" onClick={() => load({ force: true })} disabled={loading} title="Refresh">
            <RefreshCw size={14} style={{ animation: loading ? "spin .8s linear infinite" : "none" }} />
          </button>
          <button className="an-btn-export" onClick={handleExport} disabled={exporting || loading || !data}>
            {exporting
              ? <><Loader2 size={14} style={{ animation: "spin .6s linear infinite" }} /> Ekspor...</>
              : <><Download size={14} /> Laporan PDF</>}
          </button>
        </div>
      </div>

      {/* ── PERIOD FILTER ─────────────────────────────────── */}
      <div className="an-filter-row">
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
            <Calendar size={13} style={{ color: "var(--txt-muted)" }} />
            <input type="date" className="an-date-inp" value={customStart}
              onChange={(e) => setCustomStart(e.target.value)} />
            <span style={{ color: "var(--txt-muted)", fontSize: "0.75rem" }}>–</span>
            <input type="date" className="an-date-inp" value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)} />
            <button
              className="an-btn-refresh"
              onClick={() => load({ force: true })}
              disabled={!customStart || !customEnd || customStart > customEnd || loading}
              title="Terapkan rentang tanggal"
            >
              Terapkan
            </button>
          </div>
        )}
      </div>

      {period === "custom" && (!customStart || !customEnd) && (
        <div className="an-loading"><span>Pilih tanggal awal dan akhir untuk menampilkan data.</span></div>
      )}

      {period === "custom" && customStart && customEnd && customStart > customEnd && (
        <div className="an-loading"><span>Tanggal akhir harus lebih besar atau sama dengan tanggal awal.</span></div>
      )}

      {!loading && errorMsg && canQuery && (
        <div className="an-loading"><span>{errorMsg}</span></div>
      )}

      {!canQuery ? null : loading ? (
        <div className="an-loading">
          <Loader2 size={36} style={{ animation: "spin .8s linear infinite", color: "var(--accent)" }} />
          <span>Mengambil data analitik...</span>
        </div>
      ) : errorMsg ? null : !data ? (
        <div className="an-loading"><span>Gagal memuat data.</span></div>
      ) : (
        <>
          {/* ── STAT CARDS ─────────────────────────────────── */}
          <div className="an-stats-grid">
            {data.stats.map((s) => <StatCardComp key={s.key} s={s} />)}
          </div>

          {/* ── TREND CHART ────────────────────────────────── */}
          <div className="an-card an-card-full">
            <div className="an-card-header">
              <div className="an-card-title">
                <TrendingUp size={16} /> Tren Periode
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
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <AreaChart data={data.trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    {TREND_LINES.map((l) => (
                      <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={l.color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={l.color} stopOpacity={0}    />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--txt-muted)", fontSize: 10 }}
                    tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "var(--txt-muted)", fontSize: 10 }}
                    tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  {TREND_LINES.map((l) =>
                    activeLines.includes(l.key) ? (
                      <Area key={l.key} type="monotone" dataKey={l.key} name={l.label}
                        stroke={l.color} strokeWidth={2} dot={false}
                        fill={`url(#grad-${l.key})`} />
                    ) : null,
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── TENGAH: Donut × 2 ─────────────────────────── */}
          <div className="an-row-2col">
            {/* Metode Bayar */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title"><CreditCard size={15} /> Metode Pembayaran</div>
              </div>
              <div className="an-chart-wrap" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <PieChart>
                    <Pie data={data.donutMetodeBayar} cx="50%" cy="50%"
                      innerRadius={52} outerRadius={80}
                      paddingAngle={3} dataKey="value"
                      labelLine={false} label={renderDonutLabel}>
                      {data.donutMetodeBayar.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "transaksi"]} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 11, color: "var(--txt)" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Kemasan */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title"><Leaf size={15} /> Distribusi Kemasan</div>
              </div>
              <div className="an-chart-wrap" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <PieChart>
                    <Pie data={data.donutKemasan.length > 0 ? data.donutKemasan : [{ name: "Belum ada data", value: 1, color: "#334155" }]}
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={80}
                      paddingAngle={3} dataKey="value"
                      labelLine={false} label={data.donutKemasan.length > 0 ? renderDonutLabel : undefined}>
                      {(data.donutKemasan.length > 0 ? data.donutKemasan : [{ color: "#334155" }]).map((d: any, i: number) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "item"]} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 11, color: "var(--txt)" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── BAWAH: Ranking + Progress ──────────────────── */}
          <div className="an-row-3col">
            {/* Top Siswa */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title"><Trophy size={15} /> Top Siswa — Coins</div>
              </div>
              <div className="an-rank-list">
                {data.topSiswa.slice(0, 7).map((s) => (
                  <RankRow key={s.id} item={s} color="#F59E0B" isTop3={s.rank <= 3} />
                ))}
              </div>
            </div>

            {/* Top Produk */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title"><Package size={15} /> Produk Terlaris</div>
              </div>
              <div className="an-chart-wrap" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <BarChart
                    data={data.topProduk.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "var(--txt-muted)", fontSize: 9 }}
                      tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={80}
                      tick={{ fill: "var(--txt)", fontSize: 9 }}
                      tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => [v, "unit"]} />
                    <Bar dataKey="value" name="Unit" radius={[0, 4, 4, 0]}>
                      {data.topProduk.slice(0, 6).map((_: any, i: number) => (
                        <Cell key={i} fill={`hsl(${210 - i * 18}, 80%, 58%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Progress Kelas */}
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-card-title"><BarChart3 size={15} /> Kepatuhan per Kelas</div>
              </div>
              <div className="an-progress-list">
                {data.progressKelas.slice(0, 8).map((k) => {
                  const clr = k.kepatuhanPct >= 80 ? "#10b981"
                    : k.kepatuhanPct >= 60 ? "#F59E0B" : "#EF4444";
                  return (
                    <div key={k.id} className="an-progress-row">
                      <div className="an-progress-header">
                        <span className="an-progress-name">
                          {k.tingkat} {k.name}
                        </span>
                        <span className="an-progress-pct" style={{ color: clr }}>
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
                        {k.totalSiswa} siswa · {k.pelanggar} pelanggar · rata {k.coinsRata.toLocaleString("id-ID")} <Coins size={10}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
