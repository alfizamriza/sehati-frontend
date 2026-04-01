"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Search, User, Loader2, CheckCircle2, X } from "lucide-react";
import { getDaftarKasbon, lunasiKasbon, formatRupiah, formatWaktu, type KasbonItem } from "@/lib/services/kantin";
import BrandLogo from "@/components/common/BrandLogo";
import { ErrorState, LoadingState } from "@/components/common/AsyncState";
import "../../guru/dashboard/dashboard.css";
import "./kasbon.css";

// ─── THEME HOOK ───────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }, [dark]);
}

// ─── TABS FILTER ──────────────────────────────────────────────────────────────

type TabFilter = "semua" | "siswa" | "guru" | "umum";

function TabsFilter({ active, onChange }: { active: TabFilter; onChange: (t: TabFilter) => void }) {
  const tabs: { key: TabFilter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "siswa", label: "Siswa" },
    { key: "guru", label: "Guru" },
    { key: "umum", label: "Umum" },
  ];
  return (
    <div className="kasbon-tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`kasbon-tab-btn ${active === t.key ? "active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── MODAL PELUNASAN ─────────────────────────────────────────────────────────

function ModalBayarKasbon({ 
  item, onClose, onSuccess 
}: { 
  item: KasbonItem; onClose: () => void; onSuccess: () => void;
}) {
  const [nominalStr, setNominalStr] = useState(item.sisaUtang.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nominal = parseInt(nominalStr.replace(/\D/g, "") || "0", 10);
  const sisa = Math.max(0, item.sisaUtang - nominal);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setNominalStr(raw);
    setError(null);
  }

  async function handleBayar() {
    if (nominal <= 0) {
      setError("Masukkan nominal lebih dari Rp 0");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await lunasiKasbon(item.id, nominal);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Gagal mencatat pelunasan");
      setLoading(false);
    }
  }

  return (
    <div className="kasbon-modal-overlay">
      <div className="kasbon-modal-card glass-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Bayar Kasbon</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--k-text-faint)" }}>
            <X size={20} />
          </button>
        </div>

        <div className="kasbon-info-box">
          <div className="kb-info-row"><span>Nama</span><strong>{item.namaPembeli || "Umum"} ({item.identitas || "-"})</strong></div>
          <div className="kb-info-row"><span>Sisa Utang</span><strong style={{ color: "#EF4444" }}>{formatRupiah(item.sisaUtang)}</strong></div>
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: 8, color: "var(--k-text-dimmed)" }}>
            Nominal yang dibayar:
          </label>
          <div className="kb-input-wrap">
            <span className="kb-input-prefix">Rp</span>
            <input 
              type="text" 
              inputMode="numeric"
              className="kb-input" 
              value={nominal === 0 && !nominalStr ? "" : nominal.toLocaleString("id-ID")}
              onChange={handleInput}
            />
          </div>
          {nominal > item.sisaUtang && (
            <div style={{ fontSize: "0.75rem", color: "#F59E0B", marginTop: 6 }}>
              Nominal melebihi utang. Status akan lunas dan sistem hanya mencatat hingga sisa utang maksimal.
            </div>
          )}
          {nominal > 0 && nominal < item.sisaUtang && (
            <div style={{ fontSize: "0.8rem", color: "var(--k-text-primary)", marginTop: 8, textAlign: "right" }}>
              Sisa Utang Jadi: <strong>{formatRupiah(sisa)}</strong>
            </div>
          )}
          {error && <div style={{ color: "#EF4444", fontSize: "0.8rem", marginTop: 8 }}>{error}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="kb-btn-sec" onClick={onClose} disabled={loading}>Batal</button>
          <button className="kb-btn-pri" onClick={handleBayar} disabled={loading || nominal <= 0}>
            {loading ? <><Loader2 size={16} className="spin" /> Memproses...</> : "Konfirmasi Pembayaran"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function KasbonPage() {
  useTheme();
  const [data, setData] = useState<KasbonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [tab, setTab] = useState<TabFilter>("semua");
  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState<KasbonItem | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const res = await getDaftarKasbon();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Gagal memuat daftar kasbon");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = data.filter((d) => {
    if (tab !== "semua" && d.tipePelanggan !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nama = d.namaPembeli?.toLowerCase() || "";
      const id = d.identitas?.toLowerCase() || "";
      if (!nama.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  const totalPiutang = filtered.reduce((acc, curr) => acc + curr.sisaUtang, 0);

  if (error) {
    return (
      <main className="kasbon-page">
        <div className="bg-blob blob-1" />
        <ErrorState title="Gagal Memuat Daftar Utang" message={error} onRetry={loadData} />
      </main>
    );
  }

  if (loading && !data.length) {
    return (
      <main className="kasbon-page">
        <div className="bg-blob blob-1" />
        <LoadingState message="Memuat daftar kasbon..." />
      </main>
    );
  }

  return (
    <main className="kasbon-page dashboard-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      {modalItem && (
        <ModalBayarKasbon 
          item={modalItem} 
          onClose={() => setModalItem(null)} 
          onSuccess={() => { setModalItem(null); loadData(); }} 
        />
      )}

      <div className="kasbon-container">
        <header className="k-header glass-panel" style={{ padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/kantin/dashboard" className="k-btn-back">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Daftar Kasbon</h1>
              <span style={{ fontSize: "0.8rem", color: "var(--k-text-faint)" }}>Kelola piutang pelanggan</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
             <div style={{ fontSize: "0.7rem", color: "var(--k-text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Piutang ({tab})</div>
             <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#EF4444" }}>{formatRupiah(totalPiutang)}</div>
          </div>
        </header>

        <div className="kasbon-controls glass-panel">
          <TabsFilter active={tab} onChange={setTab} />
          <div className="kb-search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Cari nama atau NIP/NIS..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="kasbon-list">
          {filtered.length === 0 ? (
            <div className="glass-panel" style={{ padding: 40, textAlign: "center", color: "var(--k-text-faint)" }}>
              <CreditCard size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.5 }} />
              <div>Tidak ada kasbon ditemukan.</div>
            </div>
          ) : (
             filtered.map((item) => (
                <div key={item.id} className="kasbon-card glass-panel">
                   <div className="kb-card-header">
                      <div className="kb-card-avatar">{item.namaPembeli ? item.namaPembeli[0].toUpperCase() : "U"}</div>
                      <div className="kb-card-info">
                         <div className="kb-nama">{item.namaPembeli || "Umum"} <span className="kb-badge">{item.tipePelanggan}</span></div>
                         <div className="kb-id">{item.identitas || "-"} · {formatWaktu(item.tanggal)}</div>
                      </div>
                   </div>
                   <div style={{ display: "flex", gap: 16, marginTop: 12, marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed var(--k-border-base)" }}>
                      <div style={{ flex: 1 }}>
                         <div style={{ fontSize: "0.7rem", color: "var(--k-text-faint)" }}>Total Tagihan</div>
                         <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{formatRupiah(item.totalTagihan)}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                         <div style={{ fontSize: "0.7rem", color: "var(--k-text-faint)" }}>Telah Dibayar</div>
                         <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#10B981" }}>{formatRupiah(item.sudahDibayar)}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "right" }}>
                         <div style={{ fontSize: "0.7rem", color: "var(--k-text-faint)" }}>Sisa Utang</div>
                         <div style={{ fontSize: "1rem", fontWeight: 800, color: "#EF4444" }}>{formatRupiah(item.sisaUtang)}</div>
                      </div>
                   </div>
                   <button className="kb-btn-bayar" onClick={() => setModalItem(item)}>Catat Pembayaran</button>
                </div>
             ))
          )}
        </div>
        
        <div style={{ height: 40 }} />
      </div>

      <style jsx>{`
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
