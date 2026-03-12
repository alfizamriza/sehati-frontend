"use client";

import { useState, useEffect } from "react";
import {
  getKantin, getCachedKantin, createKantin, updateKantin,
  deleteKantin, getKantinDetail,
  type Kantin, type KantinDetail,
  type CreateKantinDto, type UpdateKantinDto,
} from "@/lib/services/admin";
import {
  Search, Plus, Pencil, Trash2, X, Save, Loader2, AlertCircle,
  CheckCircle, XCircle, Store, Package, Phone, Eye, ChevronRight,
  ShoppingBag, Tag, User, LayoutGrid, CheckSquare, TrendingUp,
} from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

const KEMASAN_LABEL: Record<string, string> = {
  plastik:       "Plastik",
  kertas:        "Kertas",
  tanpa_kemasan: "Tanpa Kemasan",
};

// Each kemasan type gets a color from CSS vars; we map to a CSS class suffix
const KEMASAN_CLASS: Record<string, { bg: string; color: string }> = {
  plastik:       { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  kertas:        { bg: "rgba(5,150,105,0.12)",  color: "var(--green)" },
  tanpa_kemasan: { bg: "var(--surface-2)",       color: "var(--text-faint)" },
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

// ─── MODAL DETAIL PRODUK ───────────────────────────────────────────────────────
function ModalDetailProduk({ kantin, onClose }: { kantin: KantinDetail; onClose: () => void }) {
  const grouped = kantin.produk.reduce<Record<string, typeof kantin.produk>>((acc, p) => {
    if (!acc[p.kategori]) acc[p.kategori] = [];
    acc[p.kategori].push(p);
    return acc;
  }, {});

  const totalNilaiStok = kantin.produk.reduce((sum, p) => sum + p.harga * p.stok, 0);
  const produkAktif = kantin.produk.filter((p) => p.statusAktif).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, maxHeight: "88vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
      >
        {/* ── Detail Header ── */}
        <div className="detail-modal-header">
          <div className="detail-modal-title-row">
            <div className="detail-modal-identity">
              <div className="store-avatar" style={{ width: 48, height: 48, borderRadius: "var(--r-lg)" }}>
                <Store size={22} />
              </div>
              <div>
                <h3 className="detail-modal-name">{kantin.nama}</h3>
                <div className="detail-modal-meta">
                  <span>@{kantin.username}</span>
                  {kantin.noHp && <span>·  {kantin.noHp}</span>}
                </div>
              </div>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Stats strip */}
          <div className="detail-stats-strip">
            {[
              { label: "Total Produk",  value: kantin.produk.length,    color: "var(--primary)" },
              { label: "Produk Aktif",  value: produkAktif,             color: "var(--green)" },
              { label: "Nilai Stok",    value: formatRupiah(totalNilaiStok), color: "var(--amber)" },
            ].map((s) => (
              <div key={s.label} className="detail-stat-chip">
                <div className="detail-stat-chip-label">{s.label}</div>
                <div className="detail-stat-chip-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="detail-modal-body">
          {kantin.produk.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={44} className="empty-state-icon" />
              <span className="empty-state-text">Kantin ini belum memiliki produk</span>
            </div>
          ) : (
            Object.entries(grouped).map(([kategori, produkList]) => (
              <div key={kategori} className="produk-list">
                {/* Category header */}
                <div className="produk-kategori-header">
                  <Tag size={12} style={{ color: "var(--amber)" }} />
                  <span className="produk-kategori-label">{kategori}</span>
                  <div className="produk-kategori-divider" />
                  <span className="produk-kategori-count">{produkList.length} produk</span>
                </div>

                {/* Produk items */}
                {produkList.map((p) => (
                  <div key={p.id} className={`produk-item ${p.statusAktif ? "aktif" : "nonaktif"}`}>
                    <div className={`produk-item-icon ${p.statusAktif ? "aktif" : "nonaktif"}`}>
                      <Package size={15} />
                    </div>

                    <div className="produk-item-body">
                      <div className="produk-item-name">
                        <span style={{ opacity: p.statusAktif ? 1 : 0.6 }}>{p.nama}</span>
                        {!p.statusAktif && <span className="produk-nonaktif-badge">nonaktif</span>}
                      </div>
                      {p.jenisKemasan && (
                        <span
                          className="kemasan-badge"
                          style={{
                            background: KEMASAN_CLASS[p.jenisKemasan]?.bg ?? "var(--surface-2)",
                            color: KEMASAN_CLASS[p.jenisKemasan]?.color ?? "var(--text-faint)",
                          }}
                        >
                          {KEMASAN_LABEL[p.jenisKemasan]}
                        </span>
                      )}
                    </div>

                    <div className="produk-item-price">
                      <div className="produk-harga" style={{ opacity: p.statusAktif ? 1 : 0.4 }}>
                        {formatRupiah(p.harga)}
                      </div>
                      <div className={`produk-stok ${p.stok === 0 ? "zero" : p.stok <= 5 ? "low" : "ok"}`}>
                        Stok: {p.stok}
                        {p.stok === 0 && " 🚫"}
                        {p.stok > 0 && p.stok <= 5 && " ⚠️"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function KantinPage() {
  const [dataKantin,     setDataKantin]     = useState<Kantin[]>(() => getCachedKantin() || []);
  const [query,          setQuery]          = useState("");
  const [isLoading,      setIsLoading]      = useState(() => !getCachedKantin());
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [detailKantin,   setDetailKantin]   = useState<KantinDetail | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode,   setModalMode]   = useState<"add" | "edit">("add");
  const [currentId,   setCurrentId]   = useState<number | null>(null);
  const [formData,    setFormData]    = useState({
    nama: "", username: "", password: "", noHp: "", statusAktif: true,
  });

  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>(
    { show: false, msg: "", type: "success" }
  );

  // ── Helpers ──
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
  };

  // ── Load ──
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getKantin({ forceRefresh: true });
        if (mounted) setDataKantin(data);
      } catch (err: any) {
        showToast(err.message || "Gagal memuat data", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const safeKantin = Array.isArray(dataKantin) ? dataKantin : [];
  const filtered = safeKantin.filter((k) => {
    const q = query.toLowerCase();
    return k.nama.toLowerCase().includes(q) || k.username.toLowerCase().includes(q);
  });

  // ── Modal helpers ──
  const openAdd = () => {
    setModalMode("add");
    setCurrentId(null);
    setFormData({ nama: "", username: "", password: "", noHp: "", statusAktif: true });
    setIsModalOpen(true);
  };

  const openEdit = (k: Kantin) => {
    setModalMode("edit");
    setCurrentId(k.id);
    setFormData({ nama: k.nama, username: k.username, password: "", noHp: k.noHp || "", statusAktif: k.statusAktif });
    setIsModalOpen(true);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!formData.nama.trim() || !formData.username.trim()) {
      showToast("Nama dan Username wajib diisi!", "error"); return;
    }
    if (modalMode === "add" && !formData.password) {
      showToast("Password wajib diisi!", "error"); return;
    }
    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        await createKantin({
          nama: formData.nama, username: formData.username,
          password: formData.password,
          noHp: formData.noHp || undefined,
          statusAktif: formData.statusAktif,
        } as CreateKantinDto);
        showToast("Akun kantin berhasil dibuat!", "success");
      } else {
        const payload: UpdateKantinDto = {
          nama: formData.nama, username: formData.username,
          noHp: formData.noHp || undefined,
          statusAktif: formData.statusAktif,
        };
        if (formData.password) payload.password = formData.password;
        await updateKantin(currentId!, payload);
        showToast("Data kantin berhasil diperbarui!", "success");
      }
      setDataKantin(await getKantin({ forceRefresh: true }));
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus akun kantin "${nama}"?\nAkun tidak dapat dipulihkan.`)) return;
    try {
      await deleteKantin(id);
      showToast(`Kantin ${nama} berhasil dihapus`, "success");
      setDataKantin((p) => p.filter((k) => k.id !== id));
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus", "error");
    }
  };

  // ── Detail ──
  const handleLihatProduk = async (id: number) => {
    setLoadingDetailId(id);
    try {
      const detail = await getKantinDetail(id);
      setDetailKantin(detail);
    } catch (err: any) {
      showToast(err.message || "Gagal mengambil detail", "error");
    } finally {
      setLoadingDetailId(null);
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
              borderColor: toast.type === "success" ? "rgba(5,150,105,0.35)" : "rgba(239,68,68,0.35)",
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
          <div className="search-container" style={{ flex: 1, maxWidth: 400 }}>
            <Search size={17} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
            <input
              type="text" className="search-input"
              placeholder="Cari nama atau username kantin..."
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={17} /> Tambah Kantin
          </button>
        </div>

        {/* ── Summary Bar ── */}
        {!isLoading && safeKantin.length > 0 && (
          <div className="summary-bar">
            {[
              {
                label: "Total Kantin",
                value: safeKantin.length,
                color: "var(--primary)",
                bg: "var(--surface-active)",
                border: "var(--primary-glow)",
                icon: <LayoutGrid size={14} />,
              },
              {
                label: "Kantin Aktif",
                value: safeKantin.filter((k) => k.statusAktif).length,
                color: "var(--green)",
                bg: "var(--green-bg)",
                border: "rgba(5,150,105,0.22)",
                icon: <CheckSquare size={14} />,
              },
              {
                label: "Total Produk",
                value: safeKantin.reduce((s, k) => s + k.jumlahProduk, 0),
                color: "var(--amber)",
                bg: "var(--amber-bg)",
                border: "rgba(217,119,6,0.22)",
                icon: <TrendingUp size={14} />,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="summary-stat"
                style={{ background: s.bg, borderColor: s.border }}
              >
                <div className="summary-stat-label" style={{ color: s.color, display: "flex", alignItems: "center", gap: 5 }}>
                  {s.icon} {s.label}
                </div>
                <div className="summary-stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <div className="card-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="kantin-card" style={{ minHeight: 200 }}>
                {[46, 14, 14, "100%"].map((h, j) => (
                  <div
                    key={j}
                    className="skeleton-shimmer"
                    style={{
                      width: j === 0 ? 46 : "80%",
                      height: typeof h === "number" ? h : 14,
                      borderRadius: j === 0 ? "50%" : 4,
                      marginBottom: 14,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Store size={52} className="empty-state-icon" />
            <span className="empty-state-text">
              {query ? "Kantin tidak ditemukan" : "Belum ada mitra kantin"}
            </span>
          </div>
        ) : (
          <div className="card-grid">
            {filtered.map((kantin) => (
              <div key={kantin.id} className="kantin-card">

                {/* Header */}
                <div className="kantin-card-header">
                  <div className="kantin-card-identity">
                    <div className="store-avatar"><Store size={20} /></div>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="kantin-name">{kantin.nama}</h3>
                      <div className="kantin-username">
                        <User size={11} />
                        @{kantin.username}
                      </div>
                    </div>
                  </div>
                  <StatusBadge active={kantin.statusAktif} />
                </div>

                {/* Info Panel */}
                <div className="kantin-info-panel">
                  {kantin.noHp ? (
                    <div className="kantin-info-row">
                      <Phone size={13} className="kantin-info-icon" />
                      {kantin.noHp}
                    </div>
                  ) : (
                    <div className="kantin-info-row empty">
                      <Phone size={13} className="kantin-info-icon" />
                      Tidak ada kontak
                    </div>
                  )}
                  <div className="kantin-info-row">
                    <Package size={13} className="kantin-info-icon" />
                    <span>
                      <strong style={{ color: "var(--primary)" }}>{kantin.jumlahProduk}</strong>
                      {" "}produk terdaftar
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="kantin-actions">
                  <button
                    className="btn-lihat-produk"
                    onClick={() => handleLihatProduk(kantin.id)}
                    disabled={loadingDetailId === kantin.id}
                  >
                    {loadingDetailId === kantin.id ? (
                      <><Loader2 size={13} className="spin" /> Memuat...</>
                    ) : (
                      <><Eye size={13} /> Lihat Produk <ChevronRight size={12} /></>
                    )}
                  </button>

                  <button className="btn-icon-sq edit" onClick={() => openEdit(kantin)} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="btn-icon-sq delete" onClick={() => handleDelete(kantin.id, kantin.nama)} title="Hapus">
                    <Trash2 size={15} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Add / Edit ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === "add" ? "Tambah Akun Kantin" : "Edit Data Kantin"}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid-equal">
                <div className="form-group">
                  <label className="form-label">Nama Kantin</label>
                  <input type="text" className="form-input" placeholder="Kantin Bu Sari..."
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input type="text" className="form-input" placeholder="kantin_sari"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                  <span className="form-hint">Hanya huruf, angka, dan underscore</span>
                </div>
              </div>

              <div className="form-grid-equal">
                <div className="form-group">
                  <label className="form-label">
                    No. WhatsApp / HP
                    <span className="form-hint" style={{ display: "inline", marginLeft: 6, marginTop: 0 }}>
                      (opsional)
                    </span>
                  </label>
                  <input type="text" className="form-input" placeholder="08xxxxxxxxxx"
                    value={formData.noHp}
                    onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
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

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password" className="form-input"
                  placeholder={modalMode === "edit" ? "Kosongkan jika tidak ingin mengubah" : "Password akun kantin..."}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {modalMode === "edit" && (
                  <span className="form-hint">* Hanya isi jika ingin mereset password</span>
                )}
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

      {/* ── Modal Detail Produk ── */}
      {detailKantin && (
        <ModalDetailProduk kantin={detailKantin} onClose={() => setDetailKantin(null)} />
      )}
    </>
  );
}