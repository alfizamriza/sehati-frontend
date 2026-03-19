"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  RefreshCw,
  Trophy,
  Flame,
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
  Coins,
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

type SiswaMetric = "coins" | "streak";

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

const rankSiswaRows = (
  rows: LeaderboardSiswaRow[],
  metric: SiswaMetric,
): LeaderboardSiswaRow[] =>
  [...rows]
    .sort((a, b) => {
      const primary = metric === "coins" ? b.coins - a.coins : b.streak - a.streak;
      if (primary !== 0) return primary;
      const secondary = metric === "coins" ? b.streak - a.streak : b.coins - a.coins;
      if (secondary !== 0) return secondary;
      return a.nama.localeCompare(b.nama, "id");
    })
    .map((row, i) => ({ ...row, rank: i + 1 }));

const getMetricValue = (row: LeaderboardSiswaRow, metric: SiswaMetric) =>
  metric === "coins" ? formatCoins(row.coins) : `${row.streak}`;

const getMetricLabel = (metric: SiswaMetric) =>
  metric === "coins" ? "coins" : "hari streak";

const formatShowcaseTime = (value?: string | null) => {
  if (!value) return "baru saja";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "baru saja";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// ─────────────────────────────────────────────
// SPRING CONFIG
// Sama persis seperti mock StudentItem pakai layout
// stiffness rendah → gerakan smooth tidak terlalu bouncy
// ─────────────────────────────────────────────
const RANK_SPRING = {
  type: "spring",
  stiffness: 250,
  damping: 28,
  mass: 1,
} as const;

// ─────────────────────────────────────────────
// SHOWCASE BUBBLE
// ─────────────────────────────────────────────
interface ShowcaseBubbleProps {
  note: LeaderboardSiswaRow["showcaseNote"];
  compact?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const ShowcaseBubble = ({ note, compact = false, isExpanded, onToggle }: ShowcaseBubbleProps) => {
  if (!note) return null;
  return (
    <div className={`lb-showcase-container${compact ? " compact" : ""}`}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.3, y: 30, rotate: -15 }}
        animate={{
          opacity: 1, scale: 1,
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
          scale: 1.05, y: -12,
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
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
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
          {isExpanded && (
            <div className="bubble-time">Dibuat {formatShowcaseTime(note.createdAt)}</div>
          )}
          <p className={!isExpanded ? "truncate-text" : "full-text"}>
            {note.noteText || "Achievement ini sedang dipamerkan."}
          </p>
        </motion.div>
        <motion.div
          animate={{ y: [0, 2, 0], scale: [1, 1.1, 1], filter: ["brightness(1)", "brightness(1.5) drop-shadow(0 0 2px rgba(255,255,255,0.5))", "brightness(1)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="bubble-tail"
        />
        <motion.div
          animate={{ y: [0, 4, 0], scale: [1, 1.2, 1], filter: ["brightness(1)", "brightness(1.5) drop-shadow(0 0 2px rgba(255,255,255,0.5))", "brightness(1)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="bubble-tail2"
        />
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SKELETON
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

// ─────────────────────────────────────────────
// PODIUM
//
// Teknik dari mock StudentItem:
// Setiap podium-box punya layoutId="podium-{nis}"
// Saat metric berubah → top3 berubah urutan →
// Framer spring-animate card ke slot baru
// ─────────────────────────────────────────────
interface PodiumProps {
  top3: LeaderboardSiswaRow[];
  metric: SiswaMetric;
}

const Podium = ({ top3, metric }: PodiumProps) => {
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  // Slot visual: [rank2, rank1, rank3] — kiri, tengah, kanan
  const slots = [
    { slot: 2, heightClass: "podium-slot-2" },
    { slot: 1, heightClass: "podium-slot-1" },
    { slot: 3, heightClass: "podium-slot-3" },
  ];

  return (
    <section className="podium-section">
      <div className="podium-particles" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i} className="particle"
            style={{ left: `${15 + i * 14}%`, top: `${10 + (i % 3) * 15}%` }}
            animate={{ y: [0, -12, 0], opacity: [0.3, 0.7, 0.3], scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>

      <div className="lb-podium">
        {slots.map(({ slot, heightClass }) => {
          const p = top3.find((x) => x.rank === slot);
          return (
            // Slot placeholder — tidak bergerak, hanya reservasi posisi
            <div key={slot} className={`podium-slot ${heightClass}`}>
              {p && (
                // Card yang bergerak smooth antar slot via layoutId
                <motion.div
                  layoutId={`podium-person-${p.nis}`}
                  layout
                  transition={RANK_SPRING}
                  className={`podium-box r-${slot}${p.is_me ? " is-me-podium" : ""}`}
                >
                  {slot === 1 && (
                    <motion.div
                      className="crown-top"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.6, type: "spring", bounce: 0.5 }}
                    >
                      <Crown size={20} color="var(--gold)" strokeWidth={2} fill="var(--gold)" />
                    </motion.div>
                  )}
                  {slot === 1 && (
                    <motion.div
                      className="pulse-ring"
                      // animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  <motion.div
                    className={`p-avatar-circle${p.is_me ? " bg-primary" : ""}`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt={p.nama}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                      />
                    ) : (
                      getInitials(p.nama)
                    )}
                  </motion.div>

                  <div className="p-base">
                    <span className="p-name">{p.nama.split(" ")[0]}</span>
                    {/* Score flip saat metric berubah */}
                    <motion.span
                      className="p-pts"
                      key={`${p.nis}-${metric}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {getMetricValue(p, metric)} {getMetricLabel(metric)}
                    </motion.span>
                    <div className={`p-rank-label rank-${slot}`}>{slot}</div>
                  </div>

                  {/* {p.showcaseNote && (
                    <ShowcaseBubble
                      note={p.showcaseNote}
                      compact
                      isExpanded={expandedRank === slot}
                      onToggle={() => setExpandedRank((prev) => (prev === slot ? null : slot))}
                    />
                  )} */}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────
// SiswaItem
//
// Kunci animasi smooth naik-turun:
// 1. layoutId={`siswa-${row.nis}`} — ID unik per siswa
// 2. layout — Framer track posisi element ini di DOM
// 3. transition layout: RANK_SPRING — spring saat posisi berubah
//
// Saat metric berubah → data di-reorder → React render ulang
// dengan key yang sama tapi posisi berbeda →
// Framer otomatis spring card ke koordinat baru
// ─────────────────────────────────────────────
interface SiswaItemProps {
  row: LeaderboardSiswaRow;
  idx: number;
  expandedNis: string | null;
  onToggleBubble: (nis: string) => void;
  metric: SiswaMetric;
}

const SiswaItem = ({ row, idx, expandedNis, onToggleBubble, metric }: SiswaItemProps) => {
  const hasBubble = !!row.showcaseNote;
  const isExpanded = expandedNis === row.nis;

  return (
    <motion.div
      // layoutId unik — Framer track perpindahan posisi DOM antar render
      layoutId={`siswa-${row.nis}`}
      layout="position"
      // Animasi masuk pertama kali (sama seperti mock StudentItem)
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        // Spring untuk layout (perpindahan posisi card)
        layout: RANK_SPRING,
        // Fade + slide untuk render pertama
        opacity: { duration: 0.35, delay: idx * 0.04 },
        x: { duration: 0.35, delay: idx * 0.04, ...RANK_SPRING },
      }}
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

      {/* Rank — animasi bounce saat angka berubah */}
      <div className="item-rank">
        <motion.div
          key={`rank-${row.nis}-${row.rank}`}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          <RankIcon rank={row.rank} />
        </motion.div>
      </div>

      <motion.div
        className={`item-avatar-circle${row.is_me ? " bg-primary" : ""}`}
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.4 }}
      >
        {row.fotoUrl ? (
          <img src={row.fotoUrl} alt={row.nama}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          getInitials(row.nama)
        )}
      </motion.div>

      <div className="item-info">
        <div className="item-name">
          {row.nama}
          {row.is_me && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="me-badge"
            >
              Kamu
            </motion.span>
          )}
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

      {/* Score — flip animasi saat metric berganti */}
      <div className="item-score">
        <motion.div
          className="pts"
          key={`score-${row.nis}-${metric}`}
          initial={{ opacity: 0, y: -10, scale: 1.2 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
        >
          {getMetricValue(row, metric)}
        </motion.div>
        <motion.div
          className="pts-label"
          key={`label-${metric}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {getMetricLabel(metric)}
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// LeaderboardListSiswa
//
// KUNCI: dibungkus LayoutGroup agar layoutId tiap SiswaItem
// hanya di-track dalam scope ini, tidak clash dengan tab lain.
//
// motion.div layout di sini memastikan container melebar/mengecil
// smooth saat card ber-margin (bubble) masuk/keluar.
// ─────────────────────────────────────────────
const LeaderboardListSiswa = ({
  data,
  metric,
  groupId,
}: {
  data: LeaderboardSiswaRow[];
  metric: SiswaMetric;
  groupId: string;
}) => {
  const [expandedNis, setExpandedNis] = useState<string | null>(null);

  const handleToggle = useCallback((nis: string) => {
    setExpandedNis((prev) => (prev === nis ? null : nis));
  }, []);

  return (
    <LayoutGroup id={groupId}>
      <motion.div layout className="lb-list">
        {data.map((row, i) => (
          <SiswaItem
            key={row.nis}
            row={row}
            idx={i}
            expandedNis={expandedNis}
            onToggleBubble={handleToggle}
            metric={metric}
          />
        ))}
      </motion.div>
    </LayoutGroup>
  );
};

// ─────────────────────────────────────────────
// KelasItem
// ─────────────────────────────────────────────
const KelasItem = ({ row, idx }: { row: LeaderboardKelasRow; idx: number }) => {
  const jenjangLabel = getJenjangLabel(
    row.jenjang,
    (row as LeaderboardKelasRow & { tingkat?: string }).tingkat,
  );
  const tingkatLabel = getTingkatLabel(row.tingkat);
  const cfg = JENJANG_CFG[jenjangLabel];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.06, duration: 0.35 }}
      className={`lb-item glass-panel${row.is_my_class ? " is-me" : ""}`}
      whileHover={{ scale: 1.01, y: -1 }}
    >
      <div className="item-rank"><RankIcon rank={row.rank} /></div>
      <div className="item-avatar-circle kelas-icon"
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
          <span className="meta-chip" style={{ color: cfg?.color }}>{cfg?.icon}{jenjangLabel}</span>
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

// ─────────────────────────────────────────────
// JenjangItem
// ─────────────────────────────────────────────
const JenjangItem = ({ row, idx }: { row: LeaderboardJenjangRow; idx: number }) => {
  const cfg = JENJANG_CFG[row.jenjang];
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + idx * 0.08 }}
      className="lb-item glass-panel lb-jenjang-item"
      style={{ borderColor: cfg ? `${cfg.color}44` : undefined, color: cfg?.color }}
      whileHover={{ scale: 1.01, y: -1 }}
    >
      <div className="item-rank"><RankIcon rank={row.rank} /></div>
      <div className="item-avatar-circle jenjang-icon"
        style={{ background: cfg ? `${cfg.color}15` : undefined, color: cfg?.color }}
      >
        {cfg?.icon ?? <Building2 size={18} />}
      </div>
      <div className="item-info">
        <div className="item-name" style={{ color: cfg?.color }}>Jenjang {row.jenjang}</div>
        <div className="item-meta">
          <span className="meta-chip"><Users size={11} />{row.total_siswa} siswa</span>
          <span className="meta-chip"><TrendingUp size={11} />Total {formatCoins(Number(row.total_coins))}</span>
        </div>
      </div>
      <div className="item-score">
        <div className="pts" style={{ color: cfg?.color }}>{Math.round(Number(row.avg_coins))}</div>
        <div className="pts-label">avg coins</div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// JenjangCards
// ─────────────────────────────────────────────
const JenjangCards = ({ data }: { data: LeaderboardJenjangRow[] }) => (
  <div className="jenjang-summary-row">
    {data.map((j, i) => {
      const cfg = JENJANG_CFG[j.jenjang];
      return (
        <motion.div
          key={j.jenjang}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.12, type: "spring", bounce: 0.35 }}
          whileHover={{ y: -4, scale: 1.03 }}
          className="jenjang-summary-card glass-panel"
          style={{ borderColor: cfg ? `${cfg.color}44` : undefined }}
        >
          <motion.div style={{ color: cfg?.color }}
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          >
            {cfg?.icon ?? <Building2 size={20} />}
          </motion.div>
          <div className="jc-jenjang" style={{ color: cfg?.color }}>{j.jenjang}</div>
          <motion.div className="jc-rank"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.12 + 0.3, type: "spring", bounce: 0.5 }}
          >
            #{j.rank}
          </motion.div>
          <div className="jc-avg">{Math.round(Number(j.avg_coins))} avg</div>
          <div className="jc-siswa"><Users size={10} />{j.total_siswa}</div>
        </motion.div>
      );
    })}
  </div>
);

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
  const [siswaMetric, setSiswaMetric] = useState<SiswaMetric>("coins");
  const [refreshing, setRefreshing] = useState(false);

  const { data: dataKelas, isLoading: loadKelas, refetch: refKelas } = useLeaderboardKelasSaya();
  const { data: dataAntarKelas, isLoading: loadAntarKelas, refetch: refAntarKelas } = useLeaderboardAntarKelas();
  const { data: dataSekolah, isLoading: loadSekolah, refetch: refSekolah } = useLeaderboardSekolah();
  const { data: dataAntarJenjang, isLoading: loadAntarJenjang, refetch: refAntarJenjang } = useLeaderboardAntarJenjang();
  const { data: dataSiswaJenjang, isLoading: loadSiswaJenjang, refetch: refSiswaJenjang } = useLeaderboardSiswaAntarJenjang();

  const showSiswaMetricSwitch =
    tab === "kelas" || tab === "sekolah" || tab === "siswaAntarJenjang";

  const handleRefresh = () => {
    setRefreshing(true);
    ({
      kelas: refKelas, antarKelas: refAntarKelas, sekolah: refSekolah,
      antarJenjang: refAntarJenjang, siswaAntarJenjang: refSiswaJenjang
    })[tab]();
    setTimeout(() => setRefreshing(false), 800);
  };

  const isLoading = {
    kelas: loadKelas, antarKelas: loadAntarKelas, sekolah: loadSekolah,
    antarJenjang: loadAntarJenjang, siswaAntarJenjang: loadSiswaJenjang,
  }[tab];

  const rankedKelas = useMemo(() => rankSiswaRows(dataKelas ?? [], siswaMetric), [dataKelas, siswaMetric]);
  const rankedSekolah = useMemo(() => rankSiswaRows(dataSekolah ?? [], siswaMetric), [dataSekolah, siswaMetric]);
  const rankedSiswaJenjang = useMemo(() => rankSiswaRows(dataSiswaJenjang ?? [], siswaMetric), [dataSiswaJenjang, siswaMetric]);

  const top3Siswa = useMemo((): LeaderboardSiswaRow[] => {
    const src =
      tab === "kelas" ? rankedKelas :
        tab === "sekolah" ? rankedSekolah :
          tab === "siswaAntarJenjang" ? rankedSiswaJenjang : undefined;
    return (src ?? []).filter((r) => r.rank <= 3);
  }, [tab, rankedKelas, rankedSekolah, rankedSiswaJenjang]);

  const showPodium = tab !== "antarKelas" && tab !== "antarJenjang";

  const myPosSiswa = useMemo(() => {
    const src =
      tab === "kelas" ? rankedKelas :
        tab === "sekolah" ? rankedSekolah :
          tab === "siswaAntarJenjang" ? rankedSiswaJenjang : undefined;
    return (src ?? []).find((r) => r.is_me);
  }, [tab, rankedKelas, rankedSekolah, rankedSiswaJenjang]);

  const myPosKelas = useMemo(() => {
    if (tab !== "antarKelas") return undefined;
    return (dataAntarKelas ?? []).find((r) => r.is_my_class);
  }, [tab, dataAntarKelas]);

  return (
    <main className="dashboard-page leaderboard-page">
      <div className="dashboard-container">

        {/* HEADER */}
        <motion.header className="dash-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="brand">
            <div className="brand-logo">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <BrandLogo size={26} alt="SEHATI" priority />
              </motion.div>
            </div>
            <div className="brand-text">
              <span className="brand-name">SEHATI</span>
              <span className="brand-role">Leaderboard</span>
            </div>
          </div>
          <div className="header-actions">
            <motion.button className="btn-icon" onClick={handleRefresh} whileTap={{ scale: 0.9 }}>
              <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8 }}>
                <RefreshCw size={18} />
              </motion.div>
            </motion.button>
          </div>
        </motion.header>

        {/* TABS */}
        <div className="lb-tabs-wrapper">
          <div className="lb-tabs-container glass-panel">
            {TABS.map((t) => (
              <motion.button
                key={t.key}
                className={`lb-tab${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
                whileTap={{ scale: 0.95 }}
              >
                {tab === t.key && (
                  <motion.div
                    layoutId="activeTab"
                    className="lb-tab-indicator"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="lb-tab-label">
                  {t.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* METRIC SWITCH */}
        <AnimatePresence>
          {showSiswaMetricSwitch && (
            <motion.div
              key="metric-switch"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="lb-metric-switch glass-panel"
            >
              <div className="lb-metric-head">
                <span className="lb-metric-title">Peringkat Berdasarkan</span>
                <span className="lb-metric-sub">
                  Ganti leaderboard antara total coins dan konsistensi streak.
                </span>
              </div>
              <div className="lb-metric-actions">
                <button
                  className={`lb-metric-btn${siswaMetric === "coins" ? " active" : ""}`}
                  onClick={() => setSiswaMetric("coins")}
                  type="button"
                >
                  <Coins size={15} /> Coins
                </button>
                <button
                  className={`lb-metric-btn${siswaMetric === "streak" ? " active streak" : ""}`}
                  onClick={() => setSiswaMetric("streak")}
                  type="button"
                >
                  <Flame size={15} /> Streak
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* POSISI SAYA */}
        <AnimatePresence mode="wait">
          {tab !== "antarJenjang" && (myPosSiswa || myPosKelas) && (
            <motion.div
              key="my-pos"
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ type: "spring" }}
              className="my-position-card glass-panel"
            >
              <div className="my-pos-label">
                <TrendingUp size={13} /> Posisi Kamu
              </div>
              <div className="my-pos-content">
                <motion.span
                  className="my-pos-rank"
                  key={myPosSiswa?.rank ?? myPosKelas?.rank}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  #{myPosSiswa?.rank ?? myPosKelas?.rank}
                </motion.span>
                <div className="my-pos-info">
                  <span className="my-pos-name">
                    {myPosSiswa?.nama ?? myPosKelas?.nama_kelas}
                  </span>
                  <span className="my-pos-sub">
                    {myPosSiswa
                      ? `${myPosSiswa.kelas} • ${getMetricValue(myPosSiswa, siswaMetric)} ${getMetricLabel(siswaMetric)}`
                      : `${myPosKelas?.jenjang} • avg ${Math.round(Number(myPosKelas?.avg_coins))} coins`
                    }
                  </span>
                </div>
                {myPosSiswa?.streak != null && (
                  <div className="my-pos-coins">
                    <Flame size={13} />
                    <span>{myPosSiswa.streak}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28 }}
          >
            {/* Podium — LayoutGroup scope per tab */}
            {showPodium && !isLoading && top3Siswa.length > 0 && (
              <LayoutGroup id={`podium-${tab}`}>
                <Podium top3={top3Siswa} metric={siswaMetric} />
              </LayoutGroup>
            )}

            {tab === "antarJenjang" && !isLoading && (dataAntarJenjang ?? []).length > 0 && (
              <JenjangCards data={dataAntarJenjang ?? []} />
            )}

            {isLoading && (
              <div className="lb-list">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}

            {!isLoading && (
              <>
                {tab === "kelas" && (
                  rankedKelas.length === 0
                    ? <EmptyState message="Tidak ada data untuk kelas ini" />
                    : <LeaderboardListSiswa
                      data={rankedKelas}
                      metric={siswaMetric}
                      groupId="list-kelas"
                    />
                )}
                {tab === "antarKelas" && (
                  <div className="lb-list">
                    {(dataAntarKelas ?? []).length === 0
                      ? <EmptyState message="Tidak ada data kelas" />
                      : (dataAntarKelas ?? []).map((row, i) => (
                        <KelasItem key={row.kelas_id} row={row} idx={i} />
                      ))
                    }
                  </div>
                )}
                {tab === "sekolah" && (
                  rankedSekolah.length === 0
                    ? <EmptyState message="Tidak ada data siswa" />
                    : <LeaderboardListSiswa
                      data={rankedSekolah}
                      metric={siswaMetric}
                      groupId="list-sekolah"
                    />
                )}
                {tab === "antarJenjang" && (
                  <div className="lb-list">
                    {(dataAntarJenjang ?? []).length === 0
                      ? <EmptyState message="Tidak ada data jenjang" />
                      : (dataAntarJenjang ?? []).map((row, i) => (
                        <JenjangItem key={row.jenjang} row={row} idx={i} />
                      ))
                    }
                  </div>
                )}
                {tab === "siswaAntarJenjang" && (
                  rankedSiswaJenjang.length === 0
                    ? <EmptyState message="Tidak ada data siswa se-jenjang" />
                    : <LeaderboardListSiswa
                      data={rankedSiswaJenjang}
                      metric={siswaMetric}
                      groupId="list-jenjang"
                    />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      <div className="lb-bottom-fade" aria-hidden />
      <BottomNavSiswa />
    </main>
  );
}
