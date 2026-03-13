"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut, Zap, Leaf, Milk, TriangleAlert, History,
  Presentation, Trophy, Medal, Coins, LayoutDashboard,
  ChevronDown, RefreshCw, Loader2, ShieldCheck,
  CheckCircle2, XCircle, TrendingUp, Users,
  CalendarCheck, Star, Tag,
} from "lucide-react";
import {
  getProfilGuru, getKelasList, getStatistikKelas,
  getTopSiswa, getPelanggaranTerbaru,
  type ProfilGuru, type KelasItem, type StatistikKelas,
  type TopSiswa, type PelanggaranItem,
} from "@/lib/services/guru";
import { ErrorState } from "@/components/common/AsyncState";
import { logout } from "@/lib/services/shared";
import BrandLogo from "@/components/common/BrandLogo";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const KATEGORI_OPTIONS = [
  { value: "ringan", label: "Ringan", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  { value: "sedang", label: "Sedang", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
  { value: "berat",  label: "Berat",  color: "#EF4444", bg: "rgba(239,68,68,0.15)"  },
];

const PERAN_META = {
  konselor:   { label: "Konselor",           color: "#A855F7" },
  wali_kelas: { label: "Wali Kelas",          color: "#10b981" },
  guru_mapel: { label: "Guru Mata Pelajaran", color: "#179EFF" },
} as const;

const MEDAL_COLOR = { gold: "#F59E0B", silver: "#94A3B8", bronze: "#B45309" };

function toRomanTingkat(v: string | number): string {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 12) return String(v);
  const map: Record<number, string> = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
    7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
  };
  return map[n] ?? String(v);
}

function formatTanggalIndonesia(raw: string): string {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; type: ToastType; message: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const clr: Record<ToastType, string> = { success: "#10b981", error: "#ef4444", info: "#179EFF" };
  const ico: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={16} />,
    error:   <XCircle size={16} />,
    info:    <Leaf size={16} />,
  };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast-item" style={{ borderColor: `${clr[t.type]}45` }}>
          <span style={{ color: clr[t.type], flexShrink: 0 }}>{ico[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, loading }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; loading?: boolean;
}) {
  return (
    <div className="glass-panel stat-card-inner">
      <div
        className="stat-icon-bg"
        style={{
          background: `${color}18`,
          border: `1px solid ${color}28`,
        }}
      >
        <Icon size={19} style={{ color }} />
      </div>
      <div className="stat-card-body">
        <div className="stat-card-label">{label}</div>
        {loading
          ? <div className="skeleton-line skeleton-value" />
          : <div className="stat-card-value" style={{ color }}>{value}</div>
        }
        {sub && !loading && <div className="stat-card-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, label, color = "#179EFF" }: {
  icon: React.ElementType; label: string; color?: string;
}) {
  return (
    <div className="section-title-inline">
      <div className="section-title-bar" style={{ background: color }} />
      <Icon size={15} style={{ color }} />
      <h3 className="section-title-text">{label}</h3>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function GuruDashboard() {
  const router = useRouter();
  const toast = useToast();

  const [profil, setProfil]                   = useState<ProfilGuru | null>(null);
  const [kelasList, setKelasList]             = useState<KelasItem[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);
  const [statistik, setStatistik]             = useState<StatistikKelas | null>(null);
  const [topSiswa, setTopSiswa]               = useState<TopSiswa[]>([]);
  const [pelanggaran, setPelanggaran]         = useState<PelanggaranItem[]>([]);

  const [loadingInit, setLoadingInit]   = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingTop, setLoadingTop]     = useState(false);
  const [loadingPel, setLoadingPel]     = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadError, setLoadError]       = useState<string | null>(null);

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [p, kelas] = await Promise.all([getProfilGuru(), getKelasList()]);
        setProfil(p);
        setKelasList(kelas);
        const defaultId = (p.isWaliKelas && p.kelasWali)
          ? p.kelasWali.id
          : kelas[0]?.id ?? null;
        setSelectedKelasId(defaultId);
      } catch (e: any) {
        setLoadError(e.message || "Gagal memuat data awal dashboard guru.");
        toast.show(e.message || "Gagal memuat profil", "error");
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedKelasId) return;
    loadKelasData(selectedKelasId);
  }, [selectedKelasId]);

  async function loadKelasData(kelasId: number, isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    setLoadingStats(true);
    setLoadingTop(true);
    setLoadingPel(true);
    try {
      const [stats, top, pel] = await Promise.all([
        getStatistikKelas(kelasId, isRefresh),
        getTopSiswa(kelasId, 5, isRefresh),
        getPelanggaranTerbaru(kelasId, 5, isRefresh),
      ]);
      setStatistik(stats);
      setTopSiswa(top);
      setPelanggaran(pel);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e.message || "Gagal memuat data kelas.");
      toast.show(e.message || "Gagal memuat data kelas", "error");
    } finally {
      setLoadingStats(false);
      setLoadingTop(false);
      setLoadingPel(false);
      if (isRefresh) setRefreshing(false);
    }
  }

  function handleRefresh() {
    if (!selectedKelasId) return;
    loadKelasData(selectedKelasId, true);
    toast.show("Data diperbarui", "info");
  }

  // ── Derived ────────────────────────────────────────
  const selectedKelas = kelasList.find((k) => k.id === selectedKelasId);
  const kelasLabel    = selectedKelas ? `${toRomanTingkat(selectedKelas.tingkat)} ${selectedKelas.nama}` : "—";
  const peranKey      = profil?.peran ?? "guru_mapel";
  const peranMeta     = PERAN_META[peranKey];
  const hadirPct      = statistik?.persentaseHadir ?? 0;
  const barColor      = hadirPct >= 80
    ? "linear-gradient(90deg,#10b981,#34d399)"
    : hadirPct >= 50
    ? "linear-gradient(90deg,#F59E0B,#FCD34D)"
    : "linear-gradient(90deg,#EF4444,#F87171)";

  const hadirPctColor = hadirPct >= 80 ? "#10b981" : hadirPct >= 50 ? "#F59E0B" : "#EF4444";

  // ── Full-page loading ─────────────────────────────
  if (loadingInit) {
    return (
      <main className="dashboard-page">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="loading-fullscreen">
          <Loader2 size={34} className="spin" style={{ color: "#179EFF" }} />
          <span className="loading-text">Memuat dashboard...</span>
        </div>
      </main>
    );
  }

  if (loadError && !profil) {
    return (
      <main className="dashboard-page">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <ErrorState
          title="Dashboard Guru Gagal Dimuat"
          message={loadError}
          onRetry={() => window.location.reload()}
        />
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <ToastContainer toasts={toast.toasts} />

      <div className="dashboard-container">

        {/* ══ NAVBAR ══════════════════════════════════════════ */}
        <header className="dash-header">
          <div className="brand">
            <div className="brand-logo"><BrandLogo size={28} alt="SEHATI Guru" priority /></div>
            <div className="brand-text">
              <span className="brand-name">SEHATI</span>
              <span className="brand-role">Guru Panel</span>
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-icon"
              title="Refresh data"
              style={{ color: refreshing ? "#179EFF" : undefined }}
            >
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            </button>
            <button onClick={() => logout()} className="btn-icon danger-hover" title="Keluar">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* ══ WELCOME BANNER ══════════════════════════════════ */}
        <section className={`welcome-banner welcome-banner--${peranKey}`}>
          <div className="welcome-text">
            <div className="welcome-title-row">
              <h1 className="greet">
                <span className="gprefixreet-">Selamat Datang, </span>
                <span className="mobile-break" />
                <span className="greet-name">{profil?.nama ?? "—"}</span>
              </h1>

              {/* Badge peran */}
              <span className={`badge-peran badge-peran--${peranKey}`}>
                {peranMeta.label}
              </span>
            </div>

            <p className="sub-greet">
              {profil?.mataPelajaran ? `${profil.mataPelajaran} · ` : ""}
              {profil?.isWaliKelas && profil.kelasWali
                ? `Wali Kelas ${profil.kelasWali.label}`
                : profil?.isKonselor
                ? "Konselor Sekolah"
                : "Guru Mata Pelajaran"}
            </p>
          </div>
          <div className="welcome-decor">
            <LayoutDashboard size={48} strokeWidth={1} />
          </div>
        </section>

        {/* ══ MAIN CONTENT GRID ═══════════════════════════════ */}
        <div className="main-grid">

          {/* ═══ LEFT COLUMN ══════════════════════════════════ */}
          <div className="left-col">

            {/* ── AKSI CEPAT ──────────────────────────────────── */}
            <section className="section-group">
              <div className="section-title">
                <Zap size={18} className="icon-title" />
                <h3>Aksi Cepat</h3>
              </div>

              <div className="action-grid">
                <Link href="/guru/absensi" className="action-card primary main-action">
                  <Milk size={26} />
                  <div className="act-text">
                    <span className="act-label">Absensi Tumbler</span>
                    <span className="act-desc">Scan QR Siswa</span>
                  </div>
                </Link>

                <Link href="/guru/laporanPelanggaran" className="action-card danger">
                  <TriangleAlert size={22} />
                  <span>Laporan Pelanggaran</span>
                </Link>

                <Link href="/guru/riwayatLaporan" className="action-card secondary">
                  <History size={22} />
                  <span>Riwayat Laporan</span>
                </Link>

                {profil?.isKonselor && (
                  <Link href="/guru/pelanggaran" className="action-card action-card-konselor">
                    <ShieldCheck size={22} style={{ color: "#A855F7" }} />
                    <span style={{ color: "#A855F7" }}>Jenis Pelanggaran</span>
                  </Link>
                )}
              </div>
            </section>

            {/* ── STATISTIK KELAS ─────────────────────────────── */}
            <section className="section-group">
              <div className="section-header-row">
                <div className="section-title no-margin">
                  <Presentation size={18} className="icon-title" />
                  <h3>Statistik Kelas</h3>
                </div>
                <div className="class-selector-wrapper">
                  <select
                    className="custom-select"
                    value={selectedKelasId ?? ""}
                    onChange={(e) => setSelectedKelasId(Number(e.target.value))}
                  >
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {toRomanTingkat(k.tingkat)} {k.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-icon" />
                </div>
              </div>

              {/* Stat cards */}
              <div className="stat-cards-row">
                <StatCard icon={Users}        label="Total Siswa"  value={statistik?.totalSiswa ?? "—"} color="#179EFF" loading={loadingStats} />
                <StatCard icon={CalendarCheck} label="Bawa Tumber"
                  value={statistik ? `${statistik.hadirHariIni}/${statistik.totalSiswa}` : "—"}
                  sub={statistik ? `${statistik.persentaseHadir}%` : undefined}
                  color="#10b981" loading={loadingStats}
                />
                <StatCard icon={Coins}        label="Rata-rata Koin"   value={statistik?.rataRataCoins ?? "—"}            color="#F59E0B" loading={loadingStats} />
                <StatCard icon={TrendingUp}   label="Rata-rata Streak" value={statistik ? `${statistik.rataRataStreak} hr` : "—"} color="#F97316" loading={loadingStats} />
              </div>

              {/* Progress bar kehadiran */}
              <div className="glass-panel stats-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 0, padding: "14px 18px" }}>
                <div className="progress-header">
                  <span className="label">
                    Kehadiran Tumbler — <strong className="progress-kelas-label">{kelasLabel}</strong>
                  </span>
                  <span className="progress-pct" style={{ color: hadirPctColor }}>
                    {loadingStats ? "—" : `${hadirPct}%`}
                  </span>
                </div>
                <div className="progress-bg">
                  <div
                    className="progress-fill"
                    style={{
                      width: loadingStats ? "0%" : `${hadirPct}%`,
                      background: barColor,
                      transition: "width 0.7s ease",
                    }}
                  />
                </div>
                {statistik && (
                  <div className="progress-sub">
                    {statistik.hadirHariIni} hadir · {statistik.totalSiswa - statistik.hadirHariIni} belum · {formatTanggalIndonesia(statistik.tanggal)}
                  </div>
                )}
              </div>
            </section>

            {/* ── RIWAYAT PELANGGARAN ─────────────────────────── */}
            <section className="section-group">
              <div className="section-header-row">
                <div className="section-title no-margin">
                  <TriangleAlert size={18} className="icon-title" style={{ color: "#EF4444" }} />
                  <h3>Pelanggaran Terbaru</h3>
                </div>
                <Link href="/guru/riwayatLaporan" className="link-lihat-semua">
                  Lihat semua →
                </Link>
              </div>

              <div className="glass-panel pelanggaran-list">
                {loadingPel ? (
                  <div className="pelanggaran-skeleton-wrap">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="pelanggaran-skeleton-row">
                        <div className="skeleton-bar" />
                        <div className="skeleton-line skeleton-name" style={{ animationDelay: "0s" }} />
                        <div className="skeleton-line skeleton-mid"  style={{ animationDelay: "0.1s" }} />
                        <div className="skeleton-line skeleton-sm"   style={{ animationDelay: "0.2s" }} />
                      </div>
                    ))}
                  </div>
                ) : pelanggaran.length === 0 ? (
                  <div className="pelanggaran-empty">
                    <Star size={28} strokeWidth={1} />
                    <span>Tidak ada pelanggaran terbaru.</span>
                  </div>
                ) : (
                  pelanggaran.map((p, idx) => {
                    const ks = KATEGORI_OPTIONS.find((o) => o.value === p.pelanggaran?.kategori) ?? KATEGORI_OPTIONS[0];

                    const statusColor =
                      p.status === "approved" ? "#10b981" :
                      p.status === "rejected" ? "#ef4444" :
                      "#F59E0B";
                    const statusBg =
                      p.status === "approved" ? "rgba(16,185,129,0.1)" :
                      p.status === "rejected" ? "rgba(239,68,68,0.1)" :
                      "rgba(245,158,11,0.1)";
                    const statusBorder =
                      p.status === "approved" ? "rgba(16,185,129,0.2)" :
                      p.status === "rejected" ? "rgba(239,68,68,0.2)" :
                      "rgba(245,158,11,0.2)";

                    return (
                      <div
                        key={p.id}
                        className="pelanggaran-row"
                        style={{ borderBottom: idx < pelanggaran.length - 1 ? "1px solid var(--pelanggaran-border)" : "none" }}
                      >
                        {/* Indikator warna kategori */}
                        <div className="pelanggaran-kategori-bar" style={{ background: ks.color }} />

                        <div className="pelanggaran-info">
                          <div className="pelanggaran-siswa-nama">{p.siswa?.nama}</div>
                          <div className="pelanggaran-jenis-nama">{p.pelanggaran?.nama}</div>
                        </div>

                        <div className="pelanggaran-meta">
                          <span
                            className="badge-kategori"
                            style={{ background: ks.bg, color: ks.color }}
                          >
                            <Tag size={8} />{p.pelanggaran?.kategori}
                          </span>
                          <span className="pelanggaran-tanggal">{formatTanggalIndonesia(p.tanggal)}</span>
                        </div>

                        {/* Status */}
                        <span
                          className="badge-status"
                          style={{ color: statusColor, background: statusBg, border: `1px solid ${statusBorder}` }}
                        >
                          {p.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* ═══ RIGHT COLUMN ═════════════════════════════════ */}
          <aside className="right-col">
            <section className="section-group full-height">
              <div className="section-header-row">
                <div className="section-title no-margin">
                  <Trophy size={18} className="icon-title" />
                  <h3>Top Siswa</h3>
                </div>
                <span className="kelas-label-muted">{kelasLabel}</span>
              </div>

              <div className="leaderboard-list">
                {loadingTop ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="leaderboard-item">
                      <div
                        className="skeleton-circle"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                        <div className="skeleton-line skeleton-name"  />
                        <div className="skeleton-line skeleton-mid"   />
                      </div>
                    </div>
                  ))
                ) : topSiswa.length === 0 ? (
                  <div className="lb-empty">
                    <Trophy size={28} strokeWidth={1} style={{ margin: "0 auto 10px", display: "block" }} />
                    Belum ada data siswa.
                  </div>
                ) : (
                  topSiswa.map((s) => (
                    <div key={s.nis} className="leaderboard-item">
                      <div className="rank-col">
                        {s.medal !== "none" ? (
                          <Medal
                            size={22}
                            color={MEDAL_COLOR[s.medal as keyof typeof MEDAL_COLOR]}
                            fill={MEDAL_COLOR[s.medal as keyof typeof MEDAL_COLOR]}
                          />
                        ) : (
                          <span className="rank-number">#{s.rank}</span>
                        )}
                      </div>
                      <div className="student-info">
                        <div className="student-name">{s.nama}</div>
                        <div className="student-streak">🔥 Streak: {s.streak} hari</div>
                      </div>
                      <div className="student-score">
                        {s.coins}
                        <Coins size={13} color="#F59E0B" fill="#F59E0B" />
                      </div>
                    </div>
                  ))
                )}

                <Link href="/guru/leaderboard" className="view-all">
                  Lihat Semua Siswa
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
