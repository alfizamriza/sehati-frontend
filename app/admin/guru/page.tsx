"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getGuru, getCachedGuru, createGuru, updateGuru,
  deleteGuru, getKelasTersedia,
  type Guru, type PeranGuru, type KelasOption,
  type CreateGuruDto, type UpdateGuruDto,
} from "@/lib/services/admin";
import {
  Search, Plus, Pencil, Trash2, X, Save, Filter,
  CheckCircle, XCircle, Shield, BookOpen, Heart,
  Loader2, AlertCircle, UserCog,
} from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PERAN_LABEL: Record<PeranGuru, string> = {
  guru_mapel: "Guru Mapel",
  wali_kelas: "Wali Kelas",
  konselor:   "Konselor",
};

const PERAN_ICON: Record<PeranGuru, React.ReactNode> = {
  guru_mapel: <BookOpen size={13} />,
  wali_kelas: <Shield   size={13} />,
  konselor:   <Heart    size={13} />,
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`status-badge ${active ? "active" : "inactive"}`}>
      {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {active ? "AKTIF" : "NON-AKTIF"}
    </span>
  );
}

function RoleBadge({ peran, kelasLabel }: { peran: PeranGuru; kelasLabel?: string }) {
  return (
    <div>
      <span className={`role-badge ${peran}`}>
        {PERAN_ICON[peran]}
        {PERAN_LABEL[peran]}
      </span>
      {peran === "wali_kelas" && kelasLabel && (
        <span className="role-kelas-sub">{kelasLabel}</span>
      )}
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
interface ToastState { show: boolean; msg: string; type: "success" | "error" }

// ─── FORM STATE ───────────────────────────────────────────────────────────────
interface FormState {
  nip:           string;
  nama:          string;
  password:      string;
  mataPelajaran: string;
  peran:         PeranGuru;
  kelasWaliId:   number | "";
  statusAktif:   boolean;
}

const FORM_EMPTY: FormState = {
  nip: "", nama: "", password: "",
  mataPelajaran: "", peran: "guru_mapel",
  kelasWaliId: "", statusAktif: true,
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function GuruPage() {
  const [dataGuru,       setDataGuru]       = useState<Guru[]>(() => getCachedGuru() || []);
  const [kelasTersedia,  setKelasTersedia]  = useState<KelasOption[]>([]);
  const [query,          setQuery]          = useState("");
  const [filterPeran,    setFilterPeran]    = useState<"Semua" | PeranGuru>("Semua");
  const [isLoading,      setIsLoading]      = useState(() => !getCachedGuru());
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  const [toast, setToast] = useState<ToastState>({ show: false, msg: "", type: "success" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode,   setModalMode]   = useState<"add" | "edit">("add");
  const [currentNip,  setCurrentNip]  = useState<string | null>(null);
  const [formData,    setFormData]    = useState<FormState>(FORM_EMPTY);

  // ── Toast helper ──
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
  };

  // ── Load data ──
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getGuru({ forceRefresh: true });
        if (mounted) setDataGuru(data);
      } catch (err: any) {
        showToast(err.message || "Gagal memuat data guru", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const loadKelasTersedia = useCallback(async (excludeId?: number) => {
    const data = await getKelasTersedia(excludeId);
    setKelasTersedia(data);
  }, []);

  // ── Filter ──
  const filtered = dataGuru.filter((g) => {
    const q = query.toLowerCase();
    const matchQ = g.nama.toLowerCase().includes(q) || g.nip.toLowerCase().includes(q);
    const matchP = filterPeran === "Semua" || g.peran === filterPeran;
    return matchQ && matchP;
  });

  // ── Modal helpers ──
  const openAdd = async () => {
    setModalMode("add");
    setCurrentNip(null);
    setFormData(FORM_EMPTY);
    await loadKelasTersedia();
    setIsModalOpen(true);
  };

  const openEdit = async (guru: Guru) => {
    setModalMode("edit");
    setCurrentNip(guru.nip);
    setFormData({
      nip:           guru.nip,
      nama:          guru.nama,
      password:      "",
      mataPelajaran: guru.mataPelajaran || "",
      peran:         guru.peran,
      kelasWaliId:   guru.kelasWali?.id || "",
      statusAktif:   guru.statusAktif,
    });
    await loadKelasTersedia(guru.kelasWali?.id);
    setIsModalOpen(true);
  };

  const handlePeranChange = async (peran: PeranGuru) => {
    setFormData((p) => ({ ...p, peran, kelasWaliId: "" }));
    if (peran === "wali_kelas") {
      const excludeId = modalMode === "edit" && currentNip
        ? dataGuru.find((g) => g.nip === currentNip)?.kelasWali?.id
        : undefined;
      await loadKelasTersedia(excludeId);
    }
  };

  // ── Save ──
  const handleSave = async () => {
    if (!formData.nip || !formData.nama) {
      showToast("NIP dan Nama wajib diisi!", "error");
      return;
    }
    if (modalMode === "add" && !formData.password) {
      showToast("Password wajib diisi untuk guru baru!", "error");
      return;
    }
    if (formData.peran === "wali_kelas" && !formData.kelasWaliId) {
      showToast("Pilih kelas untuk wali kelas!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        const payload: CreateGuruDto = {
          nip:           formData.nip,
          nama:          formData.nama,
          password:      formData.password,
          mataPelajaran: formData.mataPelajaran || undefined,
          peran:         formData.peran,
          kelasWaliId:   formData.peran === "wali_kelas" ? Number(formData.kelasWaliId) : undefined,
          statusAktif:   formData.statusAktif,
        };
        await createGuru(payload);
        showToast("Guru berhasil ditambahkan!", "success");
      } else {
        const payload: UpdateGuruDto = {
          nama:          formData.nama,
          mataPelajaran: formData.mataPelajaran || undefined,
          peran:         formData.peran,
          kelasWaliId:   formData.peran === "wali_kelas" ? Number(formData.kelasWaliId) : null,
          statusAktif:   formData.statusAktif,
        };
        if (formData.password) payload.password = formData.password;
        await updateGuru(currentNip!, payload);
        showToast("Data guru berhasil diperbarui!", "success");
      }

      const refreshed = await getGuru({ forceRefresh: true });
      setDataGuru(refreshed);
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (nip: string, nama: string) => {
    if (!confirm(`Yakin ingin menghapus data guru ${nama}?`)) return;
    try {
      await deleteGuru(nip);
      showToast(`Guru ${nama} berhasil dihapus`, "success");
      setDataGuru((p) => p.filter((g) => g.nip !== nip));
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus guru", "error");
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toast ── */}
      <div className="toast-container">
        {toast.show && (
          <div
            className="toast-item"
            style={{
              borderColor:      toast.type === "success" ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)",
              background:       toast.type === "success"
                ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))"
                : "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))",
            }}
          >
            {toast.type === "success"
              ? <CheckCircle size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
              : <AlertCircle size={16} style={{ color: "var(--red)",   flexShrink: 0 }} />}
            {toast.msg}
          </div>
        )}
      </div>

      <div className="dashboard-wrapper">

        {/* ── Action Bar ── */}
        <div className="action-bar">
          <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap", minWidth: 0 }}>
            <div className="search-container" style={{ maxWidth: 360, flex: 1 }}>
              <Search size={17} className="search-icon" style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari nama atau NIP..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="search-container" style={{ maxWidth: 180 }}>
              <Filter size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <select
                className="search-input"
                value={filterPeran}
                onChange={(e) => setFilterPeran(e.target.value as any)}
                style={{ cursor: "pointer" }}
              >
                <option value="Semua">Semua Peran</option>
                <option value="guru_mapel">Guru Mapel</option>
                <option value="wali_kelas">Wali Kelas</option>
                <option value="konselor">Konselor</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={17} /> Tambah Guru
          </button>
        </div>

        {/* ── Table ── */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>No</th>
                <th>NIP</th>
                <th>Nama Guru</th>
                <th>Mata Pelajaran</th>
                <th>Peran</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                /* ── Skeleton rows ── */
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {[28, 90, "70%", "55%", 80, 70, 60].map((w, c) => (
                      <td key={c}>
                        <div
                          className="skeleton-shimmer"
                          style={{ width: typeof w === "number" ? w : w }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((guru, idx) => (
                  <tr key={guru.nip}>
                    <td className="cell-mono" style={{ opacity: 0.5 }}>{idx + 1}</td>

                    <td>
                      <span className="cell-mono">{guru.nip}</span>
                    </td>

                    <td>
                      <div className="cell-name-row">
                        <div className="avatar-initial">
                          {guru.nama.charAt(0).toUpperCase()}
                        </div>
                        {guru.nama}
                      </div>
                    </td>

                    <td>
                      {guru.mataPelajaran
                        ? <span className="cell-pill">{guru.mataPelajaran}</span>
                        : <span className="cell-empty">—</span>}
                    </td>

                    <td>
                      <RoleBadge peran={guru.peran} kelasLabel={guru.kelasWali?.label} />
                    </td>

                    <td>
                      <StatusBadge active={guru.statusAktif} />
                    </td>

                    <td>
                      <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
                        <button
                          className="icon-btn btn-edit"
                          onClick={() => openEdit(guru)}
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn btn-delete"
                          onClick={() => handleDelete(guru.nip, guru.nama)}
                          title="Hapus"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "44px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--text-faint)" }}>
                      <UserCog size={32} style={{ opacity: 0.4 }} />
                      <span style={{ fontSize: "0.875rem" }}>
                        {query || filterPeran !== "Semua"
                          ? "Tidak ada guru yang cocok dengan filter."
                          : "Belum ada data guru."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── Modal Add / Edit ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === "add" ? "Tambah Guru Baru" : "Edit Data Guru"}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">

              {/* NIP + Nama */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">NIP</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="19870101..."
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    disabled={modalMode === "edit"}
                    style={modalMode === "edit" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nama guru..."
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  />
                </div>
              </div>

              {/* Mata Pelajaran + Status */}
              <div className="form-grid-equal">
                <div className="form-group">
                  <label className="form-label">
                    Mata Pelajaran
                    <span className="form-hint" style={{ display: "inline", marginLeft: 6, marginTop: 0 }}>
                      (opsional)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Matematika"
                    value={formData.mataPelajaran}
                    onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status Akun</label>
                  <select
                    className="form-input"
                    value={formData.statusAktif ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, statusAktif: e.target.value === "true" })}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Non-Aktif</option>
                  </select>
                </div>
              </div>

              {/* Peran Section */}
              <div className="role-section-panel">
                <div className="role-section-title">Peran &amp; Tanggung Jawab</div>
                <div className={formData.peran === "wali_kelas" ? "role-grid-2" : "role-grid-1"}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.78rem" }}>Role Sistem</label>
                    <select
                      className="form-input"
                      value={formData.peran}
                      onChange={(e) => handlePeranChange(e.target.value as PeranGuru)}
                    >
                      <option value="guru_mapel">Guru Mata Pelajaran</option>
                      <option value="wali_kelas">Wali Kelas</option>
                      <option value="konselor">Konselor</option>
                    </select>
                  </div>

                  {formData.peran === "wali_kelas" && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--amber)" }}>
                        Wali Kelas Untuk
                      </label>
                      <select
                        className={`form-input${kelasTersedia.length > 0 ? " form-input-amber" : ""}`}
                        value={formData.kelasWaliId}
                        onChange={(e) => setFormData({ ...formData, kelasWaliId: Number(e.target.value) })}
                      >
                        <option value="" disabled>Pilih Kelas</option>
                        {kelasTersedia.length === 0 ? (
                          <option disabled>Semua kelas sudah punya wali</option>
                        ) : (
                          kelasTersedia.map((k) => (
                            <option key={k.id} value={k.id}>{k.label}</option>
                          ))
                        )}
                      </select>
                      {kelasTersedia.length === 0 && (
                        <span className="kelas-warn-text">
                          ⚠️ Semua kelas sudah memiliki wali kelas
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={
                    modalMode === "edit"
                      ? "Kosongkan jika tidak ingin mengubah"
                      : "Password akun guru..."
                  }
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {modalMode === "edit" && (
                  <span className="form-hint">
                    * Hanya isi jika ingin mereset password guru
                  </span>
                )}
              </div>

            </div>{/* /modal-body */}

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 size={15} className="spin" /> Menyimpan...</>
                ) : (
                  <><Save size={15} /> Simpan Data</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}