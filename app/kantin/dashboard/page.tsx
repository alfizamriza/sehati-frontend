"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBasket, Package, ClipboardList,
  TrendingUp, Coins, BarChart2, AlertTriangle,
  RefreshCw, LogOut, ChevronRight,
  ShoppingCart, Star, Zap, ArrowUpRight,
  CreditCard, Tag, Wallet, Lock, Eye, EyeOff, Loader2,
} from "lucide-react";
import {
  getKantinDashboard, clearKantinDashboardCache, isKantinDashboardCached,
  formatRupiah, formatRupiahFull, formatWaktu, labelPayment, stokLevel,
  type KantinDashboardData, type TransaksiTerbaru, type ProdukTerlaris,
  updateKantinPassword,
} from "@/lib/services/kantin";
import { ErrorState, LoadingState } from "@/components/common/AsyncState";
import { logout } from "@/lib/services/shared";
import BrandLogo from "@/components/common/BrandLogo";
import "../../guru/dashboard/dashboard.css";
import "./kantin.css";

// ─── HOOK: THEME ─────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }, [dark]);

  return { dark };
}

// ─── JAM REAL-TIME ────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="live-clock-block">
      <div className="clock-time">{time}</div>
      <div className="clock-date">{date}</div>
    </div>
  );
}

// ─── MINI BAR CHART ───────────────────────────────────────────────────────────

function MiniBarChart({
  data,
}: {
  data: { label: string; pendapatan: number; tanggal: string }[];
}) {
  const max = Math.max(...data.map((d) => d.pendapatan), 1);
  const today = new Date().toISOString().split("T")[0];

  if (!data.length) {
    return (
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--k-text-faint)", fontSize: "0.78rem" }}>
        Belum ada data minggu ini
      </div>
    );
  }

  return (
    <div className="mini-bar-chart">
      {data.map((d, i) => {
        const pct = Math.round((d.pendapatan / max) * 100);
        const isToday = d.tanggal === today;
        return (
          <div
            key={i}
            className="bar-col"
            title={`${d.label}: ${formatRupiahFull(d.pendapatan)}`}
          >
            <div className="bar-track">
              <div
                className={`bar-fill${isToday ? " bar-today" : ""}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span className={`bar-label${isToday ? " bar-label-today" : ""}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; delay?: number;
}) {
  return (
    <div
      className="k-stat-card glass-panel"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="k-stat-icon"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <div className="k-stat-body">
        <div className="k-stat-label">{label}</div>
        <div className="k-stat-value" style={{ color }}>{value}</div>
        {sub && <div className="k-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── PAYMENT ICON ────────────────────────────────────────────────────────────

const PAY_ICONS: Record<string, React.ReactNode> = {
  coins: <Coins size={11} />,
  voucher: <Tag size={11} />,
  tunai: <Wallet size={11} />,
};

function PayIcon({ method }: { method: string }) {
  const { label, color } = labelPayment(method);
  return (
    <span
      className="pay-chip"
      style={{ color, borderColor: `${color}40`, background: `${color}12` }}
    >
      {PAY_ICONS[method] ?? <CreditCard size={11} />}
      {" "}{label}
    </span>
  );
}

// ─── TRANSAKSI ROW ────────────────────────────────────────────────────────────

function TransaksiRow({ t }: { t: TransaksiTerbaru }) {
  return (
    <div className="tx-row">
      <div className="tx-avatar">
        {t.namaSiswa.charAt(0).toUpperCase()}
      </div>
      <div className="tx-info">
        <div className="tx-nama">{t.namaSiswa}</div>
        <div className="tx-meta">
          <span>{t.jumlahItem} item</span>
          <span className="tx-dot">·</span>
          <span>{formatWaktu(t.createdAt)}</span>
          <span className="tx-dot">·</span>
          <PayIcon method={t.paymentMethod} />
        </div>
      </div>
      <div className="tx-amount">{formatRupiah(t.totalBayar)}</div>
    </div>
  );
}

// ─── PRODUK TERLARIS ROW ──────────────────────────────────────────────────────

const RANK_COLORS = ["#F59E0B", "#9CA3AF", "#CD7F32", "#179EFF", "#179EFF"];

function ProdukRow({ p, rank }: { p: ProdukTerlaris; rank: number }) {
  const rankColor = RANK_COLORS[rank - 1] ?? "#179EFF";
  return (
    <div className="produk-row">
      <div
        className="produk-rank"
        style={{ color: rankColor, borderColor: `${rankColor}40`, background: `${rankColor}10` }}
      >
        {rank}
      </div>
      <div className="produk-info">
        <div className="produk-nama">{p.nama}</div>
        <div className="produk-meta">{p.kategori} · Stok {p.stokSaat}</div>
      </div>
      <div className="produk-stats">
        <div className="produk-terjual">{p.totalTerjual}×</div>
        <div className="produk-income">{formatRupiah(p.totalPendapatan)}</div>
      </div>
    </div>
  );
}

// ─── STOK BADGE ──────────────────────────────────────────────────────────────

function StokBadge({ stok }: { stok: number }) {
  const lvl = stokLevel(stok);
  const cfg = {
    danger: { color: "#EF4444", bg: "rgba(239,68,68,0.10)", label: stok === 0 ? "Habis" : `${stok} sisa` },
    warning: { color: "#F59E0B", bg: "rgba(245,158,11,0.10)", label: `${stok} sisa` },
    ok: { color: "#10b981", bg: "rgba(16,185,129,0.10)", label: `${stok} sisa` },
  }[lvl];

  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: "0.72rem",
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.color}30`,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, action, onAction }: {
  icon: React.ReactNode; title: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="k-section-title">
      <div className="k-section-left">
        <div className="k-section-icon">{icon}</div>
        <span>{title}</span>
      </div>
      {action && (
        <button className="k-section-action" onClick={onAction}>
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

// ─── NAV CARD ────────────────────────────────────────────────────────────────

function NavCard({
  icon, title, desc, onClick, accent, badge,
}: {
  icon: React.ReactNode; title: string; desc: string;
  onClick: () => void; accent: string; badge?: string | number;
}) {
  return (
    <button
      className="k-nav-card"
      onClick={onClick}
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div className="k-nav-icon" style={{ color: accent, background: `${accent}18` }}>
        {icon}
      </div>
      {badge !== undefined && (
        <span className="k-nav-badge">{badge}</span>
      )}
      <div className="k-nav-body" style={{ flex: 1, minWidth: 0 }}>
        <div className="k-nav-title">{title}</div>
        <div className="k-nav-desc">{desc}</div>
      </div>
      <ArrowUpRight size={14} className="k-nav-arrow" style={{ color: accent }} />
    </button>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

function EmptyRow({ label }: { label: string }) {
  return (
    <div style={{
      padding: "20px 8px",
      textAlign: "center",
      color: "var(--k-text-faint)",
      fontSize: "0.78rem",
    }}>
      {label}
    </div>
  );
}

function ChangePasswordModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });
  const [show, setShow] = useState({
    passwordLama: false,
    passwordBaru: false,
    konfirmasiPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = [
    { key: "passwordLama", label: "Password Lama" },
    { key: "passwordBaru", label: "Password Baru" },
    { key: "konfirmasiPassword", label: "Konfirmasi Password Baru" },
  ] as const;

  async function handleSubmit() {
    setError(null);

    if (!form.passwordLama) {
      setError("Masukkan password lama.");
      return;
    }
    if (form.passwordBaru.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (form.passwordBaru !== form.konfirmasiPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await updateKantinPassword(form.passwordLama, form.passwordBaru);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || "Gagal mengubah password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="guru-password-overlay" onClick={onClose}>
      <div
        className="glass-panel guru-password-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kantin-password-title"
      >
        <div className="guru-password-icon">
          <Lock size={28} />
        </div>
        <div className="guru-password-heading">
          <h3 id="kantin-password-title">Ubah Password</h3>
          <p>Perbarui password akun kantin untuk menjaga keamanan akses transaksi.</p>
        </div>

        <div className="guru-password-form">
          {fields.map((field) => (
            <label key={field.key} className="guru-password-field">
              <span>{field.label}</span>
              <div className="guru-password-input-wrap">
                <input
                  type={show[field.key] ? "text" : "password"}
                  value={form[field.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="guru-password-input"
                />
                <button
                  type="button"
                  className="guru-password-toggle"
                  onClick={() => setShow((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                >
                  {show[field.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
          ))}
        </div>

        {error && <div className="guru-password-error">{error}</div>}

        <div className="guru-password-actions">
          <button type="button" className="guru-password-secondary" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="guru-password-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <><Loader2 size={16} className="spin" /> Menyimpan...</> : <><Lock size={16} /> Simpan Password</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function KantinDashboard() {
  const router = useRouter();
  useTheme();

  const [data, setData] = useState<KantinDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (force = false) => {
    const hitCache = isKantinDashboardCached() && !force;
    if (!hitCache) {
      if (!data) setLoading(true);
      else setRefreshing(true);
    }
    try {
      const result = await getKantinDashboard(force);
      setData(result);
      setLoadError(null);
    } catch (e) {
      console.error("Gagal load kantin dashboard:", e);
      setLoadError(e instanceof Error ? e.message : "Gagal memuat dashboard kantin.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    load(false);
    intervalRef.current = setInterval(() => load(true), 2 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading && !data) {
    return (
      <main className="dashboard-page kantin-page">
        <div className="bg-blob blob-1" /><div className="bg-blob blob-2" />
        <LoadingState message="Memuat data kantin..." minHeight="100vh" />
      </main>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (!data) {
    return (
      <main className="dashboard-page kantin-page">
        <div className="bg-blob blob-1" /><div className="bg-blob blob-2" />
        <ErrorState
          title="Dashboard Kantin Gagal Dimuat"
          message={loadError || "Data dashboard kantin belum tersedia."}
          onRetry={() => load(true)}
        />
      </main>
    );
  }

  const d = data;

  return (
    <main className="dashboard-page kantin-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => { }}
        />
      )}

      <div className="dashboard-container">

        {/* ── HEADER ── */}
        <header className="k-header glass-panel">
          <div className="k-header-brand">
            <div className="brand-logo-k">
              <BrandLogo size={28} alt="SEHATI Kantin" priority />
            </div>
            <div>
              <div className="k-brand-name">SEHATI</div>
              <div className="k-brand-role">Merchant · {d.kantinNama}</div>
            </div>
          </div>

          <div className="k-header-actions">
            <button
              className="btn-icon"
              onClick={() => setShowPasswordModal(true)}
              title="Ganti password"
            >
              <Lock size={15} />
            </button>
            {/* Refresh */}
            {/* <button
              className="btn-icon"
              onClick={() => { clearKantinDashboardCache(); load(true); }}
              disabled={refreshing}
              title="Refresh data"
            >
              <RefreshCw
                size={15}
                style={{ animation: refreshing ? "spin 0.75s linear infinite" : "none" }}
              />
            </button> */}

            {/* Logout */}
            <button
              className="btn-logout-k"
              onClick={() => { clearKantinDashboardCache(); logout(); }}
            >
              <LogOut size={14} />
              <span className="logout-label">Keluar</span>
            </button>
          </div>
        </header>

        {/* ── WELCOME + CLOCK ── */}
        <div className="k-welcome-bar">
          <div>
            <div className="k-welcome-title">Selamat datang! 👋</div>
            <div className="k-welcome-sub">Siap melayani siswa hari ini?</div>
          </div>
          <LiveClock />
        </div>

        {/* ── STAT HARIAN ── */}
        <div className="k-stats-grid">
          <StatCard
            icon={<Coins size={20} />}
            label="Pendapatan Hari Ini"
            value={formatRupiah(d.statHarian.totalPendapatan)}
            sub={`Rata-rata ${formatRupiah(d.statHarian.rataRataPerTransaksi)}/transaksi`}
            color="#F59E0B"
            delay={0}
          />
          <StatCard
            icon={<ShoppingCart size={20} />}
            label="Transaksi Hari Ini"
            value={d.statHarian.totalTransaksi}
            sub={`${d.statHarian.totalItemTerjual} item terjual`}
            color="#179EFF"
            delay={60}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Pendapatan Minggu Ini"
            value={formatRupiah(d.statMingguan.totalPendapatan)}
            sub={`${d.statMingguan.totalTransaksi} transaksi`}
            color="#10b981"
            delay={120}
          />
          {/* <StatCard
            icon={<Zap size={20} />}
            label="Koin Digunakan"
            value={d.statHarian.coinsDigunakan}
            sub="koin hari ini"
            color="#8B5CF6"
            delay={180}
          /> */}
        </div>

        {/* ── CHART MINGGUAN ── */}
        <div className="glass-panel k-chart-card">
          <SectionTitle
            icon={<BarChart2 size={15} />}
            title="Pendapatan 7 Hari Terakhir"
          />
          <MiniBarChart data={d.statMingguan.chartHarian} />
        </div>

        {/* ── AKSI UTAMA ── */}
        <div className="k-nav-grid">
          <NavCard
            icon={<ShoppingBasket size={26} />}
            title="Transaksi Baru"
            desc="Scan QR siswa untuk pembayaran"
            onClick={() => router.push("/kantin/transaksi")}
            accent="#179EFF"
          />
          <NavCard
            icon={<Package size={26} />}
            title="Kelola Produk"
            desc="Atur stok & menu"
            onClick={() => router.push("/kantin/produk")}
            accent="#10b981"
            badge={d.stokRendah.length > 0 ? d.stokRendah.length : undefined}
          />
          <NavCard
            icon={<ClipboardList size={26} />}
            title="Riwayat"
            desc="Laporan penjualan"
            onClick={() => router.push("/kantin/riwayat")}
            accent="#F59E0B"
          />
          <NavCard
            icon={<CreditCard size={26} />}
            title="Kasbon"
            desc="Kelola tagihan & utang siswa"
            onClick={() => router.push("/kantin/kasbon")}
            accent="#8B5CF6"
          />
        </div>

        {/* ── TRANSAKSI TERBARU ── */}
        <div className="glass-panel k-list-card">
          <SectionTitle
            icon={<ClipboardList size={15} />}
            title="Transaksi Terbaru"
            action="Lihat Semua"
            onAction={() => router.push("/kantin/riwayat")}
          />
          <div className="k-list">
            {d.transaksiTerbaru.length > 0
              ? d.transaksiTerbaru.slice(0, 5).map((t) => (
                <TransaksiRow key={t.id} t={t} />
              ))
              : <EmptyRow label="Belum ada transaksi hari ini" />
            }
          </div>
        </div>

        {/* ── PRODUK TERLARIS + STOK RENDAH ── */}
        <div className="k-bottom-grid">

          <div className="glass-panel k-list-card">
            <SectionTitle
              icon={<Star size={15} />}
              title="Produk Terlaris"
              action="Kelola"
              onAction={() => router.push("/kantin/produk")}
            />
            <div className="k-list">
              {d.produkTerlaris.length > 0
                ? d.produkTerlaris.map((p, i) => (
                  <ProdukRow key={p.produkId} p={p} rank={i + 1} />
                ))
                : <EmptyRow label="Belum ada data penjualan" />
              }
            </div>
          </div>

          <div className="glass-panel k-list-card">
            <SectionTitle
              icon={<AlertTriangle size={15} />}
              title="Stok Perlu Diisi"
              action={d.stokRendah.length > 0 ? "Kelola" : undefined}
              onAction={() => router.push("/kantin/produk")}
            />
            <div className="k-list">
              {d.stokRendah.length > 0
                ? d.stokRendah.map((p) => (
                  <div key={p.id} className="stok-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="stok-nama">{p.nama}</div>
                      <div className="stok-kat">{p.kategori}</div>
                    </div>
                    <StokBadge stok={p.stok} />
                  </div>
                ))
                : <EmptyRow label="Semua stok aman 🎉" />
              }
            </div>
          </div>

        </div>

        <div style={{ height: 32 }} />
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}