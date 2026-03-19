"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Coins, Zap, Trophy, Droplets, ShieldAlert,
  Camera, Lock, Eye, EyeOff, X, CheckCircle2,
  ChevronRight, Loader2, LogOut, Award,
  AlertTriangle, User, MessageSquarePlus, Sparkles, Trash2,
} from "lucide-react";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";
import { ErrorState } from "@/components/common/AsyncState";
import BrandLogo from "@/components/common/BrandLogo";
import {
  getProfil, updatePassword,
  clearProfilCache, isProfilCached,
  formatJoinDate, getBadgeStyle,
  type ProfilData, type ProfilAchievement, type ProfilVoucher, type ProfilShowcaseNote,
  saveShowcaseNote, deleteShowcaseNote,
} from "@/lib/services/siswa";
import { logout } from "@/lib/services/shared";
import { clearDashboardCache } from "@/lib/services/siswa";
import ModalGantiFoto from "@/components/siswa/Modalgantifoto";
import { analyzeShowcaseNote } from "@/lib/utils/showcase-note-moderation";
import "../siswa-tokens.css";
import "./profil.css";
import "./profil-foto.css";
import SehatiLoadingScreen from "@/components/siswa/SehatiLoadingScreen";
import "./profil-showcase.css";

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
      day: "2-digit", month: "long", year: "numeric",
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

export function ShowcaseCard({
  showcaseNote,
  onEdit,
}: {
  showcaseNote: ProfilShowcaseNote | null;
  onEdit: () => void;
}) {
  const badgeStyle = getBadgeStyle(showcaseNote?.achievementBadgeColor ?? "blue");
  const createdLabel = showcaseNote?.createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(showcaseNote.createdAt))
    : "Aktif";

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!showcaseNote) {
    return (
      <button
        className="profil-showcase-card profil-showcase-empty"
        onClick={onEdit}
      >
        <div className="profil-showcase-empty-icon">
          <MessageSquarePlus size={20} />
        </div>
        <div className="profil-showcase-empty-copy">
          <div className="profil-showcase-title">
            Belum ada catatan pencapaian
          </div>
          <div className="profil-showcase-subtitle">
            Pilih achievement & tulis caption buat tampil di leaderboard!
          </div>
        </div>
      </button>
    );
  }

  // ── Filled state ───────────────────────────────────────────────────────────
  return (
    <button className="profil-showcase-card" onClick={onEdit}>
      {/* Notification-style header row */}
      <div className="profil-showcase-notif-row">
        <div className="profil-showcase-notif-icon">
          {showcaseNote.achievementIcon}
        </div>
        <div className="profil-showcase-notif-text">
          <div className="profil-showcase-notif-title">Catatan Aktif</div>
          <div className="profil-showcase-notif-sub">
            Tampil di leaderboard kamu. Untuk ganti, hapus dulu.
          </div>
        </div>
        <div className="profil-showcase-notif-time">{createdLabel}</div>
      </div>

      {/* Inner bubble */}
      <div className="profil-showcase-bubble">
        <div
          className="profil-showcase-achievement"
          style={{
            background: badgeStyle.bg,
            borderColor: badgeStyle.border,
            color: badgeStyle.text,
          }}
        >
          <span>{showcaseNote.achievementIcon}</span>
          <span>{showcaseNote.achievementName}</span>
        </div>
        <div className="profil-showcase-message">
          {showcaseNote.noteText ||
            "Achievement ini sedang dipamerkan di leaderboard."}
        </div>
      </div>

      {/* Footer */}
      <div className="profil-showcase-meta">
        <div className="profil-showcase-meta-left">
          <span className="profil-showcase-live-dot" />
          Aktif di leaderboard
        </div>
        <span className="profil-showcase-edit-tag">🗑 Hapus dulu untuk buat baru</span>
      </div>
    </button>
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
        style={{
          background: loading ? undefined : "#1878eeff",
          boxShadow: loading ? undefined : "0 4px 14px rgba(139,92,246,0.35)",
        }}
      >
        {loading
          ? <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Menyimpan...</>
          : "Simpan Password"}
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
              : <LogOut size={14} />}
            Keluar
          </button>
        </div>
      </div>
    </ModalSheet>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export function ModalShowcaseNote({
  achievements,
  currentNote,
  onClose,
  onSaved,
  // ModalSheet di-pass sebagai prop supaya komponen ini tidak perlu tahu
  // implementasinya — tinggal pakai yang sudah ada di profil.tsx
  ModalSheetComponent,
}: {
  achievements: ProfilAchievement[];
  currentNote: ProfilShowcaseNote | null;
  onClose: () => void;
  onSaved: (note: ProfilShowcaseNote | null) => void;
  // Jika ingin lebih mudah, hapus prop ini dan import ModalSheet langsung
  // dari profil.tsx setelah kamu pindahkan ke file terpisah.
  ModalSheetComponent?: React.ComponentType<{
    children: React.ReactNode;
    onClose: () => void;
    title: string;
    accentColor: string;
  }>;
}) {
  const Sheet = ModalSheetComponent as any; // fallback — lihat catatan di bawah

  const [selectedAchievementId, setSelectedAchievementId] = useState<number>(
    currentNote?.achievementId ?? achievements[0]?.id ?? 0
  );
  const [noteText, setNoteText] = useState(currentNote?.noteText ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const moderation = useMemo(() => analyzeShowcaseNote(noteText), [noteText]);
  const blockedTerms = moderation.matches;
  const hasBlockedTerms = moderation.hasProfanity;
  const severityLabel =
    moderation.severityScore >= 0.75
      ? "tinggi"
      : moderation.severityScore >= 0.45
        ? "sedang"
        : "ringan";

  const selectedAch =
    achievements.find((a) => a.id === selectedAchievementId) ?? achievements[0];
  const badgeStyle = getBadgeStyle(selectedAch?.badgeColor ?? "blue");
  const isReadonly = Boolean(currentNote);

  async function handleSave() {
    if (!selectedAchievementId) {
      setErr("Pilih achievement terlebih dahulu.");
      return;
    }
    if (hasBlockedTerms) {
      setErr("Catatan mengandung kata yang tidak pantas. Silakan perbaiki dulu.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const saved = await saveShowcaseNote({
        achievementId: selectedAchievementId,
        noteText: noteText.trim() || null,
      });
      onSaved({
        id: saved.id,
        achievementId: saved.achievementId,
        achievementName: saved.achievementName,
        achievementIcon: saved.achievementIcon,
        achievementBadgeColor: saved.achievementBadgeColor,
        noteText: saved.noteText,
        expiresAt: saved.expiresAt,
        createdAt: saved.createdAt,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Gagal menyimpan catatan pencapaian.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setErr(null);
    try {
      await deleteShowcaseNote();
      onSaved(null);
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Gagal menghapus catatan pencapaian.");
    } finally {
      setDeleting(false);
    }
  }

  const modalContent = (
    <>
      {achievements.length === 0 && !isReadonly ? (
        <div className="profil-empty-box">
          <div className="profil-empty-icon">🏅</div>
          <div className="profil-empty-text">
            Belum ada achievement yang bisa dipamerkan.
          </div>
        </div>
      ) : isReadonly ? (
        <div className="profil-showcase-form">
          <div className="profil-showcase-preview-wrap">
            <span className="profil-showcase-preview-label">Catatan Aktif</span>
            <div className="profil-showcase-preview-bubble">
              <div
                className="profil-showcase-achievement"
                style={{
                  background: getBadgeStyle(currentNote?.achievementBadgeColor ?? "blue").bg,
                  borderColor: getBadgeStyle(currentNote?.achievementBadgeColor ?? "blue").border,
                  color: getBadgeStyle(currentNote?.achievementBadgeColor ?? "blue").text,
                }}
              >
                <span>{currentNote?.achievementIcon}</span>
                <span>{currentNote?.achievementName}</span>
              </div>
              <div className="profil-showcase-preview-msg has-text">
                {currentNote?.noteText || "Achievement ini sedang dipamerkan di leaderboard."}
              </div>
            </div>
          </div>

          <div className="profil-error-alert" style={{ background: "var(--surface-soft)" }}>
            <AlertTriangle
              size={14}
              style={{
                color: "var(--primary)",
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <span className="profil-error-alert-text">
              Catatan yang sudah dibuat tidak bisa diedit. Hapus catatan ini dulu jika ingin membuat catatan baru.
            </span>
          </div>

          {err && (
            <div className="profil-error-alert">
              <AlertTriangle
                size={14}
                style={{
                  color: "var(--status-pel-text)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <span className="profil-error-alert-text">{err}</span>
            </div>
          )}

          <div className="profil-showcase-actions">
            <button className="profil-btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button
              className="profil-btn-danger profil-btn-danger-inline"
              onClick={handleDelete}
              disabled={loading || deleting}
            >
              {deleting ? (
                <Loader2
                  size={14}
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
              ) : (
                <Trash2 size={14} />
              )}
              Hapus Catatan
            </button>
          </div>
        </div>
      ) : (
        <div className="profil-showcase-form">
          {/* ── Achievement chips ── */}
          <div>
            <label className="profil-field-label">Pilih Achievement</label>
            <div className="profil-showcase-chips">
              {achievements.map((ach) => (
                <button
                  key={ach.id}
                  className={`profil-showcase-chip${ach.id === selectedAchievementId ? " active" : ""
                    }`}
                  onClick={() => setSelectedAchievementId(ach.id)}
                  type="button"
                >
                  {ach.icon} {ach.nama}
                </button>
              ))}
            </div>
          </div>

          {/* ── Live preview ── */}
          <div className="profil-showcase-preview-wrap">
            <span className="profil-showcase-preview-label">Preview</span>
            <div className="profil-showcase-preview-bubble">
              {selectedAch && (
                <div
                  className="profil-showcase-achievement"
                  style={{
                    background: badgeStyle.bg,
                    borderColor: badgeStyle.border,
                    color: badgeStyle.text,
                  }}
                >
                  <span>{selectedAch.icon}</span>
                  <span>{selectedAch.nama}</span>
                </div>
              )}
              <div
                className={`profil-showcase-preview-msg${noteText ? " has-text" : ""
                  }`}
              >
                {noteText || "Caption kamu muncul di sini..."}
              </div>
            </div>
          </div>

          {/* ── Caption textarea ── */}
          <div>
            <label className="profil-field-label">
              Caption singkat (max 100 karakter)
            </label>
            <textarea
              className="profil-textarea"
              placeholder="Contoh: Akhirnya tembus top 3! Semangat terus 🔥"
              maxLength={100}
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value.slice(0, 100));
                if (err) setErr(null);
              }}
            />
            <div className="profil-textarea-meta">{noteText.length}/100</div>
          </div>

          {hasBlockedTerms && (
            <div className="profil-error-alert">
              <AlertTriangle
                size={14}
                style={{
                  color: "var(--status-pel-text)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <span className="profil-error-alert-text">
                Catatan terdeteksi mengandung kata yang tidak pantas. Ubah caption sebelum disimpan.
                {blockedTerms.length > 0 && (
                  <>
                    {" "}Kata terdeteksi: <strong>{blockedTerms.join(", ")}</strong>.
                  </>
                )}
                {" "}Severity: <strong>{severityLabel}</strong>
                {moderation.categories.length > 0 && (
                  <>
                    {" "}• kategori: <strong>{moderation.categories.join(", ")}</strong>
                  </>
                )}
              </span>
            </div>
          )}

          {/* ── Error ── */}
          {err && (
            <div className="profil-error-alert">
              <AlertTriangle
                size={14}
                style={{
                  color: "var(--status-pel-text)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <span className="profil-error-alert-text">{err}</span>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="profil-showcase-actions">
            <button className="profil-btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button
              className="profil-btn-primary"
              onClick={handleSave}
              disabled={loading || deleting}
            >
              {loading ? (
                <>
                  <Loader2
                    size={16}
                    style={{ animation: "spin 0.7s linear infinite" }}
                  />
                  Menyimpan...
                </>
              ) : (
                "✨ Simpan Catatan"
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Render dengan ModalSheet yang sudah ada di profil.tsx
  // Karena ModalSheet ada di file yang sama, langsung pakai saja.
  // Hapus prop ModalSheetComponent dan uncomment baris di bawah
  // jika kamu pindahkan komponen ini ke file terpisah:
  //
  //   import { ModalSheet } from "./profil";  ← export ModalSheet dulu
  //
  return (
    <Sheet
      onClose={onClose}
      title="Catatan Pencapaian"
      accentColor="var(--color-primary)"
    >
      {modalContent}
    </Sheet>
  );
}

export default function ProfilSiswaPage() {
  const [profilData, setProfilData] = useState<ProfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalFoto, setModalFoto] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modalLogout, setModalLogout] = useState(false);
  const [modalShowcase, setModalShowcase] = useState(false);

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

  if (loading && !profilData) return <SehatiLoadingScreen />;

  const { profil, achievements = [], vouchers = [], showcaseNote = null } =
    profilData ?? { profil: null, achievements: [], vouchers: [], showcaseNote: null };

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
          fotoUrl={profil.fotoUrl}
          nama={profil.nama}
          nis={profil.nis}
          onClose={() => setModalFoto(false)}
          onSuccess={(url) => {
            setProfilData((prev) =>
              prev ? { ...prev, profil: { ...prev.profil, fotoUrl: url } } : prev,
            );
            setModalFoto(false);
          }}
        />
      )}
      {modalPassword && <ModalGantiPassword onClose={() => setModalPassword(false)} />}
      {modalLogout && <ModalLogout onClose={() => setModalLogout(false)} />}
      {modalShowcase && (
        <ModalShowcaseNote
          achievements={achievements}
          currentNote={showcaseNote}
          onClose={() => setModalShowcase(false)}
          ModalSheetComponent={ModalSheet}
          onSaved={(nextNote) => {
            setProfilData((prev) => (prev ? { ...prev, showcaseNote: nextNote } : prev));
          }}
        />
      )}

      <div className="dashboard-container">

        {/* ── Header ── */}
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

        {/* ── Refreshing bar ── */}
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
        <SectionTitle icon={<MessageSquarePlus size={16} />} title="Catatan Pencapaian" />
        <ShowcaseCard
          showcaseNote={showcaseNote}
          onEdit={() => setModalShowcase(true)}
        />

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
            sublabel="Crop & kompres otomatis"
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
