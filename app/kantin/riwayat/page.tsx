"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Ticket,
  Coins,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Loader2,
  CalendarRange,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  fetchRiwayat,
  fetchExportData,
  generatePDF,
  metodeLabel,
  formatWaktu,
  formatRupiah,
  formatTglRange,
  type RiwayatItem,
  type RiwayatStats,
  type RiwayatMeta,
  type QueryRiwayat,
} from "@/lib/services/kantin";
import "../../guru/dashboard/dashboard.css";
import "./riwayat.css";

type Period = "today" | "week" | "month" | "all" | "custom";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: "ok" | "err" | "loading";
  onClose: () => void;
}) {
  useEffect(() => {
    if (type !== "loading") {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [type, onClose]);
  const bg = type === "ok" ? "#10b981" : type === "err" ? "#EF4444" : "#179EFF";
  return (
    <div className="rw-toast" style={{ background: bg }}>
      {type === "loading" ? (
        <Loader2
          size={14}
          style={{ animation: "spin .6s linear infinite", flexShrink: 0 }}
        />
      ) : type === "ok" ? (
        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
      ) : (
        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
      )}
      <span>{msg}</span>
      {type !== "loading" && (
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            display: "flex",
            padding: 0,
            marginLeft: 4,
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ── Metode Badge ──────────────────────────────────────────────────────────────
function MetodeBadge({ method }: { method: string }) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    tunai: { cls: "badge-tunai", icon: <Wallet size={11} /> },
    voucher: { cls: "badge-voucher", icon: <Ticket size={11} /> },
    coins: { cls: "badge-coins", icon: <Coins size={11} /> },
  };
  const c = cfg[method] ?? { cls: "badge-tunai", icon: null };
  return (
    <span className={`rw-badge ${c.cls}`}>
      {c.icon} {metodeLabel(method)}
    </span>
  );
}

// ── Modal Struk ───────────────────────────────────────────────────────────────
function ModalStruk({
  item,
  onClose,
}: {
  item: RiwayatItem;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handlePrint() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document
      .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Struk</title>
    <style>body{font-family:monospace;font-size:12px;padding:20px;max-width:300px;margin:0 auto;}
    h2{text-align:center;font-size:14px;}hr{border:1px dashed #999;margin:8px 0;}
    .row{display:flex;justify-content:space-between;margin:3px 0;}.bold{font-weight:bold;}
    @media print{body{padding:0;}}</style></head><body>
    <h2>STRUK PEMBELIAN</h2><p style="text-align:center;font-size:10px;color:#666">${item.kodeTransaksi}</p>
    <hr/><div class="row"><span>Siswa</span><span>${item.namaSiswa}</span></div>
    <div class="row"><span>Kelas</span><span>${item.kelas}</span></div>
    <div class="row"><span>Waktu</span><span>${formatWaktu(item.createdAt)}</span></div>
    <hr/>${item.items.map((d) => `<div class="row"><span>${d.nama} x${d.qty}</span><span>Rp ${d.subtotal.toLocaleString("id-ID")}</span></div>`).join("")}
    <hr/>${item.totalDiskon > 0 ? `<div class="row"><span>Diskon</span><span>-Rp ${item.totalDiskon.toLocaleString("id-ID")}</span></div>` : ""}
    ${item.coinsUsed > 0 ? `<div class="row"><span>Potongan Koin</span><span>-${item.coinsUsed.toLocaleString("id-ID")} koin</span></div>` : ""}
    <div class="row bold"><span>TOTAL</span><span>Rp ${item.totalBayar.toLocaleString("id-ID")}</span></div>
    <div class="row"><span>Metode</span><span>${metodeLabel(item.paymentMethod)}</span></div>
    <hr/><p style="text-align:center;font-size:10px">Terima kasih!</p>
    <script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="rw-overlay" onClick={onClose}>
      <div className="rw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rw-modal-handle" />
        <button className="rw-modal-close" onClick={onClose}>
          <X size={14} />
        </button>
        <div className="rw-modal-title">
          <FileText size={16} /> Detail Struk
        </div>
        <div className="rw-struk-header">
          <div className="rw-struk-kode">{item.kodeTransaksi}</div>
          <div className="rw-struk-waktu">{formatWaktu(item.createdAt)}</div>
        </div>
        <div className="rw-struk-siswa">
          <div className="rw-struk-nama">{item.namaSiswa}</div>
          <div className="rw-struk-kelas">
            {item.kelas} · NIS {item.nis}
          </div>
        </div>
        <div className="rw-struk-divider" />
        <div className="rw-struk-items">
          {item.items.map((d, i) => (
            <div key={i} className="rw-struk-item-row">
              <div>
                <span className="rw-struk-item-nama">{d.nama}</span>
                <span className="rw-struk-item-qty"> ×{d.qty}</span>
              </div>
              <span className="rw-struk-item-sub">
                {formatRupiah(d.subtotal)}
              </span>
            </div>
          ))}
        </div>
        <div className="rw-struk-divider" />
        <div className="rw-struk-totals">
          <div className="rw-total-row">
            <span>Subtotal</span>
            <span>{formatRupiah(item.totalHarga)}</span>
          </div>
          {item.totalDiskon > 0 && (
            <div className="rw-total-row discount">
              <span>Diskon</span>
              <span>-{formatRupiah(item.totalDiskon)}</span>
            </div>
          )}
          {item.coinsUsed > 0 && (
            <div className="rw-total-row coins">
              <span>Potongan Koin</span>
              <span>-{item.coinsUsed.toLocaleString()} koin</span>
            </div>
          )}
          <div className="rw-total-row grand">
            <span>Total Bayar</span>
            <span>{formatRupiah(item.totalBayar)}</span>
          </div>
        </div>
        <div className="rw-struk-divider" />
        <div className="rw-struk-metode">
          <MetodeBadge method={item.paymentMethod} />
        </div>
        <button className="rw-btn-print-struk" onClick={handlePrint}>
          <Printer size={15} /> Cetak Struk
        </button>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  pct?: number;
}) {
  return (
    <div className="rw-stat-card">
      <div className="rw-stat-top">
        <div
          className="rw-stat-icon"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
        <div>
          <div className="rw-stat-label">{label}</div>
          <div className="rw-stat-value">{value}</div>
          {sub && <div className="rw-stat-sub">{sub}</div>}
        </div>
      </div>
      {pct !== undefined && (
        <div className="rw-stat-bar">
          <div
            className="rw-stat-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function RiwayatKantinPage() {
  const [data, setData] = useState<RiwayatItem[]>([]);
  const [stats, setStats] = useState<RiwayatStats | null>(null);
  const [meta, setMeta] = useState<RiwayatMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [filterMetode, setFilterMetode] = useState<
    "" | "tunai" | "voucher" | "coins"
  >("");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<RiwayatItem | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err" | "loading";
  } | null>(null);
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const showToast = useCallback(
    (msg: string, type: "ok" | "err" | "loading") => setToast({ msg, type }),
    [],
  );

  const buildQuery = useCallback((): QueryRiwayat => {
    const q: QueryRiwayat = { period, page, limit: 15 };
    if (period === "custom") {
      q.startDate = customStart;
      q.endDate = customEnd;
    }
    if (search) q.search = search;
    if (filterMetode) q.paymentMethod = filterMetode;
    return q;
  }, [period, customStart, customEnd, search, filterMetode, page]);

  const load = useCallback(
    async (pg = page, showSkeleton = false) => {
      if (showSkeleton) setLoading(true);
      else setFetching(true);
      try {
        const res = await fetchRiwayat({ ...buildQuery(), page: pg });
        setData(res.data);
        setStats(res.stats);
        setMeta(res.meta);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Gagal memuat";
        showToast(msg, "err");
      } finally {
        if (showSkeleton) setLoading(false);
        setFetching(false);
      }
    },
    [buildQuery, page, showToast],
  );

  useEffect(() => {
    const first = !initializedRef.current;
    initializedRef.current = true;
    load(1, first);
    setPage(1);
  }, [period, customStart, customEnd, filterMetode, load]);
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      load(1);
      setPage(1);
    }, 450);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [search, load]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    showToast("Mempersiapkan PDF...", "loading");
    try {
      const payload = await fetchExportData(buildQuery());
      await generatePDF(payload);
      setToast(null);
      showToast("PDF berhasil diunduh!", "ok");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal export";
      setToast(null);
      showToast(msg, "err");
    } finally {
      setExporting(false);
    }
  }

  const PERIODS: { key: Period; label: string }[] = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "7 Hari" },
    { key: "month", label: "Bulan Ini" },
    { key: "all", label: "Semua" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <main className="dashboard-page riwayat-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {selectedItem && (
        <ModalStruk item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <div className="rw-container">
        {/* HEADER */}
        <header className="header-section">
          <Link
            href="/kantin/dashboard"
            className="page-title"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="filter-btn"
              style={{ padding: 8, display: "grid", placeItems: "center" }}
            >
              <ArrowLeft size={22} />
            </div>
            <h1>Riwayat Transaksi</h1>
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              className="rw-btn-refresh"
              onClick={() => load(page)}
              disabled={loading || fetching}
              title="Refresh"
            >
              <RefreshCw
                size={15}
                style={{
                  animation:
                    loading || fetching ? "spin .75s linear infinite" : "none",
                }}
              />
            </button>
            <button
              className="rw-btn-export"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2
                    size={15}
                    style={{ animation: "spin .6s linear infinite" }}
                  />{" "}
                  Memproses...
                </>
              ) : (
                <>
                  <Download size={15} /> Export PDF
                </>
              )}
            </button>
          </div>
        </header>

        {/* FILTER */}
        <section className="rw-filter-section">
          <div className="rw-period-tabs">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                className={`rw-period-tab ${period === p.key ? "active" : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="rw-date-range">
              <CalendarRange
                size={14}
                style={{ color: "var(--txt-sub)", flexShrink: 0 }}
              />
              <input
                type="date"
                className="rw-date-input"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span style={{ color: "var(--txt-muted)", fontSize: "0.75rem" }}>
                s/d
              </span>
              <input
                type="date"
                className="rw-date-input"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}
          <div className="rw-filter-right">
            <div className="rw-metode-filter">
              {(["", "tunai", "voucher"] as const).map((m) => (
                <button
                  key={m || "all"}
                  className={`rw-metode-btn ${filterMetode === m ? "active" : ""}`}
                  onClick={() => setFilterMetode(m)}
                >
                  {m === "" ? "Semua" : metodeLabel(m)}
                </button>
              ))}
            </div>
            <div className="rw-search-wrap">
              <Search size={14} className="rw-search-icon" />
              <input
                type="text"
                className="rw-search"
                placeholder="Cari siswa / NIS / kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="rw-search-clear"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* STATS */}
        {stats && (
          <section className="rw-stats-grid">
            <StatCard
              icon={<CreditCard size={18} />}
              label="Total Transaksi"
              value={stats.totalTransaksi.toLocaleString()}
              sub={meta ? formatTglRange(meta.startDate, meta.endDate) : ""}
              color="#179EFF"
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="Total Pendapatan"
              value={formatRupiah(stats.totalPendapatan)}
              sub="Periode saat ini"
              color="#10b981"
            />
            <StatCard
              icon={<Wallet size={18} />}
              label="Tunai"
              value={`${stats.countTunai} trx`}
              sub={`${stats.pctTunai}%`}
              color="#10b981"
              pct={stats.pctTunai}
            />
            <StatCard
              icon={<Ticket size={18} />}
              label="Voucher"
              value={`${stats.countVoucher} trx`}
              sub={`${stats.pctVoucher}%`}
              color="#8B5CF6"
              pct={stats.pctVoucher}
            />
            {/* <StatCard
              icon={<Coins size={18} />}
              label="Koin"
              value={`${stats.countCoins} trx`}
              sub={`${stats.pctCoins}%`}
              color="#F59E0B"
              pct={stats.pctCoins}
            /> */}
          </section>
        )}

        {/* TABLE */}
        <section className="rw-table-section">
          {fetching && !loading && (
            <div className="rw-inline-fetching">Memuat pembaruan...</div>
          )}
          {loading && data.length === 0 ? (
            <div className="rw-loading-state">
              <Loader2
                size={32}
                style={{ animation: "spin .75s linear infinite" }}
              />
              <span>Memuat data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="rw-empty-state">
              <FileText size={44} style={{ opacity: 0.2, marginBottom: 10 }} />
              <div style={{ fontWeight: 700 }}>Tidak ada transaksi</div>
              <div style={{ fontSize: "0.8rem", opacity: 0.5, marginTop: 4 }}>
                {search
                  ? `Tidak ada hasil untuk "${search}"`
                  : "Belum ada transaksi pada periode ini"}
              </div>
            </div>
          ) : (
            <>
              <div className="rw-table-wrap">
                <table className="rw-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>No</th>
                      <th>Nama Siswa</th>
                      <th>Produk</th>
                      <th>Waktu</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "center" }}>Metode</th>
                      <th style={{ width: 56, textAlign: "center" }}>Struk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((t, i) => (
                      <tr key={t.id} className="rw-tr">
                        <td className="rw-td-no">
                          {(page - 1) * (meta?.limit ?? 15) + i + 1}
                        </td>
                        <td>
                          <div className="rw-cell-siswa">
                            <span className="rw-siswa-nama">{t.namaSiswa}</span>
                            <span className="rw-siswa-sub">
                              {t.kelas} · {t.nis}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="rw-cell-produk">
                            <span className="rw-produk-label">
                              {t.produkLabel}
                            </span>
                            <span className="rw-kode-trx">
                              {t.kodeTransaksi}
                            </span>
                          </div>
                        </td>
                        <td className="rw-td-waktu">
                          {formatWaktu(t.createdAt)}
                        </td>
                        <td className="rw-td-total">
                          <span className="rw-total-val">
                            {formatRupiah(t.totalBayar)}
                          </span>
                          {t.totalDiskon > 0 && (
                            <span className="rw-diskon-val">
                              -{formatRupiah(t.totalDiskon)}
                            </span>
                          )}
                          {t.coinsUsed > 0 && (
                            <span className="rw-coins-val">
                              Potongan koin: -
                              {t.coinsUsed.toLocaleString("id-ID")} koin
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <MetodeBadge method={t.paymentMethod} />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="rw-btn-struk"
                            onClick={() => setSelectedItem(t)}
                            title="Lihat & Cetak Struk"
                          >
                            <Printer size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meta && meta.totalPages > 1 && (
                <div className="rw-pagination">
                  <span className="rw-page-info">
                    {(page - 1) * meta.limit + 1}–
                    {Math.min(page * meta.limit, meta.total)} dari {meta.total}
                  </span>
                  <div className="rw-page-btns">
                    <button
                      className="rw-page-btn rw-page-nav"
                      disabled={page <= 1}
                      onClick={() => {
                        setPage((p) => p - 1);
                        load(page - 1);
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from(
                      { length: Math.min(5, meta.totalPages) },
                      (_, i) => {
                        const s = Math.max(
                          1,
                          Math.min(page - 2, meta.totalPages - 4),
                        );
                        const p = s + i;
                        if (p > meta.totalPages) return null;
                        return (
                          <button
                            key={p}
                            className={`rw-page-btn ${page === p ? "active" : ""}`}
                            onClick={() => {
                              setPage(p);
                              load(p);
                            }}
                          >
                            {p}
                          </button>
                        );
                      },
                    )}
                    <button
                      className="rw-page-btn rw-page-nav"
                      disabled={page >= meta.totalPages}
                      onClick={() => {
                        setPage((p) => p + 1);
                        load(page + 1);
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        @keyframes modalUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
