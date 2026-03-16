"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, ChevronDown, Loader2,
  CheckCircle2, AlertTriangle, Calendar, RefreshCw,
  FileX, Heart, FileText, HelpCircle, Users,
} from "lucide-react";
import {
  listKelas, listSiswaBelumAbsen, listIzin, createIzinBatch,
  KelasItem, SiswaItem, IzinRecord, IzinTipe,
} from "@/lib/services/izin.service";
import { formatKelasLabel } from "@/lib/utils/kelas";
import "../dashboard/dashboard.css";
import "./izin.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";

interface SiswaRow extends SiswaItem {
  tipe: IzinTipe;
  catatan: string;
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
  const tanggal = todayISO(); // selalu hari ini, tidak bisa diubah

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

  // ── Boot ──
  useEffect(() => {
    listKelas()
      .then(setKelasList)
      .catch((e) => showToast(e.message || "Gagal memuat data", "error"))
      .finally(() => setInitLoading(false));
  }, [showToast]);

  // ── Load siswa saat kelas berubah ──
  async function handleKelasChange(kelas: KelasItem | null) {
    setSelectedKelas(kelas);
    setRows([]);
    if (!kelas) return;
    setSiswaLoading(true);
    try {
      const data: SiswaItem[] = await listSiswaBelumAbsen(kelas.id, tanggal);
      setRows(data.map((s) => ({ ...s, tipe: "sakit", catatan: "" })));
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

  // ── Submit: kirim semua siswa yang ada di list ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rows.length === 0) return;
    setSubmitting(true);

    // Group by tipe+catatan untuk meminimalkan request
    const groups = new Map<string, { nis_list: string[]; tipe: IzinTipe; catatan?: string }>();
    for (const r of rows) {
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
      showToast(`✓ ${rows.length} siswa berhasil dicatat`);
      fetchRiwayat();

      setTimeout(async () => {
        setRows([]);
        setSuccess(false);
        // Refresh siswa list
        if (selectedKelas) {
          try {
            const fresh = await listSiswaBelumAbsen(selectedKelas.id, tanggal);
            setRows(fresh.map((s) => ({ ...s, tipe: "sakit", catatan: "" })));
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
              <div className="iz-loading-state">
                <Loader2 size={16} className="iz-spin" style={{ color: "#0d9488" }} />
                <span>Memuat siswa...</span>
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
                {/* Header count */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label className="iz-label" style={{ margin: 0 }}>
                    <Users size={14} /> Daftar Siswa Belum Absen
                  </label>
                  <span style={{ marginLeft: "auto", fontSize: "0.76rem", color: "var(--iz-nis)" }}>
                    {rows.length} siswa
                  </span>
                </div>

                {/* Rows */}
                <div className="iz-siswa-list">
                  {rows.map((r, i) => (
                    <div
                      key={r.nis}
                      className="iz-siswa-row"
                      style={{ animationDelay: `${i * 28}ms` }}
                    >
                      {/* Top: nomor + nama */}
                      <div className="iz-row-top">
                        <span className="iz-row-num">{i + 1}</span>
                        <div className="iz-row-name-wrap">
                          <div className="iz-row-nama">{r.nama}</div>
                          <div className="iz-row-nis">{r.nis}</div>
                        </div>
                      </div>

                      {/* Tipe pills */}
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

                      {/* Catatan */}
                      <textarea
                        className="iz-row-catatan"
                        rows={2}
                        placeholder="Catatan (opsional)..."
                        value={r.catatan}
                        onChange={(e) => setRowCatatan(r.nis, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <div className="iz-submit-section">
                  <button
                    type="submit"
                    disabled={submitting || success}
                    className={`iz-submit-btn ${success ? "iz-submit-btn--success" : ""}`}
                  >
                    {success ? (
                      <><CheckCircle2 size={18} /> {rows.length} Siswa Berhasil Dicatat!</>
                    ) : submitting ? (
                      <><Loader2 size={18} className="iz-spin" /> Menyimpan...</>
                    ) : (
                      <><BookOpen size={18} /> Catat Izin ({rows.length} Siswa)</>
                    )}
                  </button>
                  {!submitting && !success && (
                    <p className="iz-submit-hint">
                      Semua siswa di atas akan langsung tercatat sebagai izin hari ini
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