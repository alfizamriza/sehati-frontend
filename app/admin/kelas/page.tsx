"use client";

import { useMemo, useState, useEffect } from "react";
import {
  createKelas, deleteKelas, getCachedClasses,
  getClasses, updateKelas,
} from "@/lib/services/admin";
import type { Class } from "@/lib/dummy/types";
import {
  Plus, Search, Users, School, Pencil, Trash2, X, Save,
  ChevronDown, ChevronUp, User, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";

type JenjangOption = Class["jenjang"];
type TingkatOption = Class["tingkat"];

const TINGKAT_OPTIONS: Record<JenjangOption, TingkatOption[]> = {
  SD:  ["I","II","III","IV","V","VI"],
  SMP: ["VII","VIII","IX"],
  SMA: ["X","XI","XII"],
};
const TINGKAT_TO_NUMBER: Record<TingkatOption, number> = {
  I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11,XII:12,
};

export default function KelasPage() {
  const [dataKelas,     setDataKelas]     = useState<Class[]>(() => getCachedClasses() || []);
  const [isLoading,     setIsLoading]     = useState(() => !getCachedClasses());
  const [query,         setQuery]         = useState("");
  const [filterJenjang, setFilterJenjang] = useState<"ALL" | JenjangOption>("ALL");
  const [expandedId,    setExpandedId]    = useState<string | number | null>(null);
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [modalMode,     setModalMode]     = useState<"add" | "edit">("add");
  const [currentId,     setCurrentId]     = useState<string | number | null>(null);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>(
    { show: false, msg: "", type: "success" }
  );
  const [formData, setFormData] = useState({
    namaKelas: "", jenjang: "" as JenjangOption | "",
    tingkat: "" as TingkatOption | "", kapasitas: 32,
  });

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
  };

  useEffect(() => {
    let mounted = true;
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
    } catch (err: any) {
      showToast(err?.message || "Terjadi kesalahan", "error");
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Hapus kelas ini secara permanen?")) return;
    try {
      await deleteKelas(Number(id));
      setDataKelas((p) => p.filter((k) => k.id !== id));
      showToast("Kelas berhasil dihapus", "success");
    } catch { showToast("Gagal menghapus kelas", "error"); }
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
              : <AlertCircle  size={15} style={{ color: "var(--red)",   flexShrink: 0 }} />}
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
              {(["ALL","SD","SMP","SMA"] as const).map((j) => (
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
            {[1,2,3,4].map((i) => (
              <div key={i} className="kelas-card" style={{ minHeight: 230 }}>
                {[46,20,14,60].map((_, j) => (
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
                      onClick={() => handleDelete(k.id)}><Trash2 size={15} /></button>
                  </div>

                  {expandedId === k.id && (
                    <div className="siswa-list-expanded">
                      {k.peserta?.length ? (
                        k.peserta.map((p: any, i: number) => (
                          <div key={i} className="siswa-list-item">
                            <div className="siswa-list-dot" />
                            {p.nama}
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

      {/* Modal */}
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
    </>
  );
}