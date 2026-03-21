"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  School,
  BookOpen,
  Crown,
  Ticket,
  RefreshCw,
  Zap,
  Activity,
  UserCheck,
  LayoutDashboard,
  Flame,
  Coins,
} from "lucide-react";
import ComplianceChart from "@/components/admin/ComplianceChart";
import { ErrorState, LoadingState } from "@/components/common/AsyncState";
import authService from "@/lib/auth";
import { getAdminUser, getDashboardData } from "@/lib/services/admin";
import SharedAvatar from "@/components/common/SharedAvatar";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalSiswa: number;
  totalSiswaAktif: number;
  totalGuru: number;
  totalGuruAktif: number;
  totalKelas: number;
  totalCoins: number;
  totalVoucher: number;
  voucherDiklaim: number;
}

interface LeaderboardItem {
  rank: number;
  nis: string;
  nama: string;
  kelas: string;
  coins: number;
  streak: number;
  fotoUrl?: string | null;
}

interface ActivityItem {
  id: string;
  type: "absensi" | "pelanggaran";
  siswa: string;
  keterangan: string;
  coins: number;
  timestamp: string;
}

interface DashboardData {
  stats: DashboardStats;
  complianceChart: { labels: string[]; data: number[] };
  leaderboard: LeaderboardItem[];
  recentActivities: ActivityItem[];
}

interface AdminUser {
  nama: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " jt";
  if (n >= 10_000) return (n / 1_000).toFixed(0) + " rb";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " rb";
  return String(n);
}

function fmtPct(part: number, total: number): string {
  if (!total) return "—";
  return Math.round((part / total) * 100) + "%";
}

function fmtTime(ts: string): string {
  const d = new Date(ts);
  return (
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) +
    " · " +
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
  );
}

function rankClass(i: number) {
  if (i === 0) return "r-1";
  if (i === 1) return "r-2";
  if (i === 2) return "r-3";
  return "";
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      const dash = await getDashboardData(force);
      setData(dash);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Tampilkan nama dari cache dulu (tidak blank saat load)
    const cached = authService.getCachedProfile();
    if (cached?.nama) setAdmin({ nama: cached.nama });

    load();

    // Non-blocking: update nama admin dari API
    getAdminUser()
      .then((a) => {
        if (a) {
          setAdmin(a);
          authService.saveProfile(a).catch(() => {});
        }
      })
      .catch(() => {});
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  if (loading) return <LoadingState message="Menyiapkan dashboard..." />;
  if (error || !data)
    return (
      <ErrorState
        title="Dashboard Gagal Dimuat"
        message={error || "Data dashboard tidak tersedia."}
        onRetry={() => {
          setError(null);
          setLoading(true);
          load(true);
        }}
      />
    );

  const { stats, complianceChart, leaderboard, recentActivities } = data;

  // ── Stat card config ──
  const statCards = [
    {
      label: "Total Siswa",
      value: stats.totalSiswa,
      sub: `${stats.totalSiswaAktif} aktif`,
      rate: fmtPct(stats.totalSiswaAktif, stats.totalSiswa),
      rateKind: "good" as const,
      icon: <Users size={20} />,
      color: "#0284c7",
      bg: "rgba(2,132,199,0.12)",
    },
    {
      label: "Total Guru",
      value: stats.totalGuru,
      sub: `${stats.totalGuruAktif} aktif`,
      rate: fmtPct(stats.totalGuruAktif, stats.totalGuru),
      rateKind: "good" as const,
      icon: <School size={20} />,
      color: "#059669",
      bg: "rgba(5,150,105,0.12)",
    },
    {
      label: "Total Kelas",
      value: stats.totalKelas,
      sub: "kelas terdaftar",
      rate: null,
      rateKind: "info" as const,
      icon: <BookOpen size={20} />,
      color: "#db2777",
      bg: "rgba(219,39,119,0.12)",
    },
    {
      label: "Poin Beredar",
      value: fmtNumber(stats.totalCoins),
      sub: "total koin siswa",
      rate: null,
      rateKind: "info" as const,
      icon: <Crown size={20} />,
      color: "#d97706",
      bg: "rgba(217,119,6,0.12)",
    },
    {
      label: "Voucher Diklaim",
      value: stats.voucherDiklaim,
      sub: `dari ${stats.totalVoucher} total`,
      rate: fmtPct(stats.voucherDiklaim, stats.totalVoucher),
      rateKind:
        stats.voucherDiklaim / Math.max(stats.totalVoucher, 1) > 0.7
          ? ("warn" as const)
          : ("info" as const),
      icon: <Ticket size={20} />,
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.12)",
    },
  ];

  const voucherPct = stats.totalVoucher
    ? Math.min(
        100,
        Math.round((stats.voucherDiklaim / stats.totalVoucher) * 100),
      )
    : 0;

  return (
    <div className="dashboard-wrapper">
      {/* ── Hero ──────────────────────────────────────── */}
      <div className="hero-section fade-up">
        <div className="hero-text">
          <div className="hero-greeting">Selamat datang kembali 👋</div>
          <h2 className="hero-name">{admin?.nama || "Admin"}</h2>
          <div className="hero-badges">
            <span className="hero-badge">
              <UserCheck size={11} /> Administrator
            </span>
            <span className="hero-badge">
              <Users size={11} /> {stats.totalSiswaAktif} Siswa Aktif
            </span>
            <span className="hero-badge">
              <School size={11} /> {stats.totalGuruAktif} Guru Aktif
            </span>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-icon-wrap">
            <LayoutDashboard size={30} />
          </div>
          <button className="hero-refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={12} className={refreshing ? "spin" : ""} />
            {refreshing ? "Memperbarui..." : "Perbarui Data"}
          </button>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────── */}
      <div className="stats-grid fade-up fade-up-1">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="stat-card"
            style={{ "--stat-accent": s.color } as React.CSSProperties}
          >
            <div className="stat-top">
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
              <div
                className="icon-box"
                style={{ background: s.bg, color: s.color }}
              >
                {s.icon}
              </div>
            </div>
            <div className="stat-footer">
              <span className="stat-sub">{s.sub}</span>
              {s.rate && (
                <span className={`stat-rate ${s.rateKind}`}>{s.rate}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts + Leaderboard ──────────────────────── */}
      <div className="charts-grid fade-up fade-up-2">
        {/* Compliance Chart */}
        <div
          className="glass-card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div className="card-header-fancy">
            <div className="header-title-box">
              <div className="icon-indicator blue" />
              <h3>Kepatuhan Siswa</h3>
            </div>
            <div className="card-tag">7 Hari Terakhir</div>
          </div>
          <div className="chart-wrapper">
            <ComplianceChart
              labels={complianceChart.labels}
              data={complianceChart.data}
            />
            <div className="chart-legend">
              <div className="chart-legend-item">
                <div
                  className="chart-legend-dot"
                  style={{ background: "var(--chart-line)" }}
                />
                Persentase absensi tumbler harian
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div
          className="glass-card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div className="card-header-fancy">
            <div className="header-title-box">
              <div className="icon-indicator gold" />
              <h3>Top Siswa</h3>
            </div>
            <Crown size={18} className="crown-icon-animate" />
          </div>

          <div className="leaderboard-scroll-area" style={{ flex: 1 }}>
            {leaderboard.length === 0 ? (
              <div className="lb-empty">Belum ada data leaderboard</div>
            ) : (
              leaderboard.slice(0, 8).map((s, i) => (
                <div key={s.nis} className="leaderboard-row">
                  <div
                    className={`rank-number ${rankClass(i)}`}
                    style={
                      !rankClass(i)
                        ? {
                            background: "var(--surface-2)",
                            color: "var(--text-faint)",
                          }
                        : {}
                    }
                  >
                    {i + 1}
                  </div>
                  <div className="student-profile" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexDirection: 'row' }}>
                    <SharedAvatar fotoUrl={s.fotoUrl || null} nama={s.nama} size={32} />
                    <div>
                      <span className="student-name-bold">{s.nama}</span>
                      <span className="student-class-tag flex items-center gap-1 ml-1" style={{ marginLeft: 0 }}>
                        {s.kelas}
                        {s.streak > 0 && (
                          <>
                            <span>·</span>
                            <Flame size={12} stroke="#e32424"/>
                            <span>{s.streak} hari</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="student-points">
                    <span className="coin-val">{fmtNumber(s.coins)}</span>
                    <span className="coin-label"><Coins size={16} stroke="#ffb700" fill="none"/></span>
                  </div>
                </div>
              ))
            )}
          </div>

          {leaderboard.length > 8 && (
            <a href="/admin/leaderboard" className="lb-footer-link">
              Lihat Semua →
            </a>
          )}
        </div>
      </div>

      {/* ── Voucher Progress (hanya jika ada voucher) ─── */}
      {stats.totalVoucher > 0 && (
        <div className="glass-card fade-up fade-up-3">
          <div className="card-header-fancy">
            <div className="header-title-box">
              <div className="icon-indicator purple" />
              <h3>Ringkasan Voucher</h3>
            </div>
            <div className="card-tag">
              <Ticket size={11} />
              {voucherPct}% terklaim
            </div>
          </div>

          <div className="voucher-progress-wrap">
            {/* Diklaim */}
            <div className="voucher-progress-row">
              <div className="voucher-row-header">
                <span className="voucher-label">Voucher Diklaim</span>
                <span className="voucher-count">
                  {stats.voucherDiklaim} / {stats.totalVoucher}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${voucherPct}%`,
                    background:
                      voucherPct > 70
                        ? "linear-gradient(90deg,#d97706,#f59e0b)"
                        : "linear-gradient(90deg,#7c3aed,#a78bfa)",
                  }}
                />
              </div>
            </div>

            {/* Tersedia */}
            <div className="voucher-progress-row">
              <div className="voucher-row-header">
                <span className="voucher-label">Voucher Tersedia</span>
                <span className="voucher-count">
                  {stats.totalVoucher - stats.voucherDiklaim} sisa
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${100 - voucherPct}%`,
                    background: "linear-gradient(90deg,#059669,#34d399)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Aktivitas Terbaru ──────────────────────────── */}
      <div className="glass-card fade-up fade-up-4">
        <div className="card-header-fancy">
          <div className="header-title-box">
            <div className="icon-indicator purple" />
            <h3>Aktivitas Terbaru</h3>
          </div>
          <div className="card-tag">
            <Activity size={11} />
            10 Log Terakhir
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {recentActivities.length === 0 ? (
            <div className="lb-empty">Belum ada aktivitas hari ini</div>
          ) : (
            recentActivities.map((act) => (
              <div key={act.id} className="activity-item">
                <div className={`activity-icon-box ${act.type}`}>
                  {act.type === "absensi" ? (
                    <Zap size={16} />
                  ) : (
                    <Activity size={16} />
                  )}
                </div>

                <div className="activity-info">
                  <div className="activity-user">{act.siswa}</div>
                  <div className="activity-desc">
                    {act.type === "absensi"
                      ? "Absensi tumbler berhasil dicatat"
                      : act.keterangan}
                  </div>
                  <div className="activity-time">{fmtTime(act.timestamp)}</div>
                </div>

                <div className="activity-reward">
                  <span
                    className={`reward-plus ${act.coins >= 0 ? "positive" : "negative"}`}
                  >
                    {act.coins >= 0 ? "+" : ""}
                    {act.coins}
                    <span className="reward-label"><Coins size={16} stroke="#ffb700" fill="none"/></span>
                  </span>
                  {/* <span className="reward-label"><Coins size={16} stroke="#ffb700" fill="none"/></span> */}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
