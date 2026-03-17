"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Edit3, Trash2, X, Save, Package,
  TrendingDown, LayoutGrid, Loader2, RefreshCw,
  ShoppingBag, Tag, AlertTriangle, CheckCircle2,
  ToggleLeft, ToggleRight, Clock, BarChart3, Leaf,
} from "lucide-react";
import {
  getAllProduk, getStatsProduk, getKategoriProduk,
  createProduk, updateProduk, deleteProduk, resetStokHarian,
  clearProdukCache, stokColor, stokPct, kemasanLabel,
  titipanPct, filterProduk,
  type ProdukItem, type StatsProduk, type CreateProdukPayload,
} from "@/lib/services/kantin";
import "../../guru/dashboard/dashboard.css";
import "./produk.css";

// ─── FORM STATE ───────────────────────────────────────────────────────────────
const EMPTY_FORM: CreateProdukPayload & { id?: number; isActive?: boolean } = {
  nama: "", harga: 0, stok: 0, kategori: "", jenisKemasan: null,
  isTitipan: false, stokHarian: 0,
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="p-stat-card">
      <div className="p-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div>
        <div className="p-stat-label">{label}</div>
        <div className="p-stat-value" style={{ color }}>{value}</div>
        {sub && <div className="p-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`p-toast p-toast-${type}`}>
      {type === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
      {msg}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0 }}>
        <X size={13} />
      </button>
    </div>
  );
}

// ─── BADGE STOK ───────────────────────────────────────────────────────────────
function StokBadge({ stok }: { stok: number }) {
  const color = stokColor(stok);
  const label = stok === 0 ? "Habis" : stok <= 10 ? `${stok} — Menipis` : `${stok}`;
  return (
    <span className="p-stok-badge" style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
      {label}
    </span>
  );
}

// ─── TITIPAN PROGRESS ─────────────────────────────────────────────────────────
function TitipanBar({ p }: { p: ProdukItem }) {
  const pct  = titipanPct(p.terjualHarian, p.stokHarian);
  const sisa = p.stokSisa ?? 0;
  return (
    <div className="titipan-bar-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: 4 }}>
        <span style={{ color: "var(--txt-sub)" }}>Terjual {p.terjualHarian ?? 0}/{p.stokHarian ?? 0}</span>
        <span style={{ color: stokColor(sisa), fontWeight: 700 }}>Sisa {sisa}</span>
      </div>
      <div className="titipan-track">
        <div className="titipan-fill" style={{ width: `${pct}%`, background: pct >= 90 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#179EFF" }} />
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProdukCard({
  p, onEdit, onDelete, onToggle, delay,
}: {
  p: ProdukItem; onEdit: () => void; onDelete: () => void;
  onToggle: () => void; delay: number;
}) {
  const sc = stokColor(p.stok);

  return (
    <div
      className={`p-card ${!p.isActive ? "p-card-inactive" : ""} ${p.isTitipan ? "p-card-titipan" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {p.isTitipan && (
        <div className="titipan-badge">
          <Clock size={10} /> Titipan
        </div>
      )}

      {/* Kategori */}
      <div className="p-card-kat">{p.kategori}</div>

      {/* Top */}
      <div className="p-card-top">
        <div className="p-card-icon">
          <Package size={22} style={{ color: "var(--accent)" }} />
        </div>
        <div className="p-card-info">
          <div className="p-card-nama">{p.nama}</div>
          <div className="p-card-harga">Rp {p.harga.toLocaleString("id-ID")}</div>
          {p.jenisKemasan && (
            <div className="p-card-kemasan">{kemasanLabel(p.jenisKemasan)}</div>
          )}
        </div>
      </div>

      {/* Stok */}
      {p.isTitipan && p.stokHarian !== null ? (
        <TitipanBar p={p} />
      ) : (
        <div className="p-stok-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span className="p-stok-label">Stok Tersedia</span>
            <StokBadge stok={p.stok} />
          </div>
          <div className="p-progress-track">
            <div className="p-progress-fill" style={{ width: `${stokPct(p.stok)}%`, background: sc }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-card-footer">
        <button
          className="p-icon-btn"
          style={{ color: p.isActive ? "#10b981" : "rgba(128,128,128,0.6)" }}
          onClick={onToggle}
          title={p.isActive ? "Nonaktifkan" : "Aktifkan"}
        >
          {p.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="p-icon-btn edit" onClick={onEdit} title="Edit">
            <Edit3 size={15} />
          </button>
          <button className="p-icon-btn delete" onClick={onDelete} title="Hapus">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── INPUT ROW — di luar ModalForm agar tidak di-recreate tiap render ─────────
// ❌ Jika diletakkan di dalam ModalForm, React buat component baru tiap render
//    → input unmount+remount → focus hilang setiap ketik satu karakter
function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mf-group">
      <label className="mf-label">{label}</label>
      {children}
    </div>
  );
}

// ─── MODAL FORM ───────────────────────────────────────────────────────────────
function ModalForm({
  form: initialForm,
  kategoriList,
  onSave,
  onClose,
  loading,
}: {
  form: typeof EMPTY_FORM & { id?: number };
  kategoriList: string[];
  onSave: (d: typeof EMPTY_FORM & { id?: number }) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ ...initialForm });

  const isEdit = !!form.id;
  type FormState = typeof EMPTY_FORM & { id?: number };
  type NumericField = "harga" | "stok" | "stokHarian";

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleNum(k: NumericField) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      set(k, Number(e.target.value) as FormState[typeof k]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...form, kategori: form.kategori.trim() });
  }

  return (
    <div className="p-overlay" onClick={onClose}>
      <div className="p-modal" onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ width: 32, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
        <button onClick={onClose} className="p-modal-close"><X size={15} /></button>
        <div className="p-modal-title">{isEdit ? "Edit Produk" : "Tambah Produk Baru"}</div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputRow label="Nama Produk *">
            <input
              className="mf-input"
              required
              placeholder="Contoh: Nasi Goreng Spesial"
              value={form.nama}
              onChange={(e) => set("nama", e.target.value)}
            />
          </InputRow>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InputRow label="Harga (Rp) *">
              <input className="mf-input" required type="number" min={1} value={form.harga} onChange={handleNum("harga")} />
            </InputRow>
            {!form.isTitipan && (
              <InputRow label="Stok Awal">
                <input className="mf-input" required type="number" min={0} value={form.stok} onChange={handleNum("stok")} />
              </InputRow>
            )}
            {form.isTitipan && (
               <InputRow label="Sisa Awal Titipan">
                 <input className="mf-input" required type="number" min={0} value={form.stokHarian ?? form.stok} onChange={handleNum("stokHarian")} />
                </InputRow>
            )}
          </div>

          <InputRow label="Kategori *">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {["Makanan", "Minuman", "Snack", "Lainnya", ...kategoriList.filter((k) => !["Makanan","Minuman","Snack","Lainnya"].includes(k))]
                .map((k) => (
                  <button
                    key={k} type="button"
                    className={`mf-chip ${form.kategori === k ? "active" : ""}`}
                    onClick={() => set("kategori", k)}
                  >
                    {k}
                  </button>
                ))}
            </div>
            <input
              className="mf-input"
              placeholder="Atau ketik kategori baru..."
              value={form.kategori}
              onChange={(e) => set("kategori", e.target.value)}
            />
          </InputRow>

          <InputRow label="Jenis Kemasan">
            <select
              className="mf-input"
              value={form.jenisKemasan ?? ""}
              onChange={(e) => set("jenisKemasan", (e.target.value as FormState["jenisKemasan"]) || null)}
            >
              <option value="">— Tidak ada —</option>
              <option value="plastik">🛍️ Plastik</option>
              <option value="kertas">📦 Kertas</option>
              <option value="tanpa_kemasan">✅ Tanpa Kemasan</option>
            </select>
          </InputRow>

          {/* Titipan harian */}
          <div className="mf-titipan-wrap">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="mf-label">Titipan Harian</div>
                <div style={{ fontSize: "0.7rem", color: "var(--txt-sub)", marginTop: 2 }}>
                  Input yang dipakai adalah sisa awal titipan untuk hari ini
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !form.isTitipan;
                  set("isTitipan", next);
                  if (next) set("stokHarian", form.stokHarian ?? form.stok);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: form.isTitipan ? "#179EFF" : "var(--txt-sub)", display: "flex" }}
              >
                {form.isTitipan ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="button" className="mf-btn-cancel" onClick={onClose}>Batal</button>
            <button type="submit" className="mf-btn-save" disabled={loading}>
              {loading
                ? <><Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> Menyimpan...</>
                : <><Save size={14} /> {isEdit ? "Simpan" : "Tambah Produk"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MODAL KONFIRMASI HAPUS ───────────────────────────────────────────────────
function ModalHapus({ nama, onYa, onClose, loading }: {
  nama: string; onYa: () => void; onClose: () => void; loading: boolean;
}) {
  return (
    <div className="p-overlay" onClick={onClose}>
      <div className="p-modal" style={{ maxWidth: 360, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,0.12)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <Trash2 size={24} style={{ color: "#EF4444" }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>Hapus Produk?</div>
        <div style={{ fontSize: "0.8rem", color: "var(--txt-sub)", marginBottom: 22 }}>
          <strong>{nama}</strong> akan dinonaktifkan dan tidak muncul di katalog.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} className="mf-btn-cancel" style={{ flex: 1 }}>Batal</button>
          <button
            onClick={onYa}
            disabled={loading}
            style={{ flex: 1, padding: "11px", background: "#EF4444", borderWidth: 0, borderRadius: 12, color: "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {loading ? <Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> : <Trash2 size={14} />} Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProdukPage() {
  const [produkAll,    setProdukAll]    = useState<ProdukItem[]>([]);
  const [stats,        setStats]        = useState<StatsProduk | null>(null);
  const [kategoriList, setKategoriList] = useState<string[]>([]);

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [search,      setSearch]      = useState("");
  const [activeKat,   setActiveKat]   = useState("semua");
  const [showInaktif, setShowInaktif] = useState(false);

  const [modalForm,  setModalForm]  = useState<(typeof EMPTY_FORM & { id?: number }) | null>(null);
  const [modalHapus, setModalHapus] = useState<ProdukItem | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async (force = false) => {
    if (!produkAll.length) setLoading(true);
    else setRefreshing(true);
    try {
      const [data, s, k] = await Promise.all([
        getAllProduk({}, force),
        getStatsProduk(force),
        getKategoriProduk(),
      ]);
      setProdukAll(data);
      setStats(s);
      setKategoriList(k);
    } catch (e) {
      showToast("Gagal memuat data produk", "err");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [produkAll.length]);

  useEffect(() => { load(false); }, []); // eslint-disable-line

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
  }

  // ── Filter client-side ─────────────────────────────────────────────────────
  const produkTampil = filterProduk(produkAll, { search, kategori: activeKat, showInaktif });

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function handleSave(form: typeof EMPTY_FORM & { id?: number }) {
    setActionLoading(true);
    try {
      const normalizedForm = form.isTitipan
        ? { ...form, stok: form.stokHarian ?? form.stok }
        : { ...form, stokHarian: undefined };

      if (form.id) {
        const { id, ...payload } = normalizedForm;
        await updateProduk(id, payload);
        showToast("Produk berhasil diperbarui", "ok");
      } else {
        await createProduk(normalizedForm as CreateProdukPayload);
        showToast("Produk berhasil ditambahkan", "ok");
      }
      setModalForm(null);
      await load(true);
    } catch (e: any) {
      showToast(e.message || "Gagal menyimpan produk", "err");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!modalHapus) return;
    setActionLoading(true);
    try {
      await deleteProduk(modalHapus.id);
      showToast("Produk berhasil dinonaktifkan", "ok");
      setModalHapus(null);
      await load(true);
    } catch (e: any) {
      showToast(e.message || "Gagal hapus produk", "err");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggle(p: ProdukItem) {
    try {
      await updateProduk(p.id, { isActive: !p.isActive });
      showToast(p.isActive ? "Produk dinonaktifkan" : "Produk diaktifkan", "ok");
      await load(true);
    } catch (e: any) {
      showToast(e.message || "Gagal mengubah status", "err");
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="dashboard-page product-page">
        <div className="bg-blob blob-1" />
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <Loader2 size={36} style={{ color: "#179EFF", animation: "spin .75s linear infinite" }} />
          <span style={{ color: "var(--txt-sub)", fontSize: "0.84rem" }}>Memuat produk...</span>
        </div>
      </main>
    );
  }

  const kategoriTabs = ["semua", ...kategoriList.filter((k) => k)];

  return (
    <main className="dashboard-page product-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      {/* Modals */}
      {modalForm && (
        <ModalForm
          form={modalForm}
          kategoriList={kategoriList}
          onSave={handleSave}
          // ✅ onChange dihapus — tidak diperlukan lagi
          onClose={() => setModalForm(null)}
          loading={actionLoading}
        />
      )}
      {modalHapus && (
        <ModalHapus
          nama={modalHapus.nama}
          onYa={handleDelete}
          onClose={() => setModalHapus(null)}
          loading={actionLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="he-container">
        <header className="header-section">
          <Link href="/kantin/dashboard" className="page-title" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="filter-btn" style={{ padding: 8, display: "grid", placeItems: "center" }}>
              <ArrowLeft size={22} />
            </div>
            <h1>Kelola Produk</h1>
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              className="filter-btn"
              onClick={() => { clearProdukCache(); load(true); }}
              disabled={refreshing}
              style={{ padding: 8 }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? "spin .75s linear infinite" : "none" }} />
            </button>
          </div>
        </header>
      </div>

      <div className="prod-container">

        {/* Stats */}
        {stats && (
          <div className="p-stats-grid">
            <StatCard icon={<LayoutGrid size={18} />}  label="Total Produk"  value={stats.totalProduk}  sub={`${stats.totalAktif} aktif`}                 color="#179EFF" />
            <StatCard icon={<TrendingDown size={18} />} label="Stok Kritis"   value={stats.stokRendah}   sub={`${stats.stokHabis} habis`}                  color="#EF4444" />
            <StatCard icon={<ShoppingBag size={18} />}  label="Titipan Hari Ini" value={stats.totalTitipan} sub={`${stats.titipanTerjual} terjual`}        color="#F59E0B" />
            <StatCard icon={<BarChart3 size={18} />}    label="Semua Menu"    value={stats.totalAktif}   sub="produk aktif"                                  color="#10b981" />
          </div>
        )}

        {/* Controls */}
        <div className="p-control-bar">
          <div className="p-search-wrap">
            <input
              className="p-search"
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="p-btn-inaktif"
            onClick={() => setShowInaktif((v) => !v)}
            style={{ opacity: showInaktif ? 1 : 0.55 }}
          >
            {showInaktif ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <span className="p-btn-text">Inaktif</span>
          </button>
          <button className="p-btn-add" onClick={() => setModalForm({ ...EMPTY_FORM })}>
            <Plus size={16} /> <span className="p-btn-text">Tambah</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="p-tabs-wrap">
          {kategoriTabs.map((k) => (
            <button
              key={k}
              className={`p-tab ${activeKat === k ? "active" : ""}`}
              onClick={() => setActiveKat(k)}
              style={{ textTransform: "capitalize" }}
            >
              {k === "semua" ? "Semua" : k}
            </button>
          ))}
        </div>

        {/* Grid */}
        {produkTampil.length === 0 ? (
          <div className="p-empty">
            <Package size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Tidak ada produk</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.5 }}>
              {search ? `Tidak ada hasil untuk "${search}"` : "Tambah produk pertama kamu!"}
            </div>
          </div>
        ) : (
          <div className="p-grid">
            {produkTampil.map((p, i) => (
              <ProdukCard
                key={p.id}
                p={p}
                delay={i * 40}
                onEdit={() => setModalForm({
                  id: p.id, nama: p.nama, harga: p.harga, stok: p.stok,
                  kategori: p.kategori, jenisKemasan: p.jenisKemasan,
                  isTitipan: p.isTitipan, stokHarian: p.stokHarian ?? p.stok,
                })}
                onDelete={() => setModalHapus(p)}
                onToggle={() => handleToggle(p)}
              />
            ))}
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>


    </main>
  );
}
