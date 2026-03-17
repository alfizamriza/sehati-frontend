"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Droplets, ShoppingBag, ShieldAlert, TrendingUp, TrendingDown,
  Leaf, Clock, User, AlertTriangle, CheckCircle2, X, ChevronRight,
  Package, Trash2, Loader2, Image as ImageIcon, Zap,
  QrCode, PenLine, CreditCard, Coins, Tag,
} from "lucide-react";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";
import { ErrorState } from "@/components/common/AsyncState";
import BrandLogo from "@/components/common/BrandLogo";
import {
  getRiwayatAll, clearRiwayatCache, isRiwayatCached,
  formatTanggal, formatWaktu, formatRupiah,
  labelPaymentMethod, labelMethod,
  type RiwayatAll, type RiwayatTumbler, type RiwayatBelanja,
  type RiwayatPelanggaran, type RiwayatSummary,
} from "@/lib/services/siswa";
import "../siswa-tokens.css";
import "./riwayat.css";
import SehatiLoadingScreen from "@/components/siswa/SehatiLoadingScreen";

// ─── TYPES & CONSTANTS ────────────────────────────────────────────────────────
type TabKey = "all" | "tumbler" | "belanja" | "pelanggaran";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "Semua", icon: <Clock size={13} /> },
  { key: "tumbler", label: "Tumbler", icon: <Droplets size={13} /> },
  { key: "belanja", label: "Belanja", icon: <ShoppingBag size={13} /> },
  { key: "pelanggaran", label: "Pelanggaran", icon: <ShieldAlert size={13} /> },
];

const KATEGORI_CFG = {
  ringan: {
    color: "var(--gold,#F59E0B)",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.28)",
    iconBoxClass: "rw-icon-box rw-icon-box-pelanggaran-ringan",
  },
  sedang: {
    color: "var(--streak-color,#F97316)",
    bg: "var(--status-plastik-bg)",
    border: "var(--status-plastik-border)",
    iconBoxClass: "rw-icon-box rw-icon-box-pelanggaran-sedang",
  },
  berat: {
    color: "var(--status-pel-text)",
    bg: "var(--status-pel-bg)",
    border: "var(--status-pel-border)",
    iconBoxClass: "rw-icon-box rw-icon-box-pelanggaran-berat",
  },
} as const;

// ─── PLASTIK WARNING ──────────────────────────────────────────────────────────
function PlastikWarning({ jumlah, jumlahByoc }: { jumlah: number; jumlahByoc: number }) {
  if (jumlah === 0 && jumlahByoc === 0) return null;

  const level = jumlah >= 10 ? "high" : jumlah >= 5 ? "med" : "low";
  const cfg = {
    low: {
      color: "var(--gold,#F59E0B)",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.22)",
      text: `${jumlah}x produk kemasan plastik dibeli. Coba kurangi ya!`,
    },
    med: {
      color: "var(--streak-color,#F97316)",
      bg: "var(--status-plastik-bg)",
      border: "var(--status-plastik-border)",
      text: `${jumlah}x produk kemasan plastik! Yuk beralih ke kemasan ramah lingkungan 🌱`,
    },
    high: {
      color: "var(--status-pel-text,#EF4444)",
      bg: "var(--status-pel-bg)",
      border: "var(--status-pel-border)",
      text: `${jumlah}x produk kemasan plastik! Kamu sudah berkontribusi banyak sampah. Tolong kurangi!`,
    },
  }[level];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Warning plastik NON-BYOC */}
      {jumlah > 0 && (
        <div className="rw-plastik-warning" style={{ background: cfg.bg, borderColor: cfg.border }}>
          <AlertTriangle size={15} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="rw-plastik-warning-title" style={{ color: cfg.color }}>
              Peringatan Penggunaan Plastik
            </div>
            <div className="rw-plastik-warning-body">{cfg.text}</div>
          </div>
        </div>
      )}

      {/* Info BYOC — hijau, bukan warning */}
      {jumlahByoc > 0 && (
        <div
          className="rw-plastik-warning"
          style={{ background: "rgba(16,185,129,0.07)", borderColor: "rgba(16,185,129,0.22)" }}
        >
          <Leaf size={15} style={{ color: "var(--status-hadir-text)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="rw-plastik-warning-title" style={{ color: "var(--status-hadir-text)" }}>
              Produk Plastik dengan Wadah Sendiri
            </div>
            <div className="rw-plastik-warning-body">
              {jumlahByoc}x produk plastik dibeli menggunakan wadah sendiri (BYOC) —
              tidak dikenakan penalti. Bagus! 🌱
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUMMARY CARDS ────────────────────────────────────────────────────────────
function SummaryCards({ summary }: { summary: RiwayatSummary }) {
  return (
    <div className="rw-summary-grid">
      <div className="rw-summary-counts">
        <div className="rw-summary-card">
          <div className="rw-summary-card-value" style={{ color: "var(--status-hadir-text)" }}>
            {summary.totalTumbler}
          </div>
          <div className="rw-summary-card-label">Tumbler</div>
        </div>
        <div className="rw-summary-card">
          <div className="rw-summary-card-value" style={{ color: "var(--color-primary)" }}>
            {summary.totalBelanja}
          </div>
          <div className="rw-summary-card-label">Belanja</div>
        </div>
        <div className="rw-summary-card">
          <div className="rw-summary-card-value" style={{ color: "var(--status-pel-text)" }}>
            {summary.totalPelanggaran}
          </div>
          <div className="rw-summary-card-label">Pelanggaran</div>
        </div>
      </div>

      <div className="rw-summary-footer">
        <div className="rw-summary-footer-item">
          <TrendingUp size={13} style={{ color: "var(--status-hadir-text)" }} />
          <div>
            <div className="rw-summary-footer-label">Coins Masuk</div>
            <div className="rw-summary-footer-value" style={{ color: "var(--status-hadir-text)" }}>
              +{summary.totalCoinsDidapat}
            </div>
          </div>
        </div>

        <div className="rw-summary-divider" />

        <div className="rw-summary-footer-item">
          <TrendingDown size={13} style={{ color: "var(--status-pel-text)" }} />
          <div>
            <div className="rw-summary-footer-label">Coins Keluar</div>
            <div className="rw-summary-footer-value" style={{ color: "var(--status-pel-text)" }}>
              -{summary.totalCoinsKeluar}
            </div>
          </div>
        </div>

        <div className="rw-summary-divider" />

        {/* Plastik: dua kolom jika ada BYOC */}
        {(summary.jumlahPlastikByoc ?? 0) > 0 ? (
          <>
            <div className="rw-summary-footer-item">
              <Trash2 size={13} style={{ color: "var(--status-plastik-text)" }} />
              <div>
                <div className="rw-summary-footer-label">Plastik</div>
                <div className="rw-summary-footer-value" style={{ color: "var(--status-plastik-text)" }}>
                  {summary.jumlahPlastik}×
                </div>
              </div>
            </div>
            <div className="rw-summary-divider" />
            <div className="rw-summary-footer-item">
              <Leaf size={13} style={{ color: "var(--status-hadir-text)" }} />
              <div>
                <div className="rw-summary-footer-label">Plastik BYOC</div>
                <div className="rw-summary-footer-value" style={{ color: "var(--status-hadir-text)" }}>
                  {summary.jumlahPlastikByoc}×
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rw-summary-footer-item">
            <Trash2 size={13} style={{ color: "var(--status-plastik-text)" }} />
            <div>
              <div className="rw-summary-footer-label">Plastik</div>
              <div className="rw-summary-footer-value" style={{ color: "var(--status-plastik-text)" }}>
                {summary.jumlahPlastik}×
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHIP ─────────────────────────────────────────────────────────────────────
function Chip({ children, color, bg, border }: {
  children: React.ReactNode;
  color?: string; bg?: string; border?: string;
}) {
  return (
    <span
      className="rw-chip"
      style={{
        ...(color ? { color } : {}),
        ...(bg ? { background: bg } : {}),
        ...(border ? { borderColor: border } : {}),
      }}
    >
      {children}
    </span>
  );
}

// ─── TUMBLER CARD ─────────────────────────────────────────────────────────────
function TumblerCard({ item, onClick }: { item: RiwayatTumbler; onClick: () => void }) {
  const totalCoins = item.coinsReward + item.streakBonus;
  return (
    <button onClick={onClick} className="rw-card-btn">
      <div className="rw-item-card" style={{ borderLeft: "3px solid var(--status-hadir-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="rw-icon-box rw-icon-box-tumbler">
              <Droplets size={17} style={{ color: "var(--status-hadir-text)" }} />
            </div>
            <div>
              <div className="rw-item-title" style={{ color: "var(--status-hadir-text)" }}>
                Membawa Tumbler
              </div>
              <div className="rw-item-date">
                {formatTanggal(item.tanggal)} · {formatWaktu(item.waktu)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ textAlign: "right" }}>
              <div className="rw-coins-plus">+{totalCoins}</div>
              <div className="rw-coins-label">coins</div>
            </div>
            <ChevronRight size={13} className="rw-chevron" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {item.streakBonus > 0 && (
            <Chip color="var(--gold,#F59E0B)" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)">
              <Zap size={9} /> Bonus Streak +{item.streakBonus}
            </Chip>
          )}
          <Chip
            color="var(--status-hadir-text)"
            bg="var(--status-hadir-bg)"
            border="var(--status-hadir-border)"
          >
            {item.method === "scan" ? <QrCode size={9} /> : <PenLine size={9} />}
            {labelMethod(item.method)}
          </Chip>
          {item.dicatatOleh !== "-" && (
            <Chip><User size={9} /> {item.dicatatOleh}</Chip>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── BELANJA CARD ─────────────────────────────────────────────────────────────
function BelanjaCard({ item, onClick }: { item: RiwayatBelanja; onClick: () => void }) {
  const isPlastik = item.adaProdukPlastik;              // plastik NON-BYOC
  const isByoc = item.isByoc ?? false;
  const hasPlastikByoc = isByoc && item.jumlahItemPlastik > 0; // plastik BYOC
  const hasReward = item.coinsReward > 0;
  const hasPenalty = item.coinsPenalty > 0;

  const accColor = isPlastik
    ? "var(--status-plastik-text)"
    : hasReward
      ? "var(--status-hadir-text)"
      : "var(--color-primary)";
  const borderAcc = isPlastik
    ? "var(--status-plastik-border)"
    : hasReward
      ? "var(--status-hadir-border)"
      : "var(--border-primary)";

  const payIcon = {
    coins: <Coins size={9} />,
    voucher: <Tag size={9} />,
    tunai: <CreditCard size={9} />,
  }[item.paymentMethod] ?? <CreditCard size={9} />;

  return (
    <button onClick={onClick} className="rw-card-btn">
      <div className="rw-item-card" style={{ borderLeft: `3px solid ${borderAcc}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`rw-icon-box ${isPlastik ? "rw-icon-box-belanja-plastik" : hasReward ? "rw-icon-box-tumbler" : "rw-icon-box-belanja"}`}>
              <ShoppingBag size={17} style={{ color: accColor }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                <span className="rw-item-title" style={{ color: accColor }}>Belanja Kantin</span>

                {/* Badge BYOC — hijau */}
                {isByoc && (
                  <Chip
                    color="var(--status-hadir-text)"
                    bg="var(--status-hadir-bg)"
                    border="var(--status-hadir-border)"
                  >
                    <Leaf size={8} /> Wadah Sendiri
                  </Chip>
                )}

                {/* Bonus coins */}
                {hasReward && (
                  <Chip
                    color="var(--status-hadir-text)"
                    bg="var(--status-hadir-bg)"
                    border="var(--status-hadir-border)"
                  >
                    <Zap size={8} /> +{item.coinsReward} Bonus
                  </Chip>
                )}

                {/* Plastik NON-BYOC → merah (pelanggaran) */}
                {isPlastik && (
                  <Chip
                    color="var(--status-plastik-text)"
                    bg="var(--status-plastik-bg)"
                    border="var(--status-plastik-border)"
                  >
                    <Trash2 size={8} /> Plastik
                  </Chip>
                )}

                {/* Plastik BYOC → amber muda (info, bukan pelanggaran) */}
                {hasPlastikByoc && !isPlastik && (
                  <Chip
                    color="var(--gold,#F59E0B)"
                    bg="rgba(245,158,11,0.08)"
                    border="rgba(245,158,11,0.22)"
                  >
                    <Trash2 size={8} /> Plastik (Wadah Sendiri)
                  </Chip>
                )}
              </div>
              <div className="rw-item-date">
                {formatTanggal(item.tanggal)} · {formatWaktu(item.waktu)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              {hasReward && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span className="rw-coins-plus" style={{ fontSize: "0.82rem" }}>+{item.coinsReward}</span>
                  <span className="rw-coins-label">reward</span>
                </div>
              )}
              {hasPenalty && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span className="rw-coins-minus" style={{ fontSize: "0.82rem" }}>-{item.coinsPenalty}</span>
                  <span className="rw-coins-label">penalti</span>
                </div>
              )}
            </div>
            <ChevronRight size={13} className="rw-chevron" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Chip>{payIcon} {labelPaymentMethod(item.paymentMethod)}</Chip>
          {item.totalDiskon > 0 && (
            <Chip
              color="var(--status-hadir-text)"
              bg="var(--status-hadir-bg)"
              border="var(--status-hadir-border)"
            >
              Diskon {formatRupiah(item.totalDiskon)}
            </Chip>
          )}
        </div>

        {item.items.length > 0 && (
          <div className="rw-product-list">
            {item.items.map((i) => i.namaProduk).join(" · ")}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── PELANGGARAN CARD ─────────────────────────────────────────────────────────
function PelanggaranCard({ item, onClick }: { item: RiwayatPelanggaran; onClick: () => void }) {
  const ks = KATEGORI_CFG[item.kategori] ?? KATEGORI_CFG.sedang;
  return (
    <button onClick={onClick} className="rw-card-btn">
      <div className="rw-item-card" style={{ borderLeft: `3px solid ${ks.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={ks.iconBoxClass}>
              <ShieldAlert size={17} style={{ color: ks.color }} />
            </div>
            <div>
              <div className="rw-item-title" style={{ color: ks.color }}>{item.namaJenis}</div>
              <div className="rw-item-date">
                {formatTanggal(item.tanggal)} · {formatWaktu(item.waktu)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ textAlign: "right" }}>
              <div className="rw-coins-minus">-{item.coinsPenalty}</div>
              <div className="rw-coins-label">coins</div>
            </div>
            <ChevronRight size={13} className="rw-chevron" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Chip color={ks.color} bg={ks.bg} border={ks.border}>
            <span style={{ textTransform: "capitalize" }}>Kategori {item.kategori}</span>
          </Chip>
        </div>
      </div>
    </button>
  );
}

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function ModalWrapper({ children, onClose, accentColor }: {
  children: React.ReactNode; onClose: () => void; accentColor: string;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="rw-modal-overlay" onClick={onClose}>
      <div
        className="rw-modal-sheet"
        style={{ borderTop: `3px solid ${accentColor}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rw-modal-drag" />
        <button className="rw-modal-close" onClick={onClose}>
          <X size={15} />
        </button>
        {children}
      </div>
    </div>
  );
}

function MRow({ label, value, icon }: {
  label: string; value: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <div className="rw-modal-row">
      <span className="rw-modal-row-label">{label}</span>
      <span className="rw-modal-row-value">{icon}{value}</span>
    </div>
  );
}

// ─── MODAL TUMBLER ────────────────────────────────────────────────────────────
function ModalTumbler({ item, onClose }: { item: RiwayatTumbler; onClose: () => void }) {
  const total = item.coinsReward + item.streakBonus;
  return (
    <ModalWrapper onClose={onClose} accentColor="var(--status-hadir-text)">
      <div className="rw-modal-header">
        <div className="rw-modal-icon-box rw-icon-box-tumbler">
          <Droplets size={22} style={{ color: "var(--status-hadir-text)" }} />
        </div>
        <div>
          <div className="rw-modal-title">Detail Kehadiran Tumbler</div>
          <div className="rw-modal-subtitle">{formatTanggal(item.tanggal)}</div>
        </div>
      </div>

      <MRow label="Waktu" value={`${formatWaktu(item.waktu)} WIB`} />
      <MRow
        label="Metode"
        value={labelMethod(item.method)}
        icon={item.method === "scan" ? <QrCode size={12} /> : <PenLine size={12} />}
      />
      {item.dicatatOleh !== "-" && (
        <MRow label="Dicatat oleh" value={item.dicatatOleh} icon={<User size={12} />} />
      )}
      {item.kelas !== "-" && <MRow label="Kelas" value={item.kelas} />}

      <div className="rw-modal-divider" />

      <div className="rw-modal-coins-row">
        <div>
          <div className="rw-modal-coins-total-label">Total Coins Didapat</div>
          <div className="rw-modal-coins-total-plus">+{total}</div>
        </div>
        <div className="rw-modal-coins-breakdown">
          <div
            className="rw-modal-coins-chip"
            style={{ background: "var(--status-hadir-bg)", borderColor: "var(--status-hadir-border)" }}
          >
            <span className="rw-modal-coins-chip-label">Reward</span>
            <span className="rw-modal-coins-chip-value" style={{ color: "var(--status-hadir-text)" }}>
              +{item.coinsReward}
            </span>
          </div>
          {item.streakBonus > 0 && (
            <div
              className="rw-modal-coins-chip"
              style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" }}
            >
              <span className="rw-modal-coins-chip-label">Bonus Streak</span>
              <span className="rw-modal-coins-chip-value" style={{ color: "var(--gold,#F59E0B)" }}>
                +{item.streakBonus}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="rw-eco-note">
        <Leaf size={11} style={{ color: "var(--status-hadir-text)", marginRight: 5, display: "inline" }} />
        Terima kasih sudah membawa tumbler! Kamu membantu mengurangi sampah plastik di sekolah 🌱
      </div>
    </ModalWrapper>
  );
}

// ─── MODAL BELANJA ────────────────────────────────────────────────────────────
function ModalBelanja({ item, onClose }: { item: RiwayatBelanja; onClose: () => void }) {
  const isPlastik = item.adaProdukPlastik;
  const isByoc = item.isByoc ?? false;
  const hasPlastikByoc = isByoc && item.jumlahItemPlastik > 0 && !isPlastik;
  const hasReward = item.coinsReward > 0;
  const hasPenalty = item.coinsPenalty > 0;

  const accentColor = isPlastik
    ? "var(--status-plastik-text)"
    : hasReward
      ? "var(--status-hadir-text)"
      : "var(--color-primary)";

  const payIcon = {
    coins: <Coins size={13} />,
    voucher: <Tag size={13} />,
    tunai: <CreditCard size={13} />,
  }[item.paymentMethod] ?? null;

  return (
    <ModalWrapper onClose={onClose} accentColor={accentColor}>
      <div className="rw-modal-header">
        <div className={`rw-modal-icon-box ${isPlastik ? "rw-icon-box-belanja-plastik" : hasReward ? "rw-icon-box-tumbler" : "rw-icon-box-belanja"}`}>
          <ShoppingBag size={22} style={{ color: accentColor }} />
        </div>
        <div>
          <div className="rw-modal-title">Detail Belanja Kantin</div>
          <div className="rw-modal-subtitle">{formatTanggal(item.tanggal)} · {formatWaktu(item.waktu)}</div>
          <div className="rw-modal-kode">{item.kodeTransaksi}</div>
        </div>
      </div>

      {/* Banner BYOC */}
      {isByoc && (
        <div style={{
          background: "var(--status-hadir-bg)",
          border: "1px solid var(--status-hadir-border)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Leaf size={16} style={{ color: "var(--status-hadir-text)", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--status-hadir-text)" }}>
              Pakai Wadah Sendiri (BYOC)
            </div>
            <div style={{ fontSize: "0.76rem", marginTop: 2 }}>
              Kamu membawa wadah sendiri untuk transaksi ini.
            </div>
          </div>
        </div>
      )}

      {/* Banner bonus coins */}
      {hasReward && (
        <div style={{
          background: "var(--status-hadir-bg)",
          border: "1px solid var(--status-hadir-border)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Zap size={16} style={{ color: "var(--status-hadir-text)", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--status-hadir-text)" }}>
              Dapat Bonus Coins!
            </div>
            <div style={{ fontSize: "0.76rem", marginTop: 2 }}>
              Transaksi ini memberikan reward koin tambahan.
            </div>
            <div style={{ marginTop: 6, fontSize: "0.92rem", fontWeight: 800, color: "var(--status-hadir-text)" }}>
              +{item.coinsReward} Koin
            </div>
          </div>
        </div>
      )}

      {/* Banner plastik NON-BYOC → warning merah */}
      {isPlastik && hasPenalty && (
        <div className="rw-plastik-alert">
          <AlertTriangle size={13} style={{ color: "var(--status-plastik-text)", flexShrink: 0, marginTop: 1 }} />
          <span>
            Ada{" "}
            <strong style={{ color: "var(--status-plastik-text)" }}>
              {item.jumlahItemPlastik} produk kemasan plastik
            </strong>{" "}
            — dikenakan penalti{" "}
            <strong style={{ color: "var(--status-plastik-text)" }}>
              -{item.coinsPenalty} koin
            </strong>
            . Yuk pilih alternatif ramah lingkungan! 🌱
          </span>
        </div>
      )}

      {/* Banner plastik BYOC → informasi hijau, tidak ada penalti */}
      {hasPlastikByoc && (
        <div
          className="rw-plastik-alert"
          style={{ background: "rgba(16,185,129,0.07)", borderColor: "rgba(16,185,129,0.22)" }}
        >
          <Leaf size={13} style={{ color: "var(--status-hadir-text)", flexShrink: 0, marginTop: 1 }} />
          <span>
            Ada{" "}
            <strong style={{ color: "var(--status-hadir-text)" }}>
              {item.jumlahItemPlastik} produk kemasan plastik
            </strong>{" "}
            dibeli menggunakan{" "}
            <strong style={{ color: "var(--status-hadir-text)" }}>
              wadah sendiri (BYOC)
            </strong>{" "}
            — tidak dikenakan penalti. Tetap ramah lingkungan! 🌱
          </span>
        </div>
      )}

      {/* Daftar produk */}
      {item.items.length > 0 && (
        <div className="rw-belanja-items">
          <div className="rw-belanja-items-title">Rincian Pembelian</div>
          {item.items.map((itm, i) => (
            <div
              key={i}
              className={`rw-belanja-item-row ${itm.jenisKemasan === "plastik" ? "is-plastik" : itm.jenisKemasan === "kertas" ? "is-kertas" : ""}`}
            >
              {itm.jenisKemasan === "plastik"
                ? <Trash2 size={11} style={{ color: "var(--status-plastik-text)", flexShrink: 0 }} />
                : itm.jenisKemasan === "kertas"
                  ? <Package size={11} style={{ color: "var(--status-hadir-text)", flexShrink: 0 }} />
                  : <Package size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
              <span className="rw-belanja-item-name">{itm.namaProduk}</span>
              {itm.qty > 1 && <span className="rw-belanja-item-qty">x{itm.qty}</span>}
              <span className="rw-belanja-item-price">{formatRupiah(itm.subtotal)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="rw-modal-divider" />

      <MRow label="Metode Bayar" value={labelPaymentMethod(item.paymentMethod)} icon={payIcon} />
      {item.totalDiskon > 0 && (
        <MRow
          label="Diskon"
          value={<span style={{ color: "var(--status-hadir-text)" }}>-{formatRupiah(item.totalDiskon)}</span>}
        />
      )}
      <MRow label="Total Harga" value={formatRupiah(item.totalHarga)} />
      <MRow label="Total Bayar" value={<strong>{formatRupiah(item.totalBayar)}</strong>} />

      {(hasReward || hasPenalty) && <div className="rw-modal-divider" />}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {hasReward && (
          <div style={{ textAlign: "right" }}>
            <div className="rw-modal-coins-total-label">Coins Didapat</div>
            <div className="rw-modal-coins-total-plus">+{item.coinsReward}</div>
          </div>
        )}
        {hasPenalty && (
          <div style={{ textAlign: "right" }}>
            <div className="rw-modal-coins-total-label">Penalti Plastik</div>
            <div className="rw-modal-coins-total-minus">-{item.coinsPenalty}</div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

// ─── MODAL PELANGGARAN ────────────────────────────────────────────────────────
function ModalPelanggaran({ item, onClose }: { item: RiwayatPelanggaran; onClose: () => void }) {
  const ks = KATEGORI_CFG[item.kategori] ?? KATEGORI_CFG.sedang;
  const STATUS_CFG = {
    pending: { color: "var(--gold,#F59E0B)", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", label: "Tertunda" },
    approved: { color: "var(--status-hadir-text)", bg: "var(--status-hadir-bg)", border: "var(--status-hadir-border)", label: "Disetujui" },
    rejected: { color: "var(--status-pel-text)", bg: "var(--status-pel-bg)", border: "var(--status-pel-border)", label: "Ditolak" },
  };
  const sc = STATUS_CFG[item.status];

  return (
    <ModalWrapper onClose={onClose} accentColor={ks.color}>
      <div className="rw-modal-header">
        <div className={ks.iconBoxClass} style={{ width: 46, height: 46, borderRadius: 13 }}>
          <ShieldAlert size={22} style={{ color: ks.color }} />
        </div>
        <div>
          <div className="rw-modal-title">{item.namaJenis}</div>
          <div className="rw-modal-subtitle">{formatTanggal(item.tanggal)} · {formatWaktu(item.waktu)}</div>
        </div>
      </div>

      <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip color={ks.color} bg={ks.bg} border={ks.border}>
          <span style={{ textTransform: "capitalize" }}>Kategori {item.kategori}</span>
        </Chip>
        <Chip color={sc.color} bg={sc.bg} border={sc.border}>{sc.label}</Chip>
      </div>

      <MRow label="Dicatat oleh" value={item.dicatatOleh} icon={<User size={12} />} />
      {item.verifiedAt && (
        <MRow label="Disetujui pada" value={formatTanggal(item.verifiedAt)} icon={<CheckCircle2 size={12} />} />
      )}
      {item.catatan && <MRow label="Catatan" value={item.catatan} />}

      {item.buktiUrl && (
        <div style={{ marginTop: 12 }}>
          <div className="rw-bukti-label"><ImageIcon size={11} /> Foto Bukti</div>
          <img src={item.buktiUrl} alt="Bukti" className="rw-bukti-img" />
        </div>
      )}

      <div className="rw-modal-divider" />
      <div>
        <div className="rw-modal-coins-total-label">Pengurangan Coins</div>
        <div className="rw-modal-coins-total-minus">-{item.coinsPenalty}</div>
      </div>
    </ModalWrapper>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: TabKey }) {
  const cfg = {
    all: { icon: <Clock size={30} strokeWidth={1} />, text: "Belum ada aktivitas" },
    tumbler: { icon: <Droplets size={30} strokeWidth={1} />, text: "Belum ada riwayat tumbler" },
    belanja: { icon: <ShoppingBag size={30} strokeWidth={1} />, text: "Belum ada riwayat belanja" },
    pelanggaran: { icon: <ShieldAlert size={30} strokeWidth={1} />, text: "Tidak ada pelanggaran 🎉" },
  }[tab];
  return (
    <div className="rw-empty">
      {cfg.icon}
      <span>{cfg.text}</span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function RiwayatPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [data, setData] = useState<RiwayatAll | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalTumbler, setModalTumbler] = useState<RiwayatTumbler | null>(null);
  const [modalBelanja, setModalBelanja] = useState<RiwayatBelanja | null>(null);
  const [modalPelanggaran, setModalPelanggaran] = useState<RiwayatPelanggaran | null>(null);

  const load = useCallback(async (force = false) => {
    const hitCache = isRiwayatCached() && !force;
    if (!hitCache) {
      if (!data) setLoading(true);
      else setRefreshing(true);
    }
    try {
      const result = await getRiwayatAll(50, force);
      setData(result);
      setLoadError(null);
    } catch (e: any) {
      console.error("Gagal memuat riwayat:", e);
      setLoadError(e?.message || "Gagal memuat riwayat.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => { load(false); }, []); // eslint-disable-line

  type AllItem =
    | { kind: "tumbler"; item: RiwayatTumbler }
    | { kind: "belanja"; item: RiwayatBelanja }
    | { kind: "pelanggaran"; item: RiwayatPelanggaran };

  const allItems = useMemo((): AllItem[] => {
    if (!data) return [];
    const merged: AllItem[] = [
      ...(data.tumbler ?? []).map((item): AllItem => ({ kind: "tumbler", item })),
      ...(data.belanja ?? []).map((item): AllItem => ({ kind: "belanja", item })),
      ...(data.pelanggaran ?? []).map((item): AllItem => ({ kind: "pelanggaran", item })),
    ];
    return merged.sort((a, b) => {
      const ts = (x: AllItem) => {
        const raw = x.item.createdAt && x.item.createdAt !== "-"
          ? x.item.createdAt
          : (x.item as any).tanggal + "T00:00:00";
        return new Date(raw).getTime();
      };
      return ts(b) - ts(a);
    });
  }, [data]);

  if (loading && !data) return <SehatiLoadingScreen />;

  if (!data) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <ErrorState
            title="Riwayat Gagal Dimuat"
            message={loadError || "Data riwayat tidak tersedia."}
            onRetry={() => load(true)}
          />
        </div>
      </main>
    );
  }

  const summary = data.summary;

  return (
    <main className="dashboard-page">
      {modalTumbler && <ModalTumbler item={modalTumbler} onClose={() => setModalTumbler(null)} />}
      {modalBelanja && <ModalBelanja item={modalBelanja} onClose={() => setModalBelanja(null)} />}
      {modalPelanggaran && <ModalPelanggaran item={modalPelanggaran} onClose={() => setModalPelanggaran(null)} />}

      <div className="dashboard-container">
        <header className="dash-header">
          <div className="brand">
            <div className="brand-logo">
              <BrandLogo size={26} alt="SEHATI Riwayat" priority />
            </div>
            <div className="brand-text">
              <span className="brand-name">Riwayat</span>
              <span className="brand-role">Aktivitasmu di SEHATI</span>
            </div>
          </div>
        </header>

        {refreshing && (
          <div className="rw-refreshing-bar">
            <Loader2 size={11} style={{ animation: "spin 0.75s linear infinite" }} />
            Memperbarui data...
          </div>
        )}

        {summary && <SummaryCards summary={summary} />}

        {summary && (
          <PlastikWarning
            jumlah={summary.jumlahPlastik}
            jumlahByoc={summary.jumlahPlastikByoc ?? 0}
          />
        )}

        <div className="rw-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`rw-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tab === "all" && (
            allItems.length === 0
              ? <EmptyState tab="all" />
              : allItems.map((entry, i) => {
                if (entry.kind === "tumbler")
                  return <TumblerCard key={i} item={entry.item} onClick={() => setModalTumbler(entry.item)} />;
                if (entry.kind === "belanja")
                  return <BelanjaCard key={i} item={entry.item} onClick={() => setModalBelanja(entry.item)} />;
                return <PelanggaranCard key={i} item={entry.item} onClick={() => setModalPelanggaran(entry.item)} />;
              })
          )}
          {tab === "tumbler" && (
            !(data?.tumbler?.length ?? 0) ? <EmptyState tab="tumbler" /> :
              (data?.tumbler ?? []).map((item) => (
                <TumblerCard key={item.id} item={item} onClick={() => setModalTumbler(item)} />
              ))
          )}
          {tab === "belanja" && (
            !(data?.belanja?.length ?? 0) ? <EmptyState tab="belanja" /> :
              (data?.belanja ?? []).map((item) => (
                <BelanjaCard key={item.id} item={item} onClick={() => setModalBelanja(item)} />
              ))
          )}
          {tab === "pelanggaran" && (
            !(data?.pelanggaran?.length ?? 0) ? <EmptyState tab="pelanggaran" /> :
              (data?.pelanggaran ?? []).map((item) => (
                <PelanggaranCard key={item.id} item={item} onClick={() => setModalPelanggaran(item)} />
              ))
          )}
        </div>
      </div>

      <BottomNavSiswa />
    </main>
  );
}