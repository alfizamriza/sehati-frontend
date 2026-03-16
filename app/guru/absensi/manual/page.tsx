"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp, Check,
  CheckCircle2, Loader2, RefreshCw, Search, Users,
} from "lucide-react";
import "../../dashboard/dashboard.css";
import "./manual.css";
import {
  getKelasList, getSiswaByKelas, bulkManualAbsensi,
  clearSiswaCache, getInfoHariIni,
  type KelasItem, type SiswaAbsensi, type AbsensiMeta,
} from "@/lib/services/absensi.service";
import { formatKelasLabel } from "@/lib/utils/kelas";

export default function ManualAttendancePage() {
  const router = useRouter();

  // State hari
  const [loadingHari, setLoadingHari] = useState(true);

  // State kelas
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingKelas, setLoadingKelas] = useState(true);

  // State siswa
  const [siswaList, setSiswaList] = useState<SiswaAbsensi[]>([]);
  const [meta, setMeta] = useState<AbsensiMeta | null>(null);
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  // State aksi
  const [pendingNis, setPendingNis] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saveResult, setSaveResult] = useState<{ berhasil: number; gagal: number } | null>(null);

  // Search
  const [search, setSearch] = useState("");

  const safeKelasList = Array.isArray(kelasList) ? kelasList : [];
  const safeSiswaList = Array.isArray(siswaList) ? siswaList : [];

  // ── Cek hari libur ──
  useEffect(() => {
    async function checkHari() {
      try {
        const data = await getInfoHariIni();
        if (data.isLibur) { router.replace("/guru/absensi"); return; }
      } catch (err) {
        console.error("Gagal cek info hari:", err);
      } finally {
        setLoadingHari(false);
      }
    }
    checkHari();
  }, []);

  // ── Load kelas ──
  useEffect(() => {
    async function loadKelas() {
      try {
        const data = await getKelasList();
        setKelasList(data);
      } catch (err) {
        console.error("Gagal load kelas:", err);
      } finally {
        setLoadingKelas(false);
      }
    }
    loadKelas();
  }, []);

  // ── Pilih kelas ──
  async function handleSelectKelas(kelas: KelasItem) {
    setSelectedKelas(kelas);
    setIsDropdownOpen(false);
    setPendingNis(new Set());
    setSearch("");
    setLoadingSiswa(true);
    try {
      clearSiswaCache(kelas.id);
      const { siswa, meta } = await getSiswaByKelas(kelas.id, true);
      setSiswaList(siswa);
      setMeta(meta);
    } catch (err) {
      console.error("Gagal load siswa:", err);
    } finally {
      setLoadingSiswa(false);
    }
  }

  // ── Refresh ──
  async function handleRefresh() {
    if (!selectedKelas) return;
    setLoadingSiswa(true);
    clearSiswaCache(selectedKelas.id);
    try {
      const { siswa, meta } = await getSiswaByKelas(selectedKelas.id, true);
      setSiswaList(siswa);
      setMeta(meta);
      setPendingNis(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSiswa(false);
    }
  }

  // ── Toggle siswa ──
  function toggleSiswa(nis: string, sudahAbsen: boolean, izinAda: boolean) {
    if (sudahAbsen || izinAda) return;
    setPendingNis((prev) => {
      const next = new Set(prev);
      next.has(nis) ? next.delete(nis) : next.add(nis);
      return next;
    });
  }

  // ── Simpan ──
  async function handleSave() {
    if (!selectedKelas || pendingNis.size === 0) return;
    setSaving(true);
    try {
      const result = await bulkManualAbsensi(Array.from(pendingNis), selectedKelas.id);
      setSaveResult({ berhasil: result.berhasil.length, gagal: result.gagal.length });
      setShowSuccessModal(true);
      const { siswa, meta } = await getSiswaByKelas(selectedKelas.id, true);
      setSiswaList(siswa);
      setMeta(meta);
      setPendingNis(new Set());
    } catch (err: any) {
      console.error("Gagal simpan:", err);
    } finally {
      setSaving(false);
    }
  }

  // ── Filter ──
  const filteredSiswa = safeSiswaList.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search)
  );

  const sudahAbsenCount = safeSiswaList.filter((s) => s.sudahAbsen).length;
  const izinCount = safeSiswaList.filter((s) => s.izinHariIni?.ada).length;
  const pendingCount = pendingNis.size;

  // ── Checking ──
  if (loadingHari) {
    return (
      <main className="dashboard-page manual-page">
        <div className="bg-blob blob-1" />
        <div className="loading-state glass-panel" style={{ marginTop: 80 }}>
          <Loader2 size={32} className="spinner-anim" style={{ color: "#179EFF" }} />
          <p>Memeriksa jadwal hari ini...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page manual-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <div className="dashboard-container guru-layout-medium manual-container">

        {/* ── Header ── */}
        <header className="dash-header">
          <button className="btn-icon" onClick={() => router.back()} title="Kembali">
            <ArrowLeft size={17} />
          </button>
          <h2 className="page-title-manual">Absensi Manual</h2>
          <div style={{ width: 42 }} />
        </header>

        {/* ── Dropdown Kelas ── */}
        <div className="dropdown-wrapper">
          <div
            className={`class-selector ${isDropdownOpen ? "active" : ""}`}
            onClick={() => !loadingKelas && setIsDropdownOpen(!isDropdownOpen)}
          >
            {loadingKelas ? (
              <span className="selector-placeholder">Memuat kelas...</span>
            ) : (
              <span>
                {selectedKelas
                  ? formatKelasLabel(selectedKelas)
                  : <span className="selector-placeholder">Pilih Kelas...</span>}
              </span>
            )}
            {isDropdownOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {isDropdownOpen && (
            <div className="dropdown-menu glass-panel">
              {safeKelasList.length === 0 ? (
                <div className="dropdown-item">
                  <span className="selector-placeholder">Tidak ada kelas</span>
                </div>
              ) : (
                safeKelasList.map((kelas) => (
                  <div
                    key={kelas.id}
                    className={`dropdown-item ${selectedKelas?.id === kelas.id ? "selected" : ""}`}
                    onClick={() => handleSelectKelas(kelas)}
                  >
                    <span>{formatKelasLabel(kelas)}</span>
                    {selectedKelas?.id === kelas.id && (
                      <Check size={14} style={{ color: "var(--accent-text)" }} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Loading siswa ── */}
        {loadingSiswa && (
          <div className="loading-state glass-panel">
            <Loader2 size={30} className="spinner-anim" style={{ color: "#179EFF" }} />
            <p>Memuat data siswa...</p>
          </div>
        )}

        {/* ── List Siswa ── */}
        {selectedKelas && !loadingSiswa && (
          <div className="student-list-card glass-panel fade-in">

            {/* Info bar */}
            <div className="list-header-info">
              <div className="list-header-stats">
                <div className="stat-pill">
                  Total <span>{safeSiswaList.length}</span>
                </div>
                <div className="stat-pill">
                  Hadir <span className="c-green">{sudahAbsenCount}</span>
                </div>
                {izinCount > 0 && (
                  <div className="stat-pill">
                    Izin <span style={{ color: "#60a5fa" }}>{izinCount}</span>
                  </div>
                )}
                <div className="stat-pill">
                  Belum <span className="c-amber">
                    {safeSiswaList.length - sudahAbsenCount - izinCount}
                  </span>
                </div>
                {pendingCount > 0 && (
                  <div className="stat-pill">
                    Dipilih <span className="c-accent">{pendingCount}</span>
                  </div>
                )}
              </div>
              <button className="btn-refresh" onClick={handleRefresh} title="Refresh">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Search */}
            <div className="search-wrapper">
              <Search size={13} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Cari nama atau NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Rows */}
            <div className="list-scroll-area">
              {filteredSiswa.length === 0 ? (
                <div className="list-empty-msg">Tidak ditemukan</div>
              ) : (
                filteredSiswa.map((siswa) => {
                  const isPending = pendingNis.has(siswa.nis);
                  const isIzin = Boolean(siswa.izinHariIni?.ada);
                  const isLocked = siswa.sudahAbsen || isIzin;
                  const isChecked = siswa.sudahAbsen || isPending || isIzin;

                  // Status label
                  const statusLabel = isIzin
                    ? "Izin / Sakit"
                    : siswa.sudahAbsen
                      ? "Sudah Hadir"
                      : isPending
                        ? "Akan Diabsen"
                        : "Belum Absen";

                  const statusClass = isIzin
                    ? "is-izin"
                    : siswa.sudahAbsen
                      ? "is-present"
                      : isPending
                        ? "is-pending"
                        : "not-present";

                  return (
                    <div
                      key={siswa.nis}
                      className={`student-row ${isChecked ? "active" : "inactive"} ${isLocked ? "locked" : ""} ${isIzin ? "izin-row" : ""}`}
                      onClick={() => toggleSiswa(siswa.nis, siswa.sudahAbsen, isIzin)}
                    >
                      <div className="student-info-col">
                        <span className="student-name">{siswa.nama}</span>
                        <span className="student-nis">{siswa.nis}</span>
                        {isIzin && (
                          <span className="izin-chip">
                            {siswa.izinHariIni?.tipe ?? "izin"}
                            {siswa.izinHariIni?.catatan ? ` · ${siswa.izinHariIni.catatan}` : ""}
                          </span>
                        )}
                        <span className={`status-text ${statusClass}`}>{statusLabel}</span>
                      </div>

                      <div className="student-meta-col">
                        <span className="streak-info">🔥 {siswa.streak}</span>
                        <div className={`custom-checkbox ${isChecked ? (isIzin ? "checked-izin" : "checked") : ""} ${isLocked ? "locked" : ""}`}>
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Save */}
            <div className="action-area">
              <button
                className="btn-save-green"
                onClick={handleSave}
                disabled={pendingNis.size === 0 || saving}
              >
                {saving ? (
                  <><Loader2 size={16} className="spinner-anim" /> Menyimpan...</>
                ) : pendingNis.size > 0 ? (
                  <><Check size={17} /> Simpan Absensi ({pendingNis.size} Siswa)</>
                ) : (
                  <><Users size={17} /> Pilih siswa terlebih dahulu</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!selectedKelas && !loadingKelas && (
          <div className="empty-state glass-panel">
            <Users size={32} style={{ color: "var(--text-ghost)", opacity: 0.5 }} />
            <p>Pilih kelas untuk melihat daftar siswa</p>
          </div>
        )}
      </div>

      {/* ── Modal Sukses ── */}
      {showSuccessModal && saveResult && (
        <div className="modal-overlay">
          <div className="success-modal glass-panel">
            <div className="success-icon-wrap">
              <CheckCircle2 size={40} />
            </div>
            <h3>Tersimpan!</h3>
            <p>
              <b style={{ color: "#10b981" }}>{saveResult.berhasil} siswa</b> berhasil diabsen.
              {saveResult.gagal > 0 && (
                <><br /><span style={{ color: "#ef4444" }}>{saveResult.gagal} gagal</span> (mungkin sudah absen).</>
              )}
            </p>
            <button className="btn-save-green" style={{ width: "100%" }} onClick={() => setShowSuccessModal(false)}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
  );
}