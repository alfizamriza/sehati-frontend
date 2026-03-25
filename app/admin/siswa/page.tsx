"use client";

import { useState, useEffect, useRef } from "react";
import {
  getSiswa, getCachedSiswa, createSiswa, updateSiswa,
  deleteSiswa, importSiswa, downloadTemplate,
  getKelasDropdown,
  type Siswa, type CreateSiswaDto, type UpdateSiswaDto,
} from "@/lib/services/admin";
import QRDownloadModal from "@/components/admin/QRDownloadModal";
import {
  Search, Plus, Pencil, Trash2, X, Save, Filter,
  CheckCircle, XCircle, Upload, FileSpreadsheet, Loader2,
  AlertCircle, QrCode, GraduationCap, Users,
  Flame,
  Coins,
  ArrowDownAZ,
  ArrowUpAZ,
  Shield,
} from "lucide-react";

type SortField = "nis" | "nama" | "kelas" | "status" | "coins" | "streak";

// ─── STATUS BADGE ──────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`status-badge ${active ? "active" : "inactive"}`}>
      {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {active ? "AKTIF" : "NON-AKTIF"}
    </span>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SiswaPage() {
  const [dataSiswa, setDataSiswa] = useState<Siswa[]>(() => getCachedSiswa() || []);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [kelasLoading, setKelasLoading] = useState(false);
  const [kelasError, setKelasError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterKelas, setFilterKelas] = useState("Semua");
  const [sortConfig, setSortConfig] = useState<{ by: SortField; dir: "asc" | "desc" }>({
    by: "nama",
    dir: "asc",
  });
  const [isLoading, setIsLoading] = useState(() => !getCachedSiswa());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const kelasReqRef = useRef<Promise<any[]> | null>(null);

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [currentNis, setCurrentNis] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>(
    { show: false, msg: "", type: "success" }
  );

  const [formData, setFormData] = useState({
    nis: "", nama: "", password: "",
    kelasId: "" as number | "",
    statusAktif: true,
    permissions: [] as string[],
  });

  // ── Helpers ──
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
  };

  // ── Load siswa ──
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getSiswa({ forceRefresh: false });
        if (mounted) setDataSiswa(data);
      } catch (err: any) {
        showToast(err.message || "Gagal memuat data", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
      try {
        const refreshed = await getSiswa({ forceRefresh: true });
        if (mounted) setDataSiswa(refreshed);
      } catch { /* silent */ }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // ── Lazy kelas dropdown (deduplicated) ──
  const loadKelasDropdown = async () => {
    if (kelasList.length > 0) return;
    if (kelasReqRef.current) return kelasReqRef.current;
    setKelasLoading(true);
    setKelasError(null);
    const req = getKelasDropdown()
      .then((d) => { setKelasList(d); return d; })
      .catch((e: any) => { setKelasError(e?.message || "Gagal memuat kelas"); return []; })
      .finally(() => { setKelasLoading(false); kelasReqRef.current = null; });
    kelasReqRef.current = req;
    return req;
  };

  // ── Filter ──
  const uniqueClasses = ["Semua", ...Array.from(new Set(dataSiswa.map((s) => s.kelas))).sort()];

  const filtered = dataSiswa.filter((s) => {
    const q = query.toLowerCase();
    const matchQ = s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
    const matchK = filterKelas === "Semua" || s.kelas === filterKelas;
    return matchQ && matchK;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortConfig.dir === "asc" ? 1 : -1;
    switch (sortConfig.by) {
      case "nis": return dir * a.nis.localeCompare(b.nis, "id");
      case "nama": return dir * a.nama.localeCompare(b.nama, "id");
      case "kelas": return dir * (a.kelas || "").localeCompare(b.kelas || "", "id");
      case "status": return dir * ((a.statusAktif === b.statusAktif) ? 0 : a.statusAktif ? -1 : 1);
      case "coins": return dir * ((a.coins || 0) - (b.coins || 0));
      case "streak": return dir * ((a.streak || 0) - (b.streak || 0));
      default: return 0;
    }
  });

  const toggleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.by === field) {
        return { by: field, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { by: field, dir: "asc" };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortConfig.by === field;
    const dir = isActive ? sortConfig.dir : "asc";
    const icon = dir === "asc" ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />;
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        aria-label={`Urutkan kolom ${field}`}
        style={{
          border: "none",
          background: isActive ? "var(--surface-2, #f5f7fb)" : "transparent",
          borderRadius: 6,
          padding: "4px 6px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--text-muted)",
          transition: "all 120ms ease",
          marginLeft: 6,
        }}
      >
        <span style={{ opacity: isActive ? 1 : 0.4 }}>{icon}</span>
      </button>
    );
  };

  // ── Modal helpers ──
  const openAdd = () => {
    setModalMode("add");
    setFormData({ nis: "", nama: "", password: "", kelasId: "", statusAktif: true, permissions: [] });
    setIsModalOpen(true);
    void loadKelasDropdown();
  };

  const openEdit = (s: Siswa) => {
    setModalMode("edit");
    setCurrentNis(s.nis);
    setFormData({ nis: s.nis, nama: s.nama, password: "", kelasId: s.kelasId || "", statusAktif: s.statusAktif, permissions: s.permissions || [] });
    setIsModalOpen(true);
    void loadKelasDropdown();
  };

  // ── Save ──
  const handleSave = async () => {
    if (!formData.nis || !formData.nama || !formData.kelasId) {
      showToast("NIS, Nama, dan Kelas wajib diisi!", "error");
      return;
    }
    if (modalMode === "add" && !formData.password) {
      showToast("Password wajib diisi untuk siswa baru!", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        await createSiswa({
          nis: formData.nis, nama: formData.nama,
          kelasId: Number(formData.kelasId),
          password: formData.password, statusAktif: formData.statusAktif,
          permissions: formData.permissions,
        } as CreateSiswaDto);
        showToast("Siswa berhasil ditambahkan!", "success");
      } else {
        const update: UpdateSiswaDto = {
          nama: formData.nama, kelasId: Number(formData.kelasId),
          statusAktif: formData.statusAktif,
          permissions: formData.permissions,
        };
        if (formData.password) update.password = formData.password;
        await updateSiswa(currentNis!, update);
        showToast("Data siswa berhasil diperbarui!", "success");
      }
      setDataSiswa(await getSiswa({ forceRefresh: true }));
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (nis: string, nama: string) => {
    if (!confirm(`Hapus siswa "${nama}"?`)) return;
    try {
      await deleteSiswa(nis);
      showToast("Siswa berhasil dihapus", "success");
      setDataSiswa((p) => p.filter((s) => s.nis !== nis));
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus siswa", "error");
    }
  };

  // ── Import ──
  const handleImport = async () => {
    if (!importFile) { showToast("Pilih file terlebih dahulu!", "error"); return; }
    setIsImporting(true);
    try {
      const result = await importSiswa(importFile);
      setImportResult(result);
      setDataSiswa(await getSiswa({ forceRefresh: true }));
      showToast(
        `Import selesai! Berhasil: ${result.success}, Gagal: ${result.failed}`,
        result.failed > 0 ? "error" : "success",
      );
    } catch (err: any) {
      showToast(err.message || "Import gagal", "error");
    } finally {
      setIsImporting(false);
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
              borderColor: toast.type === "success"
                ? "rgba(5,150,105,0.35)"
                : "rgba(239,68,68,0.35)",
              background: toast.type === "success"
                ? "linear-gradient(135deg,rgba(5,150,105,0.15),rgba(5,150,105,0.08))"
                : "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08))",
            }}
          >
            {toast.type === "success"
              ? <CheckCircle size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
              : <AlertCircle size={16} style={{ color: "var(--red)", flexShrink: 0 }} />}
            {toast.msg}
          </div>
        )}
      </div>

      <div className="dashboard-wrapper">

        {/* ── Action Bar ── */}
        <div className="action-bar">
          <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap", minWidth: 0 }}>
            <div className="search-container" style={{ flex: 1, maxWidth: 360 }}>
              <Search size={17} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <input
                type="text" className="search-input"
                placeholder="Cari nama atau NIS..."
                value={query} onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="search-container" style={{ maxWidth: 160 }}>
              <Filter size={15} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <select
                className="search-input"
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <button className="btn btn-qr" onClick={() => setIsQRModalOpen(true)} title="Download QR Code Siswa">
              <QrCode size={15} /> QR Code
            </button>
            <button className="btn btn-secondary" onClick={downloadTemplate} title="Download Template Excel">
              <FileSpreadsheet size={15} /> Template
            </button>
            <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={15} /> Import
            </button>
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={17} /> Tambah Siswa
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>No</th>
                <th>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    NIS
                    <SortIcon field="nis" />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    Nama Siswa
                    <SortIcon field="nama" />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    Kelas
                    <SortIcon field="kelas" />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    Koin
                    <SortIcon field="coins" />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    Streak
                    <SortIcon field="streak" />
                  </div>
                </th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {[28, 90, "60%", 60, 70, 36, 36, 60].map((w, c) => (
                      <td key={c}>
                        <div
                          className="skeleton-shimmer"
                          style={{ width: typeof w === "number" ? w : w }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length > 0 ? (
                sorted.map((s, idx) => (
                  <tr key={s.nis}>
                    <td className="cell-mono" style={{ opacity: 0.45 }}>{idx + 1}</td>
                    <td><span className="cell-mono">{s.nis}</span></td>
                    <td>
                      <div className="cell-name-row">
                        <div className="avatar-circle">{s.nama.charAt(0).toUpperCase()}</div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>{s.nama}</span>
                          {s.permissions && s.permissions.length > 0 && (
                            <span style={{ fontSize: "0.75em", color: "var(--primary)", marginTop: 2, fontWeight: 500 }}>
                              <Shield size={10} style={{ display: "inline", marginRight: 2 }} /> OSIS
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className="kelas-pill">{s.kelas}</span></td>
                    <td><StatusBadge active={s.statusAktif} /></td>
                    <td>
                      <span className="cell-coins">
                        {s.coins}
                        <span style={{ fontSize: "0.85em" }}><Coins size={16} /></span>
                      </span>
                    </td>
                    <td>
                      <span className="cell-streak">
                        <span style={{ fontSize: "0.85em" }}><Flame size={16} /></span>
                        {s.streak}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
                        <button className="icon-btn btn-edit" onClick={() => openEdit(s)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="icon-btn btn-delete" onClick={() => handleDelete(s.nis, s.nama)} title="Hapus">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <GraduationCap size={36} className="empty-state-icon" />
                      <span className="empty-state-text">
                        {query || filterKelas !== "Semua"
                          ? "Tidak ada siswa yang cocok dengan filter."
                          : "Belum ada data siswa."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Add/Edit ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === "add" ? "Tambah Siswa Baru" : "Edit Data Siswa"}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">NIS</label>
                  <input
                    type="text" className="form-input" placeholder="Nomor Induk"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    disabled={modalMode === "edit"}
                    style={modalMode === "edit" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text" className="form-input" placeholder="Nama siswa..."
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-equal">
                <div className="form-group">
                  <label className="form-label">Kelas</label>
                  <select
                    className="form-input"
                    value={formData.kelasId}
                    onChange={(e) => setFormData({ ...formData, kelasId: Number(e.target.value) })}
                  >
                    <option value="" disabled>
                      {kelasLoading ? "Memuat kelas..." : "Pilih Kelas"}
                    </option>
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>{k.label}</option>
                    ))}
                  </select>
                  {kelasError && (
                    <span className="form-hint" style={{ color: "var(--red)" }}>{kelasError}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Status Aktif</label>
                  <select
                    className="form-input"
                    value={formData.statusAktif ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, statusAktif: e.target.value === "true" })}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Non-Aktif (Keluar/Lulus)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password" className="form-input"
                  placeholder={modalMode === "edit" ? "Kosongkan jika tidak ingin mengubah" : "Password awal siswa..."}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {modalMode === "edit" && (
                  <span className="form-hint">* Hanya isi jika ingin mereset password siswa</span>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Shield size={16} /> Akses Khusus (Opsional)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-2, #f5f7fb)", borderRadius: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9rem" }}>
                    <input 
                      type="checkbox" 
                      className="form-checkbox"
                      checked={formData.permissions.includes('manage_absensi')}
                      onChange={(e) => {
                        const newPerms = e.target.checked 
                          ? [...formData.permissions, 'manage_absensi']
                          : formData.permissions.filter(p => p !== 'manage_absensi');
                        setFormData({ ...formData, permissions: newPerms });
                      }}
                    />
                    Akses Fitur Absensi (OSIS)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9rem" }}>
                    <input 
                      type="checkbox" 
                      className="form-checkbox"
                      checked={formData.permissions.includes('manage_pelanggaran')}
                      onChange={(e) => {
                        const newPerms = e.target.checked 
                          ? [...formData.permissions, 'manage_pelanggaran']
                          : formData.permissions.filter(p => p !== 'manage_pelanggaran');
                        setFormData({ ...formData, permissions: newPerms });
                      }}
                    />
                    Akses Fitur Pelanggaran (OSIS)
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 size={15} className="spin" /> Menyimpan...</>
                  : <><Save size={15} /> Simpan Data</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Import ── */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Import Siswa dari Excel</h3>
              <button className="modal-close-btn" onClick={() => setIsImportModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="import-info-panel">
                <p>
                  <strong>Format File:</strong> .xlsx, .xlsm, .xlsb, .csv<br />
                  <strong>Kolom:</strong> NIS, Nama Lengkap, Tingkat, Nama Kelas, Password, Status Aktif
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Pilih File</label>
                <input
                  type="file"
                  accept=".xlsx,.xlsm,.xlsb,.csv"
                  className="file-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setImportFile(f); setImportResult(null); }
                  }}
                />
              </div>

              {importFile && (
                <div className="import-file-preview">
                  <FileSpreadsheet size={16} />
                  {importFile.name}
                </div>
              )}

              {importResult && (
                <div className="import-results">
                  <h4>Hasil Import</h4>
                  <div className="import-results-row">
                    <Users size={13} style={{ color: "var(--text-faint)" }} />
                    <span style={{ color: "var(--text-muted)" }}>Total:</span>
                    <strong style={{ color: "var(--text-main)", marginLeft: "auto" }}>{importResult.total}</strong>
                  </div>
                  <div className="import-results-row">
                    <CheckCircle size={13} style={{ color: "var(--green)" }} />
                    <span style={{ color: "var(--text-muted)" }}>Berhasil:</span>
                    <strong style={{ color: "var(--green)", marginLeft: "auto" }}>{importResult.success}</strong>
                  </div>
                  <div className="import-results-row">
                    <XCircle size={13} style={{ color: "var(--red)" }} />
                    <span style={{ color: "var(--text-muted)" }}>Gagal:</span>
                    <strong style={{ color: "var(--red)", marginLeft: "auto" }}>{importResult.failed}</strong>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="import-error-list">
                      {importResult.errors.map((e: any, i: number) => (
                        <div key={i} className="import-error-item">
                          Baris {e.row} ({e.nis}): {e.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(false)}>Tutup</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={!importFile || isImporting}>
                {isImporting
                  ? <><Loader2 size={15} className="spin" /> Importing...</>
                  : <><Upload size={15} /> Import Data</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Modal ── */}
      {isQRModalOpen && (
        <QRDownloadModal siswaList={dataSiswa} onClose={() => setIsQRModalOpen(false)} />
      )}
    </>
  );
}
