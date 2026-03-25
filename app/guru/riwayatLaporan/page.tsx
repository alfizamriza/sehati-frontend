"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle,
  Edit3, Trash2, Loader2, X, Check, Tag, Coins,
  ChevronDown, Search, TriangleAlert, FileText, Image as ImageIcon,
} from "lucide-react";
import {
  getRiwayatPelanggaranSaya,
  getJenisPelanggaranAktif,
  updatePelanggaran,
  deletePelanggaran,
  type RiwayatPelanggaranGuruItem,
  type JenisPelanggaranItem,
} from "@/lib/services/guru";
// import "../dashboard/dashboard.css";
import "./riwayat.css";

// ─── UTILS ────────────────────────────────────────────────────────────────────
function toRomawi(n: number): string {
  const map: [number, string][] = [
    [1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],
    [100,"C"],[90,"XC"],[50,"L"],[40,"XL"],
    [10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"],
  ];
  let result = "";
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

function formatKelasLabel(label: string): string {
  return label.replace(/^(\d+)/, (_, num) => toRomawi(parseInt(num)));
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const KATEGORI_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  ringan: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)" },
  sedang: { color: "#F97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.25)" },
  berat:  { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.25)"  },
};

const STATUS_CONFIG = {
  pending:  { label: "Menunggu",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)",  icon: <AlertTriangle size={11} /> },
  approved: { label: "Disetujui", color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.25)",  icon: <CheckCircle2  size={11} /> },
  rejected: { label: "Ditolak",   color: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.25)",   icon: <XCircle       size={11} /> },
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";
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
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-item"
          style={{ borderColor: t.type === "success" ? "#10b98145" : "#ef444445" }}
        >
          {t.type === "success"
            ? <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0 }} />
            : <XCircle      size={16} style={{ color: "#ef4444", flexShrink: 0 }} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
function ConfirmDialog({ nama, onConfirm, onCancel, loading }: {
  nama: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <div className="confirm-header">
          <div className="confirm-icon-wrap">
            <AlertTriangle size={18} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div className="confirm-title">Hapus Laporan</div>
            <div className="confirm-body">
              Laporan pelanggaran{" "}
              <span className="confirm-name">"{nama}"</span>{" "}
              akan dihapus permanen.
            </div>
          </div>
        </div>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading
              ? <Loader2 size={13} className="spin" />
              : <Trash2 size={13} />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOM SELECT ────────────────────────────────────────────────────────────
function CustomSelect({ value, onChange, options, disabled }: {
  value: number;
  onChange: (val: number) => void;
  options: JenisPelanggaranItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const ks = selected ? KATEGORI_COLOR[selected.kategori] : KATEGORI_COLOR.sedang;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`csel-trigger ${open ? "csel-trigger-open" : ""}`}
      >
        {selected ? (
          <>
            {/* Kategori badge — still needs dynamic colors */}
            <span
              className="badge-kategori"
              style={{ background: ks.bg, color: ks.color, border: `1px solid ${ks.border}`, textTransform: "uppercase", flexShrink: 0 }}
            >
              {selected.kategori}
            </span>
            <span className="csel-name">{selected.nama}</span>
            <span className="jenis-preview-coins" style={{ fontSize: "0.82rem" }}>
              <Coins size={12} />-{selected.bobot_coins}
            </span>
          </>
        ) : (
          <span className="csel-placeholder">Pilih jenis pelanggaran...</span>
        )}
        <ChevronDown
          size={15}
          className={`csel-chevron ${open ? "csel-chevron-open" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="csel-dropdown">
          {options.map((o, i) => {
            const ok = KATEGORI_COLOR[o.kategori];
            const isSelected = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); }}
                className={`csel-item ${isSelected ? "csel-item-selected" : ""} ${i < options.length - 1 ? "csel-item-divider" : ""}`}
              >
                <span
                  className="badge-kategori"
                  style={{ background: ok.bg, color: ok.color, border: `1px solid ${ok.border}`, textTransform: "uppercase", flexShrink: 0, minWidth: 52, justifyContent: "center" }}
                >
                  {o.kategori}
                </span>
                <span className={`csel-item-label ${isSelected ? "csel-item-label-active" : ""}`}>
                  {o.nama}
                </span>
                <span className="jenis-preview-coins" style={{ fontSize: "0.8rem" }}>
                  <Coins size={11} />-{o.bobot_coins}
                </span>
                {isSelected && <Check size={13} style={{ color: "#EF4444", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ item, jenisList, onSave, onCancel, loading }: {
  item: RiwayatPelanggaranGuruItem;
  jenisList: JenisPelanggaranItem[];
  onSave: (pelanggaranId: number, jenisPelanggaranId: number, catatan: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [jenisPelanggaranId, setJenisPelanggaranId] = useState<number>(item.jenisPelanggaran.id);
  const [catatan, setCatatan] = useState(item.catatan ?? "");

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-title">Edit Laporan Pelanggaran</div>
        <div className="modal-meta">
          Siswa: <strong>{item.siswa.nama}</strong>
          <span className="modal-dot">·</span>
          {formatKelasLabel(item.siswa.kelasLabel)}
        </div>

        {/* Jenis Pelanggaran */}
        <div className="form-group">
          <label className="form-label">Jenis Pelanggaran</label>
          <CustomSelect
            value={jenisPelanggaranId}
            onChange={setJenisPelanggaranId}
            options={jenisList}
          />
        </div>

        {/* Catatan */}
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label">
            Catatan <span className="modal-note-optional">(opsional)</span>
          </label>
          <textarea
            className="form-input"
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Detail kejadian..."
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(item.id, jenisPelanggaranId, catatan)}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function RiwayatLaporanPage() {
  const router = useRouter();
  const toast  = useToast();

  const [riwayat,   setRiwayat]   = useState<RiwayatPelanggaranGuruItem[]>([]);
  const [jenisList, setJenisList] = useState<JenisPelanggaranItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [editItem,     setEditItem]     = useState<RiwayatPelanggaranGuruItem | null>(null);
  const [confirmDel,   setConfirmDel]   = useState<RiwayatPelanggaranGuruItem | null>(null);
  const safeRiwayat = Array.isArray(riwayat) ? riwayat : [];

  useEffect(() => {
    async function load() {
      try {
        const [data, jenis] = await Promise.all([
          getRiwayatPelanggaranSaya(100),
          getJenisPelanggaranAktif(),
        ]);
        setRiwayat(data);
        setJenisList(jenis);
      } catch (e: any) {
        toast.show(e.message || "Gagal memuat riwayat", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = safeRiwayat.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    const q = search.toLowerCase();
    return (
      r.siswa.nama.toLowerCase().includes(q) ||
      r.siswa.nis.toLowerCase().includes(q) ||
      r.siswa.kelasLabel.toLowerCase().includes(q) ||
      r.jenisPelanggaran.nama.toLowerCase().includes(q)
    );
  });

  const stats = {
    total:    safeRiwayat.length,
    pending:  safeRiwayat.filter((r) => r.status === "pending").length,
    approved: safeRiwayat.filter((r) => r.status === "approved").length,
    rejected: safeRiwayat.filter((r) => r.status === "rejected").length,
  };

  async function handleSaveEdit(pelanggaranId: number, jenisPelanggaranId: number, catatan: string) {
    setSaving(true);
    try {
      await updatePelanggaran(pelanggaranId, {
        jenis_pelanggaran_id: jenisPelanggaranId,
        catatan: catatan.trim() || undefined,
      });
      const updatedJenis = jenisList.find((j) => j.id === jenisPelanggaranId);
      setRiwayat((prev) => prev.map((r) =>
        r.id === pelanggaranId ? {
          ...r,
          catatan: catatan.trim() || null,
          coinspenalty: updatedJenis?.bobot_coins ?? r.coinspenalty,
          jenisPelanggaran: updatedJenis
            ? {
              id: updatedJenis.id,
              nama: updatedJenis.nama,
              kategori: updatedJenis.kategori,
              bobot_coins: updatedJenis.bobot_coins,
            }
            : r.jenisPelanggaran,
        } : r
      ));
      setEditItem(null);
      toast.show("Laporan berhasil diperbarui");
    } catch (e: any) {
      toast.show(e?.response?.data?.message || e.message || "Gagal menyimpan perubahan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setSaving(true);
    try {
      await deletePelanggaran(id);
      setRiwayat((prev) => prev.filter((r) => r.id !== id));
      setConfirmDel(null);
      toast.show("Laporan berhasil dihapus");
    } catch (e: any) {
      toast.show(e?.response?.data?.message || e.message || "Gagal menghapus laporan", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="bg-blob blob-1" /><div className="bg-blob blob-2" />
        <div className="loading-fullscreen">
          <Loader2 size={34} className="spin" style={{ color: "#A855F7" }} />
          <span className="loading-text">Memuat riwayat...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="bg-blob blob-1" /><div className="bg-blob blob-2" />
      <ToastContainer toasts={toast.toasts} />

      {confirmDel && (
        <ConfirmDialog
          nama={confirmDel.jenisPelanggaran.nama}
          onConfirm={() => handleDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
          loading={saving}
        />
      )}
      {editItem && (
        <EditModal
          item={editItem}
          jenisList={jenisList}
          onSave={handleSaveEdit}
          onCancel={() => setEditItem(null)}
          loading={saving}
        />
      )}

      <div className="dashboard-container">

        {/* ── Header ── */}
        <header className="dash-header">
          <button className="riwayat-back-btn" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Kembali
          </button>
        </header>

        {/* ── Page Title ── */}
        <div className="riwayat-title-row">
          <div className="riwayat-icon-badge">
            <Clock size={24} style={{ color: "#A855F7" }} />
          </div>
          <div className="riwayat-title-text">
            <h1>Riwayat Laporan Saya</h1>
            <p>Laporan pelanggaran yang telah Anda catat</p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="stat-mini-grid">
          {[
            { label: "Total",     value: stats.total,    color: "#179EFF" },
            { label: "Menunggu",  value: stats.pending,  color: "#F59E0B" },
            { label: "Disetujui", value: stats.approved, color: "#10b981" },
            { label: "Ditolak",   value: stats.rejected, color: "#EF4444" },
          ].map((s) => (
            <div key={s.label} className="glass-panel stat-mini-card">
              <div className="stat-mini-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-mini-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="riwayat-toolbar">
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Cari nama, NIS, kelas, jenis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-btns">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => {
              const isActive = filterStatus === f;
              const cfg = f === "all"
                ? { color: "var(--filter-btn-all-color)", bg: "var(--filter-btn-all-bg)", border: "var(--filter-btn-all-border)" }
                : { color: STATUS_CONFIG[f].color, bg: STATUS_CONFIG[f].bg, border: STATUS_CONFIG[f].border };

              return (
                <button
                  key={f}
                  className="filter-btn"
                  onClick={() => setFilterStatus(f)}
                  style={isActive
                    ? { border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color }
                    : { border: `1px solid var(--filter-btn-inactive-border)`, background: "transparent", color: "var(--filter-btn-inactive-color)" }
                  }
                >
                  {f === "all" ? "Semua" : STATUS_CONFIG[f].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <div className="glass-panel riwayat-empty">
            <TriangleAlert size={32} strokeWidth={1} />
            <span style={{ fontSize: "0.9rem" }}>
              {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada laporan pelanggaran"}
            </span>
            {!search && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 4, fontSize: "0.82rem" }}
                onClick={() => router.push("/guru/laporanPelanggaran")}
              >
                <FileText size={13} /> Buat Laporan Baru
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="count-label">
              Menampilkan <strong>{filtered.length}</strong> dari {safeRiwayat.length} laporan
            </div>

            {filtered.map((item) => {
              const st      = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
              const ks      = KATEGORI_COLOR[item.jenisPelanggaran.kategori] ?? KATEGORI_COLOR.sedang;
              const canEdit = item.status === "pending";

              return (
                <div
                  key={item.id}
                  className="riwayat-card"
                  style={{ borderLeft: `3px solid ${st.color}` }}
                >
                  {/* Row 1: tanggal + status + aksi */}
                  <div className="card-row1">
                    <span className="card-date">📅 {item.tanggal}</span>

                    {/* Status badge — dynamic colors kept inline */}
                    <span
                      className="badge-kategori"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.01em" }}
                    >
                      {st.icon} {st.label}
                    </span>

                    {canEdit && (
                      <div className="card-action-btns">
                        <button className="card-btn-edit" onClick={() => setEditItem(item)} title="Edit laporan">
                          <Edit3 size={13} />
                        </button>
                        <button className="card-btn-del" onClick={() => setConfirmDel(item)} title="Hapus laporan">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="riwayat-card-divider" />

                  {/* Row 2: Avatar + student info */}
                  <div className="card-row2">
                    <div
                      className="card-avatar"
                      style={{ background: `${st.color}18`, border: `1px solid ${st.color}30`, color: st.color }}
                    >
                      {item.siswa.nama.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-student-name">{item.siswa.nama}</div>
                      <div className="card-student-meta">
                        {item.siswa.nis}
                        <span className="card-dot">·</span>
                        Kelas {formatKelasLabel(item.siswa.kelasLabel)}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Jenis + Coins + Foto badge */}
                  <div className="card-row3">
                    <span
                      className="badge-kategori"
                      style={{ background: ks.bg, color: ks.color, border: `1px solid ${ks.border}`, display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", fontSize: "0.78rem" }}
                    >
                      <Tag size={10} /> {item.jenisPelanggaran.nama}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#EF4444", fontWeight: 700, fontSize: "0.82rem", padding: "5px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 20 }}>
                      <Coins size={12} /> -{item.coinspenalty} coins
                    </span>
                    {item.buktiUrl && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#179EFF", fontSize: "0.76rem", padding: "5px 10px", background: "rgba(23,158,255,0.08)", border: "1px solid rgba(23,158,255,0.15)", borderRadius: 20 }}>
                        <ImageIcon size={11} /> Ada foto bukti
                      </span>
                    )}
                  </div>

                  {/* Row 4: Catatan */}
                  {item.catatan && (
                    <div className="card-catatan">"{item.catatan}"</div>
                  )}

                  {/* Locked info */}
                  {!canEdit && (
                    <div className="card-locked">
                      <span>🔒</span> Laporan sudah diproses konselor, tidak dapat diubah
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
