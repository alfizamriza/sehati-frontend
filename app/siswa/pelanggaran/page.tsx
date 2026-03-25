"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TriangleAlert,
  ChevronDown,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Tag,
  Coins,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Clock3,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  getKelasList,
  getSiswaByKelas,
  getJenisPelanggaranAktif,
  getRiwayatPelanggaranSaya,
  createPelanggaran,
  deletePelanggaran,
  updateBuktiFoto,
  compressImage,
  type KelasItem,
  type SiswaItem,
  type JenisPelanggaranItem,
  type RiwayatPelanggaranGuruItem,
} from "@/lib/services/laporan-pelanggaran.service";
import { hasPermission } from "@/lib/services/auth.service";
import { uploadBuktiPelanggaran } from "@/lib/supabase-client";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";
import "../siswa.css";
import "./pelanggaran.css";
import SehatiLoadingScreen from "@/components/siswa/SehatiLoadingScreen";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ActiveTab = "lapor" | "riwayat";

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const KATEGORI_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  ringan: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  sedang: { color: "#F97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)" },
  berat: { color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
};

const STATUS_CONFIG = {
  pending: {
    label: "Menunggu",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    icon: Clock3,
  },
  approved: {
    label: "Disetujui",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Ditolak",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    icon: XCircle,
  },
} as const;

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function formatTanggal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/* ─────────────────────────────────────────
   Page Component
───────────────────────────────────────── */
export default function SiswaPelanggaranPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  /* permissions & loading */
  const [canManagePelanggaran] = useState(() => hasPermission("manage_pelanggaran"));
  const [initLoading, setInitLoading] = useState(true);
  const [siswaLoading, setSiswaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("lapor");

  /* data */
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaItem[]>([]);
  const [jenisList, setJenisList] = useState<JenisPelanggaranItem[]>([]);
  const [riwayatList, setRiwayatList] = useState<RiwayatPelanggaranGuruItem[]>([]);

  /* form state */
  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaItem | null>(null);
  const [selectedJenis, setSelectedJenis] = useState<JenisPelanggaranItem | null>(null);
  const [catatan, setCatatan] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  /* ── toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ── initial data load ── */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!canManagePelanggaran) {
        if (!cancelled) setInitLoading(false);
        return;
      }
      try {
        const [kelas, jenis, riwayat] = await Promise.all([
          getKelasList(),
          getJenisPelanggaranAktif(),
          getRiwayatPelanggaranSaya(20),
        ]);
        if (cancelled) return;
        setKelasList(kelas);
        setJenisList(jenis);
        setRiwayatList(riwayat);
      } catch (error: unknown) {
        if (cancelled) return;
        setToast({
          type: "error",
          message: error instanceof Error ? error.message : "Gagal memuat data pelanggaran",
        });
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [canManagePelanggaran]);

  /* ── computed stats ── */
  const statPending = riwayatList.filter(r => r.status === "pending").length;
  const statApproved = riwayatList.filter(r => r.status === "approved").length;
  const statRejected = riwayatList.filter(r => r.status === "rejected").length;

  /* ─────────── handlers ─────────── */
  async function loadRiwayat(forceRefresh = false) {
    setRiwayatLoading(true);
    try {
      const data = await getRiwayatPelanggaranSaya(20, forceRefresh);
      setRiwayatList(data);
    } catch (error: unknown) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal memuat riwayat laporan",
      });
    } finally {
      setRiwayatLoading(false);
    }
  }

  async function handleKelasChange(kelasId: number) {
    const kelas = kelasList.find(item => item.id === kelasId) ?? null;
    setSelectedKelas(kelas);
    setSelectedSiswa(null);
    setSiswaList([]);
    if (!kelas) return;

    setSiswaLoading(true);
    try {
      const siswa = await getSiswaByKelas(kelas.id, true);
      setSiswaList(siswa);
    } catch (error: unknown) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal memuat daftar siswa",
      });
    } finally {
      setSiswaLoading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressImage(file, 2);
      setFotoFile(compressed);

      const reader = new FileReader();
      reader.onload = (e) => {
        setFotoPreview(typeof e.target?.result === "string" ? e.target.result : null);
      };
      reader.readAsDataURL(compressed);

      if (compressed.size < file.size) {
        const before = (file.size / 1024).toFixed(0);
        const after = (compressed.size / 1024).toFixed(0);
        setToast({ type: "success", message: `Gambar dikompres: ${before} KB → ${after} KB` });
      }
    } catch (error: unknown) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal memproses gambar",
      });
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setCompressing(false);
    }
  }

  function removePhoto() {
    setFotoFile(null);
    setFotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSiswa || !selectedJenis) return;

    setSubmitting(true);
    try {
      const result = await createPelanggaran({
        nis: selectedSiswa.nis,
        jenis_pelanggaran_id: selectedJenis.id,
        catatan: catatan.trim() || undefined,
      });

      if (fotoFile) {
        try {
          const buktiUrl = await uploadBuktiPelanggaran(
            fotoFile,
            result.data.id,
            `${selectedSiswa.nis}-${selectedSiswa.nama}`,
          );
          await updateBuktiFoto(result.data.id, buktiUrl);
        } catch {
          setToast({ type: "error", message: "Laporan tersimpan, tapi upload foto bukti gagal" });
        }
      }

      setSuccess(true);
      setToast({ type: "success", message: result.message || "Pelanggaran berhasil dilaporkan" });
      await loadRiwayat(true);

      window.setTimeout(() => {
        setSelectedKelas(null);
        setSelectedSiswa(null);
        setSelectedJenis(null);
        setSiswaList([]);
        setCatatan("");
        removePhoto();
        setSuccess(false);
      }, 2200);
    } catch (error: unknown) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal melaporkan pelanggaran",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: RiwayatPelanggaranGuruItem) {
    if (item.status !== "pending" || deletingId !== null) return;

    const confirmed = window.confirm(
      `Hapus laporan "${item.jenisPelanggaran.nama}" untuk ${item.siswa.nama}?`,
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      await deletePelanggaran(item.id);
      setRiwayatList(current => current.filter(e => e.id !== item.id));
      setToast({ type: "success", message: "Laporan berhasil dihapus" });
    } catch (error: unknown) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal menghapus laporan",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const isValid = Boolean(selectedKelas && selectedSiswa && selectedJenis);

  /* ─────────── early returns ─────────── */
  if (initLoading) return <SehatiLoadingScreen />;

  if (!canManagePelanggaran) {
    return (
      <main className="dashboard-page" style={{ paddingBottom: 110 }}>
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="dashboard-container" style={{ maxWidth: 720 }}>
          <div className="glass-panel pel-access-denied">
            <div className="pel-title-row">
              <div className="pel-icon-badge">
                <ShieldAlert size={24} style={{ color: "#EF4444" }} />
              </div>
              <div className="pel-title-text">
                <h1>Akses Ditolak</h1>
                <p>Halaman ini hanya untuk siswa yang memiliki izin pelaporan pelanggaran.</p>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => router.push("/siswa/dashboard")}>
              <ArrowLeft size={16} /> Kembali ke Dashboard
            </button>
          </div>
        </div>
        <BottomNavSiswa />
      </main>
    );
  }

  /* ─────────── main render ─────────── */
  return (
    <main className="dashboard-page pel-page" style={{ paddingBottom: 110 }}>
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      {/* ── Toast ── */}
      {toast && (
        <div className="pel-toast-container">
          <div
            className={`pel-toast pel-toast--${toast.type}`}
          >
            {toast.type === "success"
              ? <CheckCircle2 size={15} />
              : <AlertTriangle size={15} />}
            {toast.message}
          </div>
        </div>
      )}

      <div className="dashboard-container guru-layout-form">

        {/* ── Page header ── */}
        <div className="pel-page-header">
          <div className="pel-title-row">
            <div className="pel-icon-badge">
              <TriangleAlert size={22} style={{ color: "#EF4444" }} />
            </div>
            <div className="pel-title-text">
              <h1>Lapor Pelanggaran</h1>
              <p>Catat pelanggaran siswa dan kirim untuk verifikasi konselor.</p>
            </div>
          </div>
        </div>

        {/* ── Stat mini cards ── */}
        <div className="pel-stat-grid">
          {[
            { label: "Menunggu", value: statPending, color: "#F59E0B", glow: "rgba(245,158,11,0.35)" },
            { label: "Disetujui", value: statApproved, color: "#10b981", glow: "rgba(16,185,129,0.35)" },
            { label: "Ditolak", value: statRejected, color: "#EF4444", glow: "rgba(239,68,68,0.35)" },
          ].map(({ label, value, color, glow }) => (
            <div key={label} className="pel-stat-card glass-panel">
              <div className="pel-stat-dot" style={{ background: color, boxShadow: `0 0 8px ${glow}` }} />
              <div className="pel-stat-value" style={{ color }}>{value}</div>
              <div className="pel-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab navigation ── */}
        <div className="pel-tab-nav">
          <button
            type="button"
            className={`pel-tab-btn ${activeTab === "lapor" ? "pel-tab-btn--active" : "pel-tab-btn--inactive"}`}
            onClick={() => setActiveTab("lapor")}
          >
            <TriangleAlert size={14} />
            Buat Laporan
          </button>
          <button
            type="button"
            className={`pel-tab-btn ${activeTab === "riwayat" ? "pel-tab-btn--active" : "pel-tab-btn--inactive"}`}
            onClick={() => setActiveTab("riwayat")}
          >
            <Clock3 size={14} />
            Riwayat ({riwayatList.length})
          </button>
        </div>

        {/* ══════════════════════════════
            TAB: BUAT LAPORAN
        ══════════════════════════════ */}
        {activeTab === "lapor" && (
          <form onSubmit={handleSubmit}>
            <div className="glass-panel pel-form-card">

              {/* Card header accent */}
              <div className="pel-form-card-header">
                <span className="pel-form-card-dot" />
                <span className="pel-form-card-title">Form Pelanggaran</span>
              </div>

              {/* Kelas */}
              <div className="form-group">
                <label className="form-label">
                  Kelas <span className="pel-required">*</span>
                </label>
                <div className="form-select-wrap">
                  <select
                    className="form-input"
                    value={selectedKelas?.id ?? ""}
                    onChange={e => handleKelasChange(Number(e.target.value) || 0)}
                  >
                    <option value="">— Pilih Kelas —</option>
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.label}</option>
                    ))}

                  </select>
                </div>
              </div>

              {/* Siswa */}
              <div className="form-group">
                <label className="form-label">
                  Nama Siswa <span className="pel-required">*</span>
                  {siswaLoading && (
                    <Loader2 size={13} className="spin pel-inline-loader" />
                  )}
                </label>
                <div className="form-select-wrap">
                  <select
                    className="form-input"
                    value={selectedSiswa?.nis ?? ""}
                    onChange={e => {
                      const siswa = siswaList.find(s => s.nis === e.target.value) ?? null;
                      setSelectedSiswa(siswa);
                    }}
                    disabled={!selectedKelas || siswaLoading}
                  >
                    <option value="">
                      {!selectedKelas
                        ? "Pilih kelas terlebih dahulu"
                        : siswaLoading
                          ? "Memuat siswa..."
                          : siswaList.length === 0
                            ? "Tidak ada siswa di kelas ini"
                            : "— Pilih Siswa —"}
                    </option>
                    {siswaList.map(s => (
                      <option key={s.nis} value={s.nis}>{s.nama} ({s.nis})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jenis Pelanggaran */}
              <div className="form-group">
                <label className="form-label">
                  Jenis Pelanggaran <span className="pel-required">*</span>
                </label>
                <div className="form-select-wrap">
                  <select
                    className="form-input"
                    value={selectedJenis?.id ?? ""}
                    onChange={e => {
                      const jenis = jenisList.find(j => j.id === Number(e.target.value)) ?? null;
                      setSelectedJenis(jenis);
                    }}
                  >
                    <option value="">— Pilih Jenis Pelanggaran —</option>
                    {jenisList.map(j => (
                      <option key={j.id} value={j.id}>
                        [{j.kategori.toUpperCase()}] {j.nama} (-{j.bobot_coins} coins)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jenis preview badge */}
                {selectedJenis && (() => {
                  const pal = KATEGORI_COLOR[selectedJenis.kategori] ?? KATEGORI_COLOR.sedang;
                  return (
                    <div
                      className="pel-jenis-preview"
                      style={{ background: pal.bg, border: `1px solid ${pal.border}` }}
                    >
                      <span
                        className="badge-kategori"
                        style={{ background: pal.bg, color: pal.color, border: `1px solid ${pal.border}` }}
                      >
                        <Tag size={9} />
                        {selectedJenis.kategori}
                      </span>
                      <span className="pel-jenis-preview-name">{selectedJenis.nama}</span>
                      <span className="pel-jenis-preview-coins" style={{ color: pal.color }}>
                        <Coins size={12} />
                        -{selectedJenis.bobot_coins}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Foto Bukti */}
              <div className="form-group">
                <label className="form-label">
                  Foto Bukti{" "}
                  <span className="pel-label-hint">(opsional · maks. 2 MB · JPG/PNG)</span>
                </label>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />

                {!fotoPreview ? (
                  <button
                    type="button"
                    className="pel-upload-zone"
                    onClick={() => fileRef.current?.click()}
                    disabled={compressing}
                  >
                    {compressing
                      ? <Loader2 size={26} className="spin" style={{ color: "#179EFF" }} />
                      : <Upload size={26} className="pel-upload-icon" />}
                    <span className="pel-upload-label">
                      {compressing ? "Mengkompres gambar..." : "Klik untuk upload foto"}
                    </span>
                    <span className="pel-upload-hint">
                      JPG atau PNG · otomatis dikompres bila &gt; 2 MB
                    </span>
                  </button>
                ) : (
                  <div className="pel-photo-preview">
                    <img src={fotoPreview} alt="Preview bukti" className="pel-photo-img" />
                    <button
                      type="button"
                      className="pel-photo-remove"
                      onClick={removePhoto}
                      aria-label="Hapus foto"
                    >
                      <X size={14} />
                    </button>
                    {fotoFile && (
                      <div className="pel-photo-size">
                        <ImageIcon size={10} />
                        {(fotoFile.size / 1024).toFixed(0)} KB
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div className="form-group">
                <label className="form-label">
                  Catatan{" "}
                  <span className="pel-label-hint">(opsional)</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder="Tambahkan detail kejadian jika diperlukan..."
                />
              </div>

              {/* Summary */}
              {isValid && (
                <div className="pel-summary">
                  <div className="pel-summary-title">Ringkasan Laporan</div>
                  <div className="pel-summary-row">
                    <span className="pel-summary-lbl">Siswa</span>
                    <span className="pel-summary-val">
                      {selectedSiswa?.nama}
                      <span className="pel-summary-meta"> ({selectedSiswa?.nis})</span>
                    </span>
                  </div>
                  <div className="pel-summary-row">
                    <span className="pel-summary-lbl">Kelas</span>
                    <span className="pel-summary-val">{selectedKelas?.label}</span>
                  </div>
                  <div className="pel-summary-row">
                    <span className="pel-summary-lbl">Pelanggaran</span>
                    <span className="pel-summary-val">{selectedJenis?.nama}</span>
                  </div>
                  <div className="pel-summary-row">
                    <span className="pel-summary-lbl">Penalti</span>
                    <span className="pel-summary-penalty">
                      <Coins size={13} />
                      -{selectedJenis?.bobot_coins} coins
                    </span>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!isValid || submitting || success || compressing}
                className={`pel-submit-btn ${success
                  ? "pel-submit-btn--success"
                  : isValid && !submitting
                    ? "pel-submit-btn--active"
                    : "pel-submit-btn--disabled"
                  }`}
              >
                {success ? (
                  <><CheckCircle2 size={18} /> Pelanggaran Berhasil Dilaporkan</>
                ) : submitting ? (
                  <><Loader2 size={18} className="spin" /> Menyimpan...</>
                ) : (
                  <><TriangleAlert size={18} /> Laporkan Pelanggaran</>
                )}
              </button>

            </div>
          </form>
        )}

        {/* ══════════════════════════════
            TAB: RIWAYAT
        ══════════════════════════════ */}
        {activeTab === "riwayat" && (
          <section className="glass-panel pel-riwayat-section">

            {/* Section header */}
            <div className="pel-riwayat-header">
              <div className="pel-title-row" style={{ marginBottom: 0 }}>
                <div className="pel-icon-badge pel-icon-badge--blue">
                  <Clock3 size={20} style={{ color: "#179EFF" }} />
                </div>
                <div className="pel-title-text">
                  <h2 className="pel-riwayat-title">Laporan Saya</h2>
                  <p>Laporan yang sudah Anda kirim. Hapus yang masih menunggu jika perlu.</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary pel-refresh-btn"
                onClick={() => void loadRiwayat(true)}
                disabled={riwayatLoading}
              >
                {riwayatLoading
                  ? <Loader2 size={15} className="spin" />
                  : <RefreshCw size={15} />}
                Muat Ulang
              </button>
            </div>

            {/* Content */}
            {riwayatLoading ? (
              <div className="pel-riwayat-loading">
                <Loader2 size={20} className="spin" style={{ color: "#179EFF" }} />
                <span>Memuat riwayat laporan...</span>
              </div>
            ) : riwayatList.length === 0 ? (
              <div className="pel-riwayat-empty">
                <TriangleAlert size={32} style={{ opacity: 0.3 }} />
                <span>Belum ada laporan yang Anda kirim.</span>
              </div>
            ) : (
              <div className="pel-riwayat-list">
                {riwayatList.map(item => {
                  const st = STATUS_CONFIG[item.status];
                  const kt = KATEGORI_COLOR[item.jenisPelanggaran.kategori] ?? KATEGORI_COLOR.sedang;
                  const StatusIcon = st.icon;

                  return (
                    <article key={item.id} className="pel-riwayat-card">

                      {/* Row 1: name + status badge */}
                      <div className="pel-riwayat-card-top">
                        <div className="pel-riwayat-card-info">
                          <div className="pel-riwayat-jenis">{item.jenisPelanggaran.nama}</div>
                          <div className="pel-riwayat-siswa">
                            {item.siswa.nama}
                            <span className="pel-riwayat-nis"> · {item.siswa.nis}</span>
                            <span className="pel-riwayat-kelas"> · {item.siswa.kelasLabel}</span>
                          </div>
                        </div>
                        <span
                          className="badge-kategori pel-status-badge"
                          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                        >
                          <StatusIcon size={11} />
                          {st.label}
                        </span>
                      </div>

                      {/* Row 2: tag chips */}
                      <div className="pel-riwayat-tags">
                        <span
                          className="badge-kategori"
                          style={{ background: kt.bg, color: kt.color, border: `1px solid ${kt.border}` }}
                        >
                          {item.jenisPelanggaran.kategori}
                        </span>
                        <span className="badge-kategori pel-tag-date">
                          {formatTanggal(item.tanggal)}
                        </span>
                        <span className="badge-kategori pel-tag-coins">
                          <Coins size={10} />
                          -{item.jenisPelanggaran.bobot_coins}
                        </span>
                      </div>

                      {/* Catatan */}
                      {item.catatan && (
                        <div className="pel-riwayat-catatan">{item.catatan}</div>
                      )}

                      {/* Bukti foto link */}
                      {item.buktiUrl && (
                        <a
                          href={item.buktiUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pel-riwayat-bukti"
                        >
                          <ImageIcon size={13} /> Lihat foto bukti
                        </a>
                      )}

                      {/* Delete (only pending) */}
                      {item.status === "pending" && (
                        <div className="pel-riwayat-actions">
                          <button
                            type="button"
                            className="btn pel-delete-btn"
                            onClick={() => void handleDelete(item)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? (
                              <><Loader2 size={14} className="spin" /> Menghapus...</>
                            ) : (
                              <><Trash2 size={14} /> Hapus Laporan</>
                            )}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomNavSiswa />
    </main>
  );
}