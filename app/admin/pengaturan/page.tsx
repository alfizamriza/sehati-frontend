"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  Save, School, Plus, Trash2, TriangleAlert, Crown, CalendarDays,
  CheckCircle2, XCircle, Loader2, Settings2, Edit3, ShieldCheck,
  Zap, AlertTriangle, Check, X, Info, Tag, Coins, Mail, Phone,
  MapPin, Hash, Building2, Trophy, Ticket,
  ArrowRightLeft, OctagonX, Milk, Flame, HandCoins,
} from "lucide-react";
import {
  getAllPengaturan, bulkUpdatePengaturan,
  getAllLibur, createLibur, updateLibur, deleteLibur, toggleLiburActive,
  getAllPelanggaran, createPelanggaran, updatePelanggaran, deletePelanggaran,
  togglePelanggaranActive,
  getAllAchievement, createAchievement, updateAchievement, deleteAchievement,
  toggleAchievementActive,
  type Pengaturan, type TanggalLibur, type JenisPelanggaran, type Achievement,
} from "@/lib/services/admin";
import { Calendar } from "@/components/ui/calendar";
// import "@/app/admin/admin.css";

// ─── EXTENDED TYPE ────────────────────────────────────────────────────────────
interface AchievementFull extends Achievement {
  voucher_reward: boolean;
  voucher_nominal?: number | null;
  voucher_tipe_voucher?: "percentage" | "fixed" | null;
  pelanggaran_mode?: "count" | "no_violation_days" | null;
  pelanggaran_period_days?: number | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
type TabKey = "general" | "libur" | "pelanggaran" | "achievement";

const TABS: { key: TabKey; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { key: "general",     label: "Pengaturan Umum",  icon: Settings2,    desc: "Info sekolah & reward",   color: "#179EFF" },
  { key: "libur",       label: "Hari Libur",        icon: CalendarDays, desc: "Manajemen tanggal libur", color: "#F59E0B" },
  { key: "pelanggaran", label: "Pelanggaran",       icon: ShieldCheck,  desc: "Kategori & sanksi",       color: "#EF4444" },
  { key: "achievement", label: "Achievement",       icon: Trophy,       desc: "Badge & reward siswa",    color: "#A855F7" },
];

const KATEGORI_OPTIONS = [
  { value: "ringan" as const, label: "Ringan", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  { value: "sedang" as const, label: "Sedang", color: "#F97316", bg: "rgba(249,115,22,0.15)" },
  { value: "berat"  as const, label: "Berat",  color: "#EF4444", bg: "rgba(239,68,68,0.15)"  },
];

const TIPE_OPTIONS = [
  { value: "streak",      label: "Streak",      color: "#F97316", bg: "rgba(249,115,22,0.15)", icon: <Flame size={14} color="#F97316"/> },
  { value: "coins",       label: "Coins",       color: "#ffe600", bg: "rgba(245,158,11,0.15)", icon: <Coins size={14} color="#ffe600"/> },
  { value: "tumbler",     label: "Tumbler",     color: "#10a8b9", bg: "rgba(16,185,129,0.15)", icon: <Milk size={14} color="#10a8b9"/> },
  { value: "pelanggaran", label: "Pelanggaran", color: "#EF4444", bg: "rgba(239,68,68,0.15)",  icon: <OctagonX size={14} color="#f54242"/> },
  { value: "transaksi",   label: "Transaksi",   color: "#179EFF", bg: "rgba(23,158,255,0.15)", icon: <ArrowRightLeft size={13} color="#179EFF" /> },
];

const PELANGGARAN_MODE_OPTIONS = [
  { value: "count" as const, label: "Berdasarkan Jumlah", hint: "Achievement unlock jika jumlah pelanggaran sama dengan target." },
  { value: "no_violation_days" as const, label: "Tanpa Pelanggaran", hint: "Achievement unlock jika siswa bebas pelanggaran selama X hari." },
];

const BADGE_COLORS = [
  { value: "blue",    color: "#179EFF", label: "Biru"    },
  { value: "green",   color: "#10b981", label: "Hijau"   },
  { value: "orange",  color: "#F97316", label: "Oranye"  },
  { value: "yellow",  color: "#F59E0B", label: "Kuning"  },
  { value: "purple",  color: "#A855F7", label: "Ungu"    },
  { value: "red",     color: "#EF4444", label: "Merah"   },
  { value: "gold",    color: "#EAB308", label: "Gold"    },
  { value: "diamond", color: "#67E8F9", label: "Diamond" },
];

const SCHOOL_KEYS = [
  { key: "nama_sekolah",  label: "Nama Sekolah",      icon: Building2, tipe: "text",     placeholder: "Contoh: SMA Negeri 1 Contoh" },
  { key: "npsn",          label: "NPSN",               icon: Hash,      tipe: "text",     placeholder: "Nomor Pokok Sekolah Nasional" },
  { key: "email_sekolah", label: "Email Resmi",        icon: Mail,      tipe: "text",     placeholder: "info@sekolah.sch.id" },
  { key: "nomor_hp",      label: "Nomor HP / Telepon", icon: Phone,     tipe: "text",     placeholder: "08xx-xxxx-xxxx" },
  { key: "alamat",        label: "Alamat Lengkap",     icon: MapPin,    tipe: "textarea", placeholder: "Jl. Pendidikan No. 1, Kota..." },
];

const POINTS_KEYS = ["coins_tumbler", "coins_streak_bonus"];

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  if (cur > last) return [];
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function parseIsoDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatIsoDate(date?: Date): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value?: string): string {
  const date = parseIsoDate(value);
  if (!date) return "Pilih tanggal";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isBeforeMin(date: Date, min?: string) {
  const minDate = parseIsoDate(min);
  if (!minDate) return false;
  return date < minDate;
}

function isAfterMax(date: Date, max?: string) {
  const maxDate = parseIsoDate(max);
  if (!maxDate) return false;
  return date > maxDate;
}

function DateField({
  value,
  onChange,
  min,
  max,
  placeholder = "Pilih tanggal",
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const selected = parseIsoDate(value);

  return (
    <Popover className="date-field-popover" style={style}>
      <PopoverButton className="form-input date-field-button">
        <span className={`date-field-value ${value ? "has-value" : ""}`}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarDays size={16} className="date-field-icon" />
      </PopoverButton>
      <PopoverPanel anchor="bottom start" className="date-field-panel">
        {({ close }) => (
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatIsoDate(date));
              close();
            }}
            disabled={(date) => isBeforeMin(date, min) || isAfterMax(date, max)}
          />
        )}
      </PopoverPanel>
    </Popover>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; type: ToastType; message: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3800);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const borderColors: Record<ToastType, string> = {
    success: "var(--green)",
    error:   "var(--red)",
    info:    "var(--primary)",
  };
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={17} />,
    error:   <XCircle size={17} />,
    info:    <Info size={17} />,
  };
  return (
    <div className="peng-toast-stack">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="peng-toast-item"
          style={{ borderLeftColor: borderColors[t.type], borderLeftWidth: 3, color: borderColors[t.type] }}
        >
          <span style={{ color: borderColors[t.type], flexShrink: 0 }}>{icons[t.type]}</span>
          <span style={{ color: "var(--text-main)" }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 26 }}>
          <div className="confirm-icon-box">
            <AlertTriangle size={20} style={{ color: "var(--red)" }} />
          </div>
          <div>
            <div className="confirm-title">Konfirmasi Hapus</div>
            <div className="confirm-message">{message}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancel}>Batal</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <Trash2 size={15} /> Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED UI HELPERS ────────────────────────────────────────────────────────
function LoadingCard() {
  return (
    <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, gap: 14 }}>
      <Loader2 size={26} className="spin" style={{ color: "var(--primary)" }} />
      <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Memuat data...</span>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <span className="empty-state-text">{message}</span>
    </div>
  );
}

function StatusBadge({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: onClick ? "pointer" : "default", padding: 0 }}>
      {active
        ? <span className="status-badge active"><CheckCircle2 size={11} /> Aktif</span>
        : <span className="status-badge inactive"><XCircle size={11} /> Nonaktif</span>
      }
    </button>
  );
}

function CardHeader({ color, icon: Icon, title, subtitle }: {
  color: string; icon: React.ElementType; title: string; subtitle?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: `${color}15`, border: `1px solid ${color}28`,
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        <Icon size={19} style={{ color }} />
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>{title}</h3>
        {subtitle && <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-faint)", marginTop: 2 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`toggle-switch ${value ? "on" : "off"}`}
    >
      <span className="toggle-knob" />
    </button>
  );
}

// ─── TAB: PENGATURAN UMUM ─────────────────────────────────────────────────────
function PengaturanUmumSection({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [settings, setSettings]         = useState<Pengaturan[]>([]);
  const [values, setValues]             = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);

  useEffect(() => {
    getAllPengaturan()
      .then((data) => {
        setSettings(data);
        const map: Record<string, string> = {};
        data.forEach((s) => (map[s.key] = s.value));
        setValues(map);
      })
      .catch((e) => toast.show(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, val: string) => setValues((p) => ({ ...p, [key]: val }));

  async function saveGroup(keys: string[], label: string, setSaving: (v: boolean) => void) {
    setSaving(true);
    try {
      await bulkUpdatePengaturan(
        keys.filter((k) => values[k] !== undefined).map((k) => ({ key: k, value: values[k] }))
      );
      toast.show(`${label} berhasil disimpan.`);
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  const schoolKeysList = SCHOOL_KEYS.map((s) => s.key);
  const pointsSettings = settings.filter((s) => POINTS_KEYS.includes(s.key));
  const otherSettings  = settings.filter((s) => !schoolKeysList.includes(s.key) && !POINTS_KEYS.includes(s.key));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Identitas Sekolah ── */}
      <div className="glass-card">
        <CardHeader color="#179EFF" icon={Building2} title="Identitas Sekolah" subtitle="Tampil di kop laporan & aplikasi" />
        <div className="form-grid-equal" style={{ marginBottom: 16 }}>
          {SCHOOL_KEYS.filter((f) => ["nama_sekolah", "npsn"].includes(f.key)).map((field) => (
            <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <field.icon size={13} style={{ color: "var(--text-faint)" }} /> {field.label}
              </label>
              <input
                className="form-input"
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
        <div className="form-grid-equal" style={{ marginBottom: 16 }}>
          {SCHOOL_KEYS.filter((f) => ["email_sekolah", "nomor_hp"].includes(f.key)).map((field) => (
            <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <field.icon size={13} style={{ color: "var(--text-faint)" }} /> {field.label}
              </label>
              <input
                className="form-input"
                type={field.key === "email_sekolah" ? "email" : "text"}
                value={values[field.key] ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
        {SCHOOL_KEYS.filter((f) => f.tipe === "textarea").map((field) => (
          <div key={field.key} className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <field.icon size={13} style={{ color: "var(--text-faint)" }} /> {field.label}
            </label>
            <textarea
              className="form-input"
              value={values[field.key] ?? ""}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              style={{ fontFamily: "inherit", resize: "vertical" }}
            />
          </div>
        ))}
        <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: 18 }}>
          <button className="btn btn-primary" onClick={() => saveGroup(schoolKeysList, "Identitas sekolah", setSavingSchool)} disabled={savingSchool}>
            {savingSchool ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Simpan Identitas
          </button>
        </div>
      </div>

      {/* ── Reward Poin ── */}
      {pointsSettings.length > 0 && (
        <div className="glass-card">
          <CardHeader color="#F59E0B" icon={Crown} title="Konfigurasi Reward Poin" subtitle="Jumlah koin yang diberikan per event" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginBottom: 24 }}>
            {pointsSettings.map((s) => (
              <div key={s.key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {s.label || s.key}
                  {s.deskripsi && (
                    <span title={s.deskripsi} style={{ marginLeft: 6, cursor: "help" }}>
                      <Info size={11} style={{ color: "var(--text-faint)", display: "inline", verticalAlign: "middle" }} />
                    </span>
                  )}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number" min={0}
                    className="form-input"
                    value={values[s.key] ?? ""}
                    onChange={(e) => set(s.key, e.target.value)}
                    style={{ color: "var(--amber)", fontWeight: 700, paddingRight: 52 }}
                  />
                  <span style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    color: "var(--text-faint)", fontSize: "0.74rem", pointerEvents: "none",
                  }}>coins</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: 18 }}>
            <button className="btn btn-primary" onClick={() => saveGroup(POINTS_KEYS, "Konfigurasi reward", setSavingPoints)} disabled={savingPoints}>
              {savingPoints ? <Loader2 size={16} className="spin" /> : <Zap size={16} />} Simpan Reward
            </button>
          </div>
        </div>
      )}

      {/* ── Pengaturan Lainnya ── */}
      {otherSettings.length > 0 && (
        <div className="glass-card">
          <CardHeader color="#A855F7" icon={Settings2} title="Pengaturan Lainnya" subtitle="Konfigurasi sistem tambahan" />
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Label</th>
                  <th style={{ minWidth: 200 }}>Nilai</th>
                  <th>Tipe</th>
                  <th>Terakhir Diubah</th>
                  <th style={{ textAlign: "center", width: 90 }}>Simpan</th>
                </tr>
              </thead>
              <tbody>
                {otherSettings.map((s) => (
                  <tr key={s.key}>
                    <td>
                      <code style={{
                        color: "var(--primary)", fontSize: "0.78rem",
                        background: "var(--surface-active)",
                        padding: "2px 8px", borderRadius: 6,
                        fontFamily: "var(--font-mono)",
                      }}>{s.key}</code>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{s.label || "—"}</td>
                    <td>
                      {s.tipe === "boolean"
                        ? <StatusBadge active={values[s.key] === "true"} onClick={() => set(s.key, values[s.key] === "true" ? "false" : "true")} />
                        : <input
                            type={s.tipe === "number" ? "number" : s.tipe === "date" ? "date" : "text"}
                            className="form-input"
                            value={values[s.key] ?? ""}
                            onChange={(e) => set(s.key, e.target.value)}
                            style={s.tipe === "number" ? { color: "var(--amber)", fontWeight: 700 } : {}}
                          />
                      }
                    </td>
                    <td>
                      <span className="cell-pill" style={{ fontSize: "0.72rem" }}>{s.tipe}</span>
                    </td>
                    <td className="cell-mono" style={{ fontSize: "0.78rem" }}>
                      {s.updated_at
                        ? new Date(s.updated_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                        onClick={() => saveGroup([s.key], `Setting "${s.label || s.key}"`, setSavingSchool)}
                      >
                        <Save size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB: HARI LIBUR ──────────────────────────────────────────────────────────
function HariLiburSection({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [list, setList]             = useState<TanggalLibur[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editData, setEditData]     = useState({ tanggal: "", keterangan: "" });
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [addMode, setAddMode]       = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState("");
  const [singleDesc, setSingleDesc] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd]     = useState("");
  const [rangeDesc, setRangeDesc]   = useState("");
  const rangePreview = rangeStart && rangeEnd ? generateDateRange(rangeStart, rangeEnd) : [];

  const load = useCallback(async () => {
    try { setList(await getAllLibur()); }
    catch (e: any) { toast.show(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = list.filter((h) =>
    filterStatus === "all" ? true : filterStatus === "active" ? h.is_active : !h.is_active
  );

  async function handleAddSingle() {
    if (!singleDate) return toast.show("Pilih tanggal terlebih dahulu.", "error");
    if (!singleDesc.trim()) return toast.show("Keterangan tidak boleh kosong.", "error");
    setSaving(true);
    try {
      const created = await createLibur({ tanggal: singleDate, keterangan: singleDesc.trim() });
      setList((p) => [...p, created].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()));
      setSingleDate(""); setSingleDesc("");
      toast.show("Hari libur berhasil ditambahkan.");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function handleAddRange() {
    if (!rangeStart || !rangeEnd) return toast.show("Pilih tanggal mulai dan selesai.", "error");
    if (!rangeDesc.trim()) return toast.show("Keterangan tidak boleh kosong.", "error");
    if (rangePreview.length === 0) return toast.show("Tanggal mulai harus sebelum tanggal selesai.", "error");
    if (rangePreview.length > 60) return toast.show("Maksimal 60 hari sekaligus.", "error");
    const existing = new Set(list.map((h) => h.tanggal));
    const toAdd = rangePreview.filter((d) => !existing.has(d));
    if (toAdd.length === 0) return toast.show("Semua tanggal sudah terdaftar.", "info");
    setSaving(true);
    try {
      const results = await Promise.allSettled(toAdd.map((tanggal) => createLibur({ tanggal, keterangan: rangeDesc.trim() })));
      const created = results.filter((r): r is PromiseFulfilledResult<TanggalLibur> => r.status === "fulfilled").map((r) => r.value);
      const failed  = results.filter((r) => r.status === "rejected").length;
      setList((p) => [...p, ...created].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()));
      setRangeStart(""); setRangeEnd(""); setRangeDesc("");
      toast.show(failed > 0 ? `${created.length} ditambahkan, ${failed} gagal.` : `${created.length} hari libur ditambahkan.`);
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function handleToggle(id: number) {
    try {
      const u = await toggleLiburActive(id);
      setList((p) => p.map((h) => (h.id === id ? u : h)));
    } catch (e: any) { toast.show(e.message, "error"); }
  }

  async function handleDelete(id: number) {
    try {
      await deleteLibur(id);
      setList((p) => p.filter((h) => h.id !== id));
      toast.show("Hari libur dihapus.");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setConfirmDel(null); }
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const u = await updateLibur(editingId, editData);
      setList((p) => p.map((h) => (h.id === editingId ? u : h)).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()));
      setEditingId(null);
      toast.show("Hari libur diperbarui.");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingCard />;

  const stats = {
    total:    list.length,
    active:   list.filter((h) => h.is_active).length,
    upcoming: list.filter((h) => new Date(h.tanggal) >= new Date()).length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Stats */}
      <div className="peng-stat-grid cols-3">
        {[
          { label: "Total Libur",  value: stats.total,    color: "var(--primary)" },
          { label: "Aktif",        value: stats.active,   color: "var(--green)"   },
          { label: "Mendatang",    value: stats.upcoming, color: "var(--amber)"   },
        ].map((s) => (
          <div key={s.label} className="peng-stat-chip">
            <div className="peng-stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="peng-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card">
        {/* Header + filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <CardHeader color="#F59E0B" icon={CalendarDays} title="Daftar Hari Libur" subtitle={`${filtered.length} entri ditampilkan`} />
          <div className="filter-pill-group">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`filter-pill ${filterStatus === f ? "amber active" : ""}`}
              >
                {{ all: "Semua", active: "Aktif", inactive: "Nonaktif" }[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Form tambah */}
        <div style={{
          background: "var(--surface-2)", border: "1px solid var(--border-glass)",
          borderRadius: 14, padding: 18, marginBottom: 22,
        }}>
          <div className="mode-toggle-group">
            <button
              onClick={() => setAddMode("single")}
              className={`mode-toggle-btn ${addMode === "single" ? "active" : ""}`}
            >
              <CalendarDays size={14} /> Tanggal Tunggal
            </button>
            <button
              onClick={() => setAddMode("range")}
              className={`mode-toggle-btn ${addMode === "range" ? "active" : ""}`}
            >
              <Plus size={14} /> Rentang Tanggal
            </button>
          </div>

          {addMode === "single" && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: "0 0 170px", marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Tanggal</label>
                <DateField value={singleDate} onChange={setSingleDate} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Keterangan</label>
                <input
                  type="text" className="form-input"
                  placeholder="Contoh: Hari Raya Idul Fitri"
                  value={singleDesc} onChange={(e) => setSingleDesc(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSingle()}
                />
              </div>
              <button className="btn btn-primary" onClick={handleAddSingle} disabled={saving} style={{ whiteSpace: "nowrap" }}>
                {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Tambah
              </button>
            </div>
          )}

          {addMode === "range" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="form-group" style={{ flex: "0 0 170px", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Tanggal Mulai</label>
                  <DateField value={rangeStart} onChange={setRangeStart} />
                </div>
                <div style={{ paddingBottom: 10, color: "var(--text-faint)", fontSize: "1.1rem" }}>→</div>
                <div className="form-group" style={{ flex: "0 0 170px", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Tanggal Selesai</label>
                  <DateField value={rangeEnd} min={rangeStart} onChange={setRangeEnd} />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Keterangan</label>
                  <input type="text" className="form-input" placeholder="Contoh: Libur Semester Ganjil" value={rangeDesc} onChange={(e) => setRangeDesc(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={handleAddRange} disabled={saving || rangePreview.length === 0} style={{ whiteSpace: "nowrap" }}>
                  {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
                  {rangePreview.length > 0 ? ` Tambah ${rangePreview.length} Hari` : " Tambah"}
                </button>
              </div>

              {rangePreview.length > 0 && (
                <div className="range-preview-strip">
                  <div className="range-preview-title">Preview — {rangePreview.length} hari:</div>
                  <div className="range-preview-tags">
                    {rangePreview.map((d) => {
                      const date = new Date(d + "T00:00:00");
                      const exists = list.some((h) => h.tanggal === d);
                      return (
                        <span key={d} className={`range-tag ${exists ? "exists" : "new"}`}>
                          {date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{" "}
                          <span style={{ opacity: 0.55 }}>{date.toLocaleDateString("id-ID", { weekday: "short" })}</span>
                          {exists && " ✕"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabel */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Hari</th>
                <th>Keterangan</th>
                <th style={{ textAlign: "center", width: 105 }}>Status</th>
                <th style={{ textAlign: "center", width: 120 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon={<CalendarDays size={32} strokeWidth={1} />} message="Tidak ada data hari libur." /></td></tr>
              ) : filtered.map((h) => {
                const d = new Date(h.tanggal + "T00:00:00");
                const isPast = d < new Date();
                const isEditing = editingId === h.id;
                return (
                  <tr key={h.id} style={{ opacity: isPast && !isEditing ? 0.5 : 1 }}>
                    <td style={{ fontWeight: 600 }}>
                      {isEditing
                        ? <DateField value={editData.tanggal} onChange={(value) => setEditData((p) => ({ ...p, tanggal: value }))} style={{ width: 165 }} />
                        : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>
                      {d.toLocaleDateString("id-ID", { weekday: "long" })}
                    </td>
                    <td>
                      {isEditing
                        ? <input type="text" className="form-input" value={editData.keterangan} onChange={(e) => setEditData((p) => ({ ...p, keterangan: e.target.value }))} />
                        : h.keterangan}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <StatusBadge active={h.is_active} onClick={() => handleToggle(h.id)} />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={saveEdit} disabled={saving} className="act-btn act-green">
                            {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => setEditingId(null)} className="act-btn act-gray"><X size={14} /></button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => { setEditingId(h.id); setEditData({ tanggal: h.tanggal, keterangan: h.keterangan }); }} className="act-btn act-blue">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => setConfirmDel(h.id)} className="act-btn act-red"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDel !== null && (
        <ConfirmDialog
          message="Hari libur ini akan dihapus permanen dari database."
          onConfirm={() => handleDelete(confirmDel!)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

// ─── TAB: JENIS PELANGGARAN ───────────────────────────────────────────────────
function JenisPelanggaranSection({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [list, setList]               = useState<JenisPelanggaran[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [confirmDel, setConfirmDel]   = useState<number | null>(null);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [editData, setEditData]       = useState<Partial<JenisPelanggaran>>({});
  const [filterKat, setFilterKat]     = useState("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm]       = useState(false);
  const blank = { nama: "", kategori: "ringan" as const, bobot_coins: 10, deskripsi: "", is_active: true };
  const [newForm, setNewForm]         = useState({ ...blank });

  const load = useCallback(async () => {
    try { setList(await getAllPelanggaran()); }
    catch (e: any) { toast.show(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = list.filter((p) => {
    if (filterKat !== "all" && p.kategori !== filterKat) return false;
    if (filterActive === "active"   && !p.is_active) return false;
    if (filterActive === "inactive" &&  p.is_active) return false;
    return true;
  });

  const katStyle = (k: string) => KATEGORI_OPTIONS.find((o) => o.value === k) ?? KATEGORI_OPTIONS[0];

  async function handleCreate() {
    if (!newForm.nama.trim()) return toast.show("Nama pelanggaran wajib diisi.", "error");
    if (newForm.bobot_coins <= 0) return toast.show("Bobot coins harus > 0.", "error");
    setSaving(true);
    try {
      const created = await createPelanggaran(newForm);
      setList((p) => [...p, created]);
      setNewForm({ ...blank }); setShowForm(false);
      toast.show("Jenis pelanggaran berhasil ditambahkan.");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function handleToggle(id: number) {
    try { const u = await togglePelanggaranActive(id); setList((p) => p.map((v) => (v.id === id ? u : v))); }
    catch (e: any) { toast.show(e.message, "error"); }
  }

  async function handleDelete(id: number) {
    try { await deletePelanggaran(id); setList((p) => p.filter((v) => v.id !== id)); toast.show("Pelanggaran dihapus."); }
    catch (e: any) { toast.show(e.message, "error"); }
    finally { setConfirmDel(null); }
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const u = await updatePelanggaran(editingId, editData);
      setList((p) => p.map((v) => (v.id === editingId ? u : v)));
      setEditingId(null); toast.show("Pelanggaran diperbarui.");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingCard />;

  const stats = {
    ringan: list.filter((p) => p.kategori === "ringan").length,
    sedang: list.filter((p) => p.kategori === "sedang").length,
    berat:  list.filter((p) => p.kategori === "berat").length,
    active: list.filter((p) => p.is_active).length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      <div className="peng-stat-grid cols-4">
        {[
          { label: "Ringan", value: stats.ringan, color: "var(--amber)" },
          { label: "Sedang", value: stats.sedang, color: "#F97316"      },
          { label: "Berat",  value: stats.berat,  color: "var(--red)"   },
          { label: "Aktif",  value: stats.active, color: "var(--green)" },
        ].map((s) => (
          <div key={s.label} className="peng-stat-chip">
            <div className="peng-stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="peng-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <CardHeader color="#EF4444" icon={TriangleAlert} title="Jenis Pelanggaran & Sanksi" subtitle={`${filtered.length} jenis ditampilkan`} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Kategori filter */}
            <div className="filter-pill-group">
              {["all", "ringan", "sedang", "berat"].map((k) => {
                const o = katStyle(k);
                const colorKey = k === "ringan" ? "amber" : k === "sedang" ? "red" : k === "berat" ? "red" : "primary";
                return (
                  <button
                    key={k}
                    onClick={() => setFilterKat(k)}
                    className={`filter-pill ${filterKat === k ? `${colorKey} active` : ""}`}
                    style={filterKat === k && k !== "all" ? { color: o.color, borderColor: `${o.color}40`, background: o.bg } : {}}
                  >
                    {k === "all" ? "Semua" : k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                );
              })}
            </div>
            {/* Status filter */}
            <div className="filter-pill-group">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterActive(f)}
                  className={`filter-pill ${filterActive === f ? "red active" : ""}`}
                >
                  {{ all: "Semua", active: "Aktif", inactive: "Nonaktif" }[f]}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm((p) => !p)} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
              <Plus size={15} /> Tambah
            </button>
          </div>
        </div>

        {showForm && (
          <div className="peng-add-panel color-red">
            <div className="peng-add-panel-title" style={{ color: "var(--red)" }}>
              <TriangleAlert size={15} /> Tambah Jenis Pelanggaran Baru
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Nama Pelanggaran *</label>
                <input className="form-input" placeholder="Contoh: Tidak memakai seragam" value={newForm.nama} onChange={(e) => setNewForm((p) => ({ ...p, nama: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Kategori</label>
                <select className="form-input" value={newForm.kategori} onChange={(e) => setNewForm((p) => ({ ...p, kategori: e.target.value as any }))} style={{ appearance: "none", cursor: "pointer" }}>
                  {KATEGORI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Bobot Coins *</label>
                <input type="number" min={1} className="form-input" value={newForm.bobot_coins} onChange={(e) => setNewForm((p) => ({ ...p, bobot_coins: Number(e.target.value) }))} style={{ color: "var(--red)", fontWeight: 700 }} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: "0.78rem" }}>Deskripsi (opsional)</label>
              <input className="form-input" placeholder="Penjelasan singkat..." value={newForm.deskripsi} onChange={(e) => setNewForm((p) => ({ ...p, deskripsi: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setNewForm({ ...blank }); }}>Batal</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Simpan
              </button>
            </div>
          </div>
        )}

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nama Pelanggaran</th>
                <th style={{ width: 100 }}>Kategori</th>
                <th style={{ width: 120 }}>Bobot Coins</th>
                <th>Deskripsi</th>
                <th style={{ textAlign: "center", width: 105 }}>Status</th>
                <th style={{ textAlign: "center", width: 115 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={<ShieldCheck size={32} strokeWidth={1} />} message="Tidak ada data pelanggaran." /></td></tr>
              ) : filtered.map((p) => {
                const ks = katStyle(p.kategori);
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id}>
                    <td>
                      {isEditing
                        ? <input className="form-input" value={editData.nama ?? ""} onChange={(e) => setEditData((d) => ({ ...d, nama: e.target.value }))} />
                        : <span style={{ fontWeight: 600 }}>{p.nama}</span>}
                    </td>
                    <td>
                      {isEditing
                        ? <select className="form-input" value={editData.kategori} onChange={(e) => setEditData((d) => ({ ...d, kategori: e.target.value as any }))} style={{ appearance: "none", cursor: "pointer", padding: "8px 10px" }}>
                            {KATEGORI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: "0.74rem", fontWeight: 700, background: ks.bg, color: ks.color, textTransform: "capitalize" }}>
                            <Tag size={10} />{p.kategori}
                          </span>}
                    </td>
                    <td>
                      {isEditing
                        ? <input type="number" min={1} className="form-input" value={editData.bobot_coins ?? 10} onChange={(e) => setEditData((d) => ({ ...d, bobot_coins: Number(e.target.value) }))} style={{ color: "var(--red)", fontWeight: 700 }} />
                        : <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", fontWeight: 700 }}><Coins size={14} /> -{p.bobot_coins}</span>}
                    </td>
                    <td>
                      {isEditing
                        ? <input className="form-input" value={editData.deskripsi ?? ""} onChange={(e) => setEditData((d) => ({ ...d, deskripsi: e.target.value }))} />
                        : <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>{p.deskripsi || "—"}</span>}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <StatusBadge active={p.is_active} onClick={() => handleToggle(p.id)} />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={saveEdit} disabled={saving} className="act-btn act-green">
                            {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => setEditingId(null)} className="act-btn act-gray"><X size={14} /></button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => { setEditingId(p.id); setEditData({ nama: p.nama, kategori: p.kategori, bobot_coins: p.bobot_coins, deskripsi: p.deskripsi }); }} className="act-btn act-blue">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => setConfirmDel(p.id)} className="act-btn act-red"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDel !== null && (
        <ConfirmDialog
          message="Jenis pelanggaran ini akan dihapus permanen. Pastikan tidak ada riwayat transaksi yang menggunakannya."
          onConfirm={() => handleDelete(confirmDel!)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

// ─── TAB: ACHIEVEMENT ─────────────────────────────────────────────────────────
function AchievementSection({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [list, setList]               = useState<AchievementFull[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [confirmDel, setConfirmDel]   = useState<number | null>(null);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [editData, setEditData]       = useState<Partial<AchievementFull>>({});
  const [filterTipe, setFilterTipe]   = useState("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [showForm, setShowForm]       = useState(false);

  const blank: Omit<AchievementFull, "id" | "created_at"> = {
    nama: "", deskripsi: "", tipe: "streak", target_value: 10,
    icon: "🏆", badge_color: "blue", coins_reward: 0, is_active: true,
    voucher_reward: false, voucher_nominal: null, voucher_tipe_voucher: null,
    pelanggaran_mode: null, pelanggaran_period_days: null,
  };
  const [newForm, setNewForm] = useState({ ...blank });

  const load = useCallback(async () => {
    try { setList(await getAllAchievement() as AchievementFull[]); }
    catch (e: any) { toast.show(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = list.filter((a) => {
    if (filterTipe !== "all" && a.tipe !== filterTipe) return false;
    if (filterActive === "active"   && !a.is_active) return false;
    if (filterActive === "inactive" &&  a.is_active) return false;
    return true;
  });

  const getTipeStyle  = (tipe: string) => TIPE_OPTIONS.find((o) => o.value === tipe) ?? TIPE_OPTIONS[0];
  const getBadgeColor = (color: string) => BADGE_COLORS.find((c) => c.value === color)?.color ?? "#179EFF";
  const formatTargetLabel = (item: Pick<AchievementFull, "tipe" | "target_value" | "pelanggaran_mode" | "pelanggaran_period_days">) => {
    if (item.tipe === "pelanggaran" && item.pelanggaran_mode === "no_violation_days") {
      return `Tanpa pelanggaran ${item.pelanggaran_period_days ?? 0} hari`;
    }
    return `Target: ${item.target_value}`;
  };
  const isNewFormNoViolation = newForm.tipe === "pelanggaran" && newForm.pelanggaran_mode === "no_violation_days";
  const isEditNoViolation = (editData.tipe ?? "") === "pelanggaran" && editData.pelanggaran_mode === "no_violation_days";

  async function handleCreate() {
    if (!newForm.nama.trim()) return toast.show("Nama achievement wajib diisi.", "error");
    if (newForm.voucher_reward && (!newForm.voucher_nominal || !newForm.voucher_tipe_voucher))
      return toast.show("Isi nominal dan tipe voucher.", "error");
    if (isNewFormNoViolation && (!newForm.pelanggaran_period_days || newForm.pelanggaran_period_days < 1)) {
      return toast.show("Isi durasi hari tanpa pelanggaran.", "error");
    }
    setSaving(true);
    try {
      const created = await createAchievement({
        ...newForm,
        target_value: isNewFormNoViolation ? 0 : newForm.target_value,
      }) as AchievementFull;
      setList((p) => [...p, created].sort((a, b) => a.tipe.localeCompare(b.tipe) || a.target_value - b.target_value));
      setNewForm({ ...blank }); setShowForm(false);
      toast.show("Achievement berhasil ditambahkan.");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function handleToggle(id: number) {
    try { const u = await toggleAchievementActive(id) as AchievementFull; setList((p) => p.map((a) => (a.id === id ? u : a))); }
    catch (e: any) { toast.show(e.message, "error"); }
  }

  async function handleDelete(id: number) {
    try { await deleteAchievement(id); setList((p) => p.filter((a) => a.id !== id)); toast.show("Achievement dihapus."); }
    catch (e: any) { toast.show(e.message, "error"); }
    finally { setConfirmDel(null); }
  }

  async function saveEdit() {
    if (!editingId) return;
    if (editData.voucher_reward && (!editData.voucher_nominal || !editData.voucher_tipe_voucher))
      return toast.show("Isi nominal dan tipe voucher.", "error");
    if (isEditNoViolation && (!editData.pelanggaran_period_days || editData.pelanggaran_period_days < 1)) {
      return toast.show("Isi durasi hari tanpa pelanggaran.", "error");
    }
    setSaving(true);
    try {
      const u = await updateAchievement(editingId, {
        ...editData,
        target_value: isEditNoViolation ? 0 : editData.target_value,
      }) as AchievementFull;
      setList((p) => p.map((a) => (a.id === editingId ? u : a)));
      setEditingId(null); toast.show("Achievement diperbarui.");
    } catch (e: any) { toast.show(e.message, "error"); }
    finally { setSaving(false); }
  }

  const fmtVoucher = (a: AchievementFull) =>
    a.voucher_tipe_voucher === "percentage"
      ? `${a.voucher_nominal}%`
      : `Rp ${(a.voucher_nominal ?? 0).toLocaleString("id-ID")}`;

  if (loading) return <LoadingCard />;

  const stats = {
    total:       list.length,
    active:      list.filter((a) => a.is_active).length,
    withVoucher: list.filter((a) => a.voucher_reward).length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Stats */}
      <div className="peng-stat-grid cols-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
        {[
          { label: "Total",       value: stats.total,       color: "var(--purple)" },
          { label: "Aktif",       value: stats.active,      color: "var(--green)"  },
          { label: "Ada Voucher", value: stats.withVoucher, color: "var(--primary)"},
        ].map((s) => (
          <div key={s.label} className="peng-stat-chip">
            <div className="peng-stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="peng-stat-lbl">{s.label}</div>
          </div>
        ))}
        {TIPE_OPTIONS.map((t) => (
          <div key={t.value} className="peng-stat-chip">
            <div className="peng-stat-num" style={{ color: t.color }}>{list.filter((a) => a.tipe === t.value).length}</div>
            <div className="peng-stat-lbl">{t.icon} {t.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card">
        {/* Header + filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <CardHeader color="#A855F7" icon={Trophy} title="Daftar Achievement" subtitle={`${filtered.length} achievement`} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="filter-pill-group">
              <button onClick={() => setFilterTipe("all")} className={`filter-pill ${filterTipe === "all" ? "purple active" : ""}`}>Semua</button>
              {TIPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFilterTipe(t.value)}
                  className={`filter-pill ${filterTipe === t.value ? "active" : ""}`}
                  style={filterTipe === t.value ? { color: t.color, borderColor: `${t.color}40`, background: t.bg } : {}}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <div className="filter-pill-group">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button key={f} onClick={() => setFilterActive(f)} className={`filter-pill ${filterActive === f ? "purple active" : ""}`}>
                  {{ all: "Semua", active: "Aktif", inactive: "Nonaktif" }[f]}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm((p) => !p)} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
              <Plus size={15} /> Tambah
            </button>
          </div>
        </div>

        {/* ─── FORM TAMBAH ─── */}
        {showForm && (
          <div className="peng-add-panel color-purple">
            <div className="peng-add-panel-title" style={{ color: "var(--purple)" }}>
              <Trophy size={15} /> Tambah Achievement Baru
            </div>

            {/* Baris 1: Nama + Icon + Badge */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 130px", gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Nama Achievement *</label>
                <input className="form-input" placeholder="Contoh: Streak Pemula 🔥" value={newForm.nama} onChange={(e) => setNewForm((p) => ({ ...p, nama: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Icon</label>
                <input className="form-input" value={newForm.icon ?? ""} onChange={(e) => setNewForm((p) => ({ ...p, icon: e.target.value }))} style={{ textAlign: "center", fontSize: "1.2rem" }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Warna Badge</label>
                <select
                  className="form-input"
                  value={newForm.badge_color ?? "blue"}
                  onChange={(e) => setNewForm((p) => ({ ...p, badge_color: e.target.value }))}
                  style={{ appearance: "none", cursor: "pointer", color: getBadgeColor(newForm.badge_color ?? "blue"), fontWeight: 700 }}
                >
                  {BADGE_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Baris 2: Tipe + Target + Coins */}
            <div className="role-grid-2" style={{ gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Tipe *</label>
                <select
                  className="form-input"
                  value={newForm.tipe}
                  onChange={(e) => setNewForm((p) => {
                    const nextTipe = e.target.value as any;
                    return {
                      ...p,
                      tipe: nextTipe,
                      pelanggaran_mode: nextTipe === "pelanggaran" ? (p.pelanggaran_mode ?? "count") : null,
                      pelanggaran_period_days: nextTipe === "pelanggaran" ? p.pelanggaran_period_days : null,
                      target_value: nextTipe === "pelanggaran" && p.pelanggaran_mode === "no_violation_days" ? 0 : p.target_value,
                    };
                  })}
                  style={{ appearance: "none", cursor: "pointer" }}
                >
                  {TIPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Target Value *</label>
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={isNewFormNoViolation ? 0 : newForm.target_value}
                  onChange={(e) => setNewForm((p) => ({ ...p, target_value: Number(e.target.value) }))}
                  disabled={isNewFormNoViolation}
                  style={{ color: "var(--primary)", fontWeight: 700, opacity: isNewFormNoViolation ? 0.7 : 1 }}
                />
              </div>
            </div>
            {newForm.tipe === "pelanggaran" && (
              <div className="role-grid-2" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Mode Pelanggaran</label>
                  <select
                    className="form-input"
                    value={newForm.pelanggaran_mode ?? "count"}
                    onChange={(e) => setNewForm((p) => {
                      const nextMode = e.target.value as "count" | "no_violation_days";
                      return {
                        ...p,
                        pelanggaran_mode: nextMode,
                        pelanggaran_period_days: nextMode === "no_violation_days" ? (p.pelanggaran_period_days ?? 30) : null,
                        target_value: nextMode === "no_violation_days" ? 0 : p.target_value || 0,
                      };
                    })}
                    style={{ appearance: "none", cursor: "pointer" }}
                  >
                    {PELANGGARAN_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-faint)", marginTop: 6 }}>
                    {PELANGGARAN_MODE_OPTIONS.find((option) => option.value === (newForm.pelanggaran_mode ?? "count"))?.hint}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>
                    {isNewFormNoViolation ? "Durasi Hari *" : "Target Pelanggaran *"}
                  </label>
                  {isNewFormNoViolation ? (
                    <input
                      type="number"
                      min={1}
                      className="form-input"
                      value={newForm.pelanggaran_period_days ?? 30}
                      onChange={(e) => setNewForm((p) => ({ ...p, pelanggaran_period_days: Number(e.target.value) }))}
                      style={{ color: "var(--primary)", fontWeight: 700 }}
                    />
                  ) : (
                    <div style={{ fontSize: "0.74rem", color: "var(--text-faint)", paddingTop: 10 }}>
                      Gunakan target di atas untuk jumlah pelanggaran, misalnya target `0` atau `3`.
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: "0.78rem" }}>Coins Reward</label>
              <input type="number" min={0} className="form-input" value={newForm.coins_reward} onChange={(e) => setNewForm((p) => ({ ...p, coins_reward: Number(e.target.value) }))} style={{ color: "var(--amber)", fontWeight: 700 }} />
            </div>

            {/* Deskripsi */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: "0.78rem" }}>Deskripsi (opsional)</label>
              <input className="form-input" placeholder="Contoh: Konsisten membawa tumbler 3 hari berturut-turut" value={newForm.deskripsi ?? ""} onChange={(e) => setNewForm((p) => ({ ...p, deskripsi: e.target.value }))} />
            </div>

            {/* Voucher toggle */}
            <div className={`voucher-toggle-box ${newForm.voucher_reward ? "on" : ""}`}>
              <div className="voucher-toggle-header" style={{ marginBottom: newForm.voucher_reward ? 16 : 0 }}>
                <div>
                  <div className="voucher-toggle-label">
                    <Ticket size={15} style={{ color: newForm.voucher_reward ? "var(--primary)" : "var(--text-faint)" }} />
                    <span style={{ color: newForm.voucher_reward ? "var(--primary)" : "var(--text-muted)" }}>Voucher Kantin Otomatis</span>
                  </div>
                  <div className="voucher-toggle-sub">Siswa otomatis dapat voucher kantin saat unlock achievement ini</div>
                </div>
                <ToggleSwitch value={newForm.voucher_reward} onChange={(v) => setNewForm((p) => ({ ...p, voucher_reward: v, voucher_nominal: null, voucher_tipe_voucher: null }))} />
              </div>
              {newForm.voucher_reward && (
                <div style={{ animation: "fadeUp 0.2s var(--ease)" }}>
                  <div className="form-grid-equal" style={{ gap: 12, marginBottom: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.78rem" }}>Nominal Voucher *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number" min={1} className="form-input"
                          placeholder={newForm.voucher_tipe_voucher === "percentage" ? "Contoh: 20" : "Contoh: 5000"}
                          value={newForm.voucher_nominal ?? ""}
                          onChange={(e) => setNewForm((p) => ({ ...p, voucher_nominal: e.target.value ? Number(e.target.value) : null }))}
                          style={{ color: "var(--primary)", fontWeight: 700, paddingRight: 44 }}
                        />
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontSize: "0.74rem", pointerEvents: "none" }}>
                          {newForm.voucher_tipe_voucher === "percentage" ? "%" : "Rp"}
                        </span>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.78rem" }}>Tipe Voucher *</label>
                      <select className="form-input" value={newForm.voucher_tipe_voucher ?? ""} onChange={(e) => setNewForm((p) => ({ ...p, voucher_tipe_voucher: e.target.value as any || null }))} style={{ appearance: "none", cursor: "pointer" }}>
                        <option value="">Pilih tipe...</option>
                        <option value="fixed">Fixed (Potongan Rp)</option>
                        <option value="percentage">Persentase (%)</option>
                      </select>
                    </div>
                  </div>
                  <div className="ach-code-hint">
                    ℹ️ Kode format <code className="ach-code">ACH-YYYYMMDD-XXXX</code> — berlaku <strong style={{ color: "var(--primary)" }}>90 hari</strong> sejak unlock. Hanya 1× per siswa.
                  </div>
                </div>
              )}
            </div>

            {/* Preview badge */}
            <div className="ach-preview-card" style={{ marginBottom: 18 }}>
              <div className="ach-preview-icon">{newForm.icon || "🏆"}</div>
              <div className="ach-preview-body">
                <div className="ach-preview-name" style={{ color: getBadgeColor(newForm.badge_color ?? "blue") }}>
                  {newForm.nama || "Nama Achievement"}
                </div>
                <div className="ach-preview-desc">{newForm.deskripsi || "Deskripsi achievement"}</div>
                <div className="ach-preview-tags">
                  <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10, background: getTipeStyle(newForm.tipe).bg, color: getTipeStyle(newForm.tipe).color, fontWeight: 600 }}>
                    {getTipeStyle(newForm.tipe).icon} {newForm.tipe}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--primary)" }}>
                    {formatTargetLabel({
                      tipe: newForm.tipe,
                      target_value: isNewFormNoViolation ? 0 : newForm.target_value,
                      pelanggaran_mode: newForm.pelanggaran_mode,
                      pelanggaran_period_days: newForm.pelanggaran_period_days,
                    })}
                  </span>
                  {newForm.coins_reward > 0 && (
                    <span style={{ fontSize: "0.72rem", color: "var(--amber)" }}>+{newForm.coins_reward} <HandCoins size={12} /></span>
                  )}
                  {newForm.voucher_reward && newForm.voucher_nominal && (
                    <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10, background: "var(--surface-active)", color: "var(--primary)", fontWeight: 600 }}>
                      <Ticket size={11} /> {newForm.voucher_tipe_voucher === "percentage" ? `${newForm.voucher_nominal}%` : `Rp ${newForm.voucher_nominal.toLocaleString("id-ID")}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setNewForm({ ...blank }); }}>Batal</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Simpan
              </button>
            </div>
          </div>
        )}

        {/* ─── TABEL ─── */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>Icon</th>
                <th>Nama &amp; Deskripsi</th>
                <th style={{ width: 115 }}>Tipe</th>
                <th style={{ width: 90 }}>Target</th>
                <th style={{ width: 105 }}>Coins</th>
                <th style={{ width: 150 }}>Voucher Kantin</th>
                <th style={{ textAlign: "center", width: 105 }}>Status</th>
                <th style={{ textAlign: "center", width: 115 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={<Trophy size={32} strokeWidth={1} />} message="Tidak ada achievement." /></td></tr>
              ) : filtered.map((a) => {
                const ts = getTipeStyle(a.tipe);
                const isEditing = editingId === a.id;
                return (
                  <tr key={a.id}>
                    {/* Icon */}
                    <td style={{ textAlign: "center", fontSize: "1.4rem" }}>
                      {isEditing
                        ? <input className="form-input" value={editData.icon ?? ""} onChange={(e) => setEditData((d) => ({ ...d, icon: e.target.value }))} style={{ width: 52, textAlign: "center", fontSize: "1.1rem", padding: "6px 4px" }} />
                        : a.icon || "🏆"}
                    </td>

                    {/* Nama + deskripsi */}
                    <td>
                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input className="form-input" value={editData.nama ?? ""} onChange={(e) => setEditData((d) => ({ ...d, nama: e.target.value }))} style={{ fontSize: "0.85rem" }} />
                          <input className="form-input" value={editData.deskripsi ?? ""} onChange={(e) => setEditData((d) => ({ ...d, deskripsi: e.target.value }))} placeholder="Deskripsi..." style={{ fontSize: "0.78rem", opacity: 0.8 }} />
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, color: getBadgeColor(a.badge_color ?? "blue") }}>{a.nama}</div>
                          {a.deskripsi && <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: 2 }}>{a.deskripsi}</div>}
                        </div>
                      )}
                    </td>

                    {/* Tipe */}
                    <td>
                      {isEditing
                        ? <select
                            className="form-input"
                            value={editData.tipe}
                            onChange={(e) => setEditData((d) => {
                              const nextTipe = e.target.value as any;
                              return {
                                ...d,
                                tipe: nextTipe,
                                pelanggaran_mode: nextTipe === "pelanggaran" ? (d.pelanggaran_mode ?? "count") : null,
                                pelanggaran_period_days: nextTipe === "pelanggaran" ? (d.pelanggaran_period_days ?? null) : null,
                                target_value:
                                  nextTipe === "pelanggaran" && d.pelanggaran_mode === "no_violation_days"
                                    ? 0
                                    : d.target_value,
                              };
                            })}
                            style={{ appearance: "none", cursor: "pointer", padding: "7px 10px", fontSize: "0.82rem" }}
                          >
                            {TIPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: "0.73rem", fontWeight: 700, background: ts.bg, color: ts.color }}>{ts.icon} {a.tipe}</span>}
                    </td>

                    {/* Target */}
                    <td>
                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input
                            type="number"
                            min={0}
                            className="form-input"
                            value={isEditNoViolation ? 0 : editData.target_value ?? 0}
                            onChange={(e) => setEditData((d) => ({ ...d, target_value: Number(e.target.value) }))}
                            disabled={isEditNoViolation}
                            style={{ color: "var(--primary)", fontWeight: 700, width: 90, opacity: isEditNoViolation ? 0.7 : 1 }}
                          />
                          {(editData.tipe ?? a.tipe) === "pelanggaran" && (
                            <>
                              <select
                                className="form-input"
                                value={editData.pelanggaran_mode ?? "count"}
                                onChange={(e) => setEditData((d) => {
                                  const nextMode = e.target.value as "count" | "no_violation_days";
                                  return {
                                    ...d,
                                    pelanggaran_mode: nextMode,
                                    pelanggaran_period_days: nextMode === "no_violation_days" ? (d.pelanggaran_period_days ?? 30) : null,
                                    target_value: nextMode === "no_violation_days" ? 0 : d.target_value,
                                  };
                                })}
                                style={{ appearance: "none", cursor: "pointer", fontSize: "0.78rem" }}
                              >
                                {PELANGGARAN_MODE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              {isEditNoViolation && (
                                <input
                                  type="number"
                                  min={1}
                                  className="form-input"
                                  value={editData.pelanggaran_period_days ?? 30}
                                  onChange={(e) => setEditData((d) => ({ ...d, pelanggaran_period_days: Number(e.target.value) }))}
                                  placeholder="Jumlah hari"
                                  style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }}
                                />
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.78rem" }}>
                          {formatTargetLabel(a)}
                        </span>
                      )}
                    </td>

                    {/* Coins reward */}
                    <td>
                      {isEditing
                        ? <input type="number" min={0} className="form-input" value={editData.coins_reward ?? 0} onChange={(e) => setEditData((d) => ({ ...d, coins_reward: Number(e.target.value) }))} style={{ color: "var(--amber)", fontWeight: 700, width: 90 }} />
                        : <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--amber)", fontWeight: 700 }}><HandCoins size={14} /> {a.coins_reward}</span>}
                    </td>

                    {/* Voucher kantin */}
                    <td>
                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ToggleSwitch value={editData.voucher_reward ?? false} onChange={(v) => setEditData((d) => ({ ...d, voucher_reward: v, voucher_nominal: null, voucher_tipe_voucher: null }))} />
                            <span style={{ fontSize: "0.74rem", color: editData.voucher_reward ? "var(--primary)" : "var(--text-faint)" }}>Aktifkan</span>
                          </div>
                          {editData.voucher_reward && (
                            <>
                              <input type="number" min={1} className="form-input" placeholder="Nominal" value={editData.voucher_nominal ?? ""} onChange={(e) => setEditData((d) => ({ ...d, voucher_nominal: e.target.value ? Number(e.target.value) : null }))} style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }} />
                              <select className="form-input" value={editData.voucher_tipe_voucher ?? ""} onChange={(e) => setEditData((d) => ({ ...d, voucher_tipe_voucher: e.target.value as any || null }))} style={{ appearance: "none", cursor: "pointer", fontSize: "0.82rem" }}>
                                <option value="">Pilih tipe...</option>
                                <option value="fixed">Fixed (Rp)</option>
                                <option value="percentage">Persen (%)</option>
                              </select>
                            </>
                          )}
                        </div>
                      ) : a.voucher_reward && a.voucher_nominal ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: "0.73rem", fontWeight: 700, background: "var(--surface-active)", color: "var(--primary)", border: "1px solid var(--primary-glow)", width: "fit-content" }}>
                            <Ticket size={11} /> {fmtVoucher(a)}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", paddingLeft: 2 }}>
                            {a.voucher_tipe_voucher === "percentage" ? "Diskon persen" : "Potongan tetap"} · 90 hari
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-ghost)", fontSize: "0.78rem" }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: "center" }}>
                      <StatusBadge active={a.is_active} onClick={() => handleToggle(a.id)} />
                    </td>

                    {/* Aksi */}
                    <td style={{ textAlign: "center" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={saveEdit} disabled={saving} className="act-btn act-green">
                            {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => setEditingId(null)} className="act-btn act-gray"><X size={14} /></button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            onClick={() => {
                              setEditingId(a.id);
                              setEditData({
                                nama: a.nama, deskripsi: a.deskripsi, tipe: a.tipe,
                                target_value: a.target_value, icon: a.icon, badge_color: a.badge_color,
                                coins_reward: a.coins_reward, voucher_reward: a.voucher_reward ?? false,
                                voucher_nominal: a.voucher_nominal ?? null,
                                voucher_tipe_voucher: a.voucher_tipe_voucher ?? null,
                                pelanggaran_mode: a.pelanggaran_mode ?? (a.tipe === "pelanggaran" ? "count" : null),
                                pelanggaran_period_days: a.pelanggaran_period_days ?? null,
                              });
                            }}
                            className="act-btn act-blue"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => setConfirmDel(a.id)} className="act-btn act-red"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDel !== null && (
        <ConfirmDialog
          message="Achievement ini akan dihapus permanen. Data unlock siswa yang terkait tidak akan terhapus."
          onConfirm={() => handleDelete(confirmDel!)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const toast = useToast();

  return (
    <div className="peng-page">
      <ToastContainer toasts={toast.toasts} />

      {/* ─── TAB NAVIGATION ─── */}
      <div className="peng-tab-list">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`peng-tab-btn ${activeTab === t.key ? "active" : ""}`}
            style={{ "--tab-color": t.color } as React.CSSProperties}
          >
            <div className="peng-tab-icon">
              <t.icon size={16} style={{ color: activeTab === t.key ? t.color : "var(--text-muted)" }} />
            </div>
            <div className="peng-tab-text">
              <div className="peng-tab-label">{t.label}</div>
              <span className="peng-tab-desc">{t.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT ─── */}
      {activeTab === "general"     && <PengaturanUmumSection   toast={toast} />}
      {activeTab === "libur"       && <HariLiburSection        toast={toast} />}
      {activeTab === "pelanggaran" && <JenisPelanggaranSection toast={toast} />}
      {activeTab === "achievement" && <AchievementSection      toast={toast} />}
    </div>
  );
}
