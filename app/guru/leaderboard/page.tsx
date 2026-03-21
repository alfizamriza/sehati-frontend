"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, Crown, Download,
  Flame, Loader2, Medal, School, Search,
  Star, TrendingUp, Trophy, Users,
} from "lucide-react";
import SharedAvatar from "@/components/common/SharedAvatar";
import BrandLogo from "@/components/common/BrandLogo";
import {
  exportLeaderboardPdf,
  getKelasDropdown,
  LeaderboardJenjangRow,
  LeaderboardKelasRow,
  LeaderboardSiswaRow,
  useLeaderboardAntarJenjang,
  useLeaderboardAntarKelas,
  useLeaderboardKelasSaya,
  useLeaderboardSekolah,
  useLeaderboardSiswaByJenjang,
} from "@/lib/services/admin";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type TabKey = "kelas" | "antarKelas" | "sekolah" | "antarJenjang" | "siswaAntarJenjang";
type LeaderboardRow = LeaderboardSiswaRow | LeaderboardKelasRow | LeaderboardJenjangRow;

const TABS: { key: TabKey; label: string }[] = [
  { key: "kelas", label: "Kelas Saya" },
  { key: "antarKelas", label: "Antar Kelas" },
  { key: "sekolah", label: "Sekolah" },
  { key: "antarJenjang", label: "Antar Jenjang" },
  { key: "siswaAntarJenjang", label: "Se-Jenjang" },
];

const JENJANG_LIST = ["SD", "SMP", "SMA"] as const;

const JENJANG_BADGE: Record<string, string> = {
  SD: "badge-sd",
  SMP: "badge-smp",
  SMA: "badge-sma",
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
  if (rank === 1) return "var(--lb-gold)";
  if (rank === 2) return "var(--lb-silver)";
  if (rank === 3) return "var(--lb-bronze)";
  return "var(--lb-text-muted)";
};

const getAvatarClass = (rank: number) => {
  if (rank === 1) return "avatar avatar-gold";
  if (rank === 2) return "avatar avatar-silver";
  if (rank === 3) return "avatar avatar-bronze";
  return "avatar avatar-default";
};

const getScoreClass = (rank: number) => {
  if (rank === 1) return "score-num score-gold";
  if (rank === 2) return "score-num score-silver";
  if (rank === 3) return "score-num score-bronze";
  return "score-num";
};

const getRowClass = (rank: number) => {
  if (rank === 1) return "lb-item rank-1";
  if (rank === 2) return "lb-item rank-2";
  if (rank === 3) return "lb-item rank-3";
  return "lb-item";
};

// ─────────────────────────────────────────────
// CSS (injected once)
// ─────────────────────────────────────────────
const STYLES = `
  :root {
    --lb-bg:           #0a0c10;
    --lb-surface:      #111318;
    --lb-surface2:     #181b22;
    --lb-border:       rgba(255,255,255,0.07);
    --lb-border2:      rgba(255,255,255,0.12);
    --lb-text:         #e8eaf0;
    --lb-text-sub:     #8b90a0;
    --lb-text-muted:   #555a6a;
    --lb-gold:         #f0b429;
    --lb-silver:       #94a3b8;
    --lb-bronze:       #c47d3e;
    --lb-accent:       #5b8def;
    --lb-accent-soft:  rgba(91,141,239,0.12);
    --lb-green:        #34d399;
    --lb-red:          #f87171;
    --lb-orange:       #fb923c;
    --lb-r:            14px;
    --lb-r-sm:         8px;
  }

  @media (prefers-color-scheme: light) {
    :root {
      --lb-bg:           #f8fafc;
      --lb-surface:      #ffffff;
      --lb-surface2:     #f1f5f9;
      --lb-border:       rgba(15,23,42,0.06);
      --lb-border2:      rgba(15,23,42,0.12);
      --lb-text:         #0f172a;
      --lb-text-sub:     #475569;
      --lb-text-muted:   #64748b;
      --lb-gold:         #d97706;
      --lb-silver:       #64748b;
      --lb-bronze:       #b45309;
      --lb-accent:       #3b82f6;
      --lb-accent-soft:  rgba(59,130,246,0.12);
      --lb-green:        #10b981;
      --lb-red:          #ef4444;
      --lb-orange:       #f97316;
    }
  }

  /* ── PAGE ── */
  .lb-page {
    min-height: 100vh;
    background: var(--lb-bg);
    color: var(--lb-text);
    font-family: 'Sora', 'Inter', sans-serif;
    padding: 24px 20px 60px;
  }
  .lb-container { max-width: 860px; margin: 0 auto; }

  /* ── HEADER ── */
  .lb-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 28px; padding-bottom: 20px;
    border-bottom: 0.5px solid var(--lb-border);
  }
  .lb-brand { display: flex; align-items: center; gap: 10px; }
  .lb-brand-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, #5b8def 0%, #3b6fd4 100%);
    display: grid; place-items: center; font-size: 16px; flex-shrink: 0;
  }
  .lb-brand-name { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2; }
  .lb-brand-sub  { font-size: 11px; color: var(--lb-text-muted); font-weight: 400; }
  .lb-header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

  /* ── BUTTONS ── */
  .lb-btn {
    height: 34px; padding: 0 14px; border-radius: var(--lb-r-sm);
    font-family: inherit; font-size: 12px; font-weight: 500;
    cursor: pointer; display: flex; align-items: center; gap: 6px;
    transition: all 0.15s; white-space: nowrap;
  }
  .lb-btn-ghost {
    background: transparent; border: 0.5px solid var(--lb-border2);
    color: var(--lb-text-sub);
  }
  .lb-btn-ghost:hover  { background: var(--lb-surface2); color: var(--lb-text); }
  .lb-btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }
  .lb-btn-icon {
    width: 34px; padding: 0; justify-content: center;
    background: transparent; border: 0.5px solid var(--lb-border);
    color: var(--lb-text-sub);
  }
  .lb-btn-icon:hover { background: var(--lb-surface2); color: var(--lb-text); }

  /* ── TABS ── */
  .lb-tab-bar {
    display: flex; gap: 2px; background: var(--lb-surface);
    border: 0.5px solid var(--lb-border); border-radius: var(--lb-r);
    padding: 4px; margin-bottom: 20px; overflow-x: auto;
    scrollbar-width: none;
  }
  .lb-tab-bar::-webkit-scrollbar { display: none; }
  .lb-tab {
    flex-shrink: 0; padding: 7px 16px; border-radius: var(--lb-r-sm);
    background: transparent; border: none; color: var(--lb-text-muted);
    font-family: inherit; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .lb-tab.active {
    background: var(--lb-surface2); color: var(--lb-text);
    border: 0.5px solid var(--lb-border2); font-weight: 600;
  }
  .lb-tab:hover:not(.active) { color: var(--lb-text-sub); }

  /* ── STATS ── */
  .lb-stats-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px; margin-bottom: 20px;
  }
  .lb-stat-card {
    background: var(--lb-surface); border: 0.5px solid var(--lb-border);
    border-radius: var(--lb-r); padding: 16px 18px;
  }
  .lb-stat-label {
    font-size: 10px; color: var(--lb-text-muted); font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.6px;
  }
  .lb-stat-value {
    font-size: 22px; font-weight: 700; margin: 5px 0 4px; letter-spacing: -0.5px;
  }
  .lb-stat-sub {
    font-size: 11px; color: var(--lb-green);
    display: flex; align-items: center; gap: 4px;
  }
  .lb-stat-accent    { color: var(--lb-accent); }
  .lb-stat-gold      { color: var(--lb-gold); }
  .lb-stat-red       { color: var(--lb-red); }

  /* ── MAIN PANEL ── */
  .lb-panel {
    background: var(--lb-surface); border: 0.5px solid var(--lb-border);
    border-radius: var(--lb-r); overflow: hidden;
  }
  .lb-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 0.5px solid var(--lb-border);
    flex-wrap: wrap; gap: 10px;
  }
  .lb-panel-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 600;
  }
  .lb-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

  /* ── SELECT ── */
  .lb-select-wrap { position: relative; }
  .lb-select {
    height: 32px; padding: 0 28px 0 12px; appearance: none;
    border-radius: var(--lb-r-sm); background: var(--lb-bg);
    border: 0.5px solid var(--lb-border); color: var(--lb-text);
    font-family: inherit; font-size: 12px; font-weight: 500;
    cursor: pointer; outline: none;
  }
  .lb-select:focus { border-color: var(--lb-accent); }
  .lb-select option { background: var(--lb-surface2); }
  .lb-chevron {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    pointer-events: none; color: var(--lb-text-muted);
  }

  /* ── SEARCH ── */
  .lb-search-wrap { position: relative; }
  .lb-search-icon {
    position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
    color: var(--lb-text-muted); pointer-events: none;
  }
  .lb-search {
    height: 32px; padding: 0 12px 0 32px; border-radius: var(--lb-r-sm);
    background: var(--lb-bg); border: 0.5px solid var(--lb-border);
    color: var(--lb-text); font-family: inherit; font-size: 12px;
    outline: none; width: 180px;
  }
  .lb-search:focus { border-color: var(--lb-accent); }
  .lb-search::placeholder { color: var(--lb-text-muted); }

  /* ── LIST ── */
  .lb-list { padding: 8px; }

  .lb-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 10px;
    transition: background 0.12s; cursor: default;
  }
  .lb-item:hover { background: var(--lb-surface2); }
  .lb-item.rank-1 { background: rgba(240,180,41,0.05); }
  .lb-item.rank-2 { background: rgba(148,163,184,0.04); }
  .lb-item.rank-3 { background: rgba(196,125,62,0.04); }
  .lb-item.rank-1:hover { background: rgba(240,180,41,0.09); }
  .lb-item.rank-2:hover { background: rgba(148,163,184,0.08); }
  .lb-item.rank-3:hover { background: rgba(196,125,62,0.08); }

  .lb-divider { height: 0.5px; background: var(--lb-border); margin: 2px 12px; }

  /* Rank column */
  .rank-col { width: 26px; flex-shrink: 0; display: flex; justify-content: center; align-items: center; }
  .rank-num  { font-size: 12px; color: var(--lb-text-muted); font-weight: 500; font-variant-numeric: tabular-nums; }

  /* Avatar */
  .avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    display: grid; place-items: center; font-size: 13px; font-weight: 700; overflow: hidden;
  }
  .avatar-gold   { background: rgba(240,180,41,0.15); color: var(--lb-gold);   border: 1px solid rgba(240,180,41,0.3); }
  .avatar-silver { background: rgba(148,163,184,0.12); color: var(--lb-silver); border: 1px solid rgba(148,163,184,0.25); }
  .avatar-bronze { background: rgba(196,125,62,0.12); color: var(--lb-bronze); border: 1px solid rgba(196,125,62,0.25); }
  .avatar-default { background: var(--lb-surface2); color: var(--lb-text-sub); border: 0.5px solid var(--lb-border); }

  /* Info */
  .lb-info { flex: 1; min-width: 0; }
  .lb-info-name {
    font-size: 13px; font-weight: 600; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    display: flex; align-items: center; gap: 6px;
  }
  .lb-info-meta  { display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
  .lb-meta-text  { font-size: 11px; color: var(--lb-text-muted); }

  /* Badges */
  .badge {
    font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 20px;
    letter-spacing: 0.2px; flex-shrink: 0;
  }
  .badge-sd  { background: rgba(52,211,153,0.12);  color: #34d399; }
  .badge-smp { background: rgba(96,165,250,0.12);  color: #60a5fa; }
  .badge-sma { background: rgba(244,114,182,0.12); color: #f472b6; }
  .badge-kelas { background: rgba(91,141,239,0.12); color: #5b8def; }

  /* Score */
  .lb-score { text-align: right; flex-shrink: 0; }
  .score-num  { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--lb-text); }
  .score-gold   { color: var(--lb-gold); }
  .score-silver { color: var(--lb-silver); }
  .score-bronze { color: var(--lb-bronze); }
  .score-unit   { font-size: 10px; color: var(--lb-text-muted); margin-top: 1px; }

  /* Empty / footer */
  .lb-empty {
    text-align: center; padding: 48px 20px;
    color: var(--lb-text-muted); font-size: 13px;
  }
  .lb-footer {
    text-align: center; font-size: 11px; color: var(--lb-text-muted);
    padding: 14px; border-top: 0.5px solid var(--lb-border);
  }

  /* Skeleton shimmer */
  @keyframes lb-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .lb-skel {
    border-radius: 6px;
    background: linear-gradient(90deg, var(--lb-surface2) 25%, #1e2128 50%, var(--lb-surface2) 75%);
    background-size: 800px 100%;
    animation: lb-shimmer 1.5s infinite;
  }
  .lb-skel-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px;
  }

  /* Spin */
  @keyframes lb-spin { to { transform: rotate(360deg); } }
  .lb-spin { animation: lb-spin 0.7s linear infinite; }

  @media (max-width: 560px) {
    .lb-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    .lb-stat-value { font-size: 18px; }
    .lb-search { width: 140px; }
  }
`;

// ─────────────────────────────────────────────
// SKELETON ROW
// ─────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="lb-skel-row">
    <div className="lb-skel" style={{ width: 26, height: 14, flexShrink: 0 }} />
    <div className="lb-skel" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="lb-skel" style={{ width: "50%", height: 12 }} />
      <div className="lb-skel" style={{ width: "30%", height: 10 }} />
    </div>
    <div className="lb-skel" style={{ width: 40, height: 16 }} />
  </div>
);

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, valueClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="lb-stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="lb-stat-label">{label}</div>
        <div style={{ color: "var(--lb-text-muted)", flexShrink: 0 }}>{icon}</div>
      </div>
      <div className={`lb-stat-value ${valueClass}`}>{value}</div>
      <div className="lb-stat-sub">
        <TrendingUp size={10} />
        {sub}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MEDAL ICON
// ─────────────────────────────────────────────
function MedalIcon({ rank }: { rank: number }) {
  const color = getMedalColor(rank);
  return <Medal size={18} color={color} fill={color} />;
}

// ─────────────────────────────────────────────
// ROW: SISWA
// ─────────────────────────────────────────────
function SiswaItem({ row, isLast }: { row: LeaderboardSiswaRow; isLast: boolean }) {
  const streakColor =
    row.streak > 10 ? "var(--lb-red)"
      : row.streak > 5 ? "var(--lb-orange)"
        : "var(--lb-text-muted)";

  return (
    <>
      <div className={getRowClass(row.rank)}>
        <div className="rank-col">
          {row.rank <= 3
            ? <MedalIcon rank={row.rank} />
            : <span className="rank-num">#{row.rank}</span>
          }
        </div>

        <div className={getAvatarClass(row.rank)}>
          {row.fotoUrl ? (
            <SharedAvatar fotoUrl={row.fotoUrl} nama={row.nama} size="100%" />
          ) : (
            getInitial(row.nama)
          )}
        </div>

        <div className="lb-info">
          <div className="lb-info-name">
            {row.nama}
            {row.rank === 1 && (
              <Crown size={11} color="var(--lb-gold)" fill="var(--lb-gold)" />
            )}
          </div>
          <div className="lb-info-meta">
            <span className={`badge ${JENJANG_BADGE[row.jenjang] ?? "badge-kelas"}`}>
              {row.jenjang}
            </span>
            <span className="lb-meta-text">{row.kelas}</span>
            <span className="lb-meta-text" style={{ color: streakColor }}>
              <Flame
                size={10}
                color={streakColor}
                style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }}
              />
              {row.streak}d
            </span>
          </div>
        </div>

        <div className="lb-score">
          <div className={getScoreClass(row.rank)}>{formatCoins(row.coins)}</div>
          <div className="score-unit">poin</div>
        </div>
      </div>
      {!isLast && <div className="lb-divider" />}
    </>
  );
}

// ─────────────────────────────────────────────
// ROW: KELAS
// ─────────────────────────────────────────────
function KelasItem({ row, isLast }: { row: LeaderboardKelasRow; isLast: boolean }) {
  const badgeClass = JENJANG_BADGE[row.jenjang] ?? "badge-kelas";
  return (
    <>
      <div className={getRowClass(row.rank)}>
        <div className="rank-col">
          {row.rank <= 3
            ? <MedalIcon rank={row.rank} />
            : <span className="rank-num">#{row.rank}</span>
          }
        </div>

        <div
          className="avatar"
          style={{
            background: "var(--lb-surface2)",
            border: "0.5px solid var(--lb-border)",
          }}
        >
          <School size={15} color="var(--lb-text-sub)" />
        </div>

        <div className="lb-info">
          <div className="lb-info-name">
            {row.nama_kelas}
            {row.rank === 1 && (
              <Crown size={11} color="var(--lb-gold)" fill="var(--lb-gold)" />
            )}
          </div>
          <div className="lb-info-meta">
            <span className={`badge ${badgeClass}`}>
              {JENJANG_ICON[row.jenjang]} {row.jenjang}
            </span>
            <span className="lb-meta-text">👥 {row.jumlah_siswa} siswa</span>
          </div>
        </div>

        <div className="lb-score">
          <div className={getScoreClass(row.rank)}>
            {formatCoins(Math.round(Number(row.avg_coins)))}
          </div>
          <div className="score-unit">avg</div>
        </div>
      </div>
      {!isLast && <div className="lb-divider" />}
    </>
  );
}

// ─────────────────────────────────────────────
// ROW: JENJANG
// ─────────────────────────────────────────────
function JenjangItem({ row, isLast }: { row: LeaderboardJenjangRow; isLast: boolean }) {
  const badgeClass = JENJANG_BADGE[row.jenjang] ?? "badge-kelas";
  return (
    <>
      <div className={getRowClass(row.rank)}>
        <div className="rank-col">
          {row.rank <= 3
            ? <MedalIcon rank={row.rank} />
            : <span className="rank-num">#{row.rank}</span>
          }
        </div>

        <div
          className="avatar"
          style={{
            background: "var(--lb-surface2)",
            border: "0.5px solid var(--lb-border)",
            fontSize: 17,
          }}
        >
          {JENJANG_ICON[row.jenjang]}
        </div>

        <div className="lb-info">
          <div className="lb-info-name" style={{ fontWeight: 700 }}>
            Jenjang {row.jenjang}
            {row.rank === 1 && (
              <Crown size={11} color="var(--lb-gold)" fill="var(--lb-gold)" />
            )}
          </div>
          <div className="lb-info-meta">
            <span className={`badge ${badgeClass}`}>{row.jenjang}</span>
            <span className="lb-meta-text">
              👥 {row.total_siswa} siswa
            </span>
            <span className="lb-meta-text">
              · {formatCoins(Number(row.total_coins))} koin total
            </span>
          </div>
        </div>

        <div className="lb-score">
          <div className={getScoreClass(row.rank)}>
            {Math.round(Number(row.avg_coins))}
          </div>
          <div className="score-unit">avg</div>
        </div>
      </div>
      {!isLast && <div className="lb-divider" />}
    </>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function LeaderboardGuruPage() {
  const [tab, setTab] = useState<TabKey>("kelas");
  const [q, setQuery] = useState("");
  const [jenjangKelas, setJenjangKelas] = useState("");
  const [jenjangSiswa, setJenjangSiswa] = useState("SD");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [kelasList, setKelasList] = useState<{ id: string; label: string }[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getKelasDropdown()
      .then((data) => setKelasList(data.map((k) => ({ id: String(k.id), label: k.label }))))
      .catch(console.error);
  }, []);

  // ── Queries ──
  const { data: dataKelas, isLoading: lKelas } = useLeaderboardKelasSaya(selectedKelas || undefined);
  const { data: dataAntarKelas, isLoading: lAntarKelas } = useLeaderboardAntarKelas(jenjangKelas || undefined);
  const { data: dataSekolah, isLoading: lSekolah } = useLeaderboardSekolah();
  const { data: dataAntarJenjang, isLoading: lAntarJenjang } = useLeaderboardAntarJenjang();
  const { data: dataSiswaJenjang, isLoading: lSiswaJenjang } = useLeaderboardSiswaByJenjang(jenjangSiswa);

  const isLoading = {
    kelas: lKelas, antarKelas: lAntarKelas, sekolah: lSekolah,
    antarJenjang: lAntarJenjang, siswaAntarJenjang: lSiswaJenjang,
  }[tab];

  // ── Active data ──
  const activeData = useMemo<LeaderboardRow[]>(() => {
    switch (tab) {
      case "kelas": return (dataKelas ?? []) as LeaderboardRow[];
      case "antarKelas": return (dataAntarKelas ?? []) as LeaderboardRow[];
      case "sekolah": return (dataSekolah ?? []) as LeaderboardRow[];
      case "antarJenjang": return (dataAntarJenjang ?? []) as LeaderboardRow[];
      case "siswaAntarJenjang": return (dataSiswaJenjang ?? []) as LeaderboardRow[];
    }
  }, [tab, dataKelas, dataAntarKelas, dataSekolah, dataAntarJenjang, dataSiswaJenjang]);

  // ── Filter ──
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return activeData;
    return activeData.filter((r) => {
      if (tab === "antarJenjang") return r.jenjang.toLowerCase().includes(query);
      if (tab === "antarKelas") return (r as LeaderboardKelasRow).nama_kelas.toLowerCase().includes(query);
      return (
        (r as LeaderboardSiswaRow).nama.toLowerCase().includes(query) ||
        (r as LeaderboardSiswaRow).kelas.toLowerCase().includes(query)
      );
    });
  }, [q, activeData, tab]);

  // ── Stats ──
  const stats = useMemo(() => {
    if (tab === "antarJenjang") {
      const rows = activeData as LeaderboardJenjangRow[];
      return {
        partisipan: rows.reduce((s, r) => s + r.total_siswa, 0),
        totalCoins: rows.reduce((s, r) => s + Number(r.total_coins), 0),
        avgStreak: null as number | null,
        labelP: "Total Siswa",
        subP: `${rows.length} jenjang`,
      };
    }
    if (tab === "antarKelas") {
      const rows = activeData as LeaderboardKelasRow[];
      return {
        partisipan: rows.length,
        totalCoins: rows.reduce((s, r) => s + Number(r.total_coins), 0),
        avgStreak: null,
        labelP: "Total Kelas",
        subP: `${rows.reduce((s, r) => s + r.jumlah_siswa, 0)} total siswa`,
      };
    }
    const rows = activeData as LeaderboardSiswaRow[];
    return {
      partisipan: rows.length,
      totalCoins: rows.reduce((s, r) => s + r.coins, 0),
      avgStreak: rows.length
        ? Math.round(rows.reduce((s, r) => s + r.streak, 0) / rows.length)
        : 0,
      labelP: "Total Siswa",
      subP: "Siswa aktif",
    };
  }, [tab, activeData]);

  // ── Export CSV ──
  const handleExportCsv = () => {
    if (!filtered.length) return;
    let header = "";
    let lines: string[] = [];

    if (tab === "antarJenjang") {
      header = "Rank,Jenjang,Avg Coins,Total Siswa,Total Coins";
      lines = (filtered as LeaderboardJenjangRow[]).map(
        (r) => `${r.rank},${r.jenjang},${Math.round(Number(r.avg_coins))},${r.total_siswa},${r.total_coins}`
      );
    } else if (tab === "antarKelas") {
      header = "Rank,Kelas,Jenjang,Avg Coins,Jumlah Siswa";
      lines = (filtered as LeaderboardKelasRow[]).map(
        (r) => `${r.rank},${r.nama_kelas},${r.jenjang},${Math.round(Number(r.avg_coins))},${r.jumlah_siswa}`
      );
    } else {
      header = "Rank,Nama,Kelas,Jenjang,Coins,Streak";
      lines = (filtered as LeaderboardSiswaRow[]).map(
        (r) => `${r.rank},${r.nama},${r.kelas},${r.jenjang},${r.coins},${r.streak}`
      );
    }

    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leaderboard_guru_${tab}_${Date.now()}.csv`;
    a.click();
  };

  // ── Export PDF ──
  const handleExportPdf = async () => {
    if (!filtered.length || isExporting) return;
    setIsExporting(true);
    try {
      const clsId = tab === "kelas" ? (selectedKelas || undefined) : undefined;
      await exportLeaderboardPdf({ type: tab, kelas_id: clsId, data: filtered as any[] });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Switch tab ──
  const handleTabChange = (key: TabKey) => {
    setTab(key);
    setQuery("");
    setJenjangKelas("");
    setSelectedKelas("");
  };

  return (
    <main className="lb-page">
      <style>{STYLES}</style>

      <div className="lb-container">

        {/* ── HEADER ── */}
        <header className="lb-header">
          <div className="lb-brand">
            {/* <div className="lb-brand-icon">
              <BrandLogo size={20} alt="SEHATI" priority />
            </div>
            <div>
              <div className="lb-brand-name">SEHATI</div>
              <div className="lb-brand-sub">Leaderboard</div>
            </div> */}
            <Link href="/guru/dashboard">
              <button className="lb-btn lb-btn-icon" title="Kembali ke Dashboard">
                <ArrowLeft size={15} />
              </button>
            </Link>
          </div>

          <div className="lb-header-right">
            <button className="lb-btn lb-btn-ghost" onClick={handleExportCsv} disabled={!filtered.length}>
              <Download size={13} />
              CSV
            </button>
            <button
              className="lb-btn lb-btn-ghost"
              onClick={handleExportPdf}
              disabled={isExporting || !filtered.length}
            >
              {isExporting ? (
                <><Loader2 size={13} className="lb-spin" /> PDF...</>
              ) : (
                <><Download size={13} /> PDF</>
              )}
            </button>

          </div>
        </header>

        {/* ── TABS ── */}
        <div className="lb-tab-bar">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`lb-tab${tab === t.key ? " active" : ""}`}
              onClick={() => handleTabChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── STATS ── */}
        <div className="lb-stats-grid">
          <StatCard
            icon={<Users size={14} />}
            label={stats.labelP}
            value={isLoading ? "—" : stats.partisipan}
            sub={stats.subP}
            valueClass="lb-stat-accent"
          />
          <StatCard
            icon={<Star size={14} />}
            label="Total Koin"
            value={isLoading ? "—" : stats.totalCoins.toLocaleString("id-ID")}
            sub="Koin terkumpul"
            valueClass="lb-stat-gold"
          />
          {stats.avgStreak !== null && (
            <StatCard
              icon={<Flame size={14} />}
              label="Rata-rata Streak"
              value={isLoading ? "—" : `${stats.avgStreak}`}
              sub="Konsistensi siswa"
              valueClass="lb-stat-red"
            />
          )}
        </div>

        {/* ── MAIN PANEL ── */}
        <div className="lb-panel">

          {/* Panel header */}
          <div className="lb-panel-header">
            <div className="lb-panel-title">
              <Trophy size={15} color="var(--lb-gold)" />
              Peringkat Siswa
            </div>

            <div className="lb-controls">
              {/* Kelas filter — tab Kelas Saya */}
              {tab === "kelas" && (
                <div className="lb-select-wrap">
                  <select
                    className="lb-select"
                    value={selectedKelas}
                    onChange={(e) => setSelectedKelas(e.target.value)}
                  >
                    <option value="">Semua Kelas</option>
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>{k.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="lb-chevron" />
                </div>
              )}

              {/* Jenjang filter — tab Antar Kelas */}
              {tab === "antarKelas" && (
                <div className="lb-select-wrap">
                  <select
                    className="lb-select"
                    value={jenjangKelas}
                    onChange={(e) => setJenjangKelas(e.target.value)}
                  >
                    <option value="">Semua Jenjang</option>
                    {JENJANG_LIST.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="lb-chevron" />
                </div>
              )}

              {/* Jenjang filter — tab Se-Jenjang */}
              {tab === "siswaAntarJenjang" && (
                <div className="lb-select-wrap">
                  <select
                    className="lb-select"
                    value={jenjangSiswa}
                    onChange={(e) => setJenjangSiswa(e.target.value)}
                  >
                    {JENJANG_LIST.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="lb-chevron" />
                </div>
              )}

              {/* Search — semua tab kecuali Antar Jenjang */}
              {tab !== "antarJenjang" && (
                <div className="lb-search-wrap">
                  <Search size={12} className="lb-search-icon" />
                  <input
                    className="lb-search"
                    type="text"
                    placeholder={tab === "antarKelas" ? "Cari kelas..." : "Cari nama / kelas..."}
                    value={q}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* List */}
          <div className="lb-list">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <div className="lb-empty">
                <Trophy size={32} style={{ opacity: 0.15, display: "block", margin: "0 auto 10px" }} />
                Tidak ada data ditemukan.
              </div>
            ) : (
              filtered.map((row, i) => {
                const isLast = i === filtered.length - 1;
                if (tab === "antarKelas") {
                  return (
                    <KelasItem
                      key={(row as LeaderboardKelasRow).kelas_id}
                      row={row as LeaderboardKelasRow}
                      isLast={isLast}
                    />
                  );
                }
                if (tab === "antarJenjang") {
                  return (
                    <JenjangItem
                      key={(row as LeaderboardJenjangRow).jenjang}
                      row={row as LeaderboardJenjangRow}
                      isLast={isLast}
                    />
                  );
                }
                return (
                  <SiswaItem
                    key={`${(row as LeaderboardSiswaRow).nis}-${i}`}
                    row={row as LeaderboardSiswaRow}
                    isLast={isLast}
                  />
                );
              })
            )}
          </div>

          {/* Footer */}
          {!isLoading && filtered.length > 0 && (
            <div className="lb-footer">
              Menampilkan {filtered.length} data
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
