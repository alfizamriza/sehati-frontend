"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, ScanLine, User, Plus, Minus,
  Wallet, X, Check, TicketPercent,
  Loader2, ShoppingCart, AlertTriangle, Coins, Camera,
  ChevronRight, CheckCircle2,
} from "lucide-react";
import SharedAvatar from "@/components/common/SharedAvatar";
import BrandLogo from "@/components/common/BrandLogo";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  lookupSiswa, cekVoucher, getProdukKatalog, createTransaksi,
  addToCart, updateCartQty, getCartTotal, getCartCoinsPenalty,
  buildPayload, hitungDiskon, formatVoucherLabel,
  kelompokkanProduk, kemasanInfo,
  clearProdukCache,
  toggleCartByoc,
  listSiswa,
  type SiswaInfo, type CartItem, type VoucherInfo,
  type TransaksiResult,
} from "@/lib/services/kantin";
import type { ProdukItem } from "@/lib/services/transaksi.service";
import NisSearchInput from "./NisSearchInput";
import { useKantinShortcuts, ShortcutHintBar } from "./useKantinShortcuts";
import "../kantin-tokens.css";
import "../../guru/dashboard/dashboard.css";
import "./transaksi.css";
import "./transaksi-modal.css";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const NOMINAL_TUNAI = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];

const S = {
  glass: { background: "var(--tr-bg-panel-inner)", border: "1px solid var(--tr-border-base)" },
  glassCard: { background: "var(--tr-bg-panel)", border: "1px solid var(--tr-border-base)", color: "var(--tr-text-primary)" },
  muted: { color: "var(--tr-text-muted)" },
  dimmed: { color: "var(--tr-text-dimmed)" },
  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  cyan: "#179EFF",
} as const;

// ─── HOOK: THEME ──────────────────────────────────────────────────────────────

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
  return { dark };
}

// ─── HELPER: SUMMARY ROW ──────────────────────────────────────────────────────

function SummaryRow({ label, value, color, small }: {
  label: React.ReactNode; value: React.ReactNode; color?: string; small?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: 6, fontSize: small ? "0.78rem" : "0.82rem",
      color: color ?? "var(--tr-text-secondary)",
    }}>
      <span>{label}</span>
      <span style={color ? { color, fontWeight: 700 } : {}}>{value}</span>
    </div>
  );
}

// ─── AVATAR MINI ──────────────────────────────────────────────────────────────

function AvatarMini({ fotoUrl, nama }: { fotoUrl: string | null; nama: string }) {
  const initials = nama.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  return (
    <div style={{
      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,rgba(23,158,255,0.3),rgba(139,92,246,0.3))",
      border: "2px solid rgba(23,158,255,0.3)",
      display: "grid", placeItems: "center", overflow: "hidden",
    }}>
      {fotoUrl
        ? <SharedAvatar fotoUrl={fotoUrl} nama={nama} size="100%" />
        : <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff" }}>{initials}</span>
      }
    </div>
  );
}

// ─── KEMASAN CHIP ─────────────────────────────────────────────────────────────

function KemasanChip({ kemasan, penalty }: { kemasan: string | null; penalty: number }) {
  if (!kemasan || kemasan === "tanpa_kemasan") return null;
  const info = kemasanInfo(kemasan);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: 6, marginTop: 4,
      background: `${info.color}14`, border: `1px solid ${info.color}35`,
      fontSize: "0.64rem", fontWeight: 700, color: info.color,
    }}>
      <span>{info.icon}</span><span>{info.label}</span>
      {penalty > 0 && <span style={{ opacity: 0.75 }}>−{penalty} koin</span>}
    </div>
  );
}

// ─── MODAL SHELL ─────────────────────────────────────────────────────────────
/*
  Perbaikan:
  - Desktop (≥600px): modal centered dengan max-height 90vh + scroll internal
  - Mobile (<600px): bottom-sheet dengan drag handle
  - Animasi berbeda: scale-in untuk desktop, slide-up untuk mobile
*/
function ModalSheet({
  children, onClose, title, accentColor = S.cyan, wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  accentColor?: string;
  wide?: boolean;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      onClick={onClose}
      className="modal-overlay-base"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`modal-sheet-base ${wide ? "modal-sheet-wide" : ""}`}
        style={{ borderTopColor: accentColor } as React.CSSProperties}
      >
        {/* Drag handle — hanya muncul di mobile via CSS */}
        <div className="modal-drag-handle" />

        <button className="modal-close-btn" onClick={onClose}>
          <X size={15} />
        </button>

        <div className="modal-title">{title}</div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: SCANNER ───────────────────────────────────────────────────────────

function ModalScanner({ onScan, onClose }: {
  onScan: (val: string) => void;
  onClose: () => void;
}) {
  const [isSecure, setIsSecure] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");

  useEffect(() => { setIsSecure(window.isSecureContext); }, []);

  return (
    <div
      onClick={onClose}
      className="modal-overlay-base"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-sheet-base modal-scanner-sheet"
        style={{ borderTopColor: S.cyan } as React.CSSProperties}
      >
        <div className="modal-drag-handle" />
        <div className="modal-scanner-header">
          <div className="modal-title" style={{ margin: 0 }}>Scan QR Siswa</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setCameraFacing((p) => p === "environment" ? "user" : "environment")}
              className="btn-secondary-sm"
            >
              <Camera size={14} />
              <span>{cameraFacing === "environment" ? "Belakang" : "Depan"}</span>
            </button>
            <button onClick={onClose} className="btn-icon-sm"><X size={15} /></button>
          </div>
        </div>

        <div className="scanner-viewport">
          {isSecure === false ? (
            <div className="scanner-error">
              <AlertTriangle size={28} style={{ color: S.amber, marginBottom: 10 }} />
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Butuh koneksi aman (HTTPS)</div>
              <div style={{ fontSize: "0.79rem", color: "var(--tr-text-muted)", lineHeight: 1.6 }}>
                Buka via <strong>https</strong> atau <strong>localhost</strong> agar kamera bisa diakses.
              </div>
            </div>
          ) : (
            <Scanner
              key={cameraFacing}
              constraints={{ facingMode: cameraFacing }}
              onScan={(codes) => {
                if (!codes.length) return;
                onScan(codes[0].rawValue);
                navigator.vibrate?.(150);
              }}
            />
          )}
        </div>
        <p className="scanner-hint">
          {isSecure === false
            ? "Gunakan origin aman agar scanner bisa mengakses kamera."
            : "Arahkan kamera ke QR Code kartu siswa"}
        </p>
      </div>
    </div>
  );
}

// ─── MODAL: PILIH VOUCHER ─────────────────────────────────────────────────────
/*
  Perbaikan:
  - List voucher lebih besar dan mudah di-tap (min-height 64px per item)
  - Tombol "Pakai" lebih lebar dan jelas
  - Hapus redundansi layout
*/
function ModalVoucher({ siswa, total, onPilih, onManual, onClose }: {
  siswa: SiswaInfo; total: number;
  onPilih: (v: VoucherInfo) => void; onManual: () => void; onClose: () => void;
}) {
  return (
    <ModalSheet onClose={onClose} title="Pilih Voucher" accentColor={S.violet}>
      {siswa.voucherAktif.length > 0 ? (
        <>
          <div className="modal-section-label">
            Voucher Tersedia ({siswa.voucherAktif.length})
          </div>
          <div className="voucher-list">
            {siswa.voucherAktif.map((v) => {
              const diskon = hitungDiskon(v, total);
              const tgl = new Date(v.tanggalBerakhir).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
              return (
                <button
                  key={v.id}
                  className="voucher-item-btn"
                  onClick={() => onPilih(v)}
                >
                  <div className="voucher-icon-wrap" style={{ background: `${S.violet}20`, borderColor: `${S.violet}40` }}>
                    <TicketPercent size={18} style={{ color: S.violet }} />
                  </div>
                  <div className="voucher-info">
                    <div className="voucher-name" style={{ color: S.violet }}>{v.namaVoucher}</div>
                    <div className="voucher-meta">{formatVoucherLabel(v)} · s/d {tgl}</div>
                  </div>
                  <div className="voucher-right">
                    <div className="voucher-diskon">-Rp {diskon.toLocaleString("id-ID")}</div>
                    <div className="voucher-pakai-badge">
                      <Check size={11} /> Pakai
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="modal-divider" />
        </>
      ) : (
        <div className="voucher-empty">
          <TicketPercent size={32} style={{ color: "var(--tr-text-dimmed)", marginBottom: 8 }} />
          <div>Tidak ada voucher aktif</div>
        </div>
      )}
      <button className="btn-manual-voucher" onClick={onManual}>
        <TicketPercent size={15} /> Input kode voucher manual
      </button>
    </ModalSheet>
  );
}

// ─── MODAL: INPUT KODE VOUCHER ────────────────────────────────────────────────
/*
  Perbaikan:
  - Input auto-focus saat modal terbuka
  - Keyboard "enter" langsung cek
  - Input lebih besar dan mudah diketik
*/
function ModalInputVoucher({ nis, onPilih, onClose }: {
  nis: string; onPilih: (v: VoucherInfo) => void; onClose: () => void;
}) {
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // auto-focus setelah animasi modal selesai
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  async function handleCek() {
    if (!kode.trim()) { setErr("Masukkan kode voucher"); return; }
    setLoading(true); setErr(null);
    try {
      const result = await cekVoucher(kode, nis);
      if (!result.valid || !result.voucher) setErr(result.message);
      else onPilih(result.voucher);
    } catch (e: any) {
      setErr(e.message ?? "Gagal cek voucher");
    } finally { setLoading(false); }
  }

  return (
    <ModalSheet onClose={onClose} title="Kode Voucher" accentColor={S.blue}>
      <div className="voucher-input-wrap">
        <TicketPercent size={36} style={{ color: S.blue, display: "block", margin: "0 auto 8px" }} />
        <p className="voucher-input-hint">Masukkan kode voucher promo</p>
      </div>

      <div className="voucher-input-field-wrap">
        <input
          ref={inputRef}
          type="text"
          placeholder="Contoh: HEMAT5K"
          value={kode}
          onChange={(e) => { setKode(e.target.value.toUpperCase()); setErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleCek()}
          className={`voucher-code-input ${err ? "input-error" : ""}`}
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>

      {err && (
        <div className="input-err-msg">
          <AlertTriangle size={13} /> {err}
        </div>
      )}

      <button
        onClick={handleCek}
        disabled={loading || !kode.trim()}
        className="btn-cek-voucher"
        style={{ background: loading || !kode.trim() ? undefined : S.blue }}
      >
        {loading
          ? <><Loader2 size={15} className="spin" /> Mengecek...</>
          : "Cek Voucher"}
      </button>
    </ModalSheet>
  );
}

// ─── KALKULATOR TUNAI ─────────────────────────────────────────────────────────
/*
  Perbaikan:
  - Tombol nominal lebih besar (mudah di-tap)
  - Grid 2×2 di mobile alih-alih 4 kolom sempit
  - Input Rp auto-focus
  - Kembalian ditampilkan lebih menonjol
*/
function KalkulatorTunai({ totalBayar, onUangChange, externalUang, onExternalUangConsumed }: {
  totalBayar: number; onUangChange: (uang: number) => void;
  externalUang?: number | null;
  onExternalUangConsumed?: () => void;
}) {
  const [uangStr, setUangStr] = useState("");
  const [mode, setMode] = useState<"quick" | "numpad">("quick");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Terima uang dari luar (shortcut Numpad / F8)
  useEffect(() => {
    if (externalUang != null && externalUang > 0) {
      setUangStr(externalUang.toLocaleString("id-ID"));
      onUangChange(externalUang);
      onExternalUangConsumed?.();
    }
  }, [externalUang]); // eslint-disable-line

  const uang = parseInt(uangStr.replace(/\D/g, "") || "0", 10);
  const kembalian = uang - totalBayar;
  const cukup = uang >= totalBayar;
  const pas = uang === totalBayar;

  // Nominal otomatis: dibulatkan ke atas ke pecahan terdekat
  const nominalOtomatis = useMemo(() => {
    const pecahan = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];
    // Nominal pas + 3 pilihan di atasnya
    const diatas = pecahan.filter((n) => n >= totalBayar).slice(0, 3);
    // Kalau total pas ke pecahan, tidak perlu "pas" terpisah
    const hasPas = diatas[0] === totalBayar;
    return { diatas, hasPas };
  }, [totalBayar]);

  function setNominal(n: number) {
    setUangStr(n.toLocaleString("id-ID"));
    onUangChange(n);
  }
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw || "0", 10);
    setUangStr(raw ? num.toLocaleString("id-ID") : "");
    onUangChange(num);
  }
  // Numpad on-screen
  function numpadPress(key: string) {
    if (key === "C") { setUangStr(""); onUangChange(0); return; }
    if (key === "⌫") {
      const raw = uangStr.replace(/\D/g, "").slice(0, -1);
      const num = parseInt(raw || "0", 10);
      setUangStr(raw ? num.toLocaleString("id-ID") : "");
      onUangChange(num);
      return;
    }
    const raw = (uangStr.replace(/\D/g, "") + key).replace(/^0+/, "") || "0";
    const num = parseInt(raw, 10);
    setUangStr(num.toLocaleString("id-ID"));
    onUangChange(num);
  }

  const statusBg = uang === 0 ? "transparent" : cukup ? `${S.green}14` : `${S.red}14`;
  const statusBorder = uang === 0 ? "transparent" : cukup ? `${S.green}40` : `${S.red}40`;
  const statusColor = cukup ? S.green : S.red;

  return (
    <div className="kalkulator-wrap">

      {/* ── Total yang harus dibayar (always visible) ── */}
      <div className="kalk-total-header">
        <span className="kalk-total-label">Total tagihan</span>
        <span className="kalk-total-val">Rp {totalBayar.toLocaleString("id-ID")}</span>
      </div>

      {/* ── Mode toggle: Quick | Numpad ── */}
      <div className="kalk-mode-toggle">
        <button
          type="button"
          className={`kalk-mode-btn ${mode === "quick" ? "active" : ""}`}
          onClick={() => setMode("quick")}
        >
          ⚡ Cepat
        </button>
        <button
          type="button"
          className={`kalk-mode-btn ${mode === "numpad" ? "active" : ""}`}
          onClick={() => setMode("numpad")}
        >
          🔢 Numpad
        </button>
      </div>

      {mode === "quick" ? (
        <>
          {/* ── Tombol PAS — paling menonjol ── */}
          <button
            type="button"
            className="kalk-btn-pas"
            onClick={() => setNominal(totalBayar)}
            style={{
              background: pas ? S.green : `${S.green}18`,
              border: `1.5px solid ${S.green}`,
              color: pas ? "#fff" : S.green,
            }}
          >
            <Check size={16} />
            Bayar Pas · Rp {totalBayar.toLocaleString("id-ID")}
          </button>

          {/* ── Nominal otomatis dibulatkan ke atas ── */}
          <div className="kalk-nominal-grid">
            {nominalOtomatis.diatas.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNominal(n)}
                className={`kalk-nominal-btn ${uang === n ? "active" : ""}`}
              >
                <span className="kalk-nominal-rp">
                  Rp {n >= 1_000 ? `${(n / 1_000).toLocaleString("id-ID")}rb` : n}
                </span>
                <span className="kalk-nominal-kembalian" style={{ color: uang === n ? S.cyan : "var(--tr-text-dimmed)" }}>
                  {n === totalBayar ? "pas" : `kembalian ${((n - totalBayar) / 1_000).toFixed(0)}rb`}
                </span>
              </button>
            ))}
          </div>

          {/* ── Input manual jika nominal tidak ada ── */}
          <div className="kalk-input-row">
            <span className="kalk-prefix">Rp</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="atau ketik nominal lain..."
              value={uangStr}
              onChange={handleInput}
              className="kalk-input"
              style={{ borderColor: uang > 0 ? (cukup ? `${S.green}60` : `${S.red}60`) : "var(--tr-border-input)" }}
            />
          </div>
        </>
      ) : (
        <>
          {/* ── Numpad layar sentuh besar ── */}
          <div className="kalk-display">
            <span className="kalk-display-prefix">Rp</span>
            <span className="kalk-display-val">{uangStr || "0"}</span>
          </div>
          <div className="kalk-numpad-grid">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => numpadPress(k)}
                className={`kalk-numpad-btn ${k === "C" ? "kalk-numpad-clear" : k === "⌫" ? "kalk-numpad-back" : ""}`}
              >
                {k}
              </button>
            ))}
          </div>
          {/* Tombol pas di numpad */}
          <button
            type="button"
            className="kalk-btn-pas"
            onClick={() => setNominal(totalBayar)}
            style={{
              background: S.green,
              border: `1.5px solid ${S.green}`,
              color: "#fff",
            }}
          >
            <Check size={16} />
            Bayar Pas · Rp {totalBayar.toLocaleString("id-ID")}
          </button>
        </>
      )}

      {/* ── Status kembalian ── */}
      {uang > 0 && (
        <div className="kalk-status" style={{ background: statusBg, borderColor: statusBorder }}>
          <span className="kalk-status-label">
            {pas ? "✅ Pas" : cukup ? "💰 Kembalian" : "⚠️ Kurang"}
          </span>
          <span className="kalk-status-val" style={{ color: statusColor, fontSize: "1.2rem" }}>
            Rp {Math.abs(kembalian).toLocaleString("id-ID")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── MODAL: KONFIRMASI ────────────────────────────────────────────────────────
/*
  Perbaikan:
  - Dua tab: "Ringkasan" dan "Pembayaran" — tidak perlu scroll panjang
  - Tombol Bayar selalu visible di bawah (sticky footer)
  - BYOC toggle lebih jelas per item
  - Tampilan lebih compact dan terorganisir
*/
function ModalKonfirmasi({ siswa, cart, voucher, metodeBayar, onKonfirmasi, onClose, loading, onToggleByoc, externalUang, onExternalUangConsumed }: {
  siswa: SiswaInfo; cart: CartItem[]; voucher: VoucherInfo | null;
  metodeBayar: "tunai" | "voucher";
  onKonfirmasi: () => void; onClose: () => void; loading: boolean;
  onToggleByoc: (p: CartItem) => void;
  externalUang?: number | null;
  onExternalUangConsumed?: () => void;
}) {
  // Skip tab ringkasan kalau keranjang kecil (≤2 item unik) — langsung ke bayar
  const skipRingkasan = cart.length <= 2;
  const [tab, setTab] = useState<"ringkasan" | "bayar">(skipRingkasan ? "bayar" : "ringkasan");
  const [uangDiterima, setUangDiterima] = useState(0);

  const total = getCartTotal(cart);
  const diskon = voucher ? hitungDiskon(voucher, total) : 0;
  const bayar = Math.max(0, total - diskon);
  const { total: penaltyTotal, detail: penaltyDetail } = getCartCoinsPenalty(cart);
  const selectedWadahCount = cart.filter((c) => c.isByoc).length;
  const kembalian = uangDiterima - bayar;
  const uangKurang = metodeBayar === "tunai" && uangDiterima > 0 && kembalian < 0;
  const bisaBayar = metodeBayar !== "tunai" || uangDiterima >= bayar;
  const accent = metodeBayar === "voucher" ? S.violet : S.green;
  const btnDisabled = loading || !bisaBayar;

  return (
    <ModalSheet onClose={onClose} title="Konfirmasi Pembayaran" accentColor={accent} wide>
      {/* ── Siswa info ── */}
      <div className="konfirm-siswa-row">
        <SharedAvatar fotoUrl={siswa.fotoUrl} nama={siswa.nama} />
        <div>
          <div className="konfirm-siswa-nama">{siswa.nama}</div>
          <div className="konfirm-siswa-sub">{siswa.kelas} · {siswa.nis}</div>
        </div>
        <div className="konfirm-total-badge" style={{ color: accent }}>
          Rp {bayar.toLocaleString("id-ID")}
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div className="konfirm-tabs">
        <button
          className={`konfirm-tab ${tab === "ringkasan" ? "active" : ""}`}
          onClick={() => setTab("ringkasan")}
          style={tab === "ringkasan" ? { borderBottomColor: accent, color: "var(--tr-text-primary)" } : {}}
        >
          Ringkasan
        </button>
        <button
          className={`konfirm-tab ${tab === "bayar" ? "active" : ""}`}
          onClick={() => setTab("bayar")}
          style={tab === "bayar" ? { borderBottomColor: accent, color: "var(--tr-text-primary)" } : {}}
        >
          {metodeBayar === "tunai" ? "💵 Kalkulator Tunai" : "🎟️ Voucher"}
        </button>
      </div>

      {/* ── Tab: Ringkasan ── */}
      {tab === "ringkasan" && (
        <div className="konfirm-tab-content">
          {/* Item list */}
          <div className="konfirm-items">
            {cart.map((c) => (
              <div key={c.id} className="konfirm-item-row">
                <div className="konfirm-item-info">
                  <span className="konfirm-item-name">{c.nama} ×{c.qty}</span>
                  {c.jenisKemasan && c.jenisKemasan !== "tanpa_kemasan" && (
                    <KemasanChip kemasan={c.jenisKemasan} penalty={c.coinsPenaltyPerItem} />
                  )}
                  {/* BYOC toggle inline */}
                  {c.coinsPenaltyPerItem > 0 && (
                    <label className="byoc-toggle-label">
                      <input
                        type="checkbox"
                        checked={c.isByoc}
                        onChange={() => onToggleByoc(c)}
                        style={{ accentColor: S.green }}
                      />
                      <span style={{ color: c.isByoc ? S.green : "var(--tr-text-muted)" }}>
                        {c.isByoc ? "🌱 Bawa Wadah (BYOC)" : "Bawa Wadah?"}
                      </span>
                    </label>
                  )}
                </div>
                <span className="konfirm-item-price">Rp {(c.harga * c.qty).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>

          {/* Price summary */}
          <div className="konfirm-summary-box">
            <SummaryRow label="Subtotal" value={`Rp ${total.toLocaleString("id-ID")}`} />
            {diskon > 0 && <SummaryRow label={`Diskon ${voucher?.namaVoucher}`} value={`-Rp ${diskon.toLocaleString("id-ID")}`} color={S.green} />}
            {penaltyTotal > 0 && <SummaryRow label="⚠️ Penalti koin" value={`-${penaltyTotal} koin`} color={S.red} small />}
            {selectedWadahCount > 0 && <SummaryRow label="🌱 BYOC aktif" value={`${selectedWadahCount} item`} color={S.green} small />}
            <div className="konfirm-total-row">
              <span>Total Bayar</span>
              <span style={{ color: accent }}>Rp {bayar.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Lanjut ke bayar */}
          <button
            className="btn-next-tab"
            style={{ background: accent }}
            onClick={() => setTab("bayar")}
          >
            Lanjut ke Pembayaran <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Tab: Bayar ── */}
      {tab === "bayar" && (
        <div className="konfirm-tab-content">
          {metodeBayar === "tunai" ? (
            <KalkulatorTunai
              totalBayar={bayar}
              onUangChange={setUangDiterima}
              externalUang={externalUang}
              onExternalUangConsumed={onExternalUangConsumed}
            />
          ) : (
            <div className="voucher-confirm-info" style={{ borderColor: `${S.violet}40`, background: `${S.violet}0f` }}>
              <TicketPercent size={20} style={{ color: S.violet }} />
              <div>
                <div style={{ fontWeight: 700, color: S.violet }}>{voucher?.namaVoucher}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--tr-text-muted)" }}>
                  Diskon Rp {diskon.toLocaleString("id-ID")} · Total Rp {bayar.toLocaleString("id-ID")}
                </div>
              </div>
              <CheckCircle2 size={20} style={{ color: S.green, marginLeft: "auto" }} />
            </div>
          )}

          {/* Tombol bayar — sticky di dalam tab */}
          <div className="konfirm-action-row">
            <button
              className="btn-batal"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              className="btn-bayar"
              onClick={onKonfirmasi}
              disabled={btnDisabled}
              style={{ background: btnDisabled ? undefined : accent }}
              title={!bisaBayar && metodeBayar === "tunai" ? "Uang belum cukup" : undefined}
            >
              {loading
                ? <><Loader2 size={15} className="spin" /> Memproses...</>
                : uangKurang
                  ? `Kurang Rp ${Math.abs(kembalian).toLocaleString("id-ID")}`
                  : "Bayar Sekarang"}
            </button>
          </div>
        </div>
      )}
    </ModalSheet>
  );
}

// ─── MODAL: SUKSES ────────────────────────────────────────────────────────────
/*
  Perbaikan:
  - Layout lebih compact
  - Kembalian ditampilkan sangat menonjol
  - Animasi checkmark
*/
function ModalSukses({ result, kembalian, onLagi }: {
  result: TransaksiResult; kembalian: number; onLagi: () => void;
}) {
  const penaltyTotal = result.coinsPenaltyTotal ?? 0;
  return (
    <div className="modal-sukses-overlay">
      <div className="modal-sukses-card">
        <div className="sukses-check-wrap">
          <Check size={38} color="#ffffff" strokeWidth={3} />
        </div>
        <div className="sukses-title">Transaksi Berhasil!</div>
        <div className="sukses-kode">{result.kodeTransaksi}</div>

        {/* Total bayar */}
        <div className="sukses-total">
          Rp {result.totalBayar.toLocaleString("id-ID")}
        </div>

        {/* Kembalian — sangat menonjol */}
        {kembalian > 0 && (
          <div className="sukses-kembalian-box">
            <div className="sukses-kembalian-label">💵 Kembalian</div>
            <div className="sukses-kembalian-val">
              Rp {kembalian.toLocaleString("id-ID")}
            </div>
          </div>
        )}

        {/* BYOC reward */}
        {result.isByoc && result.coinsReward > 0 && (
          <div className="sukses-info-chip" style={{ borderColor: `${S.green}40`, background: `${S.green}14`, color: S.green }}>
            🌱 +{result.coinsReward} koin (BYOC)
          </div>
        )}

        {/* Penalty */}
        {penaltyTotal > 0 && (
          <div className="sukses-info-chip" style={{ borderColor: `${S.red}33`, background: `${S.red}14`, color: S.red }}>
            ⚠️ -{penaltyTotal} koin penalti kemasan
          </div>
        )}

        <button className="btn-transaksi-baru" onClick={onLagi}>
          Transaksi Baru
        </button>
      </div>
    </div>
  );
}

// ─── PRODUK CARD ──────────────────────────────────────────────────────────────

function ProdukCard({ p, qty, onAdd, onMinus, disabled, shortcutNum, pinned }: {
  p: ProdukItem; qty: number; onAdd: () => void; onMinus: () => void;
  disabled: boolean; shortcutNum?: number; pinned?: boolean;
}) {
  const isSelected = qty > 0;
  const hasWarning = p.coinsPenaltyPerItem > 0;

  return (
    <div
      className="produk-card-item"
      onClick={!disabled ? onAdd : undefined}
      style={{
        padding: "14px 12px", borderRadius: 16, position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.15s",
        background: isSelected
          ? `${S.cyan}12`
          : pinned
            ? "rgba(245,158,11,0.06)"
            : "var(--tr-bg-product, rgba(30,41,59,0.6))",
        border: `1px solid ${isSelected
          ? `${S.cyan}4d`
          : pinned
            ? "rgba(245,158,11,0.28)"
            : hasWarning
              ? `${S.red}26`
              : "var(--tr-border-product, rgba(255,255,255,0.06))"}`,
        display: "flex", flexDirection: "column", gap: 6,
      }}
    >
      {/* Shortcut number badge (keyboard) */}
      {shortcutNum !== undefined && !isSelected && (
        <div style={{
          position: "absolute", top: 7, left: 7,
          width: 17, height: 17, borderRadius: 5,
          background: "var(--tr-border-strong)",
          color: "var(--tr-text-dimmed)",
          display: "grid", placeItems: "center",
          fontSize: "0.6rem", fontWeight: 800,
        }}>
          {shortcutNum}
        </div>
      )}

      {/* Pinned badge */}
      {pinned && !isSelected && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          fontSize: "0.58rem", fontWeight: 700,
          color: S.amber, opacity: 0.8,
        }}>
          ★
        </div>
      )}

      {/* Qty badge */}
      {isSelected && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 20, height: 20, borderRadius: "50%",
          background: S.cyan, color: "#fff",
          display: "grid", placeItems: "center",
          fontSize: "0.7rem", fontWeight: 800,
        }}>
          {qty}
        </div>
      )}

      <div style={{
        fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.3,
        color: "var(--tr-text-primary)",
        paddingRight: isSelected ? 20 : 0,
        paddingLeft: shortcutNum !== undefined && !isSelected ? 18 : 0,
      }}>
        {p.nama}
      </div>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: S.cyan }}>
        Rp {p.harga.toLocaleString("id-ID")}
      </div>
      {p.jenisKemasan && <KemasanChip kemasan={p.jenisKemasan} penalty={p.coinsPenaltyPerItem} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <span style={{ fontSize: "0.65rem", color: "var(--tr-text-dimmed)" }}>Stok {p.stok}</span>
        {isSelected && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={onMinus} style={{ width: 22, height: 22, borderRadius: 6, background: "var(--tr-bg-qty-btn)", border: "none", color: "var(--tr-text-primary)", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Minus size={11} />
            </button>
            <button onClick={onAdd} style={{ width: 22, height: 22, borderRadius: 6, background: S.cyan, border: "none", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Plus size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TransaksiPage() {
  useTheme();

  const [produkAll, setProdukAll] = useState<ProdukItem[]>([]);
  const [siswa, setSiswa] = useState<SiswaInfo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeKat, setActiveKat] = useState<string>("");
  const [nisInput, setNisInput] = useState("");

  const [loadingProduk, setLoadingProduk] = useState(true);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [loadingBayar, setLoadingBayar] = useState(false);

  const selectedWadahCount = cart.filter((c) => c.isByoc).length;

  const [modalScanner, setModalScanner] = useState(false);
  const [modalVoucher, setModalVoucher] = useState(false);
  const [modalInputVoucher, setModalInputVoucher] = useState(false);
  const [modalKonfirmasi, setModalKonfirmasi] = useState(false);
  const [modalSukses, setModalSukses] = useState<{ result: TransaksiResult; kembalian: number } | null>(null);

  const [selectedVoucher, setSelectedVoucher] = useState<VoucherInfo | null>(null);
  const [metodeBayar, setMetodeBayar] = useState<"tunai" | "voucher">("tunai");
  const [uangTunai, setUangTunai] = useState(0);

  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchKatalog = useCallback(() => {
    setLoadingProduk(true);
    getProdukKatalog(true)
      .then((data) => { setProdukAll(data); if (data.length > 0) setActiveKat(data[0].kategori); })
      .catch(console.error)
      .finally(() => setLoadingProduk(false));
  }, []);

  useEffect(() => { fetchKatalog(); }, [fetchKatalog]);
  useEffect(() => () => { if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current); }, []);

  const katalog = kelompokkanProduk(produkAll);
  const kategoriList = Object.keys(katalog);

  const doLookup = useCallback(async (raw: string) => {
    if (!raw.trim()) return;
    setLoadingSiswa(true); setSiswa(null);
    try { setSiswa(await lookupSiswa(raw)); }
    catch { setSiswa(null); }
    finally { setLoadingSiswa(false); }
  }, []);

  function handleNisChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setNisInput(val);
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    if (val.length >= 6) lookupTimerRef.current = setTimeout(() => doLookup(val), 350);
    else setSiswa(null);
  }

  function handleScan(raw: string) {
    const nis = raw.includes(":") ? raw.split(":").pop()! : raw;
    setNisInput(nis); doLookup(raw); setModalScanner(false);
  }

  const handleAddToCart = (p: ProdukItem) => { if (!siswa) { inputRef.current?.focus(); return; } setCart((prev) => addToCart(prev, p)); };
  const handleUpdateQty = (id: number, delta: number) => setCart((prev) => updateCartQty(prev, id, delta));

  const total = getCartTotal(cart);
  const { total: penaltyTotal } = getCartCoinsPenalty(cart);
  const diskon = selectedVoucher ? hitungDiskon(selectedVoucher, total) : 0;
  const bayar = Math.max(0, total - diskon);

  function handlePilihVoucher(v: VoucherInfo) {
    setSelectedVoucher(v); setMetodeBayar("voucher");
    setModalVoucher(false); setModalInputVoucher(false);
    setModalKonfirmasi(true);
  }

  async function handleKonfirmasi() {
    if (!siswa || !cart.length) return;
    setLoadingBayar(true);
    try {
      const extra = metodeBayar === "voucher" && selectedVoucher ? { voucherId: selectedVoucher.id } : undefined;
      const result = await createTransaksi(buildPayload(siswa.nis, cart, metodeBayar, extra));
      const kembalian = metodeBayar === "tunai" ? Math.max(0, uangTunai - bayar) : 0;
      setModalKonfirmasi(false);
      setModalSukses({ result, kembalian });
    } catch (e: any) {
      alert(e.message ?? "Gagal memproses transaksi");
    } finally { setLoadingBayar(false); }
  }

  function resetSemua() {
    clearProdukCache();
    setCart([]); setSiswa(null); setNisInput("");
    setSelectedVoucher(null); setMetodeBayar("tunai");
    setUangTunai(0); setModalSukses(null);
    fetchKatalog();
    inputRef.current?.focus();
  }

  // ─── Shortcut: tutup modal aktif (Escape) ─────────────────────────────────
  function closeActiveModal() {
    if (modalSukses) { return; } // sukses tidak bisa di-esc, harus klik tombol
    if (modalKonfirmasi) { setModalKonfirmasi(false); return; }
    if (modalInputVoucher) { setModalInputVoucher(false); return; }
    if (modalVoucher) { setModalVoucher(false); return; }
    if (modalScanner) { setModalScanner(false); return; }
  }

  // ─── Shortcut: hapus item terakhir ────────────────────────────────────────
  function removeLastItem() {
    if (!cart.length) return;
    const last = cart[cart.length - 1];
    setCart((prev) => updateCartQty(prev, last.id, -1));
  }

  // ─── Shortcut: set uang tunai (nominal pas atau Numpad) ───────────────────
  // State ini perlu di-lift ke parent agar hook bisa set-nya,
  // lalu pass ke KalkulatorTunai via prop onExternalSet
  const [externalUang, setExternalUang] = useState<number | null>(null);

  // Produk aktif untuk shortcut 1-9
  const produkAktif = useMemo(
    () => (katalog[activeKat] ?? []).map((p) => ({ id: p.id, stok: p.stok })),
    [katalog, activeKat],
  );

  const isAnyModalOpen = modalScanner || modalVoucher || modalInputVoucher || modalKonfirmasi || !!modalSukses;

  // ─── Register shortcuts ───────────────────────────────────────────────────
  useKantinShortcuts({
    nisInputRef: inputRef,
    hasSiswa: !!siswa,
    hasCart: cart.length > 0,
    isModalOpen: isAnyModalOpen,
    isModalKonfirmasi: modalKonfirmasi,
    isModalTunai: modalKonfirmasi && metodeBayar === "tunai",
    onOpenScanner: () => setModalScanner(true),
    onOpenTunai: () => { setSelectedVoucher(null); setMetodeBayar("tunai"); setUangTunai(0); setModalKonfirmasi(true); },
    onOpenVoucher: () => setModalVoucher(true),
    onKonfirmasi: handleKonfirmasi,
    onCloseModal: closeActiveModal,
    onReset: resetSemua,
    onClearCart: () => setCart([]),
    onRemoveLastItem: removeLastItem,
    onSetUangPas: (amount) => setExternalUang(amount),
    totalBayar: bayar,
    produkAktif,
    onAddProduk: (id) => {
      const p = produkAll.find((x) => x.id === id);
      if (p) handleAddToCart(p);
    },
  });

  return (
    <main className="dashboard-page trans-page">
      <div className="bg-blob blob-1" />

      {modalScanner && <ModalScanner onScan={handleScan} onClose={() => setModalScanner(false)} />}
      {modalVoucher && siswa && (
        <ModalVoucher siswa={siswa} total={total} onPilih={handlePilihVoucher}
          onManual={() => { setModalVoucher(false); setModalInputVoucher(true); }}
          onClose={() => setModalVoucher(false)} />
      )}
      {modalInputVoucher && siswa && (
        <ModalInputVoucher nis={siswa.nis} onPilih={handlePilihVoucher} onClose={() => setModalInputVoucher(false)} />
      )}
      {modalKonfirmasi && siswa && (
        <ModalKonfirmasi siswa={siswa} cart={cart} voucher={selectedVoucher}
          metodeBayar={metodeBayar} loading={loadingBayar}
          onToggleByoc={(p) => setCart(toggleCartByoc(cart, p.id))}
          onKonfirmasi={handleKonfirmasi} onClose={() => setModalKonfirmasi(false)}
          externalUang={externalUang}
          onExternalUangConsumed={() => setExternalUang(null)} />
      )}
      {modalSukses && (
        <ModalSukses result={modalSukses.result} kembalian={modalSukses.kembalian} onLagi={resetSemua} />
      )}

      {/* Header */}
      <div className="he-container">
        <header className="header-section">
          <Link href="/kantin/dashboard" className="page-title" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="filter-btn" style={{ padding: 8, display: "grid", placeItems: "center" }}>
              <ArrowLeft size={20} />
            </div>
            <h1>Transaksi Baru</h1>
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <BrandLogo size={20} alt="SEHATI Kantin" />
            <span style={{ fontSize: "0.75rem", color: "var(--tr-text-muted)" }}>SEHATI</span>
          </div>
        </header>
      </div>

      {/* Main layout */}
      <div className="trans-container">
        <section className="left-panel glass-panel">
          {/* ── NIS Search ── */}
          <div className="scanner-section">
            <button
              className="scan-trigger-btn"
              onClick={() => setModalScanner(true)}
              title="F3 — Scan QR"
            >
              <ScanLine size={22} />
            </button>
            <NisSearchInput
              value={nisInput}
              onChange={(val) => {
                setNisInput(val);
                if (!val.trim()) setSiswa(null);
              }}
              onSelect={(nis) => doLookup(nis)}
              loading={loadingSiswa}
              strategy="local"
              listAllFn={listSiswa}
              searchByNisFn={async (nis) => {
                try { return await lookupSiswa(nis); }
                catch { return null; }
              }}
            />
          </div>

          {loadingSiswa && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", fontSize: "0.8rem", color: "var(--tr-text-muted)" }}>
              <Loader2 size={14} className="spin" /> Mencari siswa...
            </div>
          )}
          {!loadingSiswa && siswa && (
            <div className="student-card-mini">
              <SharedAvatar fotoUrl={siswa.fotoUrl} nama={siswa.nama} />
              <div className="info">
                <h4>{siswa.nama}</h4>
                <p>{siswa.nis}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span className="class-badge">{siswa.kelas}</span>
                  <span style={{ fontSize: "0.68rem", color: S.amber }}><Coins size={12} /> {siswa.coins.toLocaleString("id-ID")}</span>
                  {siswa.voucherAktif.length > 0 && (
                    <span style={{ fontSize: "0.68rem", color: S.violet, background: `${S.violet}1a`, padding: "1px 5px", borderRadius: 6, border: `1px solid ${S.violet}40` }}>
                      {siswa.voucherAktif.length} voucher
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {!loadingSiswa && !siswa && nisInput.length === 0 && (
            <div className="student-placeholder">
              <User size={16} style={{ margin: "0 auto 6px", display: "block", opacity: 0.3 }} />
              Scan kartu atau input NIS siswa
            </div>
          )}
          {!loadingSiswa && !siswa && nisInput.length > 0 && (
            <div className="student-placeholder" style={{ borderColor: `${S.red}33`, color: S.red }}>
              <AlertTriangle size={14} style={{ display: "inline", marginRight: 4 }} /> Siswa tidak ditemukan
            </div>
          )}

          <hr className="divider" />

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="student-placeholder" style={{ border: "none" }}>
                <ShoppingCart size={18} style={{ margin: "0 auto 6px", display: "block", opacity: 0.25 }} />
                Keranjang kosong
              </div>
            ) : cart.map((item) => {
              const ki = kemasanInfo(item.jenisKemasan);
              return (
                <div key={item.id} className="cart-item">
                  <div className="item-name">
                    <span>{item.nama}</span>
                    {item.coinsPenaltyPerItem > 0 && (
                      <small style={{ color: S.red, fontSize: "0.66rem", marginTop: 1 }}>
                        {ki.icon} -{item.coinsPenaltyPerItem} koin/{ki.label}
                      </small>
                    )}
                  </div>
                  <div className="qty-control">
                    <button onClick={() => handleUpdateQty(item.id, -1)}><Minus size={12} /></button>
                    <span className="qty-val">{item.qty}</span>
                    <button onClick={() => handleUpdateQty(item.id, 1)}><Plus size={12} /></button>
                  </div>
                  <div className="item-price">{(item.harga * item.qty).toLocaleString("id-ID")}</div>
                </div>
              );
            })}
          </div>

          <div className="checkout-footer">
            {penaltyTotal > 0 && (
              <div className="summary-row" style={{ color: S.red, fontSize: "0.75rem" }}>
                <span>⚠️ Penalti kemasan</span><span>−{penaltyTotal} koin</span>
              </div>
            )}
            {selectedWadahCount > 0 && (
              <div className="summary-row" style={{ color: S.green, fontSize: "0.75rem" }}>
                <span>🌱 Item Bawa Wadah</span><span>{selectedWadahCount} item</span>
              </div>
            )}
            {selectedVoucher && (
              <div className="summary-row" style={{ color: S.green }}>
                <span>Diskon {selectedVoucher.namaVoucher}</span>
                <span>-Rp {diskon.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="summary-row total-rp">
              <span>Total Bayar</span>
              <span className="val-rp">Rp {bayar.toLocaleString("id-ID")}</span>
            </div>

            {selectedVoucher && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: `${S.violet}14`, border: `1px solid ${S.violet}33`, fontSize: "0.74rem", color: S.violet }}>
                  <TicketPercent size={11} /> {selectedVoucher.namaVoucher}
                </div>
                <button onClick={() => { setSelectedVoucher(null); setMetodeBayar("tunai"); }}
                  style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 7, padding: "5px 6px", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex" }}>
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="action-buttons">
              <button className="btn-pay cash" disabled={!siswa || !cart.length}
                onClick={() => { setSelectedVoucher(null); setMetodeBayar("tunai"); setUangTunai(0); setModalKonfirmasi(true); }}>
                <Wallet size={16} /> Tunai
              </button>
              <button className="btn-pay voucher" disabled={!siswa || !cart.length} onClick={() => setModalVoucher(true)}>
                <TicketPercent size={16} />
                {siswa?.voucherAktif.length ? `Voucher (${siswa.voucherAktif.length})` : "Voucher"}
              </button>
            </div>
          </div>
        </section>

        <section className="right-panel">
          {loadingProduk ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 10, color: "var(--tr-text-muted)" }}>
              <Loader2 size={22} className="spin" /><span>Memuat produk...</span>
            </div>
          ) : (
            <>
              <div className="catalog-tabs" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
                {kategoriList.map((kat) => (
                  <button key={kat} className={`tab-btn ${activeKat === kat ? "active" : ""}`}
                    onClick={() => setActiveKat(kat)} style={{ whiteSpace: "nowrap", textTransform: "capitalize" }}>
                    {kat}
                  </button>
                ))}
              </div>
              <div className="product-grid">
                {(katalog[activeKat] ?? []).map((p, idx) => {
                  const qty = cart.find((c) => c.id === p.id)?.qty ?? 0;
                  return (
                    <ProdukCard
                      key={p.id} p={p} qty={qty}
                      onAdd={() => handleAddToCart(p)}
                      onMinus={() => handleUpdateQty(p.id, -1)}
                      disabled={!siswa}
                      shortcutNum={idx < 9 ? idx + 1 : undefined}
                      pinned={p.isPinned}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <ShortcutHintBar
        hasSiswa={!!siswa}
        hasCart={cart.length > 0}
        isModalOpen={isAnyModalOpen}
      />

      <style jsx>{`
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes modalUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </main>
  );
}
