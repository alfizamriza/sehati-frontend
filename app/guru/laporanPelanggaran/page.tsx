"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, TriangleAlert, ChevronDown, FileText,
  Upload, X, Image as ImageIcon, Loader2, CheckCircle2,
  Tag, Coins, AlertTriangle,
} from "lucide-react";
import {
  getKelasList, getSiswaByKelas, getJenisPelanggaranAktif,
  createPelanggaran, updateBuktiFoto, compressImage,
  type KelasItem, type SiswaItem, type JenisPelanggaranItem,
} from "@/lib/services/laporan-pelanggaran.service";
import { uploadBuktiPelanggaran } from "@/lib/supabase-client";
import "../dashboard/dashboard.css";
import "./laporan.css";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const KATEGORI_COLOR: Record<string, { color: string; bg: string }> = {
  ringan: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  sedang: { color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  berat:  { color: "#EF4444", bg: "rgba(239,68,68,0.12)"  },
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LaporanPelanggaranPage() {
  const router = useRouter();

  const [kelasList,  setKelasList]  = useState<KelasItem[]>([]);
  const [siswaList,  setSiswaList]  = useState<SiswaItem[]>([]);
  const [jenisList,  setJenisList]  = useState<JenisPelanggaranItem[]>([]);

  const [selectedKelas,  setSelectedKelas]  = useState<KelasItem | null>(null);
  const [selectedSiswa,  setSelectedSiswa]  = useState<SiswaItem | null>(null);
  const [selectedJenis,  setSelectedJenis]  = useState<JenisPelanggaranItem | null>(null);
  const [catatan, setCatatan] = useState("");

  const [fotoFile, setFotoFile]       = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [initLoading,   setInitLoading]   = useState(true);
  const [siswaLoading,  setSiswaLoading]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [kelas, jenis] = await Promise.all([
          getKelasList(),
          getJenisPelanggaranAktif(),
        ]);
        setKelasList(kelas);
        setJenisList(jenis);
      } catch (e: any) {
        showToast(e.message || "Gagal memuat data", "error");
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, [showToast]);

  async function handleKelasChange(kelas: KelasItem | null) {
    setSelectedKelas(kelas);
    setSelectedSiswa(null);
    setSiswaList([]);
    if (!kelas) return;
    setSiswaLoading(true);
    try {
      const siswa = await getSiswaByKelas(kelas.id);
      setSiswaList(siswa);
    } catch (e: any) {
      showToast(e.message || "Gagal memuat siswa", "error");
    } finally {
      setSiswaLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Hanya file JPG dan PNG yang diperbolehkan", "error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setCompressing(true);
    try {
      const compressed = await compressImage(file, 2);
      setFotoFile(compressed);
      const reader = new FileReader();
      reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
      reader.readAsDataURL(compressed);

      if (compressed.size < file.size) {
        const from = (file.size / 1024).toFixed(0);
        const to   = (compressed.size / 1024).toFixed(0);
        showToast(`Gambar dikompres: ${from} KB → ${to} KB`);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal memproses gambar", "error");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSiswa || !selectedJenis) return;
    setSubmitting(true);

    try {
      const result = await createPelanggaran({
        nis: selectedSiswa.nis,
        jenis_pelanggaran_id: selectedJenis.id,
        catatan: catatan.trim() || undefined,
      });

      const pelanggaranId = result.data.id;
      const siswaLabel = `${selectedSiswa.nis}-${selectedSiswa.nama}`;

      if (fotoFile) {
        try {
          const buktiUrl = await uploadBuktiPelanggaran(fotoFile, pelanggaranId, siswaLabel);
          await updateBuktiFoto(pelanggaranId, buktiUrl);
        } catch {
          showToast("Pelanggaran tersimpan, tapi foto gagal diupload", "error");
        }
      }

      setSuccess(true);
      showToast(result.message || "Pelanggaran berhasil dilaporkan");

      setTimeout(() => {
        setSelectedKelas(null);
        setSelectedSiswa(null);
        setSelectedJenis(null);
        setCatatan("");
        setSiswaList([]);
        removePhoto();
        setSuccess(false);
      }, 2500);

    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || "Gagal melaporkan pelanggaran";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = !!selectedSiswa && !!selectedJenis;
  const safeKelasList = Array.isArray(kelasList) ? kelasList : [];
  const safeSiswaList = Array.isArray(siswaList) ? siswaList : [];
  const safeJenisList = Array.isArray(jenisList) ? jenisList : [];

  // ── Loading state ──
  if (initLoading) {
    return (
      <main className="dashboard-page">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="loading-fullscreen">
          <Loader2 size={34} className="spin" style={{ color: "#EF4444" }} />
          <span className="loading-text">Memuat data...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      {/* ── Toast ── */}
      {toast && (
        <div className="toast-container">
          <div
            className="toast-item"
            style={{ borderColor: toast.type === "success" ? "#10b98145" : "#ef444445" }}
          >
            {toast.type === "success"
              ? <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0 }} />
              : <AlertTriangle  size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
            }
            {toast.msg}
          </div>
        </div>
      )}

      <div className="dashboard-container guru-layout-form">

        {/* ── Header ── */}
        <header className="dash-header">
          <button className="page-back-btn" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Kembali
          </button>
        </header>

        {/* ── Page Title ── */}
        <div className="page-title-row">
          <div className="page-icon-badge page-icon-badge-red">
            <TriangleAlert size={24} style={{ color: "#EF4444" }} />
          </div>
          <div className="page-title-text">
            <h1>Laporan Pelanggaran</h1>
            <p>Isi data pelanggaran siswa dengan lengkap</p>
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="glass-panel" style={{ borderRadius: 18, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* 1. Pilih Kelas */}
            <div className="form-group">
              <label className="form-label">
                Kelas <span className="form-required">*</span>
              </label>
              <div className="form-select-wrap">
                <select
                  className="form-input"
                  value={selectedKelas?.id ?? ""}
                  onChange={(e) => {
                    const kelas = safeKelasList.find((k) => k.id === Number(e.target.value)) ?? null;
                    handleKelasChange(kelas);
                  }}
                >
                  <option value="">— Pilih Kelas —</option>
                  {safeKelasList.map((k) => (
                    <option key={k.id} value={k.id}>{k.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="form-select-chevron" />
              </div>
            </div>

            {/* 2. Pilih Siswa */}
            <div className="form-group">
              <label className="form-label">
                Nama Siswa <span className="form-required">*</span>
                {siswaLoading && (
                  <Loader2 size={13} className="spin" style={{ color: "#179EFF" }} />
                )}
              </label>
              <div className="form-select-wrap">
                <select
                  className="form-input"
                  value={selectedSiswa?.nis ?? ""}
                  onChange={(e) => {
                    const siswa = safeSiswaList.find((s) => s.nis === e.target.value) ?? null;
                    setSelectedSiswa(siswa);
                  }}
                  disabled={!selectedKelas || siswaLoading}
                >
                  <option value="">
                    {!selectedKelas
                      ? "Pilih kelas terlebih dahulu"
                      : siswaLoading
                      ? "Memuat siswa..."
                      : safeSiswaList.length === 0
                      ? "Tidak ada siswa di kelas ini"
                      : "— Pilih Siswa —"}
                  </option>
                  {safeSiswaList.map((s) => (
                    <option key={s.nis} value={s.nis}>{s.nama} ({s.nis})</option>
                  ))}
                </select>
                <ChevronDown size={16} className="form-select-chevron" />
              </div>
            </div>

            {/* 3. Jenis Pelanggaran */}
            <div className="form-group">
              <label className="form-label">
                Jenis Pelanggaran <span className="form-required">*</span>
              </label>
              <div className="form-select-wrap">
                <select
                  className="form-input"
                  value={selectedJenis?.id ?? ""}
                  onChange={(e) => {
                    const jenis = safeJenisList.find((j) => j.id === Number(e.target.value)) ?? null;
                    setSelectedJenis(jenis);
                  }}
                >
                  <option value="">— Pilih Jenis Pelanggaran —</option>
                  {safeJenisList.map((j) => (
                    <option key={j.id} value={j.id}>
                      [{j.kategori.toUpperCase()}] {j.nama} (-{j.bobot_coins} coins)
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="form-select-chevron" />
              </div>

              {/* Preview badge jenis terpilih */}
              {selectedJenis && (() => {
                const ks = KATEGORI_COLOR[selectedJenis.kategori] ?? KATEGORI_COLOR.sedang;
                return (
                  <div className="jenis-preview">
                    <span
                      className="badge-kategori"
                      style={{ background: ks.bg, color: ks.color }}
                    >
                      <Tag size={9} />{selectedJenis.kategori}
                    </span>
                    <span className="jenis-preview-name">{selectedJenis.nama}</span>
                    <span className="jenis-preview-coins">
                      <Coins size={13} />-{selectedJenis.bobot_coins}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* 4. Upload Foto Bukti */}
            <div className="form-group">
              <label className="form-label">
                Foto Bukti{" "}
                <span className="form-label-optional">(opsional · maks. 2 MB · JPG/PNG)</span>
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
                  className="upload-zone"
                  onClick={() => fileRef.current?.click()}
                  disabled={compressing}
                >
                  {compressing
                    ? <Loader2 size={28} className="spin" style={{ color: "#179EFF" }} />
                    : <Upload size={28} />
                  }
                  <span className="upload-zone-label">
                    {compressing ? "Mengkompres gambar..." : "Klik untuk upload foto"}
                  </span>
                  <span className="upload-zone-hint">
                    JPG atau PNG · Otomatis dikompres jika &gt; 2 MB
                  </span>
                </button>
              ) : (
                <div className="photo-preview-wrap">
                  <img src={fotoPreview} alt="Preview" className="photo-preview-img" />
                  <button type="button" className="photo-remove-btn" onClick={removePhoto}>
                    <X size={15} />
                  </button>
                  {fotoFile && (
                    <div className="photo-size-badge">
                      <ImageIcon size={10} />
                      {(fotoFile.size / 1024).toFixed(0)} KB
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Catatan */}
            <div className="form-group">
              <label className="form-label">
                Catatan{" "}
                <span className="form-label-optional">(opsional)</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tambahkan detail kejadian jika diperlukan..."
              />
            </div>

            {/* ── Preview Ringkasan ── */}
            {isValid && (
              <div className="summary-box">
                <div className="summary-title">Ringkasan Laporan</div>
                <div className="summary-row">
                  <span className="summary-row-label">Siswa: </span>
                  <span className="summary-row-value">{selectedSiswa?.nama}</span>{" "}
                  <span className="summary-row-meta">({selectedSiswa?.nis})</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Kelas: </span>
                  <span className="summary-row-value">{selectedKelas?.label}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Pelanggaran: </span>
                  <span className="summary-row-value">{selectedJenis?.nama}</span>
                </div>
                <div className="summary-penalty">
                  Penalti: -{selectedJenis?.bobot_coins} coins
                </div>
              </div>
            )}

            {/* ── Submit Button ── */}
            <button
              type="submit"
              disabled={!isValid || submitting || success || compressing}
              className={`submit-btn ${
                success
                  ? "submit-btn-success"
                  : isValid && !submitting
                  ? "submit-btn-active"
                  : "submit-btn-disabled"
              }`}
            >
              {success ? (
                <><CheckCircle2 size={18} /> Pelanggaran Berhasil Dilaporkan!</>
              ) : submitting ? (
                <><Loader2 size={18} className="spin" /> Menyimpan...</>
              ) : (
                <><TriangleAlert size={18} /> Laporkan Pelanggaran</>
              )}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}