"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, ChevronDown, Loader2,
  CheckCircle2, AlertTriangle, Calendar, RefreshCw,
  FileX, Heart, FileText, HelpCircle, Users,
  CalendarOff, Zap
} from "lucide-react";
import { getInfoHariIni } from "@/lib/services/absensi.service";
import {
  listKelas, listSiswaBelumAbsen, listIzin, createIzinBatch,
  KelasItem, SiswaItem, IzinRecord, IzinTipe,
} from "@/lib/services/izin.service";
import { formatKelasLabel } from "@/lib/utils/kelas";
import "../dashboard/dashboard.css";
import "./izin.css";
import "../absensi/scanner.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";

interface SiswaRow extends SiswaItem {
  tipe: IzinTipe;
  catatan: string;
  checked: boolean; // ← NEW
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPE_OPTS: { value: IzinTipe; label: string; icon: React.ReactNode }[] = [
  { value: "sakit", label: "Sakit", icon: <Heart size={12} /> },
  { value: "izin", label: "Izin", icon: <FileText size={12} /> },
  { value: "tanpa_keterangan", label: "Tanpa Keterangan", icon: <HelpCircle size={12} /> },
];

const TIPE_LABEL: Record<IzinTipe, string> = {
  sakit: "Sakit", izin: "Izin", tanpa_keterangan: "Tanpa Keterangan",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function formatTanggalHariIni() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GuruIzinPage() {
  const router = useRouter();
  const tanggal = todayISO();

  // Data
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [rows, setRows] = useState<SiswaRow[]>([]);

  // Form
  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);

  // Loading
  const [initLoading, setInitLoading] = useState(true);
  const [siswaLoading, setSiswaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Riwayat
  const [riwayat, setRiwayat] = useState<IzinRecord[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const showToast = useCallback((msg: string, type: ToastType = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Derived: siswa yang tercentang ───
  const checkedRows = rows.filter((r) => r.checked);
  const allChecked = rows.length > 0 && rows.every((r) => r.checked);
  const someChecked = rows.some((r) => r.checked) && !allChecked;

  // Holiday
  const [isHoliday, setIsHoliday] = useState(false);
  const [liburInfo, setLiburInfo] = useState<{ keterangan: string } | null>(null);

  // ── Boot ──
  useEffect(() => {
    async function boot() {
      try {
        const info = await getInfoHariIni();
        if (info.isLibur) {
          setLiburInfo({ keterangan: info.keterangan || "" });
          setIsHoliday(true);
          setInitLoading(false);
          return;
        }
      } catch {
        // Abaikan error cek hari libur
      }

      listKelas()
        .then(setKelasList)
        .catch((e) => showToast(e.message || "Gagal memuat data", "error"))
        .finally(() => setInitLoading(false));
    }
    boot();
  }, [showToast]);

  // ── Load siswa saat kelas berubah ──
  async function handleKelasChange(kelas: KelasItem | null) {
    setSelectedKelas(kelas);
    setRows([]);
    if (!kelas) return;
    setSiswaLoading(true);
    try {
      const data: SiswaItem[] = await listSiswaBelumAbsen(kelas.id, tanggal);
      // Default: semua tercentang
      setRows(data.map((s) => ({ ...s, tipe: "sakit", catatan: "", checked: true })));
    } catch (e: any) {
      showToast(e.message || "Gagal memuat siswa", "error");
    } finally {
      setSiswaLoading(false);
    }
  }

  // ── Row helpers ──
  const setRowTipe = (nis: string, tipe: IzinTipe) =>
    setRows((prev) => prev.map((r) => r.nis === nis ? { ...r, tipe } : r));
  const setRowCatatan = (nis: string, catatan: string) =>
    setRows((prev) => prev.map((r) => r.nis === nis ? { ...r, catatan } : r));
  const toggleRowCheck = (nis: string) =>
    setRows((prev) => prev.map((r) => r.nis === nis ? { ...r, checked: !r.checked } : r));

  // ── Select All / Deselect All ──
  const handleToggleAll = () => {
    const next = !allChecked;
    setRows((prev) => prev.map((r) => ({ ...r, checked: next })));
  };

  // ── Riwayat ──
  const fetchRiwayat = useCallback(async () => {
    setLoadingRiwayat(true);
    try {
      const data = await listIzin({ status: "approved" });
      setRiwayat(data.slice(0, 30));
    } catch {
      setRiwayat([]);
    } finally {
      setLoadingRiwayat(false);
    }
  }, []);

  useEffect(() => { fetchRiwayat(); }, [fetchRiwayat]);

  // ── Submit: kirim hanya siswa yang checked ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checkedRows.length === 0) return;
    setSubmitting(true);

    const groups = new Map<string, { nis_list: string[]; tipe: IzinTipe; catatan?: string }>();
    for (const r of checkedRows) {
      const key = `${r.tipe}||${r.catatan.trim()}`;
      if (!groups.has(key)) {
        groups.set(key, { nis_list: [], tipe: r.tipe, catatan: r.catatan.trim() || undefined });
      }
      groups.get(key)!.nis_list.push(r.nis);
    }

    try {
      await Promise.all(
        Array.from(groups.values()).map((g) => createIzinBatch({ ...g, tanggal }))
      );
      setSuccess(true);
      showToast(`✓ ${checkedRows.length} siswa berhasil dicatat`);
      fetchRiwayat();

      setTimeout(async () => {
        setRows([]);
        setSuccess(false);
        if (selectedKelas) {
          try {
            const fresh = await listSiswaBelumAbsen(selectedKelas.id, tanggal);
            setRows(fresh.map((s) => ({ ...s, tipe: "sakit", catatan: "", checked: true })));
          } catch { /* silent */ }
        }
      }, 2000);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || "Gagal mencatat izin";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const safeKelas = Array.isArray(kelasList) ? kelasList : [];

  // ── Loading screen ──
  if (initLoading) {
    return (
      <main className="dashboard-page">
        <div className="bg-blob blob-1" />
        <div className="loading-fullscreen">
          <Loader2 size={34} className="iz-spin" style={{ color: "#0d9488" }} />
          <span className="loading-text">Memuat data...</span>
        </div>
      </main>
    );
  }

  // ── Holiday screen ──
  if (isHoliday) {
    return (
      <main className="dashboard-page scanner-page">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="dashboard-container guru-layout-medium scanner-container">
          <header className="scanner-header">
            <button className="btn-icon back-btn" onClick={() => router.back()}>
              <ArrowLeft size={17} />
            </button>
            <h2 className="page-title">Catat Izin / Sakit</h2>
            <div className="spacer" />
          </header>
          <div className="scanner-frame-wrapper">
            <div className="result-card holiday-card glass-panel" style={{ marginTop: '40px' }}>
              <div className="sc-icon-badge sc-icon-badge--holiday">
                <CalendarOff size={48} />
              </div>

              <h2 className="res-title">Hari Libur</h2>

              {liburInfo?.keterangan && (
                <div className="sc-info-badge sc-info-badge--amber">
                  🎉 {liburInfo.keterangan}
                </div>
              )}

              <p className="sc-date-text">{formatTanggalHariIni()}</p>

              <p className="res-desc">
                Pencatatan izin atau sakit tidak dapat dilakukan pada hari libur.
                <br />
                Sampai jumpa di hari sekolah berikutnya!
              </p>

              <div className="sc-notice-box sc-notice-box--amber">
                <Zap size={14} color="#F59E0B" />
                <span>Streak tidak putus karena hari libur.</span>
              </div>

              <button className="btn-outline full-width" onClick={() => router.back()}>
                <ArrowLeft size={16} /> Kembali
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="bg-blob blob-1" />

      {/* ── Toast ── */}
      {toast && (
        <div className="toast-container">
          <div
            className="toast-item"
            style={{ borderColor: toast.type === "success" ? "#10b98145" : "#ef444445" }}
          >
            {toast.type === "success"
              ? <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0 }} />
              : <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />}
            {toast.msg}
          </div>
        </div>
      )}

      <div className="dashboard-container guru-layout-form">

        {/* ── Back ── */}
        <button className="iz-back-btn" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Kembali
        </button>

        {/* ── Title ── */}
        <div className="iz-page-title-row">
          <div className="iz-icon-badge">
            <BookOpen size={24} style={{ color: "#0d9488" }} />
          </div>
          <div className="iz-page-title-text">
            <h1>Catat Izin / Sakit</h1>
            <p>Siswa yang tercatat izin tidak memutus streak absensi tumbler</p>
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="glass-panel" style={{ borderRadius: 18, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Tanggal — read only */}
            <div>
              <label className="iz-label">
                <Calendar size={14} /> Tanggal
              </label>
              <div className="iz-date-chip">
                <Calendar size={15} style={{ color: "#0d9488", flexShrink: 0 }} />
                {formatTanggalHariIni()}
                <span className="iz-date-chip-right">Hari ini</span>
              </div>
            </div>

            {/* Pilih Kelas */}
            <div>
              <label className="iz-label">
                Kelas <span className="iz-required">*</span>
              </label>
              <div className="iz-sel-wrap">
                <select
                  className="iz-select"
                  value={selectedKelas?.id ?? ""}
                  onChange={(e) => {
                    const found = safeKelas.find((k) => k.id === Number(e.target.value)) ?? null;
                    handleKelasChange(found);
                  }}
                >
                  <option value="">— Pilih Kelas —</option>
                  {safeKelas.map((k) => (
                    <option key={k.id} value={k.id}>{formatKelasLabel(k)}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="iz-sel-chevron" />
              </div>
            </div>

            {/* ── Siswa list ── */}
            {!selectedKelas && (
              <div className="iz-empty-state">
                <Users size={26} />
                <span>Pilih kelas untuk melihat daftar siswa</span>
              </div>
            )}

            {selectedKelas && siswaLoading && (
              <div className="ls-siswa-card glass-panel">

                {/* Orbit spinner */}
                <div className="ls-siswa-orbit">
                  <div className="ls-siswa-orbit-ring" />
                  <div className="ls-siswa-orbit-arc ls-siswa-orbit-arc--outer" />
                  <div className="ls-siswa-orbit-arc ls-siswa-orbit-arc--inner" />
                  <div className="ls-siswa-orbit-center">
                    {/* User icon via inline SVG — tidak perlu import */}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                      stroke="#179EFF" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="8" cy="6" r="3" />
                      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    </svg>
                  </div>
                </div>

                {/* Label */}
                <div className="ls-siswa-label">
                  <span className="ls-siswa-label-main">Memuat data siswa</span>
                  <span className="ls-siswa-label-sub">Menyiapkan daftar kelas...</span>
                </div>

                {/* Skeleton rows — simulasi list siswa */}
                <div className="ls-siswa-skel-list">
                  {[70, 55, 80, 62].map((w, i) => (
                    <div key={i} className="ls-siswa-skel-row" style={{ animationDelay: `${i * 0.12}s` }}>
                      <div className="ls-siswa-skel ls-siswa-skel-avatar" />
                      <div className="ls-siswa-skel-texts">
                        <div className="ls-siswa-skel ls-siswa-skel-name" style={{ width: `${w}%` }} />
                        <div className="ls-siswa-skel ls-siswa-skel-nis" />
                      </div>
                      <div className="ls-siswa-skel ls-siswa-skel-badge" />
                    </div>
                  ))}
                </div>

                {/* Bouncing dots */}
                <div className="ls-siswa-dots">
                  <div className="ls-siswa-dot ls-siswa-dot--1" />
                  <div className="ls-siswa-dot ls-siswa-dot--2" />
                  <div className="ls-siswa-dot ls-siswa-dot--3" />
                </div>

              </div>
            )}

            {selectedKelas && !siswaLoading && rows.length === 0 && (
              <div className="iz-empty-state">
                <CheckCircle2 size={28} style={{ color: "#10b981" }} />
                <span>Semua siswa sudah absen atau sudah ada catatan izin hari ini</span>
              </div>
            )}

            {selectedKelas && !siswaLoading && rows.length > 0 && (
              <>
                {/* ── Select All header ── */}
                <div className="iz-select-all-bar">
                  <label className="iz-select-all-label">
                    <span
                      className={`iz-checkbox ${allChecked ? "iz-checkbox--on" : someChecked ? "iz-checkbox--partial" : ""}`}
                      onClick={handleToggleAll}
                      role="checkbox"
                      aria-checked={allChecked ? true : someChecked ? "mixed" : false}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === " " && handleToggleAll()}
                    >
                      {allChecked && <CheckCircle2 size={13} />}
                      {someChecked && <span className="iz-checkbox-dash" />}
                    </span>
                    <span className="iz-select-all-text" onClick={handleToggleAll}>
                      {allChecked ? "Batalkan Semua" : "Pilih Semua"}
                    </span>
                  </label>
                  <span className="iz-select-all-counter">
                    <span className="iz-counter-num">{checkedRows.length}</span>
                    <span className="iz-counter-sep">/</span>
                    <span>{rows.length}</span>
                    <span className="iz-counter-lbl">siswa dipilih</span>
                  </span>
                </div>

                {/* Rows */}
                <div className="iz-siswa-list">
                  {rows.map((r, i) => (
                    <div
                      key={r.nis}
                      className={`iz-siswa-row ${!r.checked ? "iz-siswa-row--unchecked" : ""}`}
                      style={{ animationDelay: `${i * 28}ms` }}
                    >
                      {/* Top: checkbox + nomor + nama */}
                      <div className="iz-row-top">
                        {/* Checkbox */}
                        <button
                          type="button"
                          className={`iz-row-checkbox ${r.checked ? "iz-row-checkbox--on" : ""}`}
                          onClick={() => toggleRowCheck(r.nis)}
                          aria-label={r.checked ? `Batalkan ${r.nama}` : `Pilih ${r.nama}`}
                        >
                          {r.checked && <CheckCircle2 size={13} />}
                        </button>

                        <span className="iz-row-num">{i + 1}</span>
                        <div className="iz-row-name-wrap">
                          <div className="iz-row-nama">{r.nama}</div>
                          <div className="iz-row-nis">{r.nis}</div>
                        </div>
                      </div>

                      {/* Tipe pills + Catatan — hanya tampil jika checked */}
                      {r.checked && (
                        <>
                          <div className="iz-tipe-pills">
                            {TIPE_OPTS.map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                className={`iz-pill iz-pill--${t.value} ${r.tipe === t.value ? "iz-pill--on" : ""}`}
                                onClick={() => setRowTipe(r.nis, t.value)}
                              >
                                {t.icon}
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            className="iz-row-catatan"
                            rows={2}
                            placeholder="Catatan (opsional)..."
                            value={r.catatan}
                            onChange={(e) => setRowCatatan(r.nis, e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <div className="iz-submit-section">
                  <button
                    type="submit"
                    disabled={submitting || success || checkedRows.length === 0}
                    className={`iz-submit-btn ${success ? "iz-submit-btn--success" : ""}`}
                  >
                    {success ? (
                      <><CheckCircle2 size={18} /> {checkedRows.length} Siswa Berhasil Dicatat!</>
                    ) : submitting ? (
                      <><Loader2 size={18} className="iz-spin" /> Menyimpan...</>
                    ) : checkedRows.length === 0 ? (
                      <><BookOpen size={18} /> Pilih siswa terlebih dahulu</>
                    ) : (
                      <><BookOpen size={18} /> Catat Izin ({checkedRows.length} Siswa)</>
                    )}
                  </button>
                  {!submitting && !success && checkedRows.length > 0 && (
                    <p className="iz-submit-hint">
                      {checkedRows.length === rows.length
                        ? `Semua ${rows.length} siswa akan dicatat izin hari ini`
                        : `${checkedRows.length} dari ${rows.length} siswa akan dicatat izin hari ini`}
                    </p>
                  )}
                </div>
              </>
            )}

          </div>
        </form>

        {/* ── Riwayat ── */}
        <div style={{ marginTop: 32 }}>
          <div className="iz-rw-head">
            <div className="iz-rw-head-title">
              <Calendar size={18} className="iz-rw-head-icon" />
              Riwayat Izin Terbaru
            </div>
            <button className="iz-rw-refresh" onClick={fetchRiwayat} disabled={loadingRiwayat}>
              {loadingRiwayat
                ? <Loader2 size={13} className="iz-spin" />
                : <RefreshCw size={13} />}
              Refresh
            </button>
          </div>

          {loadingRiwayat ? (
            <div className="iz-loading-state">
              <Loader2 size={18} className="iz-spin" style={{ color: "#0d9488" }} />
              <span>Memuat riwayat...</span>
            </div>
          ) : riwayat.length === 0 ? (
            <div className="iz-empty-state">
              <FileX size={26} />
              <span>Belum ada riwayat izin</span>
            </div>
          ) : (
            <div className="iz-rw-list">
              {riwayat.map((r) => (
                <div key={r.id} className="iz-rw-card">
                  <div className={`iz-rw-bar iz-rw-bar--${r.tipe}`} />
                  <div className="iz-rw-info">
                    <div className="iz-rw-nama">{r.siswa_nama ?? r.nis}</div>
                    <div className="iz-rw-meta">
                      {r.kelas_label && <span>{r.kelas_label}</span>}
                      {r.kelas_label && <span>·</span>}
                      <Calendar size={11} />
                      <span>{r.tanggal}</span>
                    </div>
                  </div>
                  <span className={`iz-tipe-badge iz-tipe-badge--${r.tipe}`}>
                    {TIPE_LABEL[r.tipe]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}