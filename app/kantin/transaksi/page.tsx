"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, ScanLine, User, Plus, Minus,
  Wallet, X, Check, TicketPercent,
  Loader2, ShoppingCart, AlertTriangle,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  lookupSiswa, cekVoucher, getProdukKatalog, createTransaksi,
  addToCart, updateCartQty, getCartTotal, getCartCoinsPenalty,
  buildPayload, hitungDiskon, formatVoucherLabel,
  kelompokkanProduk, kemasanInfo,
  clearProdukCache, // Added for cache clearing on transaction success
  type SiswaInfo, type CartItem, type VoucherInfo,
  type TransaksiResult,
} from "@/lib/services/kantin";
import type { ProdukItem } from "@/lib/services/transaksi.service";
import "../kantin-tokens.css";
import "../../guru/dashboard/dashboard.css";
import "./transaksi.css";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const NOMINAL_TUNAI = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];

// Shared inline style tokens — values work on both light and dark surfaces
// (modals always render on a dark sheet, so these remain dark-surface values)
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
    if (dark) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [dark]);

  return { dark };
}

// ─── HELPER: SUMMARY ROW ─────────────────────────────────────────────────────

function SummaryRow({
  label, value, color, small,
}: { label: React.ReactNode; value: React.ReactNode; color?: string; small?: boolean }) {
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
        ? <img src={fotoUrl} alt={nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
      <span>{info.icon}</span>
      <span>{info.label}</span>
      {penalty > 0 && <span style={{ opacity: 0.75 }}>−{penalty} koin</span>}
    </div>
  );
}

// ─── MODAL SHELL ─────────────────────────────────────────────────────────────

function ModalSheet({
  children, onClose, title, accentColor = S.cyan,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  accentColor?: string;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          ...S.glassCard,
          borderTop: `3px solid ${accentColor}`,
          borderRight: "none", borderBottom: "none", borderLeft: "none",
          borderRadius: "22px 22px 0 0",
          padding: "20px 22px 44px",
          maxHeight: "90vh", overflowY: "auto",
          animation: "modalUp 0.25s ease",
          position: "relative",
        }}
      >
        <div style={{ width: 32, height: 4, borderRadius: 2, background: "var(--tr-border-strong)", margin: "0 auto 16px" }} />
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 18, right: 18,
            background: "var(--tr-bg-input)", border: "none",
            borderRadius: 8, padding: "5px 6px",
            cursor: "pointer", color: "var(--tr-text-dimmed)", display: "flex",
          }}
        >
          <X size={15} />
        </button>
        <div style={{ fontWeight: 700, fontSize: "0.97rem", marginBottom: 18 }}>{title}</div>
        {children}
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
  useEffect(() => { setIsSecure(window.isSecureContext); }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...S.glassCard, borderRadius: 24, padding: 24, width: "90%", maxWidth: 380 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Scan QR Siswa</div>
          <button onClick={onClose} style={{ background: "var(--tr-bg-input)", border: "none", borderRadius: 8, padding: "5px 6px", cursor: "pointer", color: "var(--tr-text-dimmed)", display: "flex" }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--tr-bg-panel-inner)", height: 280 }}>
          {isSecure === false ? (
            <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 20, textAlign: "center", color: "var(--tr-text-secondary)" }}>
              <div>
                <AlertTriangle size={28} style={{ margin: "0 auto 10px", color: S.amber }} />
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Kamera butuh koneksi aman</div>
                <div style={{ fontSize: "0.8rem", lineHeight: 1.6, color: "var(--tr-text-muted)" }}>
                  Buka halaman ini melalui <b>https</b> atau <b>localhost</b>.{" "}
                  Jika dibuka dari IP jaringan seperti <code>http://192.168.x.x</code>, browser akan menolak akses kamera.
                </div>
              </div>
            </div>
          ) : (
            <Scanner onScan={(codes) => {
              if (!codes.length) return;
              onScan(codes[0].rawValue);
              navigator.vibrate?.(150);
            }} />
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.74rem", marginTop: 12, ...S.muted }}>
          {isSecure === false ? "Gunakan origin aman agar scanner bisa mengakses kamera." : "Arahkan kamera ke QR Code kartu siswa"}
        </p>
      </div>
    </div>
  );
}

// ─── MODAL: PILIH VOUCHER ─────────────────────────────────────────────────────

function ModalVoucher({ siswa, total, onPilih, onManual, onClose }: {
  siswa: SiswaInfo; total: number;
  onPilih: (v: VoucherInfo) => void; onManual: () => void; onClose: () => void;
}) {
  return (
    <ModalSheet onClose={onClose} title="Pilih Voucher" accentColor={S.violet}>
      {siswa.voucherAktif.length > 0 && (
        <>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, ...S.muted }}>
            Voucher Tersedia ({siswa.voucherAktif.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {siswa.voucherAktif.map((v) => {
              const diskon = hitungDiskon(v, total);
              const tgl = new Date(v.tanggalBerakhir).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
              return (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: `${S.violet}14`, border: `1px solid ${S.violet}33` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${S.violet}26`, border: `1px solid ${S.violet}4d`, display: "grid", placeItems: "center" }}>
                    <TicketPercent size={16} style={{ color: S.violet }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: S.violet }}>{v.namaVoucher}</div>
                    <div style={{ fontSize: "0.7rem", marginTop: 1, ...S.muted }}>{formatVoucherLabel(v)} · s/d {tgl}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: S.green }}>-{diskon.toLocaleString("id-ID")}</div>
                    <button onClick={() => onPilih(v)} style={{ marginTop: 4, padding: "4px 10px", background: S.violet, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit" }}>
                      Pakai
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <button onClick={onManual} style={{ width: "100%", padding: "12px", background: "var(--tr-bg-input)", border: "1px dashed var(--tr-border-strong)", borderRadius: 12, fontWeight: 600, fontSize: "0.84rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--tr-text-muted)" }}>
        <TicketPercent size={15} /> Input kode voucher manual
      </button>
    </ModalSheet>
  );
}

// ─── MODAL: INPUT KODE VOUCHER ────────────────────────────────────────────────

function ModalInputVoucher({ nis, onPilih, onClose }: {
  nis: string; onPilih: (v: VoucherInfo) => void; onClose: () => void;
}) {
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    <ModalSheet onClose={onClose} title="Input Kode Voucher" accentColor={S.blue}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <TicketPercent size={40} style={{ color: S.blue, margin: "0 auto 10px", display: "block" }} />
        <p style={{ fontSize: "0.82rem", ...S.muted }}>Masukkan kode voucher promo yang berlaku</p>
      </div>
      <input
        type="text" placeholder="Contoh: HEMAT5K"
        value={kode}
        onChange={(e) => { setKode(e.target.value.toUpperCase()); setErr(null); }}
        onKeyDown={(e) => e.key === "Enter" && handleCek()}
        style={{ width: "100%", padding: "14px", background: "var(--tr-bg-input)", border: `1px solid ${err ? `${S.red}80` : "var(--tr-border-strong)"}`, borderRadius: 12, outline: "none", boxSizing: "border-box", color: "var(--tr-text-primary)", fontFamily: "inherit", fontSize: "1.1rem", fontWeight: 700, textAlign: "center", letterSpacing: 2 }}
      />
      {err && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: "0.78rem", color: S.red }}>
          <AlertTriangle size={13} /> {err}
        </div>
      )}
      <button onClick={handleCek} disabled={loading} style={{ width: "100%", padding: "13px", marginTop: 16, background: loading ? "var(--tr-bg-input)" : S.blue, border: "none", borderRadius: 12, color: loading ? "var(--tr-text-dimmed)" : "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {loading ? <><Loader2 size={15} className="spin" /> Mengecek...</> : "Cek Voucher"}
      </button>
    </ModalSheet>
  );
}

// ─── KALKULATOR TUNAI ─────────────────────────────────────────────────────────

function KalkulatorTunai({ totalBayar, onUangChange }: {
  totalBayar: number; onUangChange: (uang: number) => void;
}) {
  const [uangStr, setUangStr] = useState("");

  const uang = parseInt(uangStr.replace(/\D/g, "") || "0", 10);
  const kembalian = uang - totalBayar;

  const picks = NOMINAL_TUNAI.filter((n) => n >= totalBayar).slice(0, 4);
  const nominalTampil = picks.length >= 3 ? picks : [...NOMINAL_TUNAI].reverse().slice(0, 4).reverse();

  function setNominal(n: number) { setUangStr(n.toLocaleString("id-ID")); onUangChange(n); }
  function tambah(n: number) { const b = uang + n; setUangStr(b.toLocaleString("id-ID")); onUangChange(b); }
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw || "0", 10);
    setUangStr(raw ? num.toLocaleString("id-ID") : "");
    onUangChange(num);
  }

  const borderColor = uang > 0 ? (kembalian >= 0 ? `${S.green}80` : `${S.red}66`) : "var(--tr-border-input)";
  const statusBg = kembalian >= 0 ? `${S.green}14` : `${S.red}14`;
  const statusBorder = kembalian >= 0 ? `${S.green}40` : `${S.red}40`;
  const statusColor = kembalian >= 0 ? S.green : S.red;
  const statusLabel = kembalian === 0 ? "✅ Pas / Kembalian" : kembalian > 0 ? "💰 Kembalian" : "⚠️ Kurang";
  const statusValue = `Rp ${Math.abs(kembalian).toLocaleString("id-ID")}`;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, ...S.muted }}>
        💵 Uang Diterima
      </div>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--tr-text-muted)", fontWeight: 700, fontSize: "0.9rem", pointerEvents: "none" }}>Rp</span>
        <input
          type="text" inputMode="numeric" placeholder="0"
          value={uangStr} onChange={handleInput}
          style={{ width: "100%", padding: "13px 14px 13px 38px", background: "var(--tr-bg-input)", border: `1.5px solid ${borderColor}`, borderRadius: 12, outline: "none", boxSizing: "border-box", color: "var(--tr-text-primary)", fontFamily: "inherit", fontSize: "1.1rem", fontWeight: 700 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 8 }}>
        {nominalTampil.map((n) => (
          <button key={n} type="button" onClick={() => setNominal(n)}
            style={{ padding: "7px 4px", borderRadius: 9, fontFamily: "inherit", background: uang === n ? `${S.cyan}33` : "var(--tr-bg-input)", border: `1px solid ${uang === n ? `${S.cyan}80` : "var(--tr-border-strong)"}`, color: uang === n ? S.cyan : "var(--tr-text-secondary)", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer", transition: "all 0.15s" }}>
            {n >= 1_000 ? `${n / 1_000}rb` : n.toLocaleString("id-ID")}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[1_000, 5_000, 10_000, 50_000].map((add) => (
          <button key={add} type="button" onClick={() => tambah(add)}
            style={{ flex: 1, padding: "6px 4px", borderRadius: 8, fontFamily: "inherit", background: "var(--tr-bg-input)", border: "1px dashed var(--tr-border-strong)", color: "var(--tr-text-dimmed)", fontWeight: 600, fontSize: "0.68rem", cursor: "pointer" }}>
            +{add >= 1_000 ? `${add / 1_000}rb` : add}
          </button>
        ))}
      </div>

      {uang > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: statusBg, border: `1px solid ${statusBorder}` }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--tr-text-secondary)" }}>{statusLabel}</span>
          <span style={{ fontSize: "1.05rem", fontWeight: 800, color: statusColor }}>{statusValue}</span>
        </div>
      )}
    </div>
  );
}

// ─── MODAL: KONFIRMASI ────────────────────────────────────────────────────────

function ModalKonfirmasi({ siswa, cart, voucher, metodeBayar, onKonfirmasi, onClose, loading }: {
  siswa: SiswaInfo; cart: CartItem[]; voucher: VoucherInfo | null;
  metodeBayar: "tunai" | "voucher";
  onKonfirmasi: () => void; onClose: () => void; loading: boolean;
}) {
  const [uangDiterima, setUangDiterima] = useState(0);

  const total = getCartTotal(cart);
  const diskon = voucher ? hitungDiskon(voucher, total) : 0;
  const bayar = Math.max(0, total - diskon);
  const { total: penaltyTotal, detail: penaltyDetail } = getCartCoinsPenalty(cart);

  const kembalian = uangDiterima - bayar;
  const uangKurang = metodeBayar === "tunai" && uangDiterima > 0 && kembalian < 0;
  const bisaBayar = metodeBayar !== "tunai" || uangDiterima >= bayar;
  const accent = metodeBayar === "voucher" ? S.violet : S.green;
  const btnDisabled = loading || !bisaBayar;
  const btnLabel = loading ? "Memproses..." : uangKurang ? `Kurang Rp ${Math.abs(kembalian).toLocaleString("id-ID")}` : "Bayar Sekarang";

  return (
    <ModalSheet onClose={onClose} title="Konfirmasi Pembayaran" accentColor={accent}>
      {/* Siswa */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, marginBottom: 16, ...S.glass }}>
        <AvatarMini fotoUrl={siswa.fotoUrl} nama={siswa.nama} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{siswa.nama}</div>
          <div style={{ fontSize: "0.72rem", marginTop: 1, ...S.muted }}>{siswa.kelas} · {siswa.nis}</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: 14 }}>
        {cart.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid var(--tr-border-divider)", fontSize: "0.82rem" }}>
            <div>
              <span style={{ color: "var(--tr-text-primary)" }}>{c.nama} ×{c.qty}</span>
              {c.jenisKemasan && c.jenisKemasan !== "tanpa_kemasan" && (
                <KemasanChip kemasan={c.jenisKemasan} penalty={c.coinsPenaltyPerItem} />
              )}
            </div>
            <span style={{ fontWeight: 600, flexShrink: 0 }}>Rp {(c.harga * c.qty).toLocaleString("id-ID")}</span>
          </div>
        ))}
      </div>

      {/* Price summary */}
      <div style={{ background: "var(--tr-bg-panel-inner)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <SummaryRow label="Subtotal" value={`Rp ${total.toLocaleString("id-ID")}`} />
        {diskon > 0 && <SummaryRow label={`Diskon ${voucher?.namaVoucher}`} value={`-Rp ${diskon.toLocaleString("id-ID")}`} color={S.green} />}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--tr-border-divider)", fontWeight: 800, fontSize: "1.05rem" }}>
          <span>Total Bayar</span>
          <span style={{ color: accent }}>Rp {bayar.toLocaleString("id-ID")}</span>
        </div>
      </div>

      {metodeBayar === "tunai" && <KalkulatorTunai totalBayar={bayar} onUangChange={setUangDiterima} />}

      {/* Penalty */}
      {penaltyTotal > 0 && (
        <>
          <div style={{ background: `${S.red}0f`, border: `1px solid ${S.red}33`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.8rem", color: S.red, marginBottom: 8 }}>
              <AlertTriangle size={13} /> Penalti Kemasan Plastik/Kertas
            </div>
            {penaltyDetail.map((d, i) => {
              const ki = kemasanInfo(d.kemasan);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: 4, ...S.dimmed }}>
                  <span>{ki.icon} {d.nama} ×{d.qty}</span>
                  <span style={{ color: S.red, fontWeight: 600 }}>−{d.total} koin</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700, paddingTop: 8, borderTop: `1px solid ${S.red}26`, marginTop: 4 }}>
              <span style={{ ...S.muted }}>Total penalti koin</span>
              <span style={{ color: S.red }}>−{penaltyTotal} koin</span>
            </div>
          </div>
          <div style={{ background: `${S.amber}14`, border: `1px solid ${S.amber}40`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700 }}>
              <span style={{ color: "var(--tr-text-primary)" }}>Total koin dipotong</span>
              <span style={{ color: S.amber }}>-{penaltyTotal} koin</span>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "var(--tr-bg-input)", border: "1px solid var(--tr-border-strong)", color: "var(--tr-text-secondary)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: "0.86rem" }}>
          Batal
        </button>
        <button onClick={onKonfirmasi} disabled={btnDisabled} title={!bisaBayar && metodeBayar === "tunai" ? "Uang belum cukup" : undefined}
          style={{ flex: 2, padding: "12px", border: "none", borderRadius: 12, background: btnDisabled ? "var(--tr-bg-input)" : accent, color: btnDisabled ? "var(--tr-text-dimmed)" : "#fff", fontWeight: 700, cursor: btnDisabled ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? <><Loader2 size={15} className="spin" /> {btnLabel}</> : btnLabel}
        </button>
      </div>
    </ModalSheet>
  );
}

// ─── MODAL: SUKSES ────────────────────────────────────────────────────────────

function ModalSukses({ result, kembalian, onLagi }: {
  result: TransaksiResult; kembalian: number; onLagi: () => void;
}) {
  const penaltyTotal = result.coinsPenaltyTotal ?? 0;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...S.glassCard, borderRadius: 24, padding: "32px 28px", width: "90%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: S.green, display: "grid", placeItems: "center", margin: "0 auto 20px", boxShadow: `0 0 40px ${S.green}66` }}>
          <Check size={36} color="#ffffff" strokeWidth={3} />
        </div>
        <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 6, color: "var(--tr-text-primary)" }}>Transaksi Berhasil!</div>
        <div style={{ fontSize: "0.8rem", marginBottom: 4, ...S.muted }}>Kode: {result.kodeTransaksi}</div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: S.green, marginBottom: kembalian > 0 ? 8 : 16 }}>
          Rp {result.totalBayar.toLocaleString("id-ID")}
        </div>
        {kembalian > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderRadius: 12, marginBottom: 14, background: `${S.green}1a`, border: `1px solid ${S.green}4d` }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, ...S.dimmed }}>💵 Kembalian</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: S.green }}>Rp {kembalian.toLocaleString("id-ID")}</span>
          </div>
        )}
        {penaltyTotal > 0 && (
          <div style={{ background: `${S.amber}14`, border: `1px solid ${S.amber}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: "0.78rem" }}>
            <div style={{ color: S.amber, fontWeight: 700 }}>Total koin terpotong: -{penaltyTotal} koin</div>
          </div>
        )}
        {result.coinsPenaltyTotal > 0 && (
          <div style={{ background: `${S.red}14`, border: `1px solid ${S.red}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.78rem" }}>
            <div style={{ color: S.red, fontWeight: 700, marginBottom: 4 }}>🛍️ −{result.coinsPenaltyTotal} koin penalti kemasan</div>
            {result.coinsPenaltyDetail.map((d, i) => {
              const ki = kemasanInfo(d.jenisKemasan);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", ...S.muted }}>
                  <span>{ki.icon} {d.namaProduk} ×{d.qty}</span>
                  <span>−{d.totalPenalty} koin</span>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onLagi} style={{ width: "100%", padding: "13px", background: S.cyan, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.92rem", marginTop: 10 }}>
          Transaksi Baru
        </button>
      </div>
    </div>
  );
}

// ─── PRODUK CARD ──────────────────────────────────────────────────────────────

function ProdukCard({ p, qty, onAdd, onMinus, disabled }: {
  p: ProdukItem; qty: number; onAdd: () => void; onMinus: () => void; disabled: boolean;
}) {
  const isSelected = qty > 0;
  const hasWarning = p.coinsPenaltyPerItem > 0;

  return (
    <div
      onClick={!disabled ? onAdd : undefined}
      style={{
        padding: "14px 12px", borderRadius: 16, position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.15s",
        background: isSelected ? `${S.cyan}12` : "var(--tr-bg-product, rgba(30,41,59,0.6))",
        border: `1px solid ${isSelected ? `${S.cyan}4d` : hasWarning ? `${S.red}26` : "var(--tr-border-product, rgba(255,255,255,0.06))"}`,
        display: "flex", flexDirection: "column", gap: 6,
      }}
    >
      {isSelected && (
        <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: S.cyan, color: "#fff", display: "grid", placeItems: "center", fontSize: "0.7rem", fontWeight: 800 }}>
          {qty}
        </div>
      )}
      <div style={{ fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.3, color: "var(--tr-text-primary)", paddingRight: isSelected ? 20 : 0 }}>
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

  // ── Data state
  const [produkAll, setProdukAll] = useState<ProdukItem[]>([]);
  const [siswa, setSiswa] = useState<SiswaInfo | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeKat, setActiveKat] = useState<string>("");
  const [nisInput, setNisInput] = useState("");

  // ── Loading state
  const [loadingProduk, setLoadingProduk] = useState(true);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [loadingBayar, setLoadingBayar] = useState(false);

  // ── Modal visibility
  const [modalScanner, setModalScanner] = useState(false);
  const [modalVoucher, setModalVoucher] = useState(false);
  const [modalInputVoucher, setModalInputVoucher] = useState(false);
  const [modalKonfirmasi, setModalKonfirmasi] = useState(false);
  const [modalSukses, setModalSukses] = useState<{ result: TransaksiResult; kembalian: number } | null>(null);

  // ── Payment state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherInfo | null>(null);
  const [metodeBayar, setMetodeBayar] = useState<"tunai" | "voucher">("tunai");
  const [uangTunai, setUangTunai] = useState(0);

  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load catalog
  const fetchKatalog = useCallback(() => {
    setLoadingProduk(true);
    getProdukKatalog()
      .then((data) => { setProdukAll(data); if (data.length > 0) setActiveKat(data[0].kategori); })
      .catch(console.error)
      .finally(() => setLoadingProduk(false));
  }, []);

  useEffect(() => {
    fetchKatalog();
  }, [fetchKatalog]);

  // ── Cleanup debounce
  useEffect(() => () => { if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current); }, []);

  const katalog = kelompokkanProduk(produkAll);
  const kategoriList = Object.keys(katalog);

  // ── Lookup siswa
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

  // ── Cart
  const handleAddToCart = (p: ProdukItem) => {
    if (!siswa) { inputRef.current?.focus(); return; }
    setCart((prev) => addToCart(prev, p));
  };
  const handleUpdateQty = (id: number, delta: number) =>
    setCart((prev) => updateCartQty(prev, id, delta));

  // ── Totals
  const total = getCartTotal(cart);
  const { total: penaltyTotal } = getCartCoinsPenalty(cart);
  const diskon = selectedVoucher ? hitungDiskon(selectedVoucher, total) : 0;
  const bayar = Math.max(0, total - diskon);

  // ── Voucher handlers
  function handlePilihVoucher(v: VoucherInfo) {
    setSelectedVoucher(v); setMetodeBayar("voucher");
    setModalVoucher(false); setModalInputVoucher(false);
    setModalKonfirmasi(true);
  }

  // ── Confirm
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

  // ── Reset
  function resetSemua() {
    clearProdukCache(); // Force fetch updated stock
    setCart([]); setSiswa(null); setNisInput("");
    setSelectedVoucher(null); setMetodeBayar("tunai");
    setUangTunai(0); setModalSukses(null);
    fetchKatalog(); // Explicitly reload catalog data
    inputRef.current?.focus();
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="dashboard-page trans-page">
      <div className="bg-blob blob-1" />

      {/* ── Modals ── */}
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
          onKonfirmasi={handleKonfirmasi} onClose={() => setModalKonfirmasi(false)} />
      )}
      {modalSukses && <ModalSukses result={modalSukses.result} kembalian={modalSukses.kembalian} onLagi={resetSemua} />}

      {/* ── Header ── */}
      <div className="he-container">
        <header className="header-section">
          <Link href="/kantin/dashboard" className="page-title" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="filter-btn" style={{ padding: 8, display: "grid", placeItems: "center" }}>
              <ArrowLeft size={20} />
            </div>
            <h1>Transaksi Baru</h1>
          </Link>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {/* Theme toggle */}
            {/* <button
              className="btn-theme-toggle"
              onClick={toggleTheme}
              title={dark ? "Mode Terang" : "Mode Gelap"}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button> */}

            <BrandLogo size={20} alt="SEHATI Kantin" />
            <span style={{ fontSize: "0.75rem", color: "var(--tr-text-muted)" }}>SEHATI</span>
          </div>
        </header>
      </div>

      {/* ── Main layout ── */}
      <div className="trans-container">

        {/* Left panel */}
        <section className="left-panel glass-panel">

          <div className="scanner-section">
            <button className="scan-trigger-btn" onClick={() => setModalScanner(true)}>
              <ScanLine size={22} />
            </button>
            <div className="input-group">
              <label>NIS Siswa</label>
              <input
                ref={inputRef} type="text" value={nisInput}
                onChange={handleNisChange}
                placeholder="Scan kartu atau ketik NIS..."
                autoFocus
              />
            </div>
          </div>

          {loadingSiswa && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", fontSize: "0.8rem", color: "var(--tr-text-muted)" }}>
              <Loader2 size={14} className="spin" /> Mencari siswa...
            </div>
          )}
          {!loadingSiswa && siswa && (
            <div className="student-card-mini">
              <AvatarMini fotoUrl={siswa.fotoUrl} nama={siswa.nama} />
              <div className="info">
                <h4>{siswa.nama}</h4>
                <p>{siswa.nis}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span className="class-badge">{siswa.kelas}</span>
                  <span style={{ fontSize: "0.68rem", color: S.amber }}>🪙 {siswa.coins.toLocaleString("id-ID")}</span>
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

          {/* Cart */}
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

          {/* Checkout footer */}
          <div className="checkout-footer">
            {penaltyTotal > 0 && (
              <div className="summary-row" style={{ color: S.red, fontSize: "0.75rem" }}>
                <span>⚠️ Penalti kemasan</span><span>−{penaltyTotal} koin</span>
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

        {/* Right panel */}
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
                {(katalog[activeKat] ?? []).map((p) => {
                  const qty = cart.find((c) => c.id === p.id)?.qty ?? 0;
                  return (
                    <ProdukCard key={p.id} p={p} qty={qty}
                      onAdd={() => handleAddToCart(p)}
                      onMinus={() => handleUpdateQty(p.id, -1)}
                      disabled={!siswa} />
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes modalUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </main>
  );
}
