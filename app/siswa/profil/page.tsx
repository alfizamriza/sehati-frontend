"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Coins, Zap, Trophy, Droplets, ShieldAlert,
  Camera, Lock, Eye, EyeOff, X, CheckCircle2,
  ChevronRight, Loader2, LogOut, Award,
  AlertTriangle, User,
} from "lucide-react";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";
import { ErrorState } from "@/components/common/AsyncState";
import BrandLogo from "@/components/common/BrandLogo";
import { supabase } from "@/lib/supabase-client";
import api from "@/lib/api";
import {
  getProfil, updatePassword,
  clearProfilCache, isProfilCached,
  formatJoinDate, getBadgeStyle,
  type ProfilData, type ProfilAchievement, type ProfilVoucher,
} from "@/lib/services/siswa";
import { logout } from "@/lib/services/shared";
import { clearDashboardCache } from "@/lib/services/siswa";
import "../siswa-tokens.css";
import "./profil.css";
import SehatiLoadingScreen from "@/components/siswa/SehatiLoadingScreen";

// ─── MODAL SHEET ──────────────────────────────────────────────────────────────
function ModalSheet({
  children, onClose, title, accentColor,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  accentColor: string;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="profil-modal-overlay" onClick={onClose}>
      <div
        className="profil-modal-sheet"
        style={{ borderTop: `3px solid ${accentColor}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profil-modal-drag" />
        <button className="profil-modal-close" onClick={onClose}>
          <X size={15} />
        </button>
        <div className="profil-modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function AvatarDisplay({
  fotoUrl, nama, size = 80, onClick,
}: {
  fotoUrl: string | null; nama: string; size?: number; onClick?: () => void;
}) {
  const initials = nama
    .split(" ").slice(0, 2)
    .map((w) => w[0] ?? "").join("").toUpperCase();

  return (
    <div
      className="profil-avatar-circle"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {fotoUrl ? (
        <img
          src={fotoUrl}
          alt={nama}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span
          className="profil-avatar-initials"
          style={{ fontSize: size * 0.36 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div className="profil-stat-card">
      <div className="profil-stat-icon" style={{ color }}>{icon}</div>
      <div className="profil-stat-value" style={{ color }}>{value}</div>
      <div className="profil-stat-label">{label}</div>
    </div>
  );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="profil-section-title">
      <span className="profil-section-title-icon">{icon}</span>
      <span className="profil-section-title-text">{title}</span>
    </div>
  );
}

// ─── ACHIEVEMENT BADGE ────────────────────────────────────────────────────────
function AchievementBadge({ ach }: { ach: ProfilAchievement }) {
  const s = getBadgeStyle(ach.badgeColor);
  return (
    <div className="profil-ach-item">
      <div
        className="profil-ach-icon-box"
        style={{ background: s.bg, borderColor: s.border }}
      >
        {ach.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="profil-ach-name" style={{ color: s.text }}>{ach.nama}</div>
        {ach.deskripsi && (
          <div className="profil-ach-desc">{ach.deskripsi}</div>
        )}
      </div>
      <div className="profil-ach-date">
        {new Date(ach.unlockedAt).toLocaleDateString("id-ID", {
          day: "numeric", month: "short",
        })}
      </div>
    </div>
  );
}

// ─── VOUCHER BADGE ────────────────────────────────────────────────────────────
function VoucherBadge({ voucher }: { voucher: ProfilVoucher }) {
  const STATUS_CFG: Record<string, { label: string; bg: string; border: string; text: string }> = {
    available: { label: "Tersedia", bg: "var(--status-hadir-bg)", border: "var(--status-hadir-border)", text: "var(--status-hadir-text)" },
    used: { label: "Terpakai", bg: "var(--color-primary-soft)", border: "var(--border-primary)", text: "var(--color-primary)" },
    expired: { label: "Kedaluwarsa", bg: "var(--status-pel-bg)", border: "var(--status-pel-border)", text: "var(--status-pel-text)" },
  };
  const sc = STATUS_CFG[voucher.status] ?? STATUS_CFG.available;
  const nominalLabel =
    voucher.tipeVoucher === "percentage"
      ? `${voucher.nominalVoucher}%`
      : `Rp ${voucher.nominalVoucher.toLocaleString("id-ID")}`;
  const formatTanggal = (str: string) =>
    new Date(str).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="profil-voucher-item">
      <div className="profil-voucher-top">
        <div style={{ minWidth: 0 }}>
          <div className="profil-voucher-name">{voucher.namaVoucher}</div>
          <div className="profil-voucher-kode">{voucher.kodeVoucher}</div>
        </div>
        <div
          className="profil-voucher-status"
          style={{ background: sc.bg, borderColor: sc.border, color: sc.text }}
        >
          {sc.label}
        </div>
      </div>
      <div className="profil-voucher-bottom">
        <div className="profil-voucher-nominal">{nominalLabel}</div>
        <div className="profil-voucher-date">
          {formatTanggal(voucher.tanggalBerlaku)} – {formatTanggal(voucher.tanggalBerakhir)}
        </div>
      </div>
    </div>
  );
}

// ─── MENU ITEM ────────────────────────────────────────────────────────────────
function MenuItem({ icon, label, sublabel, onClick, danger = false }: {
  icon: React.ReactNode; label: string; sublabel?: string;
  onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`profil-menu-item ${danger ? "danger" : ""}`}
    >
      <div className="profil-menu-icon-box">{icon}</div>
      <div className="profil-menu-item-info">
        <div className="profil-menu-item-label">{label}</div>
        {sublabel && <div className="profil-menu-item-sub">{sublabel}</div>}
      </div>
      <ChevronRight size={15} className="profil-menu-chevron" />
    </button>
  );
}

// ─── MODAL GANTI FOTO ─────────────────────────────────────────────────────────
function ModalGantiFoto({
  fotoUrl, nama, nis, onClose, onSuccess,
}: {
  fotoUrl: string | null; nama: string; nis: string;
  onClose: () => void; onSuccess: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setErr("Ukuran file maksimal 2MB"); return; }
    if (!f.type.startsWith("image/")) { setErr("Hanya file gambar yang diizinkan"); return; }
    setErr(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${nis}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("profil-siswa")
        .upload(filename, file, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: publicData } = supabase.storage
        .from("profil-siswa")
        .getPublicUrl(filename);

      await api.patch("/profil/foto", { fotoUrl: publicData.publicUrl });
      onSuccess(publicData.publicUrl);
    } catch (e: any) {
      setErr(e.message || "Gagal upload foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ModalSheet onClose={onClose} title="Ganti Foto Profil" accentColor="var(--color-primary)">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div className="profil-avatar-wrap">
          <AvatarDisplay fotoUrl={preview ?? fotoUrl} nama={nama} size={96} />
          <button
            className="profil-avatar-edit-btn"
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={14} color="#fff" />
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button
        className="profil-btn-pick-photo"
        onClick={() => fileRef.current?.click()}
      >
        <Camera size={16} />
        {preview ? "Pilih foto lain" : "Pilih foto dari galeri"}
      </button>

      {err && (
        <div className="profil-error-alert">
          <AlertTriangle size={14} style={{ color: "var(--status-pel-text)", flexShrink: 0, marginTop: 1 }} />
          <span className="profil-error-alert-text">{err}</span>
        </div>
      )}

      <div className="profil-upload-hint">Format: JPG, PNG · Maks 2MB</div>

      <button
        className="profil-btn-primary"
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? (
          <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Mengupload...</>
        ) : "Simpan Foto"}
      </button>
    </ModalSheet>
  );
}

// ─── MODAL GANTI PASSWORD ─────────────────────────────────────────────────────
function ModalGantiPassword({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ lama: "", baru: "", konfirmasi: "" });
  const [show, setShow] = useState({ lama: false, baru: false, konfirmasi: false });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setErr(null);
    if (!form.lama) { setErr("Masukkan password lama"); return; }
    if (form.baru.length < 6) { setErr("Password baru minimal 6 karakter"); return; }
    if (form.baru !== form.konfirmasi) { setErr("Konfirmasi password tidak cocok"); return; }
    setLoading(true);
    try {
      await updatePassword(form.lama, form.baru);
      setSuccess(true);
    } catch (e: any) {
      setErr(e.message || "Gagal mengubah password");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <ModalSheet onClose={onClose} title="Ganti Password" accentColor="var(--status-hadir-text)">
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div className="profil-success-icon-wrap">
            <CheckCircle2 size={28} style={{ color: "var(--status-hadir-text)" }} />
          </div>
          <div className="profil-confirm-title">Password Berhasil Diubah</div>
          <div className="profil-confirm-sub">
            Gunakan password baru untuk login berikutnya.
          </div>
          <button className="profil-btn-primary" onClick={onClose}>Tutup</button>
        </div>
      </ModalSheet>
    );
  }

  type FK = "lama" | "baru" | "konfirmasi";
  const fields: { key: FK; label: string; placeholder: string }[] = [
    { key: "lama", label: "Password Lama", placeholder: "Masukkan password lama" },
    { key: "baru", label: "Password Baru", placeholder: "Minimal 6 karakter" },
    { key: "konfirmasi", label: "Konfirmasi Password Baru", placeholder: "Ulangi password baru" },
  ];

  return (
    <ModalSheet onClose={onClose} title="Ganti Password" accentColor="#8B5CF6">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label className="profil-field-label">{f.label}</label>
            <div className="profil-input-wrap">
              <input
                className="profil-input"
                type={show[f.key] ? "text" : "password"}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                className="profil-input-eye"
                onClick={() => setShow((p) => ({ ...p, [f.key]: !p[f.key] }))}
              >
                {show[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {err && (
        <div className="profil-error-alert">
          <AlertTriangle size={14} style={{ color: "var(--status-pel-text)", flexShrink: 0, marginTop: 1 }} />
          <span className="profil-error-alert-text">{err}</span>
        </div>
      )}

      <button
        className="profil-btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{ background: loading ? undefined : "#1878eeff", boxShadow: loading ? undefined : "0 4px 14px rgba(139,92,246,0.35)" }}
      >
        {loading ? (
          <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Menyimpan...</>
        ) : "Simpan Password"}
      </button>
    </ModalSheet>
  );
}

// ─── MODAL LOGOUT ─────────────────────────────────────────────────────────────
function ModalLogout({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  function handleLogout() {
    setLoading(true);
    clearDashboardCache();
    clearProfilCache();
    logout();
  }
  return (
    <ModalSheet onClose={onClose} title="Keluar" accentColor="var(--status-pel-text)">
      <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
        <div className="profil-logout-icon-wrap">
          <LogOut size={24} style={{ color: "var(--status-pel-text)" }} />
        </div>
        <div className="profil-confirm-title">Yakin ingin keluar?</div>
        <div className="profil-confirm-sub">
          Kamu harus login lagi untuk mengakses aplikasi.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="profil-btn-secondary" onClick={onClose}>Batal</button>
          <button
            className="profil-btn-danger"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} />
              : <LogOut size={14} />
            }
            Keluar
          </button>
        </div>
      </div>
    </ModalSheet>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProfilSiswaPage() {
  const [profilData, setProfilData] = useState<ProfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalFoto, setModalFoto] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modalLogout, setModalLogout] = useState(false);

  const load = useCallback(async (force = false) => {
    const hitCache = isProfilCached() && !force;
    if (!hitCache) {
      if (!profilData) setLoading(true);
      else setRefreshing(true);
    }
    try {
      const result = await getProfil(force);
      setProfilData(result);
      setLoadError(null);
    } catch (e) {
      console.error("Gagal load profil:", e);
      setLoadError(e instanceof Error ? e.message : "Gagal memuat profil.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profilData]);

  useEffect(() => { load(false); }, []); // eslint-disable-line

  // ── Loading ──
  if (loading && !profilData) {
    return <SehatiLoadingScreen />;
  }
  // if (loading && !profilData) {
  //   return (
  //     <main className="dashboard-page">
  //       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
  //         <Loader2 size={32} style={{ color: "var(--color-primary)", animation: "spin 0.75s linear infinite" }} />
  //         <span style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>Memuat profil...</span>
  //       </div>
  //     </main>
  //   );
  // }

  const { profil, achievements = [], vouchers = [] } = profilData ?? { profil: null, achievements: [], vouchers: [] };

  // ── Error ──
  if (!profil) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <ErrorState
            title="Profil Siswa Gagal Dimuat"
            message={loadError || "Data profil tidak tersedia."}
            onRetry={() => load(true)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      {/* ── Modals ── */}
      {modalFoto && (
        <ModalGantiFoto
          fotoUrl={profil.fotoUrl} nama={profil.nama} nis={profil.nis}
          onClose={() => setModalFoto(false)}
          onSuccess={(url) => {
            setProfilData((prev) =>
              prev ? { ...prev, profil: { ...prev.profil, fotoUrl: url } } : prev
            );
            setModalFoto(false);
          }}
        />
      )}
      {modalPassword && <ModalGantiPassword onClose={() => setModalPassword(false)} />}
      {modalLogout && <ModalLogout onClose={() => setModalLogout(false)} />}

      <div className="dashboard-container">

        {/* Header */}
        <header className="dash-header">
          <div className="brand">
            <div className="brand-logo">
              <BrandLogo size={26} alt="SEHATI Profil" priority />
            </div>
            <div className="brand-text">
              <span className="brand-name">Profil</span>
              <span className="brand-role">Akun SEHATI-mu</span>
            </div>
          </div>
        </header>

        {/* Refreshing bar */}
        {refreshing && (
          <div className="profil-refreshing-bar">
            <Loader2 size={11} style={{ animation: "spin 0.75s linear infinite" }} />
            Memperbarui data...
          </div>
        )}

        {/* ── HERO ── */}
        <div className="glass-panel profil-hero">
          <div className="profil-avatar-wrap">
            <AvatarDisplay fotoUrl={profil.fotoUrl} nama={profil.nama} size={90} />
            <button
              className="profil-avatar-edit-btn"
              onClick={() => setModalFoto(true)}
            >
              <Camera size={14} color="#fff" />
            </button>
          </div>

          <div className="profil-hero-name">{profil.nama}</div>
          <div className="profil-hero-nis">NIS: {profil.nis}</div>

          {profil.kelas !== "-" && (
            <div className="profil-kelas-chip">{profil.kelas}</div>
          )}

          <div className="profil-join-date">
            Bergabung {formatJoinDate(profil.joinDate)}
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="profil-stats-grid">
          <StatCard icon={<Coins size={17} />} label="Coins" value={profil.coins} color="var(--score-color)" />
          <StatCard icon={<Zap size={17} />} label="Streak" value={`${profil.streak}h`} color="var(--status-hadir-text)" />
          <StatCard icon={<Trophy size={17} />} label="Rank Sekolah" value={`#${profil.rankingSekolah}`} color="var(--color-primary)" />
          <StatCard icon={<User size={17} />} label="Rank Kelas" value={`#${profil.rankingKelas}`} color="#8B5CF6" />
          <StatCard icon={<Droplets size={17} />} label="Tumbler" value={profil.totalTumbler} color="#06b6d4" />
          <StatCard icon={<ShieldAlert size={17} />} label="Pelanggaran" value={profil.totalPelanggaran} color="var(--status-pel-text)" />
        </div>

        {/* ── ACHIEVEMENTS ── */}
        <SectionTitle icon={<Award size={16} />} title="Pencapaian" />
        {achievements.length === 0 ? (
          <div className="profil-empty-box">
            <div className="profil-empty-icon">🏅</div>
            <div className="profil-empty-text">Belum ada pencapaian. Terus semangat!</div>
          </div>
        ) : (
          <div className="profil-ach-list">
            {achievements.map((ach) => <AchievementBadge key={ach.id} ach={ach} />)}
          </div>
        )}

        {/* ── VOUCHER ── */}
        <SectionTitle icon={<Trophy size={16} />} title="Voucher Saya" />
        {vouchers.length === 0 ? (
          <div className="profil-empty-box">
            <div className="profil-empty-icon">🎟️</div>
            <div className="profil-empty-text">Belum ada voucher.</div>
          </div>
        ) : (
          <div className="profil-voucher-list">
            {vouchers.map((v) => <VoucherBadge key={v.id} voucher={v} />)}
          </div>
        )}

        {/* ── INFO AKUN ── */}
        <SectionTitle icon={<User size={16} />} title="Informasi Akun" />
        <div className="profil-info-table">
          {([
            { label: "NIS", value: profil.nis },
            { label: "Nama", value: profil.nama },
            { label: "Kelas", value: profil.kelas !== "-" ? profil.kelas : "-" },
          ] as const).map((row) => (
            <div key={row.label} className="profil-info-row">
              <span className="profil-info-label">{row.label}</span>
              <span className="profil-info-value">{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── KEAMANAN ── */}
        <SectionTitle icon={<Lock size={16} />} title="Keamanan & Akun" />
        <div className="profil-menu-list">
          <MenuItem
            icon={<Camera size={16} />}
            label="Ganti Foto Profil"
            sublabel="JPG atau PNG, maks 2MB"
            onClick={() => setModalFoto(true)}
          />
          <MenuItem
            icon={<Lock size={16} />}
            label="Ganti Password"
            sublabel="Ubah kata sandi akun kamu"
            onClick={() => setModalPassword(true)}
          />
          <MenuItem
            icon={<LogOut size={16} />}
            label="Keluar"
            sublabel="Logout dari akun ini"
            onClick={() => setModalLogout(true)}
            danger
          />
        </div>

      </div>

      <BottomNavSiswa />
    </main>
  );
}
