"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, Plus, Edit3, Trash2,
  Loader2, Check, X, AlertTriangle, Tag, Coins,
  CheckCircle2, XCircle, TriangleAlert, Search, List,
  Image as ImageIcon, ThumbsUp, ThumbsDown,
} from "lucide-react";
import {
  getProfilGuru,
  getJenisPelanggaran, createJenisPelanggaran,
  updateJenisPelanggaran, deleteJenisPelanggaran,
  toggleJenisPelanggaran,
  getRiwayatPelanggaranKonselor,
  updatePelanggaranStatus,
  type JenisPelanggaran,
  type RiwayatPelanggaranKonselorItem,
} from "@/lib/services/guru";
import { uploadBuktiPelanggaran } from "@/lib/supabase-client";
import "../dashboard/dashboard.css";
import "./pelanggaran.css";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const KATEGORI_OPTIONS = [
  { value: "ringan" as const, label: "Ringan", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  { value: "sedang" as const, label: "Sedang", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
  { value: "berat"  as const, label: "Berat",  color: "#EF4444", bg: "rgba(239,68,68,0.15)"  },
];

const BLANK_FORM = { nama: "", kategori: "ringan" as const, bobot_coins: 10, deskripsi: "" };

// ─── TOAST ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; type: ToastType; message: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const c = useRef(0);
  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++c.current;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const clr: Record<ToastType, string> = { success: "#10b981", error: "#ef4444", info: "#179EFF" };
  const ico: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={16} />,
    error:   <XCircle size={16} />,
    info:    <ShieldCheck size={16} />,
  };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-item"
          style={{ borderColor: `${clr[t.type]}45` }}
        >
          <span style={{ color: clr[t.type], flexShrink: 0 }}>{ico[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
function ConfirmDialog({ nama, onConfirm, onCancel }: {
  nama: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-box confirm-box">
        <div className="confirm-header">
          <div className="confirm-icon-wrap">
            <AlertTriangle size={18} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div className="confirm-title">Hapus Jenis Pelanggaran</div>
            <div className="confirm-body">
              <span className="confirm-name">"{nama}"</span> akan dihapus permanen. Pastikan tidak ada riwayat yang menggunakannya.
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Batal</button>
          <button className="btn btn-reject" onClick={onConfirm}>
            <Trash2 size={13} /> Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="status-badge-btn">
      {active
        ? <span className="badge-aktif"><CheckCircle2 size={10} /> Aktif</span>
        : <span className="badge-nonaktif"><XCircle size={10} /> Nonaktif</span>
      }
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function JenisPelanggaranPage() {
  const router = useRouter();
  const toast  = useToast();

  const [currentTab, setCurrentTab] = useState<"jenis" | "riwayat">("riwayat");

  // ── Jenis Pelanggaran ──
  const [list, setList]                 = useState<JenisPelanggaran[]>([]);
  const [loadingInit, setLoadingInit]   = useState(true);
  const [saving, setSaving]             = useState(false);
  const [confirmDel, setConfirmDel]     = useState<JenisPelanggaran | null>(null);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [editData, setEditData]         = useState<Partial<JenisPelanggaran>>({});
  const [showForm, setShowForm]         = useState(false);
  const [newForm, setNewForm]           = useState({ ...BLANK_FORM });
  const [filterKat, setFilterKat]       = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch]             = useState("");

  // ── Riwayat ──
  const [violations, setViolations]           = useState<RiwayatPelanggaranKonselorItem[]>([]);
  const [violationSearch, setViolationSearch] = useState("");
  const [violationFilter, setViolationFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // ── Modal ──
  const [selectedViolation, setSelectedViolation] = useState<RiwayatPelanggaranKonselorItem | null>(null);
  const [modalStatusOpen, setModalStatusOpen]     = useState(false);
  const [modalImageOpen, setModalImageOpen]       = useState(false);
  const [uploadingFile, setUploadingFile]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isKonselor, setIsKonselor] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkPeran() {
      try {
        const profil = await getProfilGuru();
        if (cancelled) return;
        if (!profil.isKonselor) {
          toast.show("Akses ditolak — hanya untuk konselor", "error");
          router.push("/guru/dashboard");
          return;
        }
        const [jenisData, riwayatData] = await Promise.all([
          getJenisPelanggaran(),
          getRiwayatPelanggaranKonselor(500),
        ]);
        if (cancelled) return;
        setIsKonselor(true);
        setList(jenisData);
        setViolations(riwayatData);
      } catch (e: any) {
        if (cancelled) return;
        toast.show(e.message || "Gagal memuat data", "error");
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    }
    checkPeran();
    return () => { cancelled = true; };
  }, []);

  // ── Filters ──
  const filtered = list.filter((p) => {
    if (filterKat !== "all" && p.kategori !== filterKat) return false;
    if (filterStatus === "active"   && !p.is_active) return false;
    if (filterStatus === "inactive" &&  p.is_active) return false;
    if (search && !p.nama.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredViolations = violations.filter((v) => {
    if (violationFilter !== "all" && v.status !== violationFilter) return false;
    const q = violationSearch.toLowerCase();
    return (
      v.siswa.nama.toLowerCase().includes(q) ||
      v.siswa.nis.toLowerCase().includes(q) ||
      v.siswa.kelasLabel.toLowerCase().includes(q)
    );
  });

  const katStyle = (k: string) => KATEGORI_OPTIONS.find((o) => o.value === k) ?? KATEGORI_OPTIONS[0];

  const stats = {
    total:  list.length,
    ringan: list.filter((p) => p.kategori === "ringan").length,
    sedang: list.filter((p) => p.kategori === "sedang").length,
    berat:  list.filter((p) => p.kategori === "berat").length,
    aktif:  list.filter((p) => p.is_active).length,
  };

  // ── CRUD ──
  async function handleCreate() {
    if (!newForm.nama.trim()) return toast.show("Nama pelanggaran wajib diisi.", "error");
    if (newForm.bobot_coins <= 0) return toast.show("Bobot coins harus lebih dari 0.", "error");
    setSaving(true);
    try {
      const created = await createJenisPelanggaran(newForm);
      setList((p) => [...p, created]);
      setNewForm({ ...BLANK_FORM });
      setShowForm(false);
      toast.show(`"${created.nama}" berhasil ditambahkan.`);
    } catch (e: any) { toast.show(e.message || "Gagal menyimpan", "error"); }
    finally { setSaving(false); }
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    if (!editData.nama?.trim()) return toast.show("Nama tidak boleh kosong.", "error");
    setSaving(true);
    try {
      const updated = await updateJenisPelanggaran(editingId, editData);
      setList((p) => p.map((v) => (v.id === editingId ? updated : v)));
      setEditingId(null);
      toast.show("Pelanggaran berhasil diperbarui.");
    } catch (e: any) { toast.show(e.message || "Gagal mengupdate", "error"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await deleteJenisPelanggaran(id);
      setList((p) => p.filter((v) => v.id !== id));
      toast.show("Pelanggaran dihapus.");
    } catch (e: any) { toast.show(e.message || "Gagal menghapus", "error"); }
    finally { setConfirmDel(null); }
  }

  async function handleToggle(id: number) {
    try {
      const updated = await toggleJenisPelanggaran(id);
      setList((p) => p.map((v) => (v.id === id ? updated : v)));
    } catch (e: any) { toast.show(e.message || "Gagal mengubah status", "error"); }
  }

  function startEdit(p: JenisPelanggaran) {
    setEditingId(p.id);
    setEditData({ nama: p.nama, kategori: p.kategori, bobot_coins: p.bobot_coins, deskripsi: p.deskripsi ?? "" });
    setShowForm(false);
  }

  async function handleUpdateViolationStatus(status: "approved" | "rejected") {
    if (!selectedViolation) return;
    setSaving(true);
    try {
      await updatePelanggaranStatus(selectedViolation.id, status);
      setViolations((p) => p.map((v) => v.id === selectedViolation.id ? { ...v, status } : v));
      setModalStatusOpen(false);
      setSelectedViolation(null);
      toast.show(`Pelanggaran ${status === "approved" ? "disetujui" : "ditolak"}.`);
    } catch (e: any) { toast.show(e.message || "Gagal update status", "error"); }
    finally { setSaving(false); }
  }

  async function handleUploadImage(file: File) {
    if (!selectedViolation) return;
    setUploadingFile(true);
    try {
      const buktiUrl = await uploadBuktiPelanggaran(
        file, selectedViolation.id,
        `${selectedViolation.siswa.nis}-${selectedViolation.siswa.nama}`,
      );
      setViolations((p) => p.map((v) => v.id === selectedViolation.id ? { ...v, buktiUrl } : v));
      setSelectedViolation((p) => p ? { ...p, buktiUrl } : null);
      toast.show("Bukti foto berhasil diupload");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) { toast.show(e.message || "Gagal upload gambar", "error"); }
    finally { setUploadingFile(false); }
  }

  // ── Loading ──
  if (loadingInit) {
    return (
      <main className="dashboard-page">
        <div className="bg-blob blob-1" /><div className="bg-blob blob-2" />
        <div className="loading-fullscreen">
          <Loader2 size={34} className="spin" style={{ color: "#A855F7" }} />
          <span className="loading-text">Memuat data...</span>
        </div>
      </main>
    );
  }

  if (!isKonselor) return null;

  // ── Helper: status badge riwayat ──
  function statusBadgeRiwayat(status: string) {
    const cfg: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
      approved: { color: "#10b981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.20)", icon: <CheckCircle2 size={10} /> },
      pending:  { color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.20)", icon: <AlertTriangle size={10} /> },
      rejected: { color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.20)", icon: <XCircle size={10} /> },
    };
    const c = cfg[status] ?? cfg.pending;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 11px",
        background: c.bg, color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 20, fontSize: "0.73rem", fontWeight: 600,
        textTransform: "capitalize",
      }}>
        {c.icon}{status}
      </span>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="bg-blob blob-1" /><div className="bg-blob blob-2" />
      <ToastContainer toasts={toast.toasts} />

      <div className="dashboard-container">

        {/* ══ HEADER ══ */}
        <header className="dash-header">
          <div className="brand">
            <Link href="/guru/dashboard" className="pel-back-link">
              <ArrowLeft size={16} /> Kembali ke Dashboard
            </Link>
          </div>
          <div className="pel-konselor-badge">
            <div className="pel-konselor-dot" />
            <span className="pel-konselor-label">Konselor</span>
          </div>
        </header>

        {/* ══ PAGE TITLE ══ */}
        <div style={{ marginBottom: 24 }}>
          <div className="pel-title-row">
            <div className="pel-icon-badge">
              <ShieldCheck size={22} style={{ color: "#EF4444" }} />
            </div>
            <div className="pel-title-text">
              <h1>Manajemen Pelanggaran</h1>
              <p>Kelola jenis pelanggaran dan lihat riwayat siswa</p>
            </div>
          </div>
        </div>

        {/* ══ TAB NAVIGATION ══ */}
        <div className="tab-nav">
          {([
            { id: "riwayat", label: "Riwayat Siswa",     icon: List },
            { id: "jenis",   label: "Jenis Pelanggaran", icon: Tag  },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentTab(id)}
              className={`tab-btn ${currentTab === id ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* ══ RIWAYAT TAB ══ */}
        {currentTab === "riwayat" && (
          <>
            {/* Stats */}
            <div className="stat-mini-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              {[
                { label: "Total Pelanggaran", value: violations.length,                                    color: "#179EFF" },
                { label: "Pending",           value: violations.filter(v => v.status === "pending").length,   color: "#F59E0B" },
                { label: "Approved",          value: violations.filter(v => v.status === "approved").length,  color: "#10b981" },
                { label: "Rejected",          value: violations.filter(v => v.status === "rejected").length,  color: "#EF4444" },
              ].map((s) => (
                <div key={s.label} className="glass-panel stat-mini-card">
                  <div className="stat-mini-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-mini-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="pel-toolbar">
              <div className="search-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="form-input search-input"
                  placeholder="Cari nama siswa, NIS, atau kelas..."
                  value={violationSearch}
                  onChange={(e) => setViolationSearch(e.target.value)}
                />
              </div>
              <div className="filter-group">
                {(["all", "pending", "approved", "rejected"] as const).map((f) => {
                  const cfg: Record<string, { color: string; bg: string }> = {
                    all:      { color: "var(--filter-inactive-color)", bg: "transparent" },
                    pending:  { color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
                    approved: { color: "#10b981", bg: "rgba(16,185,129,0.10)" },
                    rejected: { color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
                  };
                  const isActive = violationFilter === f;
                  const c = cfg[f];
                  return (
                    <button
                      key={f}
                      className="filter-btn"
                      onClick={() => setViolationFilter(f)}
                      style={isActive
                        ? { border: `1px solid ${c.color}40`, background: c.bg, color: c.color }
                        : { border: "1px solid var(--filter-inactive-border)", background: "transparent", color: "var(--filter-inactive-color)" }
                      }
                    >
                      {f === "all" ? "Semua" : f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
              <div className="table-info-bar">
                Menampilkan <strong>{filteredViolations.length}</strong> dari {violations.length} pelanggaran
                {violationSearch && <> · pencarian: "<em>{violationSearch}</em>"</>}
              </div>
              <div className="table-container" style={{ borderRadius: 0 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>NIS</th>
                      <th>Nama Siswa</th>
                      <th>Kelas</th>
                      <th>Jenis Pelanggaran</th>
                      <th>Dicatat oleh</th>
                      <th>Tanggal</th>
                      <th style={{ width: 100 }}>Bobot Coins</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 130 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViolations.length === 0 ? (
                      <tr><td colSpan={9}>
                        <div className="table-empty">
                          <TriangleAlert size={30} strokeWidth={1} />
                          <span>{violationSearch ? `Tidak ada hasil untuk "${violationSearch}".` : "Belum ada pelanggaran."}</span>
                        </div>
                      </td></tr>
                    ) : filteredViolations.map((v) => {
                      const ks = katStyle(v.jenisPelanggaran.kategori);
                      return (
                        <tr key={v.id}>
                          <td className="td-nis">{v.siswa.nis}</td>
                          <td style={{ fontWeight: 500 }}>{v.siswa.nama}</td>
                          <td className="td-faint">{v.siswa.kelasLabel}</td>
                          <td>
                            <span
                              className="badge-kategori"
                              style={{ background: ks.bg, color: ks.color }}
                            >
                              <Tag size={9} />{v.jenisPelanggaran.nama}
                            </span>
                          </td>
                          <td className="td-muted">
                            <div>{v.guru.nama}</div>
                            <div className="td-guru-nip">{v.guru.nip}</div>
                          </td>
                          <td className="td-faint">{v.tanggal}</td>
                          <td>
                            <span className="td-coins-value">
                              <Coins size={13} />-{v.bobotCoins}
                            </span>
                          </td>
                          <td>{statusBadgeRiwayat(v.status)}</td>
                          <td>
                            <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                              <button
                                className="act-btn act-blue"
                                onClick={() => { setSelectedViolation(v); setModalImageOpen(true); }}
                                title="Lihat/upload foto"
                              >
                                <ImageIcon size={13} />
                              </button>
                              {v.status === "pending" && (
                                <>
                                  <button
                                    className="act-btn act-green"
                                    onClick={() => { setSelectedViolation(v); setModalStatusOpen(true); }}
                                    title="Setujui"
                                  >
                                    <ThumbsUp size={13} />
                                  </button>
                                  <button
                                    className="act-btn act-red"
                                    onClick={() => {
                                      setSelectedViolation(v);
                                      handleUpdateViolationStatus("rejected");
                                    }}
                                    title="Tolak"
                                  >
                                    <ThumbsDown size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══ JENIS PELANGGARAN TAB ══ */}
        {currentTab === "jenis" && (
          <>
            {/* Stats */}
            <div className="stat-mini-grid">
              {[
                { label: "Total",  value: stats.total,  color: "#179EFF" },
                { label: "Aktif",  value: stats.aktif,  color: "#10b981" },
                { label: "Ringan", value: stats.ringan, color: "#F59E0B" },
                { label: "Sedang", value: stats.sedang, color: "#F97316" },
                { label: "Berat",  value: stats.berat,  color: "#EF4444" },
              ].map((s) => (
                <div key={s.label} className="glass-panel stat-mini-card">
                  <div className="stat-mini-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-mini-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="pel-toolbar">
              <div className="search-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="form-input search-input"
                  placeholder="Cari nama pelanggaran..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="filter-group">
                {["all", "ringan", "sedang", "berat"].map((k) => {
                  const o = katStyle(k);
                  const isActive = filterKat === k;
                  return (
                    <button
                      key={k}
                      className="filter-btn"
                      onClick={() => setFilterKat(k)}
                      style={isActive
                        ? { border: `1px solid ${o.color}40`, background: o.bg, color: o.color }
                        : { border: "1px solid var(--filter-inactive-border)", background: "transparent", color: "var(--filter-inactive-color)" }
                      }
                    >
                      {k === "all" ? "Semua" : k}
                    </button>
                  );
                })}
              </div>
              <div className="filter-group">
                {(["all", "active", "inactive"] as const).map((f) => {
                  const isActive = filterStatus === f;
                  return (
                    <button
                      key={f}
                      className="filter-btn"
                      onClick={() => setFilterStatus(f)}
                      style={isActive
                        ? { border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#EF4444" }
                        : { border: "1px solid var(--filter-inactive-border)", background: "transparent", color: "var(--filter-inactive-color)" }
                      }
                    >
                      {{ all: "Semua", active: "Aktif", inactive: "Nonaktif" }[f]}
                    </button>
                  );
                })}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => { setShowForm((p) => !p); setEditingId(null); }}
                style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
              >
                <Plus size={15} /> Tambah Baru
              </button>
            </div>

            {/* Form Tambah */}
            {showForm && (
              <div className="form-tambah">
                <div className="form-tambah-title"><Plus size={15} /> Tambah Jenis Pelanggaran Baru</div>
                <div className="form-tambah-grid">
                  <div className="form-group">
                    <label className="form-label">Nama Pelanggaran *</label>
                    <input
                      className="form-input"
                      placeholder="Contoh: Tidak memakai seragam"
                      value={newForm.nama}
                      onChange={(e) => setNewForm((p) => ({ ...p, nama: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <div className="form-select-wrap">
                      <select
                        className="form-input"
                        value={newForm.kategori}
                        onChange={(e) => setNewForm((p) => ({ ...p, kategori: e.target.value as any }))}
                      >
                        {KATEGORI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bobot Coins *</label>
                    <input
                      type="number"
                      min={1}
                      className="form-input input-coins"
                      value={newForm.bobot_coins}
                      onChange={(e) => setNewForm((p) => ({ ...p, bobot_coins: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Deskripsi (opsional)</label>
                  <input
                    className="form-input"
                    placeholder="Penjelasan singkat..."
                    value={newForm.deskripsi}
                    onChange={(e) => setNewForm((p) => ({ ...p, deskripsi: e.target.value }))}
                  />
                </div>

                {/* Preview */}
                <div className="form-preview">
                  <span
                    className="badge-kategori"
                    style={{ background: katStyle(newForm.kategori).bg, color: katStyle(newForm.kategori).color }}
                  >
                    <Tag size={10} />{newForm.kategori}
                  </span>
                  <span className="form-preview-name">{newForm.nama || "Nama pelanggaran..."}</span>
                  <span className="form-preview-coins">
                    <Coins size={13} />-{newForm.bobot_coins} coins
                  </span>
                </div>

                <div className="modal-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setShowForm(false); setNewForm({ ...BLANK_FORM }); }}
                  >
                    Batal
                  </button>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                    {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Simpan
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="table-wrapper">
              <div className="table-info-bar">
                Menampilkan <strong>{filtered.length}</strong> dari {list.length} jenis pelanggaran
                {search && <> · pencarian: "<em>{search}</em>"</>}
              </div>
              <div className="table-container" style={{ borderRadius: 0 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Nama Pelanggaran</th>
                      <th style={{ width: 105 }}>Kategori</th>
                      <th style={{ width: 125 }}>Bobot Coins</th>
                      <th>Deskripsi</th>
                      <th style={{ textAlign: "center", width: 100 }}>Status</th>
                      <th style={{ textAlign: "center", width: 115 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6}>
                        <div className="table-empty">
                          <TriangleAlert size={30} strokeWidth={1} />
                          <span>{search ? `Tidak ada hasil untuk "${search}".` : "Belum ada jenis pelanggaran."}</span>
                          {!search && (
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: "0.82rem", marginTop: 4 }}
                              onClick={() => setShowForm(true)}
                            >
                              <Plus size={13} /> Tambah Sekarang
                            </button>
                          )}
                        </div>
                      </td></tr>
                    ) : filtered.map((p) => {
                      const ks = katStyle(p.kategori);
                      const isEditing = editingId === p.id;
                      return (
                        <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.55 }}>
                          <td>
                            {isEditing
                              ? <input
                                  className="form-input"
                                  value={editData.nama ?? ""}
                                  onChange={(e) => setEditData((d) => ({ ...d, nama: e.target.value }))}
                                  autoFocus
                                />
                              : <span style={{ fontWeight: 600 }}>{p.nama}</span>}
                          </td>
                          <td>
                            {isEditing
                              ? <div className="form-select-wrap">
                                  <select
                                    className="form-input"
                                    value={editData.kategori}
                                    onChange={(e) => setEditData((d) => ({ ...d, kategori: e.target.value as any }))}
                                  >
                                    {KATEGORI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                </div>
                              : <span className="badge-kategori" style={{ background: ks.bg, color: ks.color }}>
                                  <Tag size={9} />{p.kategori}
                                </span>
                            }
                          </td>
                          <td>
                            {isEditing
                              ? <input
                                  type="number"
                                  min={1}
                                  className="form-input input-coins"
                                  value={editData.bobot_coins ?? 10}
                                  onChange={(e) => setEditData((d) => ({ ...d, bobot_coins: Number(e.target.value) }))}
                                  style={{ width: 95 }}
                                />
                              : <span className="td-coins-value">
                                  <Coins size={13} />-{p.bobot_coins}
                                </span>
                            }
                          </td>
                          <td>
                            {isEditing
                              ? <input
                                  className="form-input"
                                  value={editData.deskripsi ?? ""}
                                  onChange={(e) => setEditData((d) => ({ ...d, deskripsi: e.target.value }))}
                                  placeholder="Deskripsi..."
                                />
                              : <span className="td-deskripsi">{p.deskripsi || "—"}</span>
                            }
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <StatusBadge active={p.is_active} onClick={() => handleToggle(p.id)} />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                                <button className="act-btn act-green" onClick={handleSaveEdit} disabled={saving}>
                                  {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                                </button>
                                <button className="act-btn act-gray" onClick={() => setEditingId(null)}>
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                                <button className="act-btn act-blue" onClick={() => startEdit(p)}>
                                  <Edit3 size={13} />
                                </button>
                                <button className="act-btn act-red" onClick={() => setConfirmDel(p)}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Confirm Delete ── */}
      {confirmDel && (
        <ConfirmDialog
          nama={confirmDel.nama}
          onConfirm={() => handleDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {/* ── Modal: Verifikasi Status ── */}
      {modalStatusOpen && selectedViolation && (
        <div className="modal-overlay">
          <div className="modal-box status-modal-box">
            <div style={{ marginBottom: 20 }}>
              <h2 className="modal-title">Verifikasi Pelanggaran</h2>
              <p className="modal-meta">
                Siswa: <strong>{selectedViolation.siswa.nama}</strong> ({selectedViolation.siswa.nis})
              </p>
              <p className="modal-meta" style={{ marginTop: 4 }}>
                Pelanggaran: <strong>{selectedViolation.jenisPelanggaran.nama}</strong>
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => { setModalStatusOpen(false); setSelectedViolation(null); }}
              >
                Batal
              </button>
              <button
                className="btn-reject"
                onClick={() => handleUpdateViolationStatus("rejected")}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="spin" /> : <X size={14} />} Tolak
              </button>
              <button
                className="btn-approve"
                onClick={() => handleUpdateViolationStatus("approved")}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Setujui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Upload/View Bukti ── */}
      {modalImageOpen && selectedViolation && (
        <div className="modal-overlay">
          <div className="modal-box image-modal-box">
            <div style={{ marginBottom: 20 }}>
              <h2 className="modal-title">Bukti Pelanggaran</h2>
              <p className="modal-meta">
                {selectedViolation.siswa.nama} • {selectedViolation.jenisPelanggaran.nama}
              </p>
            </div>

            {selectedViolation.buktiUrl ? (
              <div className="img-preview-wrap">
                <img src={selectedViolation.buktiUrl} alt="Bukti pelanggaran" />
              </div>
            ) : (
              <div className="img-empty-zone">
                <ImageIcon size={32} style={{ color: "var(--img-empty-icon)" }} />
                <div className="img-empty-text">Belum ada bukti foto</div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0]); }}
              style={{ display: "none" }}
            />
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => { setModalImageOpen(false); setSelectedViolation(null); }}
              >
                Tutup
              </button>
              <button
                className="btn-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
              >
                {uploadingFile ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />}
                {uploadingFile ? "Uploading..." : "Upload Bukti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}