"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp, Check,
  CheckCircle2, Loader2, RefreshCw, Search, Users,
} from "lucide-react";
import "./manual.css";
import {
  getKelasList, getSiswaByKelas, bulkManualAbsensi,
  clearSiswaCache, getInfoHariIni,
  type KelasItem, type SiswaAbsensi, type AbsensiMeta,
} from "@/lib/services/absensi.service";
import { formatKelasLabel, toRoman } from "@/lib/utils/kelas";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";

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
  const romanOrder: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
  function getTingkatRoman(tingkat: string | number) {
    if (typeof tingkat === "string") {
      const normalized = tingkat.trim().toUpperCase();
      if (normalized) return normalized;
    }
    const parsed = Number(tingkat);
    return Number.isFinite(parsed) ? toRoman(parsed) : "-";
  }
  function getTingkatOrderValue(tingkat: string | number) {
    if (typeof tingkat === "string") {
      const normalized = tingkat.trim().toUpperCase();
      if (romanOrder[normalized]) return romanOrder[normalized];
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
    const parsed = Number(tingkat);
    return Number.isFinite(parsed) ? parsed : 99;
  }
  const orderedKelasList = [...safeKelasList].sort((a, b) => {
    const jenjangOrder: Record<string, number> = { SD: 1, SMP: 2, SMA: 3 };
    const byJenjang = (jenjangOrder[a.jenjang] ?? 99) - (jenjangOrder[b.jenjang] ?? 99);
    if (byJenjang !== 0) return byJenjang;
    const byTingkat = getTingkatOrderValue(a.tingkat) - getTingkatOrderValue(b.tingkat);
    if (byTingkat !== 0) return byTingkat;
    return a.nama.localeCompare(b.nama, "id");
  });

  function getKelasDisplay(kelas: KelasItem) {
    const tingkatRoman = getTingkatRoman(kelas.tingkat);
    return {
      title: `${tingkatRoman} ${kelas.nama}`,
      subtitle: kelas.jenjang,
      fullLabel: formatKelasLabel(kelas),
    };
  }

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
    <main className="dashboard-page manual-page manual-page--with-nav">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <div className="dashboard-container dashboard-layout-medium manual-container">

        {/* ── Header ── */}
        <header className="scanner-header" style={{ marginBottom: 16 }}>
          <button className="btn-icon back-btn" onClick={() => router.push("/siswa/absensi")}>
            <ArrowLeft size={16} />
          </button>
          <h2 className="page-title">Absensi Manual</h2>
          <div className="spacer" />
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
              selectedKelas ? (
                <span className="selector-value">
                  <span className="selector-title">{getKelasDisplay(selectedKelas).title}</span>
                  <span className="selector-subtitle">{selectedKelas.jenjang}</span>
                </span>
              ) : <span className="selector-placeholder">Pilih Kelas...</span>
            )}
            {isDropdownOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {isDropdownOpen && (
            <div className="dropdown-menu glass-panel">
              {orderedKelasList.length === 0 ? (
                <div className="dropdown-item">
                  <span className="selector-placeholder">Tidak ada kelas</span>
                </div>
              ) : (
                orderedKelasList.map((kelas) => (
                  <div
                    key={kelas.id}
                    className={`dropdown-item ${selectedKelas?.id === kelas.id ? "selected" : ""}`}
                    onClick={() => handleSelectKelas(kelas)}
                  >
                    <span className="dropdown-item-copy">
                      <span>{getKelasDisplay(kelas).title}</span>
                      <span className="dropdown-item-sub">{kelas.jenjang}</span>
                    </span>
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

      <BottomNavSiswa />
    </main>
  );
}

