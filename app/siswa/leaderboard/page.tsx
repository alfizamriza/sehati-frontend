"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Trophy,
  Flame,
  Star,
  TrendingUp,
  School,
  Users,
  Medal,
  Crown,
  ChevronUp,
  Award,
  BookOpen,
  GraduationCap,
  Building2,
  UserCircle2,
} from "lucide-react";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";
import BrandLogo from "@/components/common/BrandLogo";
import {
  useLeaderboardKelasSaya,
  useLeaderboardAntarKelas,
  useLeaderboardSekolah,
  useLeaderboardAntarJenjang,
  useLeaderboardSiswaAntarJenjang,
  LeaderboardSiswaRow,
  LeaderboardKelasRow,
  LeaderboardJenjangRow,
} from "@/lib/services/admin";
import "../siswa-tokens.css";
import "./leaderboard-light.css";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type TabKey =
  | "kelas"
  | "antarKelas"
  | "sekolah"
  | "antarJenjang"
  | "siswaAntarJenjang";

const TABS: { key: TabKey; label: string }[] = [
  { key: "kelas", label: "Kelas Saya" },
  { key: "antarKelas", label: "Antar Kelas" },
  { key: "sekolah", label: "Sekolah" },
  { key: "antarJenjang", label: "Antar Jenjang" },
  { key: "siswaAntarJenjang", label: "Se-Jenjang" },
];

const JENJANG_CFG: Record<string, { icon: React.ReactNode; color: string }> = {
  SD: { icon: <BookOpen size={16} />, color: "var(--jenjang-sd)" },
  SMP: { icon: <School size={16} />, color: "var(--jenjang-smp)" },
  SMA: { icon: <GraduationCap size={16} />, color: "var(--jenjang-sma)" },
};

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Medal size={18} color="var(--gold)" strokeWidth={2.5} />;
  if (rank === 2) return <Medal size={18} color="var(--silver)" strokeWidth={2.5} />;
  if (rank === 3) return <Medal size={18} color="var(--bronze)" strokeWidth={2.5} />;
  return (
    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-muted)" }}>
      #{rank}
    </span>
  );
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const formatCoins = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const getJenjangLabel = (primary?: string | null, fallback?: string | null) => {
  const raw = String(primary ?? fallback ?? "").trim();
  return raw ? raw.toUpperCase() : "JENJANG";
};

const getTingkatLabel = (value?: string | number | null) => {
  const raw = String(value ?? "").trim();
  return raw || "Tingkat -";
};

// ─────────────────────────────────────────────
// SHOWCASE BUBBLE
//
// Menerima dua prop tambahan:
//   isExpanded  — dikontrol dari luar (parent)
//   onToggle    — callback ke parent untuk set id yang aktif
// ─────────────────────────────────────────────
interface ShowcaseBubbleProps {
  note: LeaderboardSiswaRow["showcaseNote"];
  compact?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const ShowcaseBubble = ({
  note,
  compact = false,
  isExpanded,
  onToggle,
}: ShowcaseBubbleProps) => {
  if (!note) return null;

  return (
    <div className={`lb-showcase-container${compact ? " compact" : ""}`}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.3, y: 30, rotate: -15 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: isExpanded ? 0 : [0, -8, 0],
          rotate: isExpanded ? 0 : [0, 2, -1, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 300, damping: 15 },
          opacity: { duration: 0.5 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          layout: { duration: 0.3 },
        }}
        whileHover={{
          scale: 1.05,
          y: -12,
          filter: [
            "brightness(1) drop-shadow(0 0 5px rgba(255,255,255,0))",
            "brightness(1.1) drop-shadow(0 0 10px rgba(var(--color-primary-rgb),0.3))",
            "brightness(1) drop-shadow(0 0 5px rgba(255,255,255,0))",
          ],
          transition: {
            filter: { repeat: Infinity, duration: 1.5 },
            scale: { type: "spring", stiffness: 400, damping: 10 },
          },
        }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(); // ← delegasi ke parent, bukan state lokal
        }}
        className={`lb-glass-bubble${isExpanded ? " expanded" : ""}`}
      >
        <div className="bubble-header">
          <span className="bubble-icon">{note.achievementIcon}</span>
          <span className="bubble-title">{note.achievementName}</span>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
              >
                <ChevronUp size={14} className="close-icon" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div layout className="bubble-content">
          <p className={!isExpanded ? "truncate-text" : "full-text"}>
            {note.noteText || "Achievement ini sedang dipamerkan."}
          </p>
        </motion.div>

        <motion.div
          animate={{
            y: [0, 2, 0], scale: [1, 1.1, 1],
            filter: ["brightness(1)", "brightness(1.5) drop-shadow(0 0 2px rgba(255,255,255,0.5))", "brightness(1)"],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="bubble-tail"
        />
        <motion.div
          animate={{
            y: [0, 4, 0], scale: [1, 1.2, 1],
            filter: ["brightness(1)", "brightness(1.5) drop-shadow(0 0 2px rgba(255,255,255,0.5))", "brightness(1)"],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="bubble-tail2"
        />
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SUB COMPONENTS
// ─────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="lb-item glass-panel lb-skeleton">
    <div className="skel skel-rank" />
    <div className="skel skel-avatar" />
    <div className="skel-info">
      <div className="skel skel-name" />
      <div className="skel skel-meta" />
    </div>
    <div className="skel skel-score" />
  </div>
);

interface PodiumProps { top3: LeaderboardSiswaRow[]; }
const Podium = ({ top3 }: PodiumProps) => {
  const order = [2, 1, 3] as const;
  // State expand lokal khusus podium (terpisah dari list)
  const [expandedPodium, setExpandedPodium] = useState<number | null>(null);

  return (
    <section className="podium-section">
      <div className="lb-podium">
        {order.map((r) => {
          const p = top3.find((x) => x.rank === r);
          return (
            <motion.div
              key={r}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{
                delay: r === 1 ? 0.1 : r === 2 ? 0.2 : 0.3,
                type: "spring",
              }}
              className={`podium-box r-${r}${p?.is_me ? " is-me-podium" : ""}`}
            >
              {r === 1 && (
                <div className="crown-top">
                  <Crown size={20} color="var(--gold)" strokeWidth={2} />
                </div>
              )}
              <div className={`p-avatar-circle${p?.is_me ? " bg-primary" : ""}`}>
                {p?.fotoUrl ? (
                  <img
                    src={p.fotoUrl}
                    alt={p.nama}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : p ? (
                  getInitials(p.nama)
                ) : (
                  <UserCircle2 size={22} opacity={0.3} />
                )}
              </div>
              <div className="p-base">
                <span className="p-name">{p ? p.nama.split(" ")[0] : "—"}</span>
                <span className="p-pts">{p ? formatCoins(p.coins) : "0"} coins</span>
                <div className={`p-rank-label rank-${r}`}>{r}</div>
              </div>
              {/* {p?.showcaseNote && (
                <ShowcaseBubble
                  note={p.showcaseNote}
                  compact
                  isExpanded={expandedPodium === r}
                  onToggle={() =>
                    setExpandedPodium((prev) => (prev === r ? null : r))
                  }
                />
              )} */}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────
// SiswaItem — menerima expandedId & onToggle dari parent LeaderboardList
// ─────────────────────────────────────────────
interface SiswaItemProps {
  row: LeaderboardSiswaRow;
  idx: number;
  expandedNis: string | null;
  onToggleBubble: (nis: string) => void;
}

const SiswaItem = ({ row, idx, expandedNis, onToggleBubble }: SiswaItemProps) => {
  const hasBubble = !!row.showcaseNote;
  const isExpanded = expandedNis === row.nis;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className={[
        "lb-item glass-panel",
        row.is_me ? "is-me" : "",
        hasBubble ? "lb-item--has-bubble" : "",
      ].filter(Boolean).join(" ")}
    >
      {hasBubble && (
        <ShowcaseBubble
          note={row.showcaseNote}
          isExpanded={isExpanded}
          onToggle={() => onToggleBubble(row.nis)}
        />
      )}

      <div className="item-rank">
        <RankIcon rank={row.rank} />
      </div>

      <div className={`item-avatar-circle${row.is_me ? " bg-primary" : ""}`}>
        {row.fotoUrl ? (
          <img
            src={row.fotoUrl}
            alt={row.nama}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          getInitials(row.nama)
        )}
      </div>

      <div className="item-info">
        <div className="item-name">
          {row.nama}
          {row.is_me && <span className="me-badge">Kamu</span>}
        </div>
        <div className="item-meta">
          <span className="meta-chip">
            <Flame size={11} color="var(--streak-color)" />
            {row.streak} hari
          </span>
          <span className="meta-chip">
            <School size={11} />
            {row.kelas}
          </span>
        </div>
      </div>

      <div className="item-score">
        <div className="pts">{formatCoins(row.coins)}</div>
        <div className="pts-label">coins</div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// LeaderboardList — wrapper list siswa yang memegang state expandedNis
// Saat bubble A di-klik: expandedNis = A
// Saat bubble B di-klik: expandedNis = B  (A otomatis tutup)
// Saat bubble yang sama di-klik: expandedNis = null (tutup)
// ─────────────────────────────────────────────
const LeaderboardListSiswa = ({ data }: { data: LeaderboardSiswaRow[] }) => {
  const [expandedNis, setExpandedNis] = useState<string | null>(null);

  const handleToggle = useCallback((nis: string) => {
    setExpandedNis((prev) => (prev === nis ? null : nis));
  }, []);

  return (
    <>
      {data.map((row, i) => (
        <SiswaItem
          key={row.nis}
          row={row}
          idx={i}
          expandedNis={expandedNis}
          onToggleBubble={handleToggle}
        />
      ))}
    </>
  );
};

const KelasItem = ({ row, idx }: { row: LeaderboardKelasRow; idx: number }) => {
  const jenjangLabel = getJenjangLabel(
    row.jenjang,
    (row as LeaderboardKelasRow & { tingkat?: string }).tingkat,
  );
  const tingkatLabel = getTingkatLabel(row.tingkat);
  const cfg = JENJANG_CFG[jenjangLabel];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className={`lb-item glass-panel${row.is_my_class ? " is-me" : ""}`}
    >
      <div className="item-rank"><RankIcon rank={row.rank} /></div>
      <div
        className="item-avatar-circle kelas-icon"
        style={{ background: cfg ? `${cfg.color}18` : undefined, color: cfg?.color }}
      >
        {cfg?.icon ?? <Building2 size={16} />}
      </div>
      <div className="item-info">
        <div className="item-name">
          {row.nama_kelas}
          {row.is_my_class && <span className="me-badge">Kelas Saya</span>}
        </div>
        <div className="item-meta">
          <span className="meta-chip" style={{ color: cfg?.color }}>
            {cfg?.icon}{jenjangLabel}
          </span>
          <span className="meta-chip"><Award size={11} />{tingkatLabel}</span>
          <span className="meta-chip"><Users size={11} />{row.jumlah_siswa} siswa</span>
        </div>
      </div>
      <div className="item-score">
        <div className="pts">{formatCoins(Math.round(row.avg_coins))}</div>
        <div className="pts-label">avg/siswa</div>
      </div>
    </motion.div>
  );
};

const JenjangItem = ({ row, idx }: { row: LeaderboardJenjangRow; idx: number }) => {
  const cfg = JENJANG_CFG[row.jenjang];
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="lb-item glass-panel lb-jenjang-item"
      style={{ borderColor: cfg ? `${cfg.color}44` : undefined, color: cfg?.color }}
    >
      <div className="item-rank"><RankIcon rank={row.rank} /></div>
      <div
        className="item-avatar-circle jenjang-icon"
        style={{ background: cfg ? `${cfg.color}15` : undefined, color: cfg?.color }}
      >
        {cfg?.icon ?? <Building2 size={18} />}
      </div>
      <div className="item-info">
        <div className="item-name" style={{ color: cfg?.color }}>Jenjang {row.jenjang}</div>
        <div className="item-meta">
          <span className="meta-chip"><Users size={11} />{row.total_siswa} siswa</span>
          <span className="meta-chip">
            <TrendingUp size={11} />Total {formatCoins(Number(row.total_coins))}
          </span>
        </div>
      </div>
      <div className="item-score">
        <div className="pts" style={{ color: cfg?.color }}>
          {Math.round(Number(row.avg_coins))}
        </div>
        <div className="pts-label">avg coins</div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ message = "Belum ada data" }: { message?: string }) => (
  <div className="lb-empty">
    <Trophy size={40} strokeWidth={1.5} />
    <p>{message}</p>
  </div>
);

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function LeaderboardSiswaPage() {
  const [tab, setTab] = useState<TabKey>("kelas");

  const { data: dataKelas, isLoading: loadKelas, refetch: refKelas } = useLeaderboardKelasSaya();
  const { data: dataAntarKelas, isLoading: loadAntarKelas, refetch: refAntarKelas } = useLeaderboardAntarKelas();
  const { data: dataSekolah, isLoading: loadSekolah, refetch: refSekolah } = useLeaderboardSekolah();
  const { data: dataAntarJenjang, isLoading: loadAntarJenjang, refetch: refAntarJenjang } = useLeaderboardAntarJenjang();
  const { data: dataSiswaJenjang, isLoading: loadSiswaJenjang, refetch: refSiswaJenjang } = useLeaderboardSiswaAntarJenjang();

  const handleRefresh = () => {
    const map: Record<TabKey, () => void> = {
      kelas: refKelas,
      antarKelas: refAntarKelas,
      sekolah: refSekolah,
      antarJenjang: refAntarJenjang,
      siswaAntarJenjang: refSiswaJenjang,
    };
    map[tab]();
  };

  const isLoading = {
    kelas: loadKelas,
    antarKelas: loadAntarKelas,
    sekolah: loadSekolah,
    antarJenjang: loadAntarJenjang,
    siswaAntarJenjang: loadSiswaJenjang,
  }[tab];

  const top3Siswa = useMemo((): LeaderboardSiswaRow[] => {
    const src =
      tab === "kelas" ? dataKelas :
        tab === "sekolah" ? dataSekolah :
          tab === "siswaAntarJenjang" ? dataSiswaJenjang : undefined;
    return (src ?? []).filter((r) => r.rank <= 3);
  }, [tab, dataKelas, dataSekolah, dataSiswaJenjang]);

  const showPodium = tab !== "antarKelas" && tab !== "antarJenjang";

  const myPosSiswa = useMemo(() => {
    const src =
      tab === "kelas" ? dataKelas :
        tab === "sekolah" ? dataSekolah :
          tab === "siswaAntarJenjang" ? dataSiswaJenjang : undefined;
    return (src ?? []).find((r) => r.is_me);
  }, [tab, dataKelas, dataSekolah, dataSiswaJenjang]);

  const myPosKelas = useMemo(() => {
    if (tab !== "antarKelas") return undefined;
    return (dataAntarKelas ?? []).find((r) => r.is_my_class);
  }, [tab, dataAntarKelas]);

  return (
    <main className="dashboard-page leaderboard-page">
      <div className="dashboard-container">

        {/* HEADER */}
        <header className="dash-header">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="brand"
          >
            <div className="brand-logo">
              <BrandLogo size={26} alt="SEHATI" priority />
            </div>
            <div className="brand-text">
              <span className="brand-name">SEHATI</span>
              <span className="brand-role">Leaderboard</span>
            </div>
          </motion.div>
          <div className="header-actions">
            <button
              className={`btn-icon${isLoading ? " spinning" : ""}`}
              onClick={handleRefresh}
              title="Refresh data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {/* TABS */}
        <div className="lb-tabs-wrapper">
          <div className="lb-tabs-container glass-panel">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`lb-tab${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* POSISI SAYA */}
        <AnimatePresence>
          {(myPosSiswa || myPosKelas) && (
            <motion.div
              key="my-pos"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="my-position-card glass-panel"
            >
              <div className="my-pos-label">
                <Star size={13} /> Posisi Kamu
              </div>
              <div className="my-pos-content">
                <span className="my-pos-rank">
                  #{myPosSiswa?.rank ?? myPosKelas?.rank}
                </span>
                <div className="my-pos-info">
                  <span className="my-pos-name">
                    {myPosSiswa?.nama ?? myPosKelas?.nama_kelas}
                  </span>
                  <span className="my-pos-sub">
                    {myPosSiswa
                      ? `${myPosSiswa.kelas} • ${formatCoins(myPosSiswa.coins)} coins`
                      : `${myPosKelas?.jenjang} • avg ${Math.round(Number(myPosKelas?.avg_coins))} coins`
                    }
                  </span>
                </div>
                <div className="my-pos-coins">
                  <Flame size={13} />
                  <span>{myPosSiswa?.streak ?? "—"}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            {showPodium && !isLoading && top3Siswa.length > 0 && (
              <Podium top3={top3Siswa} />
            )}

            {tab === "antarJenjang" && !isLoading && (dataAntarJenjang ?? []).length > 0 && (
              <div className="jenjang-summary-row">
                {(dataAntarJenjang ?? []).map((j) => {
                  const cfg = JENJANG_CFG[j.jenjang];
                  return (
                    <motion.div
                      key={j.jenjang}
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="jenjang-summary-card glass-panel"
                      style={{ borderColor: cfg ? `${cfg.color}44` : undefined }}
                    >
                      <div className="jc-icon" style={{ color: cfg?.color }}>
                        {cfg?.icon ?? <Building2 size={20} />}
                      </div>
                      <div className="jc-jenjang" style={{ color: cfg?.color }}>{j.jenjang}</div>
                      <div className="jc-rank">#{j.rank}</div>
                      <div className="jc-avg">{Math.round(Number(j.avg_coins))} avg</div>
                      <div className="jc-siswa"><Users size={10} />{j.total_siswa}</div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {isLoading && (
              <div className="lb-list">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}

            {!isLoading && (
              <div className="lb-list">
                {tab === "kelas" && (
                  (dataKelas ?? []).length === 0
                    ? <EmptyState message="Tidak ada data untuk kelas ini" />
                    : <LeaderboardListSiswa data={dataKelas ?? []} />
                )}
                {tab === "antarKelas" && (
                  (dataAntarKelas ?? []).length === 0
                    ? <EmptyState message="Tidak ada data kelas" />
                    : (dataAntarKelas ?? []).map((row, i) => (
                      <KelasItem key={row.kelas_id} row={row} idx={i} />
                    ))
                )}
                {tab === "sekolah" && (
                  (dataSekolah ?? []).length === 0
                    ? <EmptyState message="Tidak ada data siswa" />
                    : <LeaderboardListSiswa data={dataSekolah ?? []} />
                )}
                {tab === "antarJenjang" && (
                  (dataAntarJenjang ?? []).length === 0
                    ? <EmptyState message="Tidak ada data jenjang" />
                    : (dataAntarJenjang ?? []).map((row, i) => (
                      <JenjangItem key={row.jenjang} row={row} idx={i} />
                    ))
                )}
                {tab === "siswaAntarJenjang" && (
                  (dataSiswaJenjang ?? []).length === 0
                    ? <EmptyState message="Tidak ada data siswa se-jenjang" />
                    : <LeaderboardListSiswa data={dataSiswaJenjang ?? []} />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
      <BottomNavSiswa />
    </main>
  );
}