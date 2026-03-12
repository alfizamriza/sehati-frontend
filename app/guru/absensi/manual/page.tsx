"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp, Check,
  CheckCircle2, Loader2, RefreshCw, Search,
} from "lucide-react";
import "./manual.css";
import {
  getKelasList, getSiswaByKelas, bulkManualAbsensi,
  clearSiswaCache, getInfoHariIni,
  type KelasItem, type SiswaAbsensi, type AbsensiMeta,
} from "@/lib/services/absensi.service";

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

  // Pencarian
  const [search, setSearch] = useState("");
  const safeKelasList = Array.isArray(kelasList) ? kelasList : [];
  const safeSiswaList = Array.isArray(siswaList) ? siswaList : [];

  // ============================================
  // CEK HARI LIBUR — jika libur, redirect ke
  // /guru/absensi tanpa render halaman ini
  // ============================================
  useEffect(() => {
    async function checkHari() {
      try {
        const data = await getInfoHariIni();
        if (data.isLibur) {
          router.replace("/guru/absensi");
          return;
        }
      } catch (err) {
        console.error("Gagal cek info hari:", err);
      } finally {
        setLoadingHari(false);
      }
    }
    checkHari();
  }, []);

  // ============================================
  // LOAD DAFTAR KELAS
  // ============================================
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

  // ============================================
  // LOAD SISWA SAAT KELAS DIPILIH
  // ============================================
  async function handleSelectKelas(kelas: KelasItem) {
    setSelectedKelas(kelas);
    setIsDropdownOpen(false);
    setPendingNis(new Set());
    setSearch("");
    setLoadingSiswa(true);

    try {
      const { siswa, meta } = await getSiswaByKelas(kelas.id);
      setSiswaList(siswa);
      setMeta(meta);
    } catch (err) {
      console.error("Gagal load siswa:", err);
    } finally {
      setLoadingSiswa(false);
    }
  }

  // ============================================
  // REFRESH LIST SISWA
  // ============================================
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

  // ============================================
  // TOGGLE SISWA (hanya yang belum absen)
  // ============================================
  function toggleSiswa(nis: string, sudahAbsen: boolean) {
    if (sudahAbsen) return;
    setPendingNis((prev) => {
      const next = new Set(prev);
      if (next.has(nis)) next.delete(nis);
      else next.add(nis);
      return next;
    });
  }

  // ============================================
  // SIMPAN — kirim bulk absensi
  // ============================================
  async function handleSave() {
    if (!selectedKelas || pendingNis.size === 0) return;
    setSaving(true);

    try {
      const result = await bulkManualAbsensi(Array.from(pendingNis), selectedKelas.id);
      setSaveResult({
        berhasil: result.berhasil.length,
        gagal: result.gagal.length,
      });
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

  // ============================================
  // FILTER PENCARIAN
  // ============================================
  const filteredSiswa = safeSiswaList.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    s.nis.includes(search)
  );

  const sudahAbsenCount = safeSiswaList.filter((s) => s.sudahAbsen).length;
  const pendingCount = pendingNis.size;

  // Spinner saat cek hari libur berlangsung
  if (loadingHari) {
    return (
      <main className="dashboard-page manual-page">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
        <div className="dashboard-container guru-layout-medium manual-container">
          <div className="loading-state glass-panel" style={{ marginTop: 80 }}>
            <Loader2 size={32} className="spinner-anim" />
            <p>Memeriksa jadwal hari ini...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page manual-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <div className="dashboard-container guru-layout-medium manual-container">

        {/* HEADER */}
        <header className="dash-header">
          <button className="btn-icon" onClick={() => router.back()} title="Kembali">
            <ArrowLeft size={17} />
          </button>
          <h2 className="page-title-manual">Absensi Manual</h2>
          <div style={{ width: 42 }} />
        </header>

        {/* DROPDOWN KELAS */}
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
                  ? `${selectedKelas.tingkat} - ${selectedKelas.nama}`
                  : "Pilih Kelas..."}
              </span>
            )}
            {isDropdownOpen
              ? <ChevronUp size={20} />
              : <ChevronDown size={20} />
            }
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
                    <span>{kelas.tingkat} - {kelas.nama}</span>
                    <span className="dropdown-item-sub">{kelas.jenjang}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* LOADING SISWA */}
        {loadingSiswa && (
          <div className="loading-state glass-panel">
            <Loader2 size={32} className="spinner-anim" />
            <p>Memuat data siswa...</p>
          </div>
        )}

        {/* LIST SISWA */}
        {selectedKelas && !loadingSiswa && (
          <div className="student-list-card glass-panel fade-in">

            {/* Info bar */}
            <div className="list-header-info">
              <div style={{ display: "flex", gap: 12 }}>
                <p>Total: <b>{safeSiswaList.length}</b></p>
                <p>Hadir: <b className="text-green">{sudahAbsenCount}</b></p>
                <p>Belum: <b className="text-amber">{safeSiswaList.length - sudahAbsenCount}</b></p>
                {pendingCount > 0 && (
                  <p>Dipilih: <b className="text-accent">{pendingCount}</b></p>
                )}
              </div>
              <button className="btn-refresh" onClick={handleRefresh} title="Refresh data">
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Cari nama atau NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Daftar siswa */}
            <div className="list-scroll-area">
              {filteredSiswa.length === 0 ? (
                <div className="list-empty-msg">Tidak ditemukan</div>
              ) : (
                filteredSiswa.map((siswa) => {
                  const isPending = pendingNis.has(siswa.nis);
                  const isChecked = siswa.sudahAbsen || isPending;
                  const isLocked = siswa.sudahAbsen;

                  return (
                    <div
                      key={siswa.nis}
                      className={`student-row ${isChecked ? "active" : "inactive"} ${isLocked ? "locked" : ""}`}
                      onClick={() => toggleSiswa(siswa.nis, siswa.sudahAbsen)}
                    >
                      <div className="student-info-col">
                        <span className="student-name">{siswa.nama}</span>
                        <span className="student-nis">{siswa.nis}</span>
                        <span className={`status-text ${isChecked ? "is-present" : "not-present"}`}>
                          {siswa.sudahAbsen
                            ? "● Sudah Hadir"
                            : isPending
                            ? "◉ Akan Diabsen"
                            : "○ Belum Absen"}
                        </span>
                      </div>

                      <div className="student-meta-col">
                        <span className="streak-info">🔥 {siswa.streak}</span>
                        <div className={`custom-checkbox ${isChecked ? "checked" : ""} ${isLocked ? "locked" : ""}`}>
                          {isChecked && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tombol simpan */}
            <div className="action-area">
              <button
                className="btn-save-green"
                onClick={handleSave}
                disabled={pendingNis.size === 0 || saving}
              >
                {saving ? (
                  <><Loader2 size={16} className="spinner-anim" /> Menyimpan...</>
                ) : (
                  `Simpan ${pendingNis.size > 0 ? `(${pendingNis.size} siswa)` : ""}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!selectedKelas && !loadingKelas && (
          <div className="empty-state glass-panel">
            <p>Silakan pilih kelas terlebih dahulu.</p>
          </div>
        )}
      </div>

      {/* MODAL SUKSES */}
      {showSuccessModal && saveResult && (
        <div className="modal-overlay">
          <div className="success-modal glass-panel">
            <div className="success-icon-badge">
              <CheckCircle2 size={64} />
            </div>
            <h3>Tersimpan!</h3>
            <p>
              <b className="text-green">{saveResult.berhasil} siswa</b> berhasil diabsen.
              {saveResult.gagal > 0 && (
                <><br /><span className="text-red">{saveResult.gagal} gagal</span> (mungkin sudah absen).</>
              )}
            </p>
            <button className="btn-save-green" onClick={() => setShowSuccessModal(false)}>
              Tutup
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinner-anim { animation: spin 1s linear infinite; }

        /* Judul halaman — ikut var global */
        .page-title-manual {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          text-align: center;
          color: var(--text-primary);
        }

        /* Warna semantik yang dipakai di JSX */
        .text-amber { color: #F59E0B; }
        .text-accent { color: var(--accent-text); }
        .text-red    { color: #EF4444; }

        /* Sub teks dropdown */
        .dropdown-item-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Placeholder selector */
        .selector-placeholder {
          color: var(--text-muted);
        }

        /* List empty message */
        .list-empty-msg {
          text-align: center;
          padding: 24px;
          color: var(--text-ghost);
          font-size: 13px;
        }

        /* Status "Akan Diabsen" di dark */
        .student-row.active .status-text:not(.is-present) {
          color: var(--accent-text);
        }

        @media (prefers-color-scheme: light) {
          .text-amber { color: #b45309; }
          .text-red   { color: #dc2626; }

          /* Status "Akan Diabsen" di light */
          .student-row.active .status-text:not(.is-present) {
            color: #0369a1;
          }
        }
      `}</style>
    </main>
  );
}