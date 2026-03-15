"use client";

import { useMemo, useState, useEffect } from "react";
import {
  getVouchers, getCachedVouchers, createVoucher, updateVoucher,
  deleteVoucher, getSiswaDropdown,
  type Voucher, type VoucherStats, type SiswaDropdown,
} from "@/lib/services/admin";
import {
  Ticket, Search, Plus, Trash2, Edit2, CheckCircle, Clock, XCircle,
  User, Calendar, Copy, Tag, X, Save, ChevronDown,
  AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
type StatusKey = "available" | "used" | "expired";

const STATUS_LABEL: Record<StatusKey, string> = {
  available: "Tersedia",
  used:      "Sudah Dipakai",
  expired:   "Kadaluarsa",
};

const STATUS_CLASS: Record<StatusKey, string> = {
  available: "available",
  used:      "used",
  expired:   "expired",
};

const STATUS_ICON: Record<StatusKey, React.ReactNode> = {
  available: <CheckCircle size={11} />,
  used:      <CheckCircle size={11} />,
  expired:   <XCircle    size={11} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(amount: number, type: string) {
  return type === "percentage"
    ? `${amount}%`
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function formatDateId(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function useToast() {
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>(
    { show: false, msg: "", type: "success" }
  );
  const show = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
  };
  return { toast, success: (m: string) => show(m, "success"), error: (m: string) => show(m, "error") };
}

// ─── HERO STAT CARD ───────────────────────────────────────────────────────────
function HeroStat({ value, label, icon, colorVar, bgClass }: {
  value: number; label: string; icon: React.ReactNode;
  colorVar: string; bgClass: string;
}) {
  return (
    <div className={`voucher-hero-card ${bgClass}`}>
      <div className="voucher-hero-left">
        <div className="voucher-hero-label">{label}</div>
        <div className="voucher-hero-value" style={{ color: colorVar }}>{value}</div>
      </div>
      <div className="voucher-hero-icon" style={{ background: "var(--surface-2)" }}>
        {icon}
      </div>
    </div>
  );
}

// ─── VOUCHER CARD ─────────────────────────────────────────────────────────────
function VoucherCard({ voucher, onEdit, onDelete, onCopy }: {
  voucher: Voucher; onEdit: () => void; onDelete: () => void; onCopy: () => void;
}) {
  const st         = voucher.status as StatusKey;
  const isAvail    = st === "available";
  const isExpired  = st === "expired";

  // Stripe gradient
  const stripeGrad = isAvail
    ? "linear-gradient(90deg, var(--green), #34d399, #6ee7b7)"
    : isExpired
    ? "linear-gradient(90deg, var(--red), #f87171)"
    : "linear-gradient(90deg, var(--surface-hover), var(--text-faint))";

  return (
    <div className={`voucher-card ${isAvail ? "available" : ""}`}
      style={{ opacity: isExpired ? 0.75 : 1 }}>
      {/* Top stripe */}
      <div className="voucher-stripe" style={{ background: stripeGrad }} />

      <div className="voucher-card-body">
        {/* Head row: type icon + status badge */}
        <div className="voucher-card-head">
          <div className="voucher-type-icon"><Tag size={19} /></div>
          <span className={`voucher-status-badge ${STATUS_CLASS[st]}`}>
            {STATUS_ICON[st]} {STATUS_LABEL[st]}
          </span>
        </div>

        {/* Name & nominal */}
        <div>
          <h3 className="voucher-name">{voucher.namaVoucher}</h3>
          <div className="voucher-nominal">
            {formatCurrency(voucher.nominalVoucher, voucher.tipeVoucher)}
          </div>
        </div>

        {/* Info rows */}
        <div className="voucher-info-rows">
          <div className="voucher-info-row">
            <User     size={12} className="voucher-info-icon" />
            {voucher.penerima?.nama || "Umum"} · {voucher.penerima?.kelas || "—"}
          </div>
          <div className="voucher-info-row">
            <Calendar size={12} className="voucher-info-icon" />
            {formatDateId(voucher.tanggalBerlaku)} – {formatDateId(voucher.tanggalBerakhir)}
          </div>
        </div>
      </div>

      {/* Ticket cut separator */}
      <div className="voucher-separator">
        <div className="voucher-separator-line" />
        <div className="voucher-separator-notch" style={{ left: -26 }} />
        <div className="voucher-separator-notch" style={{ right: -26 }} />
      </div>

      {/* Footer */}
      <div className="voucher-card-footer">
        <button type="button" className="voucher-code-btn"
          onClick={() => { navigator.clipboard.writeText(voucher.kodeVoucher); onCopy(); }}
          title="Klik untuk menyalin">
          {voucher.kodeVoucher} <Copy size={11} />
        </button>
        <div className="voucher-actions">
          <button type="button" className="voucher-action-btn edit" title="Edit" onClick={onEdit}>
            <Edit2 size={14} />
          </button>
          <button type="button" className="voucher-action-btn delete" title="Hapus" onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VOUCHER MODAL ────────────────────────────────────────────────────────────
function VoucherModal({ editing, onClose, onSubmit }: {
  editing: Voucher | null; onClose: () => void; onSubmit: (payload: any) => void;
}) {
  const [siswa,       setSiswa]       = useState<SiswaDropdown[]>([]);
  const [siswaLoading, setSiswaLoading] = useState(true);
  const [form, setForm] = useState({
    namaVoucher:     editing?.namaVoucher     ?? "",
    nis:             editing?.penerima?.nis   ?? "",
    tanggalBerlaku:  editing?.tanggalBerlaku  ?? "",
    tanggalBerakhir: editing?.tanggalBerakhir ?? "",
    nominalVoucher:  editing?.nominalVoucher  ?? 0,
    tipeVoucher:     editing?.tipeVoucher     ?? "fixed",
    status:          editing?.status          ?? "available",
  });

  useEffect(() => {
    getSiswaDropdown()
      .then(setSiswa).catch(() => {})
      .finally(() => setSiswaLoading(false));
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="voucher-modal-content" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="voucher-modal-header">
          <div className="voucher-modal-title-row">
            <div className="voucher-modal-icon">
              <Ticket size={17} style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="modal-title" style={{ fontSize: "1rem" }}>
              {editing ? "Edit Voucher" : "Buat Voucher Baru"}
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="voucher-modal-divider" />

        {/* Form */}
        <div className="voucher-modal-form">

          {/* Nama */}
          <div className="voucher-field">
            <label className="voucher-field-label">Nama Voucher</label>
            <input type="text" className="form-input" required
              placeholder="Contoh: Diskon Akhir Tahun"
              value={form.namaVoucher}
              onChange={(e) => setForm({ ...form, namaVoucher: e.target.value })} />
          </div>

          {/* Penerima */}
          <div className="voucher-field">
            <label className="voucher-field-label">
              {siswaLoading ? "Memuat siswa..." : "Pilih Siswa (Penerima)"}
            </label>
            <div style={{ position: "relative" }}>
              <select className="form-input" required
                style={{ appearance: "none", paddingRight: 36 }}
                value={form.nis}
                onChange={(e) => setForm({ ...form, nis: e.target.value })}>
                <option value="">-- Pilih Siswa --</option>
                {siswa.map((s) => (
                  <option key={s.nis} value={s.nis}>{s.nama} ({s.kelas})</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Tipe + Nominal */}
          <div className="form-grid-equal">
            <div className="voucher-field">
              <label className="voucher-field-label">Tipe Diskon</label>
              <div style={{ position: "relative" }}>
                <select className="form-input"
                  style={{ appearance: "none", paddingRight: 36 }}
                  value={form.tipeVoucher}
                  onChange={(e) => setForm({ ...form, tipeVoucher: e.target.value as any })}>
                  <option value="fixed">Nominal (Rp)</option>
                  <option value="percentage">Persentase (%)</option>
                </select>
                <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
              </div>
            </div>
            <div className="voucher-field">
              <label className="voucher-field-label">
                Nilai {form.tipeVoucher === "percentage" ? "(%)" : "(Rp)"}
              </label>
              <input type="number" className="form-input" required min={1}
                value={form.nominalVoucher}
                onChange={(e) => setForm({ ...form, nominalVoucher: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Tanggal */}
          <div className="form-grid-equal">
            <div className="voucher-field">
              <label className="voucher-field-label">Berlaku Mulai</label>
              <input type="date" className="form-input" required
                value={form.tanggalBerlaku}
                onChange={(e) => setForm({ ...form, tanggalBerlaku: e.target.value })} />
            </div>
            <div className="voucher-field">
              <label className="voucher-field-label">Berlaku Hingga</label>
              <input type="date" className="form-input" required
                value={form.tanggalBerakhir}
                onChange={(e) => setForm({ ...form, tanggalBerakhir: e.target.value })} />
            </div>
          </div>

          {/* Status (edit only) */}
          {editing && (
            <div className="voucher-field">
              <label className="voucher-field-label">Status Voucher</label>
              <div style={{ position: "relative" }}>
                <select className="form-input"
                  style={{ appearance: "none", paddingRight: 36 }}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                  <option value="available">✅ Tersedia</option>
                  <option value="used">☑️ Sudah Dipakai</option>
                  <option value="expired">⏰ Kadaluarsa</option>
                </select>
                <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="voucher-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="button" className="btn btn-primary" onClick={() => onSubmit(form)}>
              <Save size={15} />
              {editing ? "Simpan Perubahan" : "Buat Voucher"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function VoucherPage() {
  const { toast, success, error } = useToast();
  const cached = getCachedVouchers();

  const [vouchers,     setVouchers]     = useState<Voucher[]>(cached?.vouchers ?? []);
  const [stats,        setStats]        = useState<VoucherStats>(
    cached?.stats ?? { tersedia: 0, sudahDitukar: 0, kadaluarsa: 0 }
  );
  const [isLoading,    setIsLoading]    = useState(!cached);
  const [query,        setQuery]        = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | StatusKey>("all");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState<Voucher | null>(null);

  const loadData = async (force = false) => {
    try {
      const res = await getVouchers(force);
      setVouchers(Array.isArray(res?.vouchers) ? res.vouchers : []);
      setStats(res?.stats ?? { tersedia: 0, sudahDitukar: 0, kadaluarsa: 0 });
    } catch (err: any) { error(err.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(false); }, []); // eslint-disable-line

  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return safeVouchers.filter((v) => {
      const matchQ = !q || v.namaVoucher.toLowerCase().includes(q) ||
        v.penerima?.nama.toLowerCase().includes(q) ||
        v.kodeVoucher.toLowerCase().includes(q);
      return matchQ && (filterStatus === "all" || v.status === filterStatus);
    });
  }, [query, filterStatus, safeVouchers]);

  const handleRemove = async (id: number) => {
    if (!confirm("Hapus voucher ini secara permanen?")) return;
    try { await deleteVoucher(id); success("Voucher berhasil dihapus"); loadData(true); }
    catch (err: any) { error(err.message); }
  };

  const handleUpsert = async (payload: any) => {
    try {
      if (editing) { await updateVoucher(editing.id, payload); success("Voucher diperbarui!"); }
      else         { await createVoucher(payload);             success("Voucher dibuat!");    }
      setModalOpen(false);
      loadData(true);
    } catch (err: any) { error(err.message); }
  };

  return (
    <>
      {/* ── Toast ── */}
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

        {/* ── Hero Stats ── */}
        <div className="voucher-hero-grid" style={{ marginBottom: 24 }}>
          <HeroStat
            value={stats.tersedia} label="Voucher Tersedia"
            icon={<Ticket size={24} style={{ color: "var(--green)" }} />}
            colorVar="var(--green)" bgClass=""
            // inline override for light-compatible background
          />
          <HeroStat
            value={stats.sudahDitukar} label="Sudah Ditukar"
            icon={<CheckCircle size={24} style={{ color: "var(--primary)" }} />}
            colorVar="var(--primary)" bgClass=""
          />
          <HeroStat
            value={stats.kadaluarsa} label="Kadaluarsa"
            icon={<Clock size={24} style={{ color: "var(--red)" }} />}
            colorVar="var(--red)" bgClass=""
          />
        </div>

        {/* ── Toolbar ── */}
        <div className="voucher-toolbar" style={{ marginBottom: 24 }}>
          {/* Filter tabs */}
          <div className="voucher-filter-tabs">
            {([
              { key: "all",       label: "Semua"      },
              { key: "available", label: "Tersedia"   },
              { key: "used",      label: "Dipakai"    },
              { key: "expired",   label: "Kadaluarsa" },
            ] as const).map(({ key, label }) => (
              <button key={key} type="button"
                className={`voucher-filter-btn ${filterStatus === key ? "active" : ""}`}
                onClick={() => setFilterStatus(key)}>
                {label}
              </button>
            ))}
          </div>

          {/* Search + Buat */}
          <div className="voucher-toolbar-right">
            <div className="voucher-search">
              <Search size={14} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              <input type="text" className="voucher-search-input"
                placeholder="Cari voucher..."
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button type="button" className="btn btn-primary"
              onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus size={15} /> Buat Voucher
            </button>
          </div>
        </div>

        {/* ── Voucher Grid ── */}
        {isLoading ? (
          <div className="voucher-grid">
            {[1,2,3,4].map((i) => (
              <div key={i} className="voucher-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="voucher-empty">
            <div className="voucher-empty-emoji">🎫</div>
            <div className="voucher-empty-title">
              {query ? "Voucher tidak ditemukan" : "Belum ada voucher"}
            </div>
            <div className="voucher-empty-sub">
              {query ? "Coba kata kunci lain" : "Klik 'Buat Voucher' untuk menambahkan"}
            </div>
          </div>
        ) : (
          <div className="voucher-grid">
            {filtered.map((v) => (
              <VoucherCard
                key={v.id}
                voucher={v}
                onCopy={() => success("Kode berhasil disalin!")}
                onEdit={() => { setEditing(v); setModalOpen(true); }}
                onDelete={() => handleRemove(v.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <VoucherModal
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSubmit={handleUpsert}
        />
      )}
    </>
  );
}
