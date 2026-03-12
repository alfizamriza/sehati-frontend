"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LogOut, Trophy, Medal, Flame,
  Search, Download, TrendingUp, Users,
  Crown, School, ChevronDown, ArrowLeft, Coins,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import {
  useLeaderboardKelasSaya,
  useLeaderboardAntarKelas,
  useLeaderboardSekolah,
  useLeaderboardAntarJenjang,
  useLeaderboardSiswaByJenjang,
  LeaderboardSiswaRow,
  LeaderboardKelasRow,
  LeaderboardJenjangRow,
  exportLeaderboardPdf,
} from "@/lib/services/admin";
// import "./leaderboard.css"; 

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────
type TabKey = "kelas" | "antarKelas" | "sekolah" | "antarJenjang" | "siswaAntarJenjang";
type LeaderboardRow = LeaderboardSiswaRow | LeaderboardKelasRow | LeaderboardJenjangRow;

const TABS: { key: TabKey; label: string }[] = [
  { key: "kelas",             label: "Kelas Saya"    },
  { key: "antarKelas",        label: "Antar Kelas"   },
  { key: "sekolah",           label: "Sekolah"       },
  { key: "antarJenjang",      label: "Antar Jenjang" },
  { key: "siswaAntarJenjang", label: "Se-Jenjang"    },
];

const JENJANG_LIST = ["SD", "SMP", "SMA"] as const;
const JENJANG_COLOR: Record<string, string> = {
  SD: "#4ade80", SMP: "#60a5fa", SMA: "#f472b6",
};
const JENJANG_ICON: Record<string, string> = {
  SD: "🏫", SMP: "🏛️", SMA: "🎓",
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const getInitial = (name: string) =>
  (name?.trim()?.[0] ?? "?").toUpperCase();

const formatCoins = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const getMedalColor = (rank: number) => {
  if (rank === 1) return "#F59E0B";
  if (rank === 2) return "#94A3B8";
  if (rank === 3) return "#B45309";
  return "rgba(255,255,255,0.3)";
};

// ─────────────────────────────────────────────
// SKELETON ROW
// ─────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="leaderboard-item" style={{ pointerEvents: "none" }}>
    <div style={{ width: 30, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "shimmer-guru 1.4s infinite" }} />
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "shimmer-guru 1.4s infinite", flexShrink: 0 }} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ width: "55%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "shimmer-guru 1.4s infinite" }} />
      <div style={{ width: "35%", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "shimmer-guru 1.4s infinite" }} />
    </div>
    <div style={{ width: 44, height: 18, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "shimmer-guru 1.4s infinite" }} />
  </div>
);

// ─────────────────────────────────────────────
// STAT CARD — sama persis dengan dashboard guru
// ─────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string;
}) {
  return (
    <div className="glass-panel stats-card" style={{ flexDirection: "column", gap: 0, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div className="label">{label}</div>
          <div className="value" style={{ fontSize: 22, marginTop: 4 }}>{value}</div>
        </div>
        <div style={{ padding: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10 }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
        <TrendingUp size={12} /> {sub}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LEADERBOARD ITEM — style dari dashboard.css
// ─────────────────────────────────────────────
function SiswaItem({ row }: { row: LeaderboardSiswaRow }) {
  const medalColor = getMedalColor(row.rank);
  return (
    <div className="leaderboard-item">
      <div className="rank-col">
        {row.rank <= 3 ? (
          <Medal size={22} color={medalColor} fill={medalColor} />
        ) : (
          <span className="rank-number">#{row.rank}</span>
        )}
      </div>

      {/* Avatar inisial atau foto */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: row.rank <= 3
          ? `linear-gradient(135deg, ${medalColor}88, ${medalColor}44)`
          : "rgba(255,255,255,0.08)",
        border: `1px solid ${row.rank <= 3 ? medalColor + "66" : "rgba(255,255,255,0.1)"}`,
        display: "grid", placeItems: "center",
        fontWeight: 700, fontSize: 13,
        overflow: "hidden",
      }}>
        {row.fotoUrl ? (
          <img src={row.fotoUrl} alt={row.nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          getInitial(row.nama)
        )}
      </div>

      <div className="student-info">
        <div className="student-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {row.nama}
          {row.rank === 1 && <Crown size={12} color="#F59E0B" />}
        </div>
        <div className="student-streak">
          <span style={{ marginRight: 6 }}>
            <Flame size={11} color={row.streak > 5 ? "#f43f5e" : "#64748b"} style={{ display: "inline", verticalAlign: "middle" }} />
            {" "}{row.streak} hari
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
            background: `${JENJANG_COLOR[row.jenjang] ?? "#94a3b8"}22`,
            color: JENJANG_COLOR[row.jenjang] ?? "#94a3b8",
          }}>
            {row.kelas}
          </span>
        </div>
      </div>

      <div className="student-score">
        {formatCoins(row.coins)}
        <span className="pts">pts</span>
      </div>
    </div>
  );
}

function KelasItem({ row }: { row: LeaderboardKelasRow }) {
  const medalColor = getMedalColor(row.rank);
  const jColor = JENJANG_COLOR[row.jenjang] ?? "#94a3b8";
  return (
    <div className="leaderboard-item">
      <div className="rank-col">
        {row.rank <= 3 ? (
          <Medal size={22} color={medalColor} fill={medalColor} />
        ) : (
          <span className="rank-number">#{row.rank}</span>
        )}
      </div>

      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `${jColor}22`, border: `1px solid ${jColor}44`,
        display: "grid", placeItems: "center",
      }}>
        <School size={16} color={jColor} />
      </div>

      <div className="student-info">
        <div className="student-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {row.nama_kelas}
          {row.rank === 1 && <Crown size={12} color="#F59E0B" />}
        </div>
        <div className="student-streak">
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
            background: `${jColor}22`, color: jColor, marginRight: 6,
          }}>
            {JENJANG_ICON[row.jenjang]} {row.jenjang}
          </span>
          👥 {row.jumlah_siswa} siswa
        </div>
      </div>

      <div className="student-score">
        {formatCoins(Math.round(Number(row.avg_coins)))}
        <span className="pts">avg</span>
      </div>
    </div>
  );
}

function JenjangItem({ row }: { row: LeaderboardJenjangRow }) {
  const medalColor = getMedalColor(row.rank);
  const jColor = JENJANG_COLOR[row.jenjang] ?? "#94a3b8";
  return (
    <div className="leaderboard-item" style={{ borderColor: `${jColor}33` }}>
      <div className="rank-col">
        {row.rank <= 3 ? (
          <Medal size={22} color={medalColor} fill={medalColor} />
        ) : (
          <span className="rank-number">#{row.rank}</span>
        )}
      </div>

      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `${jColor}22`, border: `1px solid ${jColor}55`,
        display: "grid", placeItems: "center", fontSize: 17,
      }}>
        {JENJANG_ICON[row.jenjang]}
      </div>

      <div className="student-info">
        <div className="student-name" style={{ color: jColor, display: "flex", alignItems: "center", gap: 6 }}>
          Jenjang {row.jenjang}
          {row.rank === 1 && <Crown size={12} color="#F59E0B" />}
        </div>
        <div className="student-streak">
          👥 {row.total_siswa} siswa &nbsp;•&nbsp; total {formatCoins(Number(row.total_coins))} koin
        </div>
      </div>

      <div className="student-score" style={{ color: jColor }}>
        {Math.round(Number(row.avg_coins))}
        <span className="pts">avg</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function LeaderboardGuruPage() {
  const [tab, setTab]             = useState<TabKey>("kelas");
  const [q, setQuery]             = useState("");
  const [jenjangKelasFilter, setJenjangKelasFilter] = useState("");
  const [jenjangSiswaFilter, setJenjangSiswaFilter] = useState("SD");

  // ── Queries ──
  const { data: dataKelas,        isLoading: lKelas        } = useLeaderboardKelasSaya();
  const { data: dataAntarKelas,   isLoading: lAntarKelas   } = useLeaderboardAntarKelas(jenjangKelasFilter || undefined);
  const { data: dataSekolah,      isLoading: lSekolah      } = useLeaderboardSekolah();
  const { data: dataAntarJenjang, isLoading: lAntarJenjang } = useLeaderboardAntarJenjang();
  const { data: dataSiswaJenjang, isLoading: lSiswaJenjang } = useLeaderboardSiswaByJenjang(jenjangSiswaFilter);

  const isLoading = { kelas: lKelas, antarKelas: lAntarKelas, sekolah: lSekolah, antarJenjang: lAntarJenjang, siswaAntarJenjang: lSiswaJenjang }[tab];

  // ── Data aktif ──
  const activeData = useMemo(() => {
    switch (tab) {
      case "kelas":             return (dataKelas         ?? []) as LeaderboardRow[];
      case "antarKelas":        return (dataAntarKelas    ?? []) as LeaderboardRow[];
      case "sekolah":           return (dataSekolah       ?? []) as LeaderboardRow[];
      case "antarJenjang":      return (dataAntarJenjang  ?? []) as LeaderboardRow[];
      case "siswaAntarJenjang": return (dataSiswaJenjang  ?? []) as LeaderboardRow[];
    }
  }, [tab, dataKelas, dataAntarKelas, dataSekolah, dataAntarJenjang, dataSiswaJenjang]);

  // ── Filter search ──
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return activeData;
    return activeData.filter((r) => {
      if (tab === "antarJenjang")      return r.jenjang.toLowerCase().includes(query);
      if (tab === "antarKelas")        return (r as LeaderboardKelasRow).nama_kelas.toLowerCase().includes(query);
      return (r as LeaderboardSiswaRow).nama.toLowerCase().includes(query) || (r as LeaderboardSiswaRow).kelas.toLowerCase().includes(query);
    });
  }, [q, activeData, tab]);

  // ── Stats ──
  const stats = useMemo(() => {
    if (tab === "antarJenjang") {
      const rows = activeData as LeaderboardJenjangRow[];
      return {
        partisipan: rows.reduce((s, r) => s + r.total_siswa, 0),
        totalCoins: rows.reduce((s, r) => s + Number(r.total_coins), 0),
        avgStreak:  null as number | null,
        labelP: "Total Siswa", subP: `${rows.length} jenjang`,
      };
    }
    if (tab === "antarKelas") {
      const rows = activeData as LeaderboardKelasRow[];
      return {
        partisipan: rows.length,
        totalCoins: rows.reduce((s, r) => s + Number(r.total_coins), 0),
        avgStreak:  null,
        labelP: "Total Kelas", subP: `${rows.reduce((s,r) => s + r.jumlah_siswa, 0)} total siswa`,
      };
    }
    const rows = activeData as LeaderboardSiswaRow[];
    return {
      partisipan: rows.length,
      totalCoins: rows.reduce((s, r) => s + r.coins, 0),
      avgStreak:  rows.length ? Math.round(rows.reduce((s, r) => s + r.streak, 0) / rows.length) : 0,
      labelP: "Total Siswa", subP: "Siswa aktif",
    };
  }, [tab, activeData]);

  // ── Export CSV ──
  const handleExport = () => {
    if (!filtered.length) return;
    let header = "", lines: string[] = [];
    if (tab === "antarJenjang") {
      header = "Rank,Jenjang,Avg Coins,Total Siswa,Total Coins";
      lines  = (filtered as LeaderboardJenjangRow[]).map((r: LeaderboardJenjangRow) => `${r.rank},${r.jenjang},${Math.round(Number(r.avg_coins))},${r.total_siswa},${r.total_coins}`);
    } else if (tab === "antarKelas") {
      header = "Rank,Kelas,Jenjang,Avg Coins,Jumlah Siswa";
      lines  = (filtered as LeaderboardKelasRow[]).map((r: LeaderboardKelasRow) => `${r.rank},${r.nama_kelas},${r.jenjang},${Math.round(Number(r.avg_coins))},${r.jumlah_siswa}`);
    } else {
      header = "Rank,Nama,Kelas,Jenjang,Coins,Streak";
      lines  = (filtered as LeaderboardSiswaRow[]).map((r: LeaderboardSiswaRow) => `${r.rank},${r.nama},${r.kelas},${r.jenjang},${r.coins},${r.streak}`);
    }
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leaderboard_guru_${tab}_${Date.now()}.csv`;
    a.click();
  };

  const handleExportPdf = () => {
    exportLeaderboardPdf({ type: tab });
  };

  return (
    <main className="dashboard-page">
      <style>{`
        @keyframes shimmer-guru {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .lb-guru-tabs {
          display: flex; gap: 4px; flex-wrap: nowrap; overflow-x: auto;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
        }
        .lb-guru-tabs::-webkit-scrollbar { display: none; }
        .lb-guru-tab {
          padding: 8px 16px; border-radius: 12px; border: none;
          background: transparent; color: rgba(255,255,255,.45);
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all .2s; white-space: nowrap; font-family: inherit;
        }
        .lb-guru-tab.active {
          background: rgba(23,158,255,.15); color: #179EFF;
          border: 1px solid rgba(23,158,255,.3); font-weight: 700;
        }
        .lb-guru-tab:hover:not(.active) { color: rgba(255,255,255,.75); }
        .lb-search {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px; padding: 8px 14px;
        }
        .lb-search input {
          background: none; border: none; outline: none;
          color: #fff; font-size: 13px; font-family: inherit; width: 180px;
        }
        .lb-search input::placeholder { color: rgba(255,255,255,.35); }
        .lb-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 12px; border: none; cursor: pointer;
          font-family: inherit; font-size: 13px; font-weight: 600; transition: all .2s;
        }
        .lb-btn-secondary {
          background: rgba(255,255,255,.07); color: rgba(255,255,255,.7);
          border: 1px solid rgba(255,255,255,.1);
        }
        .lb-btn-secondary:hover { background: rgba(255,255,255,.12); color: #fff; }
        .lb-select-wrap { position: relative; }
        .lb-select {
          appearance: none; background: rgba(23,158,255,.1);
          border: 1px solid rgba(23,158,255,.3); color: #fff;
          padding: 8px 32px 8px 12px; border-radius: 12px;
          font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; outline: none;
        }
        .lb-select option { background: #0f172a; color: #fff; }
        .lb-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #179EFF; }
        .lb-empty { text-align: center; padding: 32px; color: rgba(255,255,255,.35); font-size: 14px; }
        .lb-guru-tab-bar {
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
          border-radius: 16px; padding: 8px;
        }
      `}</style>

      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <div className="dashboard-container">

        {/* ── HEADER ── */}
        <header className="dash-header">
          <div className="brand">
            <div className="brand-logo"><BrandLogo size={30} alt="SEHATI Guru Leaderboard" priority /></div>
            <div className="brand-text">
              <span className="brand-name">SEHATI</span>
              <span className="brand-role">Leaderboard</span>
            </div>
          </div>
          <div className="header-actions">
            <Link href="/guru/dashboard" className="btn-icon" title="Kembali ke Dashboard">
              <ArrowLeft size={20} />
            </Link>
          </div>
        </header>

        {/* ── TABS ── */}
        <div className="lb-guru-tab-bar">
          <div className="lb-guru-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`lb-guru-tab ${tab === t.key ? "active" : ""}`}
                onClick={() => { setTab(t.key); setQuery(""); setJenjangKelasFilter(""); }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <StatCard
            icon={<Users size={18} color="#60a5fa" />}
            label={stats.labelP}
            value={isLoading ? "—" : stats.partisipan}
            sub={stats.subP}
          />
          <StatCard
            icon={<Coins size={18} color="#F59E0B" />}
            label="Total Koin"
            value={isLoading ? "—" : stats.totalCoins.toLocaleString("id-ID")}
            sub="Koin terkumpul"
          />
          {stats.avgStreak !== null && (
            <StatCard
              icon={<Flame size={18} color="#f43f5e" />}
              label="Rata-rata Streak"
              value={isLoading ? "—" : `${stats.avgStreak} Hari`}
              sub="Konsistensi siswa"
            />
          )}
        </div>

        {/* ── PANEL UTAMA — sesuai gaya right-col dashboard guru ── */}
        <div style={{
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 24, padding: 24,
          backdropFilter: "blur(10px)",
        }}>

          {/* Header panel: judul + search + filter + export */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div className="section-title" style={{ margin: 0 }}>
              <Trophy size={20} className="icon-title" />
              <h3 style={{ margin: 0 }}>Peringkat Siswa</h3>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* Filter jenjang — hanya tab Antar Kelas */}
              {tab === "antarKelas" && (
                <div className="lb-select-wrap">
                  <select
                    className="lb-select"
                    value={jenjangKelasFilter}
                    onChange={(e) => setJenjangKelasFilter(e.target.value)}
                  >
                    <option value="">Semua Jenjang</option>
                    {JENJANG_LIST.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <ChevronDown size={14} className="lb-chevron" />
                </div>
              )}

              {tab === "siswaAntarJenjang" && (
                <div className="lb-select-wrap">
                  <select
                    className="lb-select"
                    value={jenjangSiswaFilter}
                    onChange={(e) => setJenjangSiswaFilter(e.target.value)}
                  >
                    {JENJANG_LIST.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <ChevronDown size={14} className="lb-chevron" />
                </div>
              )}

              {/* Search — semua tab kecuali antarJenjang */}
              {tab !== "antarJenjang" && (
                <div className="lb-search">
                  <Search size={14} style={{ color: "rgba(255,255,255,.4)", flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder={tab === "antarKelas" ? "Cari kelas..." : "Cari nama / kelas..."}
                    value={q}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              )}

              <button className="lb-btn lb-btn-secondary" onClick={handleExport}>
                <Download size={14} /> CSV
              </button>
              <button className="lb-btn lb-btn-secondary" onClick={handleExportPdf}>
                <Download size={14} /> PDF
              </button>
            </div>
          </div>

          {/* ── LIST ── */}
          <div className="leaderboard-list" style={{ gap: 0 }}>
            {isLoading ? (
              Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <div className="lb-empty">
                <Trophy size={36} style={{ opacity: 0.2, marginBottom: 8 }} />
                <div>Tidak ada data ditemukan.</div>
              </div>
            ) : (
              filtered.map((row, i) => {
                if (tab === "antarKelas")        return <KelasItem   key={(row as LeaderboardKelasRow).kelas_id}   row={row as LeaderboardKelasRow} />;
                if (tab === "antarJenjang")      return <JenjangItem key={(row as LeaderboardJenjangRow).jenjang}  row={row as LeaderboardJenjangRow} />;
                return <SiswaItem key={`${(row as LeaderboardSiswaRow).nis}-${i}`} row={row as LeaderboardSiswaRow} />;
              })
            )}
          </div>

          {/* Jumlah hasil */}
          {!isLoading && filtered.length > 0 && (
            <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.25)", marginTop: 16 }}>
              Menampilkan {filtered.length} data
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
