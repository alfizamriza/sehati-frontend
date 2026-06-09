"use client";

import { useMemo, useState, useEffect } from "react";
import {
  createKelas, deleteKelas, getCachedClasses,
  getClasses, transferStudents, updateKelas,
} from "@/lib/services/admin";
import type { Class } from "@/lib/dummy/types";
import {
  Plus, Search, Users, School, Pencil, Trash2, X, Save,
  ChevronDown, ChevronUp, User, CheckCircle2, AlertCircle, Loader2,
  ArrowRightLeft,
} from "lucide-react";
import { createPortal } from "react-dom";

type JenjangOption = Class["jenjang"];
type TingkatOption = Class["tingkat"];

const TINGKAT_OPTIONS: Record<JenjangOption, TingkatOption[]> = {
  SD: ["I", "II", "III", "IV", "V", "VI"],
  SMP: ["VII", "VIII", "IX"],
  SMA: ["X", "XI", "XII"],
};
const TINGKAT_TO_NUMBER: Record<TingkatOption, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function KelasPage() {
  const [dataKelas, setDataKelas] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterJenjang, setFilterJenjang] = useState<"ALL" | JenjangOption>("ALL");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [currentId, setCurrentId] = useState<string | number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>(
    { show: false, msg: "", type: "success" }
  );
  const [formData, setFormData] = useState({
    namaKelas: "", jenjang: "" as JenjangOption | "",
    tingkat: "" as TingkatOption | "", kapasitas: 32,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string | number } | null>(null);

  // Transfer state
  const [transferSourceKelasId, setTransferSourceKelasId] = useState<string | number | null>(null);
  const [selectedStudentsForTransfer, setSelectedStudentsForTransfer] = useState<Set<string>>(new Set());
  const [transferTargetKelasId, setTransferTargetKelasId] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
  };

  useEffect(() => {
    let mounted = true;
    const cached = getCachedClasses();
    if (cached) {
      setDataKelas(cached);
      setIsLoading(false);
    }

    getClasses({ forceRefresh: true })
      .then((d) => { if (mounted) setDataKelas(d); })
      .catch(() => showToast("Gagal memuat data kelas", "error"))
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => dataKelas.filter((k) => {
    const matchQ = k.namaKelas.toLowerCase().includes(query.toLowerCase()) ||
      (k.waliKelas || "").toLowerCase().includes(query.toLowerCase());
    return matchQ && (filterJenjang === "ALL" || k.jenjang === filterJenjang);
  }), [dataKelas, query, filterJenjang]);

  const transferSourceKelas = useMemo(
    () => dataKelas.find((k) => k.id === transferSourceKelasId) ?? null,
    [dataKelas, transferSourceKelasId]
  );
  const transferTargetKelas = useMemo(
    () => dataKelas.find((k) => Number(k.id) === transferTargetKelasId) ?? null,
    [dataKelas, transferTargetKelasId]
  );
  const selectedTransferCount = selectedStudentsForTransfer.size;
  const targetRemainingSeats = transferTargetKelas
    ? Math.max(transferTargetKelas.kapasitas - transferTargetKelas.siswaAktif, 0)
    : 0;
  const isTargetCapacityEnough = Boolean(
    transferTargetKelas && targetRemainingSeats >= selectedTransferCount
  );

  const handleSave = async () => {
    if (!formData.namaKelas || !formData.jenjang || !formData.tingkat) {
      showToast("Lengkapi semua form wajib!", "error"); return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        nama: formData.namaKelas.trim(), jenjang: formData.jenjang as JenjangOption,
        tingkat: TINGKAT_TO_NUMBER[formData.tingkat as TingkatOption],
        kapasitasMaksimal: Number(formData.kapasitas),
      };
      if (modalMode === "add") await createKelas(payload);
      else await updateKelas(Number(currentId), payload);
      setDataKelas(await getClasses({ forceRefresh: true }));
      setIsModalOpen(false);
      showToast(modalMode === "add" ? "Kelas berhasil dibuat!" : "Kelas berhasil diperbarui!", "success");
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Terjadi kesalahan"), "error");
    } finally { setIsSubmitting(false); }
  };

  const confirmDelete = (id: string | number) => {
    setDeleteConfirm({ id });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteKelas(Number(deleteConfirm.id));
      setDataKelas((p) => p.filter((k) => k.id !== deleteConfirm.id));
      showToast("Kelas berhasil dihapus", "success");
    } catch {
      showToast("Gagal menghapus kelas", "error");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const closeTransferModal = () => {
    setTransferSourceKelasId(null);
    setSelectedStudentsForTransfer(new Set());
    setTransferTargetKelasId(null);
  };

  const startTransfer = (kelasId: string | number) => {
    setTransferSourceKelasId(kelasId);
    setSelectedStudentsForTransfer(new Set());
    setTransferTargetKelasId(null);
  };

  const toggleStudentSelection = (nis: string) => {
    const newSet = new Set(selectedStudentsForTransfer);
    if (newSet.has(nis)) {
      newSet.delete(nis);
    } else {
      newSet.add(nis);
    }
    setSelectedStudentsForTransfer(newSet);
  };

  const toggleAllTransferStudents = () => {
    if (!transferSourceKelas?.peserta?.length) return;
    if (selectedStudentsForTransfer.size === transferSourceKelas.peserta.length) {
      setSelectedStudentsForTransfer(new Set());
      return;
    }
    setSelectedStudentsForTransfer(new Set(transferSourceKelas.peserta.map((p) => p.nis)));
  };

  const handleTransferStudents = async () => {
    if (!transferSourceKelasId || !transferTargetKelasId || selectedTransferCount === 0) {
      showToast("Data transfer tidak lengkap", "error");
      return;
    }
    if (!isTargetCapacityEnough) {
      showToast("Kapasitas kelas tujuan tidak mencukupi", "error");
      return;
    }

    setIsTransferring(true);
    try {
      const result = await transferStudents(
        Number(transferSourceKelasId),
        Array.from(selectedStudentsForTransfer),
        transferTargetKelasId,
      );
      setDataKelas(await getClasses({ forceRefresh: true }));
      closeTransferModal();
      showToast(result.message || "Siswa berhasil dipindahkan", "success");
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "Gagal memindahkan siswa"), "error");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      <div className="toast-container">
        {toast.show && (
          <div className="toast-item" style={{
            borderColor: toast.type === "success" ? "rgba(5,150,105,0.35)" : "rgba(239,68,68,0.35)",
            background: toast.type === "success"
              ? "linear-gradient(135deg,rgba(5,150,105,0.15),rgba(5,150,105,0.08))"
              : "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08))",
          }}>
            {toast.type === "success"
              ? <CheckCircle2 size={15} style={{ color: "var(--green)", flexShrink: 0 }} />
              : <AlertCircle size={15} style={{ color: "var(--red)", flexShrink: 0 }} />}
            {toast.msg}
          </div>
        )}
      </div>

      <div className="dashboard-wrapper">
        {/* Action Bar */}
        <div className="action-bar">
          <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap", minWidth: 0 }}>
            <div className="search-container" style={{ flex: 1, maxWidth: 360 }}>
              <Search size={17} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <input type="text" className="search-input" placeholder="Cari kelas atau wali kelas..."
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="jenjang-filter-group">
              {(["ALL", "SD", "SMP", "SMA"] as const).map((j) => (
                <button key={j} type="button"
                  className={`jenjang-filter-btn ${filterJenjang === j ? "active" : ""}`}
                  onClick={() => setFilterJenjang(j)}>
                  {j === "ALL" ? "Semua" : j}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => {
            setModalMode("add");
            setFormData({ namaKelas: "", jenjang: "", tingkat: "", kapasitas: 32 });
            setIsModalOpen(true);
          }}>
            <Plus size={17} /> Tambah Kelas
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="kelas-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="kelas-card" style={{ minHeight: 230 }}>
                {[46, 20, 14, 60].map((_, j) => (
                  <div key={j} className="skeleton-shimmer" style={{
                    width: j === 0 ? 46 : j === 1 ? "55%" : "80%",
                    height: j === 0 ? 46 : 14, marginBottom: 14,
                  }} />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <School size={40} className="empty-state-icon" />
            <span className="empty-state-text">
              {query || filterJenjang !== "ALL" ? "Tidak ada kelas ditemukan." : "Belum ada data kelas."}
            </span>
          </div>
        ) : (
          <div className="kelas-grid">
            {filtered.map((k) => {
              const occ = k.kapasitas > 0 ? Math.round((k.siswaAktif / k.kapasitas) * 100) : 0;
              const fillClass = occ > 90 ? "full" : occ > 70 ? "warn" : "ok";
              return (
                <div key={k.id} className="kelas-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <span className={`jenjang-pill ${k.jenjang}`}>{k.jenjang}</span>
                      <span className="tingkat-pill">Tingkat {k.tingkat}</span>
                    </div>
                    <div className="lb-stat-icon" style={{ width: 36, height: 36, flexShrink: 0 }}>
                      <School size={16} style={{ color: "var(--primary)" }} />
                    </div>
                  </div>

                  <div>
                    <h3 className="kelas-name">{k.namaKelas}</h3>
                    <div className="kelas-wali-row">
                      <div className="kelas-wali-avatar"><User size={12} /></div>
                      {k.waliKelas || (
                        <span style={{ fontStyle: "italic", color: "var(--text-faint)" }}>Tanpa Wali Kelas</span>
                      )}
                    </div>
                  </div>

                  <div className="occupancy-box">
                    <div className="occupancy-label-row">
                      <span>Okupansi Siswa</span>
                      <strong style={{ color: occ > 90 ? "var(--red)" : "var(--text-main)" }}>
                        {k.siswaAktif} / {k.kapasitas}
                      </strong>
                    </div>
                    <div className="occupancy-track">
                      <div className={`occupancy-fill ${fillClass}`} style={{ width: `${Math.min(occ, 100)}%` }} />
                    </div>
                  </div>

                  <div className="kelas-actions">
                    <button type="button" className="btn-expand"
                      onClick={() => setExpandedId(expandedId === k.id ? null : k.id)}>
                      <Users size={14} /> Siswa
                      {expandedId === k.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button type="button" className="btn-icon-sq edit" title="Edit" onClick={() => {
                      setCurrentId(k.id); setModalMode("edit");
                      setFormData({ namaKelas: k.namaKelas, jenjang: k.jenjang, tingkat: k.tingkat, kapasitas: k.kapasitas });
                      setIsModalOpen(true);
                    }}><Pencil size={15} /></button>
                    <button type="button" className="btn-icon-sq delete" title="Hapus"
                      onClick={() => confirmDelete(k.id)}>
                      <Trash2 size={15} />
                    </button>
                    <button type="button" className="btn-icon-sq transfer" title="Pindah Siswa"
                      onClick={() => startTransfer(k.id)}>
                      <ArrowRightLeft size={15} />
                    </button>
                  </div>

                  {expandedId === k.id && (
                    <div className="siswa-list-expanded">
                      {k.peserta?.length ? (
                        k.peserta.map((p, i) => (
                          <div key={`${p.nis}-${i}`} className="siswa-list-row">
                            <span>{p.nama}</span>
                            <small>{p.nis}</small>
                          </div>
                        ))
                      ) : (
                        <span className="siswa-list-empty">Belum ada siswa di kelas ini</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteConfirm && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400 }}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trash2 size={18} style={{ color: "var(--red)" }} />
                Hapus Kelas
              </h3>
              <button className="modal-close-btn" onClick={() => setDeleteConfirm(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: "center", padding: "24px 32px" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--red-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <School size={22} style={{ color: "var(--red)" }} />
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 6 }}>
                Apakah kamu yakin ingin menghapus kelas
              </p>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)", marginBottom: 8 }}>
                &quot;{dataKelas.find((k) => k.id === deleteConfirm.id)?.namaKelas ?? ""}&quot;?
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
                Kelas tidak dapat dihapus jika masih terdapat siswa di dalam kelas ini.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Batal
              </button>
              <button
                className="btn"
                onClick={handleDelete}
                style={{ background: "var(--red)", color: "#fff", border: "none" }}
              >
                <Trash2 size={15} /> Ya, Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Tambah/Edit Kelas */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === "add" ? "Tambah Kelas Baru" : "Edit Data Kelas"}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Kelas</label>
                <input type="text" className="form-input" placeholder="Contoh: XII RPL 1"
                  value={formData.namaKelas}
                  onChange={(e) => setFormData({ ...formData, namaKelas: e.target.value })} />
              </div>
              <div className="form-grid-equal">
                <div className="form-group">
                  <label className="form-label">Jenjang</label>
                  <select className="form-input" value={formData.jenjang}
                    onChange={(e) => setFormData({ ...formData, jenjang: e.target.value as JenjangOption, tingkat: "" })}>
                    <option value="">Pilih</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tingkat</label>
                  <select className="form-input" value={formData.tingkat}
                    disabled={!formData.jenjang}
                    style={!formData.jenjang ? { opacity: 0.5 } : {}}
                    onChange={(e) => setFormData({ ...formData, tingkat: e.target.value as TingkatOption })}>
                    <option value="">Pilih</option>
                    {formData.jenjang && TINGKAT_OPTIONS[formData.jenjang].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Kapasitas Maksimal</label>
                <input type="number" className="form-input" min={1}
                  value={formData.kapasitas}
                  onChange={(e) => setFormData({ ...formData, kapasitas: Number(e.target.value) })} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={15} className="spin" /> Menyimpan...</> : <><Save size={15} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pindah Siswa */}
      {transferSourceKelasId && createPortal(
        <div className="modal-overlay" onClick={closeTransferModal}>
          <div className="modal-content transfer-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ArrowRightLeft size={18} />
                Pindah Siswa
              </h3>
              <button className="modal-close-btn" onClick={closeTransferModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="transfer-summary">
                <div>
                  <span className="transfer-summary-label">Dari kelas</span>
                  <strong>{transferSourceKelas?.namaKelas ?? "-"}</strong>
                </div>
                <div>
                  <span className="transfer-summary-label">Dipilih</span>
                  <strong>{selectedTransferCount} siswa</strong>
                </div>
              </div>

              <div className="transfer-grid">
                <section className="transfer-panel">
                  <div className="transfer-panel-head">
                    <div>
                      <span className="form-label">Pilih Siswa</span>
                      <p>Pilih satu atau beberapa siswa yang akan dipindahkan.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={toggleAllTransferStudents}
                      disabled={!transferSourceKelas?.peserta?.length}
                    >
                      {transferSourceKelas?.peserta?.length &&
                      selectedStudentsForTransfer.size === transferSourceKelas.peserta.length
                        ? "Kosongkan"
                        : "Pilih Semua"}
                    </button>
                  </div>

                  <div className="transfer-student-list">
                    {transferSourceKelas?.peserta?.length ? (
                      transferSourceKelas.peserta.map((p) => (
                        <label key={p.nis} className="transfer-student-row">
                          <input
                            type="checkbox"
                            checked={selectedStudentsForTransfer.has(p.nis)}
                            onChange={() => toggleStudentSelection(p.nis)}
                          />
                          <span>
                            <strong>{p.nama}</strong>
                            <small>{p.nis}</small>
                          </span>
                        </label>
                      ))
                    ) : (
                      <span className="siswa-list-empty">Belum ada siswa di kelas ini</span>
                    )}
                  </div>
                </section>

                <section className="transfer-panel">
                  <div className="transfer-panel-head">
                    <div>
                      <span className="form-label">Kelas Tujuan</span>
                      <p>Pilih kelas dengan kapasitas yang masih cukup.</p>
                    </div>
                  </div>

                  <div className="transfer-target-list">
                    {dataKelas.filter((k) => k.id !== transferSourceKelasId).map((k) => {
                      const remaining = Math.max(k.kapasitas - k.siswaAktif, 0);
                      const enough = selectedTransferCount > 0 && remaining >= selectedTransferCount;
                      const isSelected = transferTargetKelasId === Number(k.id);

                      return (
                        <button
                          key={k.id}
                          type="button"
                          className={`transfer-target-row ${isSelected ? "selected" : ""}`}
                          onClick={() => setTransferTargetKelasId(Number(k.id))}
                        >
                          <span>
                            <strong>{k.namaKelas}</strong>
                            <small>{k.jenjang} - Tingkat {k.tingkat} - {k.siswaAktif}/{k.kapasitas} siswa</small>
                          </span>
                          <em className={enough ? "ok" : "warn"}>
                            {selectedTransferCount === 0
                              ? `${remaining} kursi`
                              : enough
                              ? `Cukup, sisa ${remaining}`
                              : `Tidak cukup, sisa ${remaining}`}
                          </em>
                        </button>
                      );
                    })}
                  </div>

                  {transferTargetKelas && (
                    <div className={`transfer-capacity-note ${isTargetCapacityEnough ? "ok" : "warn"}`}>
                      {isTargetCapacityEnough
                        ? `Kapasitas cukup. Setelah dipindahkan, ${transferTargetKelas.namaKelas} berisi ${transferTargetKelas.siswaAktif + selectedTransferCount}/${transferTargetKelas.kapasitas} siswa.`
                        : `Kapasitas belum cukup untuk ${selectedTransferCount} siswa. Pilih kelas lain atau kurangi pilihan siswa.`}
                    </div>
                  )}
                </section>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeTransferModal} disabled={isTransferring}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleTransferStudents}
                disabled={isTransferring || selectedTransferCount === 0 || !transferTargetKelasId || !isTargetCapacityEnough}
              >
                {isTransferring
                  ? <><Loader2 size={15} className="spin" /> Memindahkan...</>
                  : <><ArrowRightLeft size={15} /> Pindahkan</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
