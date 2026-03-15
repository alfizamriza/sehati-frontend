"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Coins, Trophy, Medal, QrCode, X,
  TrendingUp, ShieldAlert, CalendarDays, Loader2, LogOut, User, ChevronDown,
  Flame, Info, Zap, Gift, Star,
} from "lucide-react";
import "./siswa-dashboard.css";
import { AttendanceCalendar } from "@/components/siswa/AttendanceCalendar";
import TumblerStatusCard from "@/components/siswa/TumblerStatusCard";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";
import AchievementPopup from "@/components/siswa/AchievementPopup";
import { ErrorState } from "@/components/common/AsyncState";
import BrandLogo from "@/components/common/BrandLogo";
import {
  getDashboardSiswa, clearDashboardCache, isCacheStale, isDashboardCached,
  type SiswaDashboard, type CalendarDay,
} from "@/lib/services/siswa-dashboard.service";
import { getUndisplayedAchievements, type Achievement } from "@/lib/services/achievement.service";
import { logout } from "@/lib/services/shared";
import SehatiLoadingScreen from "@/components/siswa/SehatiLoadingScreen";

// ─── COINS INFO POPUP ─────────────────────────────────────────────────────────
function CoinsInfoPopup({ coins, onClose }: { coins: number; onClose: () => void }) {
  // Close on outside click / Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const INFO_ITEMS = [
    { icon: <Zap size={15} />, color: "#f59e0b", text: "Coins bertambah setiap kamu membawa tumbler ke sekolah" },
    { icon: <Star size={15} />, color: "#a78bfa", text: "Semakin rajin membawa tumbler, semakin banyak coins terkumpul" },
    { icon: <Gift size={15} />, color: "#22c55e", text: "Coins bisa ditukar voucher hadiah di menu Rewards" },
    { icon: <ShieldAlert size={15} />, color: "#f87171", text: "Pelanggaran membawa kemasan plastik akan mengurangi coins kamu" },
    { icon: <Trophy size={15} />, color: "#3B9EFF", text: "Kumpulkan coins terbanyak untuk naik peringkat di leaderboard" },
  ];

  return (
    <div className="coins-popup-overlay" onClick={onClose}>
      <div className="coins-popup-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="coins-popup-drag" />
        <button className="coins-popup-close" onClick={onClose}>
          <X size={15} />
        </button>

        {/* Header */}
        <div className="coins-popup-header">
          <div className="coins-popup-icon-wrap">
            <Coins size={24} color="#f59e0b" />
          </div>
          <div>
            <div className="coins-popup-title">Sistem Coins SEHATI</div>
            <div className="coins-popup-sub">Informasi poin kamu</div>
          </div>
        </div>

        {/* Current balance */}
        <div className="coins-popup-balance">
          <div className="coins-popup-balance-label">Coins kamu saat ini</div>
          <div className="coins-popup-balance-val">
            <Coins size={20} color="#f59e0b" />
            {coins.toLocaleString("id-ID")}
          </div>
        </div>

        {/* Info list */}
        <div className="coins-popup-list">
          {INFO_ITEMS.map((item, i) => (
            <div key={i} className="coins-popup-item">
              <div
                className="coins-popup-item-icon"
                style={{ color: item.color, background: `${item.color}18` }}
              >
                {item.icon}
              </div>
              <span className="coins-popup-item-text">{item.text}</span>
            </div>
          ))}
        </div>

        <div className="coins-popup-note">
          Coins <strong>tidak dapat</strong> digunakan langsung di kantin.
          Gunakan QR Code untuk transaksi belanja.
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE DROPDOWN ─────────────────────────────────────────────────────────
function ProfileDropdown({ nama, kelas }: { nama: string; kelas: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { clearDashboardCache(); logout(); }
    catch { setIsLoggingOut(false); }
  };

  const initials = nama.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="profile-dropdown-wrapper" ref={dropdownRef}>
      <button
        className={`profile-trigger-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="avatar-circle">{initials}</div>
        <ChevronDown
          size={14}
          style={{
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "none",
          }}
        />
      </button>
      {isOpen && (
        <div className="profile-dropdown-menu glass-panel">
          <div className="dropdown-user-info">
            <div className="dropdown-avatar">{initials}</div>
            <div>
              <p className="dropdown-nama">{nama}</p>
              <p className="dropdown-kelas">{kelas}</p>
            </div>
          </div>
          <div className="dropdown-divider" />
          <button className="dropdown-item-btn" onClick={() => setIsOpen(false)}>
            <User size={15} /><span>Profil Saya</span>
          </button>
          <div className="dropdown-divider" />
          <button
            className="dropdown-item-btn logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut
              ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              : <LogOut size={15} />}
            <span>{isLoggingOut ? "Keluar..." : "Keluar"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DashboardSiswaPage() {
  const [dashboardData, setDashboardData] = useState<SiswaDashboard | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [showCoinsPopup, setShowCoinsPopup] = useState(false); // ← popup coins
  const [showAchievementPopup, setShowAchievementPopup] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calFetching, setCalFetching] = useState(false);

  const loadData = useCallback(async (force = false, silent = false) => {
    const hasData = dashboardData !== null;
    if (!silent) {
      if (!hasData) setIsLoading(true);
      else setIsFetching(true);
    }
    try {
      const [dashData, achievementData] = await Promise.all([
        getDashboardSiswa("month", force),
        force || !isDashboardCached("month") || isCacheStale("month")
          ? getUndisplayedAchievements()
          : Promise.resolve([]),
      ]);
      const todayKey = new Date();
      const todayStr = `${todayKey.getFullYear()}-${String(todayKey.getMonth() + 1).padStart(2, "0")}-${String(todayKey.getDate()).padStart(2, "0")}`;
      const cal = [...dashData.calendarDays];
      const idxToday = cal.findIndex((d) => d.date === todayStr);
      if (dashData.streak.isActiveToday) {
        if (idxToday >= 0) {
          cal[idxToday] = { ...cal[idxToday], status: "hadir", hadir: true, isToday: true };
        } else {
          cal.push({
            date: todayStr,
            label: String(todayKey.getDate()),
            dayName: todayKey.toLocaleDateString("id-ID", { weekday: "short" }),
            status: "hadir",
            isToday: true,
            isWeekend: [0, 6].includes(todayKey.getDay()),
            hadir: true,
            pelanggaranCount: 0,
            plastikCount: 0,
          });
        }
      }
      setDashboardData(dashData);
      setCalendarDays(cal);
      setAchievements(achievementData);
      setLoadError(null);
      if (achievementData.length > 0) setTimeout(() => setShowAchievementPopup(true), 800);
    } catch (err: any) {
      setLoadError(err?.message || "Gagal memuat dashboard siswa.");
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [dashboardData]);

  useEffect(() => { loadData(false, false); }, []); // eslint-disable-line

  useEffect(() => {
    function handleFocus() {
      if (isCacheStale("month")) loadData(true, true);
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadData]);

  const handleCalendarMonthChange = useCallback(async (year: number, month: number) => {
    setCalFetching(true);
    try {
      const data = await getDashboardSiswa("month", false, year, month);
      setCalendarDays(data.calendarDays);
    } catch (err) {
      console.error("Gagal memuat kalender bulan lain:", err);
    } finally {
      setCalFetching(false);
    }
  }, []);

  const qrValue = useMemo(() => dashboardData?.profile?.nis || "", [dashboardData]);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const todayStatus = useMemo(() => {
    const status = calendarDays.find((d) => d.date === todayKey)?.status ?? null;
    if (!status && dashboardData?.streak?.isActiveToday) return "hadir";
    return status;
  }, [calendarDays, todayKey, dashboardData?.streak?.isActiveToday]);

  const showTumblerCard = todayStatus !== null && todayStatus !== "libur";
  const tumblerHadir = todayStatus === "hadir";

  if (isLoading && !dashboardData) return <SehatiLoadingScreen />;

  if (!dashboardData) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <ErrorState
            title="Dashboard Siswa Gagal Dimuat"
            message={loadError || "Data dashboard tidak tersedia."}
            onRetry={() => loadData(true, false)}
          />
        </div>
      </main>
    );
  }

  const { profile, streak, ranking, pelanggaran, leaderboard } = dashboardData;

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">

        {/* HEADER */}
        <header className="dash-header">
          <div className="brand">
            <div className="brand-logo">
              <BrandLogo size={30} alt="SEHATI Siswa" priority />
            </div>
            <div className="brand-text">
              <span className="brand-name">SEHATI</span>
              <span className="brand-role">Sekolah Hijau dan Anti Plastik</span>
            </div>
          </div>
          <div className="header-actions">
            <ProfileDropdown nama={profile.nama} kelas={profile.kelas} />
          </div>
        </header>

        {isFetching && (
          <div className="top-fetch-bar">
            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Memperbarui data...
          </div>
        )}

        <div className="main-grid">
          {/* LEFT COLUMN */}
          <div className="left-col">

            {/* Welcome */}
            <section className="welcome-banner">
              <div className="welcome-text">
                <h1 className="greet">
                  Halo, <br className="mobile-break" />
                  <span>{profile.nama}</span>
                </h1>
                <div className={`streak-badge ${streak.shouldShowFaded ? "streak-faded" : ""}`}>
                  <Flame size={16} className="streak-flame-icon" />
                  <span className="streak-count">{streak.current}</span>
                  <span className="streak-label">Hari Streak</span>
                </div>
              </div>
              <div className="welcome-decor"><TrendingUp size={48} strokeWidth={1} /></div>
            </section>

            {/* Stats */}
            <div className="stats-grid-siswa">

              {/* ── COINS — klik untuk popup info ── */}
              <button
                className="glass-panel stat-card-mini stat-card-coins stat-card-clickable"
                onClick={() => setShowCoinsPopup(true)}
                title="Klik untuk info coins"
              >
                <Coins color="#F59E0B" size={22} />
                <div className="stat-info">
                  <span className="stat-label">Coins</span>
                  <span className="stat-value">{profile.coins}</span>
                </div>
                {/* Info hint — menggantikan marquee */}
                <div className="stat-coins-hint">
                  <Info size={12} />
                  <span>Ketuk untuk info</span>
                </div>
              </button>

              <div className="glass-panel stat-card-mini">
                <Trophy color="#179EFF" size={22} />
                <div className="stat-info">
                  <span className="stat-label">Rank</span>
                  <span className="stat-value">#{ranking.position}</span>
                </div>
              </div>

              <div className="glass-panel stat-card-mini">
                <ShieldAlert color="#EF4444" size={22} />
                <div className="stat-info">
                  <span className="stat-label">Pelanggaran</span>
                  <span className="stat-value">{pelanggaran}</span>
                </div>
              </div>
            </div>

            {/* Tumbler Status */}
            {showTumblerCard && (
              <div className="tumbler-status-wrap">
                <TumblerStatusCard hadir={tumblerHadir} nama={profile.nama} />
              </div>
            )}

            {/* Kalender Aktivitas */}
            <section className="section-group">
              <div className="section-title">
                <CalendarDays size={20} className="icon-title" />
                <h3>Aktivitas Kehadiran</h3>
                {calFetching && (
                  <Loader2 size={14} style={{ marginLeft: "auto", color: "#179EFF", animation: "spin 1s linear infinite" }} />
                )}
              </div>
              <div className="glass-panel chart-container attendance-panel">
                {calendarDays.length > 0 ? (
                  <AttendanceCalendar
                    days={calendarDays}
                    onMonthChange={handleCalendarMonthChange}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem" }}>
                    Belum ada data aktivitas
                  </div>
                )}
              </div>
            </section>

            {/* QR CODE */}
            <section className="section-group">
              <div className="section-title">
                <QrCode size={20} className="icon-title" />
                <h3>QR Code Belanja</h3>
              </div>
              <div className="qr-preview-card-new" onClick={() => setIsQrOpen(true)}>
                <div className="qr-frame-wrapper">
                  <div className="qr-glow-ring" />
                  <div className="qr-frame">
                    <QRCodeCanvas value={qrValue || "SEHATI"} size={72} bgColor="transparent" fgColor="#111827" />
                  </div>
                  <div className="qr-corner qr-corner-tl" />
                  <div className="qr-corner qr-corner-tr" />
                  <div className="qr-corner qr-corner-bl" />
                  <div className="qr-corner qr-corner-br" />
                </div>
                <div className="qr-info">
                  <div className="qr-nis-label">NIS</div>
                  <div className="qr-nis-value">{profile.nis}</div>
                  <div className="qr-tap-hint">
                    <span className="qr-tap-dot" />
                    Ketuk untuk perbesar
                  </div>
                </div>
                <div className="qr-scan-line" />
              </div>
            </section>
          </div>

          {/* LEADERBOARD */}
          <aside className="right-col">
            <section className="section-group">
              <div className="section-title">
                <Trophy size={20} className="icon-title" />
                <h3>Leaderboard</h3>
              </div>
              <div className="leaderboard-list">
                {leaderboard.map((item) => (
                  <div key={item.nis} className={`leaderboard-item ${item.isMe ? "is-me" : ""}`}>
                    <div className="rank-col">
                      {item.medal !== "none" ? (
                        <Medal
                          size={20}
                          fill={
                            item.medal === "gold" ? "#F59E0B"
                              : item.medal === "silver" ? "#94A3B8"
                                : "#B45309"
                          }
                        />
                      ) : <span className="rank-num">#{item.rank}</span>}
                    </div>
                    <div className="student-info">
                      <div className="student-name">{item.nama} {item.isMe && "(Kamu)"}</div>
                    </div>
                    <div className="student-score">
                      {item.coins} <span className="pts">coins</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <BottomNavSiswa />

      {/* MODAL QR */}
      {isQrOpen && (
        <div className="modal-overlay" onClick={() => setIsQrOpen(false)}>
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setIsQrOpen(false)}><X /></button>
            <h3>QR Code Presensi</h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", marginTop: -8, marginBottom: 0 }}>
              {profile.nama}
            </p>
            <div className="qr-large-wrapper">
              <QRCodeCanvas value={qrValue} size={200} includeMargin />
            </div>
            <div className="nis-display">{profile.nis}</div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
              Tunjukkan ke guru atau petugas kantin
            </p>
          </div>
        </div>
      )}

      {/* COINS INFO POPUP */}
      {showCoinsPopup && (
        <CoinsInfoPopup
          coins={profile.coins}
          onClose={() => setShowCoinsPopup(false)}
        />
      )}

      {/* ACHIEVEMENT POPUP */}
      {showAchievementPopup && achievements.length > 0 && (
        <AchievementPopup
          achievements={achievements}
          onClose={async () => {
            setShowAchievementPopup(false);
            setAchievements([]);
            clearDashboardCache();
            await loadData(true, true);
          }}
        />
      )}

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}