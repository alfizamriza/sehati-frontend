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

// Kategori config — warna tetap pakai var() agar ikut tema
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

const KEMASAN_LABEL: Record<string, string> = {
  plastik: "Plastik",
  kertas: "Kertas",
  tanpa_kemasan: "Tanpa Kemasan",
};

// ─── PLASTIK WARNING ──────────────────────────────────────────────────────────
function PlastikWarning({ jumlah }: { jumlah: number }) {
  if (jumlah === 0) return null;
  const level = jumlah >= 10 ? "high" : jumlah >= 5 ? "med" : "low";
  const cfg = {
    low: { color: "var(--gold,#F59E0B)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)", text: `${jumlah}x produk kemasan plastik dibeli. Coba kurangi ya!` },
    med: { color: "var(--streak-color,#F97316)", bg: "var(--status-plastik-bg)", border: "var(--status-plastik-border)", text: `${jumlah}x produk kemasan plastik! Yuk beralih ke kemasan ramah lingkungan 🌱` },
    high: { color: "var(--status-pel-text,#EF4444)", bg: "var(--status-pel-bg)", border: "var(--status-pel-border)", text: `${jumlah}x produk kemasan plastik! Kamu sudah berkontribusi banyak sampah. Tolong kurangi!` },
  }[level];

  return (
    <div
      className="rw-plastik-warning"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <AlertTriangle size={15} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
      <div>
        <div className="rw-plastik-warning-title" style={{ color: cfg.color }}>
          Peringatan Penggunaan Plastik
        </div>
        <div className="rw-plastik-warning-body">{cfg.text}</div>
      </div>
    </div>
  );
}

// ─── SUMMARY CARDS ────────────────────────────────────────────────────────────
function SummaryCards({ summary }: { summary: RiwayatSummary }) {
  return (
    <div className="rw-summary-grid">
      {/* Top 3 */}
      {[
        { icon: <Droplets size={16} style={{ color: "var(--status-hadir-text)" }} />, label: "Tumbler", value: summary.totalTumbler, color: "var(--status-hadir-text)" },
        { icon: <ShoppingBag size={16} style={{ color: "var(--color-primary)" }} />, label: "Belanja", value: summary.totalBelanja, color: "var(--color-primary)" },
        { icon: <ShieldAlert size={16} style={{ color: "var(--status-pel-text)" }} />, label: "Pelangg.", value: summary.totalPelanggaran, color: "var(--status-pel-text)" },
      ].map((s) => (
        <div key={s.label} className="rw-summary-card">
          <div className="rw-summary-card-icon">{s.icon}</div>
          <div className="rw-summary-card-value" style={{ color: s.color }}>{s.value}</div>
          <div className="rw-summary-card-label">{s.label}</div>
        </div>
      ))}

      {/* Bottom coins bar */}
      <div className="rw-summary-footer">
        <div className="rw-summary-footer-item">
          <TrendingUp size={15} style={{ color: "var(--status-hadir-text)" }} />
          <div>
            <div className="rw-summary-footer-label">Coins Masuk</div>
            <div className="rw-summary-footer-value" style={{ color: "var(--status-hadir-text)" }}>
              +{summary.totalCoinsDidapat}
            </div>
          </div>
        </div>
        <div className="rw-summary-divider" />
        <div className="rw-summary-footer-item">
          <TrendingDown size={15} style={{ color: "var(--status-pel-text)" }} />
          <div>
            <div className="rw-summary-footer-label">Coins Keluar</div>
            <div className="rw-summary-footer-value" style={{ color: "var(--status-pel-text)" }}>
              -{summary.totalCoinsKeluar}
            </div>
          </div>
        </div>
        <div className="rw-summary-divider" />
        <div className="rw-summary-footer-item">
          <Trash2 size={15} style={{ color: "var(--status-plastik-text)" }} />
          <div>
            <div className="rw-summary-footer-label">Plastik</div>
            <div className="rw-summary-footer-value" style={{ color: "var(--status-plastik-text)" }}>
              {summary.jumlahPlastik}x
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CHIP ────────────────────────────────────────────────────────────────────
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

// ─── ITEM CARDS ───────────────────────────────────────────────────────────────
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
          <Chip color="var(--status-hadir-text)" bg="var(--status-hadir-bg)" border="var(--status-hadir-border)">
            {item.method === "scan" ? <QrCode size={9} /> : <PenLine size={9} />}
            {labelMethod(item.method)}
          </Chip>
          {item.dicatatOleh !== "-" && (
            <Chip>
              <User size={9} /> {item.dicatatOleh}
            </Chip>
          )}
        </div>
      </div>
    </button>
  );
}

function BelanjaCard({ item, onClick }: { item: RiwayatBelanja; onClick: () => void }) {
  const isPlastik = item.adaProdukPlastik;
  const accColor = isPlastik ? "var(--status-plastik-text)" : "var(--color-primary)";
  const borderAcc = isPlastik ? "var(--status-plastik-border)" : "var(--border-primary)";
  const payIcon = { coins: <Coins size={9} />, voucher: <Tag size={9} />, tunai: <CreditCard size={9} /> }[item.paymentMethod] ?? <CreditCard size={9} />;

  return (
    <button onClick={onClick} className="rw-card-btn">
      <div className="rw-item-card" style={{ borderLeft: `3px solid ${borderAcc}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`rw-icon-box ${isPlastik ? "rw-icon-box-belanja-plastik" : "rw-icon-box-belanja"}`}>
              <ShoppingBag size={17} style={{ color: accColor }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className="rw-item-title" style={{ color: accColor }}>Belanja Kantin</span>
                {isPlastik && (
                  <Chip color="var(--status-plastik-text)" bg="var(--status-plastik-bg)" border="var(--status-plastik-border)">
                    <Trash2 size={8} /> Plastik
                  </Chip>
                )}
              </div>
              <div className="rw-item-date">
                {formatTanggal(item.tanggal)} · {formatWaktu(item.waktu)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ textAlign: "right" }}>
              <div className="rw-coins-minus">-{item.coinsUsed}</div>
              <div className="rw-coins-label">coins</div>
            </div>
            <ChevronRight size={13} className="rw-chevron" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Chip>{payIcon} {labelPaymentMethod(item.paymentMethod)}</Chip>
          {item.totalDiskon > 0 && (
            <Chip color="var(--status-hadir-text)" bg="var(--status-hadir-bg)" border="var(--status-hadir-border)">
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

function MRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rw-modal-row">
      <span className="rw-modal-row-label">{label}</span>
      <span className="rw-modal-row-value">
        {icon}{value}
      </span>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
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
      <MRow label="Metode" value={labelMethod(item.method)} icon={item.method === "scan" ? <QrCode size={12} /> : <PenLine size={12} />} />
      {item.dicatatOleh !== "-" && <MRow label="Dicatat oleh" value={item.dicatatOleh} icon={<User size={12} />} />}
      {item.kelas !== "-" && <MRow label="Kelas" value={item.kelas} />}

      <div className="rw-modal-divider" />

      <div className="rw-modal-coins-row">
        <div>
          <div className="rw-modal-coins-total-label">Total Coins Didapat</div>
          <div className="rw-modal-coins-total-plus">+{total}</div>
        </div>
        <div className="rw-modal-coins-breakdown">
          <div className="rw-modal-coins-chip" style={{ background: "var(--status-hadir-bg)", borderColor: "var(--status-hadir-border)" }}>
            <span className="rw-modal-coins-chip-label">Reward</span>
            <span className="rw-modal-coins-chip-value" style={{ color: "var(--status-hadir-text)" }}>+{item.coinsReward}</span>
          </div>
          {item.streakBonus > 0 && (
            <div className="rw-modal-coins-chip" style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" }}>
              <span className="rw-modal-coins-chip-label">Bonus Streak</span>
              <span className="rw-modal-coins-chip-value" style={{ color: "var(--gold,#F59E0B)" }}>+{item.streakBonus}</span>
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

function ModalBelanja({ item, onClose }: { item: RiwayatBelanja; onClose: () => void }) {
  const isPlastik = item.adaProdukPlastik;
  const accentColor = isPlastik ? "var(--status-plastik-text)" : "var(--color-primary)";
  const payIcon = { coins: <Coins size={13} />, voucher: <Tag size={13} />, tunai: <CreditCard size={13} /> }[item.paymentMethod] ?? null;

  return (
    <ModalWrapper onClose={onClose} accentColor={accentColor}>
      <div className="rw-modal-header">
        <div className={`rw-modal-icon-box ${isPlastik ? "rw-icon-box-belanja-plastik" : "rw-icon-box-belanja"}`}>
          <ShoppingBag size={22} style={{ color: accentColor }} />
        </div>
        <div>
          <div className="rw-modal-title">Detail Belanja Kantin</div>
          <div className="rw-modal-subtitle">{formatTanggal(item.tanggal)} · {formatWaktu(item.waktu)}</div>
          <div className="rw-modal-kode">{item.kodeTransaksi}</div>
        </div>
      </div>

      {isPlastik && (
        <div className="rw-plastik-alert">
          <AlertTriangle size={13} style={{ color: "var(--status-plastik-text)", flexShrink: 0, marginTop: 1 }} />
          <span>
            Ada <strong style={{ color: "var(--status-plastik-text)" }}>{item.jumlahItemPlastik} produk kemasan plastik</strong>. Yuk pilih alternatif ramah lingkungan! 🌱
          </span>
        </div>
      )}

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
        <MRow label="Diskon" value={<span style={{ color: "var(--status-hadir-text)" }}>-{formatRupiah(item.totalDiskon)}</span>} />
      )}
      <MRow label="Total Harga" value={formatRupiah(item.totalHarga)} />
      <MRow label="Total Bayar" value={<strong>{formatRupiah(item.totalBayar)}</strong>} />

      {item.coinsUsed > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div className="rw-modal-coins-total-label">Coins berkurang</div>
            <div className="rw-modal-coins-total-minus">-{item.coinsUsed}</div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

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
        <Chip color={sc.color} bg={sc.bg} border={sc.border}>
          {sc.label}
        </Chip>
      </div>

      <MRow label="Dicatat oleh" value={item.dicatatOleh} icon={<User size={12} />} />
      {item.verifiedAt && (
        <MRow label="Disetujui pada" value={formatTanggal(item.verifiedAt)} icon={<CheckCircle2 size={12} />} />
      )}
      {item.catatan && <MRow label="Catatan" value={item.catatan} />}

      {item.buktiUrl && (
        <div style={{ marginTop: 12 }}>
          <div className="rw-bukti-label">
            <ImageIcon size={11} /> Foto Bukti
          </div>
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

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
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

  // Merged & sorted untuk tab "all"
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

  // ── Loading state ──
  if (loading && !data) {
    return <SehatiLoadingScreen />;
  }

  // ── Error state ──
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
      {/* Modals */}
      {modalTumbler && <ModalTumbler item={modalTumbler} onClose={() => setModalTumbler(null)} />}
      {modalBelanja && <ModalBelanja item={modalBelanja} onClose={() => setModalBelanja(null)} />}
      {modalPelanggaran && <ModalPelanggaran item={modalPelanggaran} onClose={() => setModalPelanggaran(null)} />}

      <div className="dashboard-container">

        {/* Header */}
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

        {/* Refreshing bar */}
        {refreshing && (
          <div className="rw-refreshing-bar">
            <Loader2 size={11} style={{ animation: "spin 0.75s linear infinite" }} />
            Memperbarui data...
          </div>
        )}

        {summary && <SummaryCards summary={summary} />}
        {summary && <PlastikWarning jumlah={summary.jumlahPlastik} />}

        {/* Tabs */}
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

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tab === "all" && (
            allItems.length === 0 ? <EmptyState tab="all" /> :
              allItems.map((entry, i) => {
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