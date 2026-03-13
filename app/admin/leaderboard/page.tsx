"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Trophy, Medal, Flame, Search, Download, TrendingUp, Users, Crown,
  School, ChevronDown, Building2, GraduationCap, Users2, Award,
  Coins, Loader2,
} from "lucide-react";
import {
  useLeaderboardKelasSaya, useLeaderboardAntarKelas,
  useLeaderboardSekolah, useLeaderboardAntarJenjang,
  useLeaderboardSiswaByJenjang,
  LeaderboardSiswaRow, LeaderboardKelasRow, LeaderboardJenjangRow,
  exportLeaderboardPdf,
  getKelasDropdown,
} from "@/lib/services/admin";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = "kelas" | "antarKelas" | "sekolah" | "antarJenjang" | "siswaAntarJenjang";
type LeaderboardRow = LeaderboardSiswaRow | LeaderboardKelasRow | LeaderboardJenjangRow;

const TABS: { key: TabKey; label: string }[] = [
  { key: "kelas",             label: "Kelas Saya"    },
  { key: "antarKelas",        label: "Antar Kelas"   },
  { key: "sekolah",           label: "Sekolah"       },
  { key: "antarJenjang",      label: "Antar Jenjang" },
  { key: "siswaAntarJenjang", label: "Se-Jenjang"    },
];
const JENJANG_LIST = ["SD","SMP","SMA"] as const;

// Jenjang colors — use CSS var tokens where possible
const JENJANG_COLOR: Record<string, string> = {
  SD: "var(--green)", SMP: "var(--primary)", SMA: "var(--pink)",
};
const JENJANG_BG: Record<string, string> = {
  SD: "var(--green-bg)", SMP: "var(--surface-active)", SMA: "var(--pink-bg)",
};

function JenjangIcon({ jenjang, size = 16 }: { jenjang: string; size?: number }) {
  const color = JENJANG_COLOR[jenjang] ?? "var(--text-faint)";
  if (jenjang === "SD")  return <School      size={size} style={{ color }} />;
  if (jenjang === "SMP") return <Building2   size={size} style={{ color }} />;
  if (jenjang === "SMA") return <GraduationCap size={size} style={{ color }} />;
  return <School size={size} style={{ color }} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitial = (nama: string) => (nama?.trim()?.[0] ?? "?").toUpperCase();
const fmtCoins   = (n: number)    => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const RANK_GRADIENT: Record<number, string> = {
  1: "linear-gradient(135deg,#f59e0b,#d97706)",
  2: "linear-gradient(135deg,#94a3b8,#64748b)",
  3: "linear-gradient(135deg,#b45309,#78350f)",
};
const RANK_BORDER: Record<number, string> = {
  1: "var(--amber)", 2: "var(--text-ghost)", 3: "#d97706",
};

function RankLabel({ rank }: { rank: number }) {
  if (rank === 1) return <Crown  size={15} style={{ color: "var(--amber)" }} />;
  if (rank === 2) return <Medal  size={15} style={{ color: "var(--text-ghost)" }} />;
  if (rank === 3) return <Award  size={15} style={{ color: "#d97706" }} />;
  return <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>#{rank}</span>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string;
}) {
  return (
    <div className="lb-stat-card">
      <div>
        <div className="lb-stat-label">{label}</div>
        <div className="lb-stat-value">{value}</div>
        <div className="lb-stat-sub"><TrendingUp size={11} /> {sub}</div>
      </div>
      <div className="lb-stat-icon">{icon}</div>
    </div>
  );
}

// ─── Podium Card (siswa / kelas) ──────────────────────────────────────────────
function PodiumCard({ nama, subLabel, coins, rank, fotoUrl }: {
  nama: string; subLabel: string; coins: number; rank: number; fotoUrl?: string | null;
}) {
  const isFirst = rank === 1;
  const avatarSize = isFirst ? 80 : 60;
  const blockH     = isFirst ? 220 : rank === 2 ? 180 : 150;
  const bg   = RANK_GRADIENT[rank] ?? "var(--surface-2)";
  const bord = RANK_BORDER[rank] ?? "transparent";

  return (
    <div className="podium-column" style={{ width: isFirst ? 140 : 120, zIndex: isFirst ? 10 : 1 }}>
      {/* Avatar */}
      <div className="podium-avatar-wrap" style={{
        width: avatarSize, height: avatarSize,
        border: `3px solid ${bord}`,
        boxShadow: rank <= 3 ? `0 0 20px ${bord}44` : "none",
      }}>
        {fotoUrl
          ? <img src={fotoUrl} alt={nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: isFirst ? 24 : 18, fontWeight: 800, color: "var(--text-main)" }}>
              {getInitial(nama)}
            </span>}
      </div>
      {/* Block */}
      <div className="podium-block" style={{ height: blockH, width: isFirst ? 140 : 120 }}>
        <div className="podium-rank-num" style={{
          fontSize: isFirst ? 20 : 16,
          color: rank === 1 ? "var(--amber)" : "var(--text-main)",
        }}>#{rank}</div>
        <div className="podium-name" style={{ fontSize: isFirst ? 14 : 13 }}>
          {nama.split(" ")[0]}
        </div>
        <div className="podium-sub">{subLabel}</div>
        <span className="podium-coins-badge" style={{ background: bg }}>
          <Coins size={16}/> {fmtCoins(coins)}
        </span>
      </div>
    </div>
  );
}

// ─── Podium Jenjang ───────────────────────────────────────────────────────────
function PodiumJenjang({ jenjang, avgCoins, totalSiswa, rank }: {
  jenjang: string; avgCoins: number; totalSiswa: number; rank: number;
}) {
  const isFirst  = rank === 1;
  const blockH   = isFirst ? 220 : rank === 2 ? 180 : 150;
  const iconSize = isFirst ? 28 : 22;
  const avatarSz = isFirst ? 80 : 60;
  const color    = JENJANG_COLOR[jenjang] ?? "var(--text-faint)";
  const bg       = JENJANG_BG[jenjang]   ?? "var(--surface-2)";

  return (
    <div className="podium-column" style={{ width: isFirst ? 140 : 120, zIndex: isFirst ? 10 : 1 }}>
      <div className="podium-avatar-wrap" style={{
        width: avatarSz, height: avatarSz,
        border: `3px solid ${color}`,
        background: bg,
        boxShadow: `0 0 20px ${color}44`,
      }}>
        <JenjangIcon jenjang={jenjang} size={iconSize} />
      </div>
      <div className="podium-block" style={{ height: blockH, width: isFirst ? 140 : 120 }}>
        <div className="podium-rank-num" style={{ fontSize: isFirst ? 20 : 16, color }}>#{rank}</div>
        <div className="podium-name" style={{ fontSize: isFirst ? 14 : 13, color }}>{jenjang}</div>
        <div className="podium-sub">
          <Users2 size={10} style={{ display: "inline", marginRight: 3 }} />
          {totalSiswa} siswa
        </div>
        <span className="podium-coins-badge" style={{ background: bg, color, border: `1px solid ${color}66` }}>
          {Math.round(avgCoins)} avg
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {[50, "60%", "50%", "40%", "35%", "30%"].map((w, j) => (
            <td key={j}>
              <div className="skeleton-shimmer" style={{ width: typeof w === "number" ? w : w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Jenjang Chip ─────────────────────────────────────────────────────────────
function JenjangChip({ jenjang }: { jenjang: string }) {
  return (
    <span className="jenjang-chip" style={{
      color: JENJANG_COLOR[jenjang] ?? "var(--text-faint)",
      background: JENJANG_BG[jenjang] ?? "var(--surface-2)",
    }}>
      <JenjangIcon jenjang={jenjang} size={11} />
      {jenjang}
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LeaderboardAdminPage() {
  const [tab,               setTab]               = useState<TabKey>("kelas");
  const [q,                 setQuery]             = useState("");
  const [jenjangKelasFilter, setJenjangKelasFilter] = useState("");
  const [jenjangSiswaFilter, setJenjangSiswaFilter] = useState("SD");
  const [selectedKelas,     setSelectedKelas]     = useState("");
  const [kelasList,         setKelasList]         = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getKelasDropdown()
      .then((data) => setKelasList(data.map((k) => ({ id: String(k.id), label: k.label }))))
      .catch(console.error);
  }, []);

  const { data: dataKelas,        isLoading: loadKelas        } = useLeaderboardKelasSaya(selectedKelas || undefined);
  const { data: dataAntarKelas,   isLoading: loadAntarKelas   } = useLeaderboardAntarKelas(jenjangKelasFilter || undefined);
  const { data: dataSekolah,      isLoading: loadSekolah      } = useLeaderboardSekolah();
  const { data: dataAntarJenjang, isLoading: loadAntarJenjang } = useLeaderboardAntarJenjang();
  const { data: dataSiswaJenjang, isLoading: loadSiswaJenjang } = useLeaderboardSiswaByJenjang(jenjangSiswaFilter);

  const isLoading = { kelas: loadKelas, antarKelas: loadAntarKelas, sekolah: loadSekolah, antarJenjang: loadAntarJenjang, siswaAntarJenjang: loadSiswaJenjang }[tab];

  const activeData = useMemo<LeaderboardRow[]>(() => {
    switch (tab) {
      case "kelas":             return dataKelas         ?? [];
      case "antarKelas":        return dataAntarKelas    ?? [];
      case "sekolah":           return dataSekolah       ?? [];
      case "antarJenjang":      return dataAntarJenjang  ?? [];
      case "siswaAntarJenjang": return dataSiswaJenjang  ?? [];
    }
  }, [tab, dataKelas, dataAntarKelas, dataSekolah, dataAntarJenjang, dataSiswaJenjang]);

  const filteredData = useMemo(() => {
    const lq = q.trim().toLowerCase();
    if (!lq) return activeData;
    return activeData.filter((row) => {
      if (tab === "antarJenjang") return true;
      if (tab === "antarKelas")   return (row as LeaderboardKelasRow).nama_kelas.toLowerCase().includes(lq);
      const r = row as LeaderboardSiswaRow;
      return r.nama.toLowerCase().includes(lq) || r.kelas.toLowerCase().includes(lq);
    });
  }, [q, activeData, tab]);

  const stats = useMemo(() => {
    if (tab === "antarJenjang") {
      const rows = (dataAntarJenjang ?? []) as LeaderboardJenjangRow[];
      return { partisipan: rows.reduce((s,r) => s + r.total_siswa, 0), totalCoins: rows.reduce((s,r) => s + Number(r.total_coins), 0), avgStreak: null as number | null, subPartisipan: `${rows.length} jenjang` };
    }
    if (tab === "antarKelas") {
      const rows = (dataAntarKelas ?? []) as LeaderboardKelasRow[];
      return { partisipan: rows.length, totalCoins: rows.reduce((s,r) => s + Number(r.total_coins), 0), avgStreak: null, subPartisipan: `${rows.reduce((s,r) => s + r.jumlah_siswa, 0)} total siswa` };
    }
    const rows = activeData as LeaderboardSiswaRow[];
    return { partisipan: rows.length, totalCoins: rows.reduce((s,r) => s + r.coins, 0), avgStreak: rows.length ? Math.round(rows.reduce((s,r) => s + r.streak, 0) / rows.length) : 0, subPartisipan: "Siswa aktif" };
  }, [tab, activeData, dataAntarJenjang, dataAntarKelas]);

  const podiumData = useMemo(() => {
    const top3 = filteredData.filter((r) => r.rank <= 3);
    return [top3.find((r) => r.rank === 2), top3.find((r) => r.rank === 1), top3.find((r) => r.rank === 3)]
      .filter((r): r is LeaderboardRow => Boolean(r));
  }, [filteredData]);

  const handleExport = () => {
    if (!filteredData.length) return;
    const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    
    let csvContent = "";
    
    // Header Report
    csvContent += `Laporan Leaderboard SEHATI\n`;
    csvContent += `Tanggal Export:,${dateStr}\n`;
    csvContent += `Kategori:,${TABS.find(t => t.key === tab)?.label}\n\n`;

    if (tab === "antarJenjang") {
      csvContent += "Rank,Jenjang,Rata-rata Coins,Total Siswa,Total Coins\n";
      csvContent += (filteredData as LeaderboardJenjangRow[]).map((r) => `${r.rank},Jenjang ${r.jenjang},${Math.round(Number(r.avg_coins))},${r.total_siswa},${r.total_coins}`).join("\n");
    } else if (tab === "antarKelas") {
      csvContent += "Rank,Kelas,Jenjang,Rata-rata Coins,Total Coins,Jumlah Siswa\n";
      csvContent += (filteredData as LeaderboardKelasRow[]).map((r) => `${r.rank},${r.nama_kelas},${r.jenjang},${Math.round(Number(r.avg_coins))},${r.total_coins},${r.jumlah_siswa}`).join("\n");
    } else {
      csvContent += "Rank,Nama Siswa,Kelas,Jenjang,Coins,Streak (Hari)\n";
      csvContent += (filteredData as LeaderboardSiswaRow[]).map((r) => `${r.rank},"${r.nama}",${r.kelas},${r.jenjang},${r.coins},${r.streak}`).join("\n");
    }
    
    // Footer Stats
    csvContent += `\n\nRingkasan\n`;
    csvContent += `Total Partisipan:,${stats.partisipan}\n`;
    csvContent += `Total Koin:,${stats.totalCoins}\n`;
    if (stats.avgStreak !== null) csvContent += `Rata-rata Streak:,${stats.avgStreak} Hari\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `leaderboard_${tab}_${Date.now()}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="dashboard-wrapper">

      {/* ── Tabs ── */}
      <div className="lb-tab-bar" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button"
            className={`lb-tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => { setTab(t.key); setQuery(""); setJenjangKelasFilter(""); setSelectedKelas(""); }}>
            {t.label}
          </button>
        ))}

        {/* Filter Kelas — Kelas Saya */}
        {tab === "kelas" && (
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <select className="lb-filter-select"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)" }} />
          </div>
        )}

        {/* Jenjang filter — Antar Kelas */}
        {tab === "antarKelas" && (
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <select className="lb-filter-select"
              value={jenjangKelasFilter}
              onChange={(e) => setJenjangKelasFilter(e.target.value)}>
              <option value="">Semua Jenjang</option>
              {JENJANG_LIST.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)" }} />
          </div>
        )}

        {/* Jenjang filter — Siswa Se-Jenjang */}
        {tab === "siswaAntarJenjang" && (
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <select className="lb-filter-select"
              value={jenjangSiswaFilter}
              onChange={(e) => setJenjangSiswaFilter(e.target.value)}>
              {JENJANG_LIST.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-faint)" }} />
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="lb-stat-grid" style={{ marginBottom: 32 }}>
        <StatCard
          icon={<Users size={18} style={{ color: "var(--primary)" }} />}
          label={tab === "antarKelas" ? "Total Kelas" : tab === "antarJenjang" ? "Total Jenjang" : "Total Partisipan"}
          value={isLoading ? "—" : stats.partisipan}
          sub={stats.subPartisipan}
        />
        <StatCard
          icon={<Trophy size={18} style={{ color: "var(--amber)" }} />}
          label="Total Koin"
          value={isLoading ? "—" : stats.totalCoins.toLocaleString("id-ID")}
          sub="Koin terkumpul"
        />
        {stats.avgStreak !== null && (
          <StatCard
            icon={<Flame size={18} style={{ color: "var(--red)" }} />}
            label="Rata-rata Streak"
            value={isLoading ? "—" : `${stats.avgStreak} Hari`}
            sub="Konsistensi siswa"
          />
        )}
      </div>

      {/* ── Podium ── */}
      {!isLoading && podiumData.length > 0 && (
        <div className="podium-container" style={{ marginBottom: 40 }}>
          {podiumData.map((row) => {
            if (tab === "antarJenjang") {
              const r = row as LeaderboardJenjangRow;
              return <PodiumJenjang key={r.jenjang} jenjang={r.jenjang} avgCoins={Number(r.avg_coins)} totalSiswa={r.total_siswa} rank={r.rank} />;
            }
            if (tab === "antarKelas") {
              const r = row as LeaderboardKelasRow;
              return <PodiumCard key={r.kelas_id} nama={r.nama_kelas} subLabel={`${r.jenjang} · ${r.jumlah_siswa} siswa`} coins={Math.round(Number(r.avg_coins))} rank={r.rank} />;
            }
            const r = row as LeaderboardSiswaRow;
            return <PodiumCard key={r.nis} nama={r.nama} subLabel={r.kelas} coins={r.coins} rank={r.rank} fotoUrl={r.fotoUrl} />;
          })}
        </div>
      )}

      {/* ── Table ── */}
      <div className="table-container">
        <div className="table-section-header">
          <h3 className="table-section-title">
            <Medal size={18} style={{ color: "var(--amber)" }} /> Peringkat Lengkap
          </h3>
          <div className="table-section-actions">
            {tab !== "antarJenjang" && (
              <div className="search-container">
                <Search size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
                <input type="text" className="search-input"
                  placeholder={tab === "antarKelas" ? "Cari nama kelas..." : "Cari nama / kelas..."}
                  value={q} onChange={(e) => setQuery(e.target.value)} />
              </div>
            )}
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={15} /> CSV
            </button>
            <button className="btn btn-secondary" onClick={async () => {
              if (isExporting || !filteredData.length) return;
              setIsExporting(true);
              try {
                const kisId = tab === "kelas" ? (selectedKelas || undefined) : (jenjangKelasFilter || undefined);
                await exportLeaderboardPdf({ type: tab, kelas_id: kisId, jenjang: jenjangSiswaFilter || undefined, data: filteredData });
              } finally {
                setIsExporting(false);
              }
            }} disabled={isExporting || filteredData.length === 0}>
              {isExporting ? (
                 <><Loader2 size={15} style={{ animation: "spin 0.6s linear infinite" }} /> PDF...</>
               ) : (
                 <><Download size={15} /> PDF</>
               )}
            </button>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            {(tab === "kelas" || tab === "sekolah" || tab === "siswaAntarJenjang") && (
              <tr>
                <th style={{ width: 60, textAlign: "center" }}>#</th>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Jenjang</th>
                <th>Streak</th>
                <th style={{ textAlign: "right" }}>Total Koin</th>
              </tr>
            )}
            {tab === "antarKelas" && (
              <tr>
                <th style={{ width: 60, textAlign: "center" }}>#</th>
                <th>Kelas</th>
                <th>Jenjang</th>
                <th style={{ textAlign: "center" }}>Jumlah Siswa</th>
                <th style={{ textAlign: "right" }}>Total Koin</th>
                <th style={{ textAlign: "right" }}>Rata-rata</th>
              </tr>
            )}
            {tab === "antarJenjang" && (
              <tr>
                <th style={{ width: 60, textAlign: "center" }}>#</th>
                <th>Jenjang</th>
                <th style={{ textAlign: "center" }}>Total Siswa</th>
                <th style={{ textAlign: "right" }}>Total Koin</th>
                <th style={{ textAlign: "right" }}>Rata-rata</th>
              </tr>
            )}
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> :
            filteredData.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="cell-empty">Tidak ada data ditemukan.</div>
              </td></tr>
            ) : filteredData.map((row) => {
              const isTop3 = row.rank <= 3;

              // ── Siswa rows ──
              if (tab === "kelas" || tab === "sekolah" || tab === "siswaAntarJenjang") {
                const r = row as LeaderboardSiswaRow;
                return (
                  <tr key={r.nis} className={isTop3 ? "lb-top-row" : ""}>
                    <td style={{ textAlign: "center" }}><RankLabel rank={r.rank} /></td>
                    <td>
                      <div className="cell-name-row">
                        <div className="avatar-initial" style={{
                          background: isTop3 ? (RANK_GRADIENT[r.rank] ?? "var(--surface-2)") : "var(--surface-2)",
                        }}>
                          {r.fotoUrl
                            ? <img src={r.fotoUrl} alt={r.nama} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                            : getInitial(r.nama)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{r.nama}</span>
                        {r.rank === 1 && <Crown size={13} style={{ color: "var(--amber)", flexShrink: 0 }} />}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{r.kelas}</td>
                    <td><JenjangChip jenjang={r.jenjang} /></td>
                    <td>
                      <span className="streak-cell">
                        <Flame size={13} style={{ color: r.streak > 5 ? "var(--red)" : "var(--text-faint)" }} />
                        {r.streak} Hari
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="coins-cell" style={{ color: "var(--green)" }}>
                        <Coins size={16}/> {r.coins.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              }

              // ── Kelas rows ──
              if (tab === "antarKelas") {
                const r = row as LeaderboardKelasRow;
                return (
                  <tr key={r.kelas_id} className={isTop3 ? "lb-top-row" : ""}>
                    <td style={{ textAlign: "center" }}><RankLabel rank={r.rank} /></td>
                    <td>
                      <div className="cell-name-row">
                        <div className="avatar-initial" style={{ background: JENJANG_BG[r.jenjang] ?? "var(--surface-2)" }}>
                          <School size={13} style={{ color: JENJANG_COLOR[r.jenjang] }} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{r.nama_kelas}</span>
                        {r.rank === 1 && <Crown size={13} style={{ color: "var(--amber)", flexShrink: 0 }} />}
                      </div>
                    </td>
                    <td><JenjangChip jenjang={r.jenjang} /></td>
                    <td style={{ textAlign: "center" }}>
                      <span className="streak-cell" style={{ justifyContent: "center" }}>
                        <Users2 size={13} style={{ color: "var(--text-faint)" }} /> {r.jumlah_siswa}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      <span className="coins-cell"><Coins size={16} /> {Number(r.total_coins).toLocaleString()}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="coins-cell" style={{ color: "var(--green)" }}>
                        <Coins size={16} /> {Math.round(Number(r.avg_coins)).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              }

              // ── Jenjang rows ──
              if (tab === "antarJenjang") {
                const r = row as LeaderboardJenjangRow;
                return (
                  <tr key={r.jenjang} className={isTop3 ? "lb-top-row" : ""}>
                    <td style={{ textAlign: "center" }}><RankLabel rank={r.rank} /></td>
                    <td>
                      <div className="cell-name-row">
                        <div className="avatar-initial" style={{ background: JENJANG_BG[r.jenjang] ?? "var(--surface-2)", width: 36, height: 36 }}>
                          <JenjangIcon jenjang={r.jenjang} size={17} />
                        </div>
                        <span style={{ fontWeight: 700, color: JENJANG_COLOR[r.jenjang] }}>Jenjang {r.jenjang}</span>
                        {r.rank === 1 && <Crown size={13} style={{ color: "var(--amber)", flexShrink: 0 }} />}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="streak-cell" style={{ justifyContent: "center" }}>
                        <Users2 size={13} style={{ color: "var(--text-faint)" }} /> {r.total_siswa.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      <span className="coins-cell"><Coins size={16} /> {Number(r.total_coins).toLocaleString()}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="coins-cell" style={{ color: JENJANG_COLOR[r.jenjang] }}>
                        <Coins size={16} /> {Math.round(Number(r.avg_coins)).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}