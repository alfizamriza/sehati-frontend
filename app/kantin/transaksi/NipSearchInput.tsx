"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, Clock, X, Users, AlertCircle } from "lucide-react";
import SharedAvatar from "@/components/common/SharedAvatar";
// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface GuruSearchResult {
  nip: string; nama: string; peran: string; fotoUrl: string | null;
}
export type SearchStrategy = "local" | "remote";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (nip: string) => void;
  loading: boolean;
  disabled?: boolean;
  strategy?: SearchStrategy;
  listAllFn?: () => Promise<GuruSearchResult[]>;
  searchByNipFn?: (nip: string) => Promise<GuruSearchResult | null>;
}

// ─── CACHE ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000;
const CACHE_KEY = "sehati_guru_list";
let memCache: { data: GuruSearchResult[]; ts: number } | null = null;

function readCache(): GuruSearchResult[] | null {
  if (memCache && Date.now() - memCache.ts < CACHE_TTL) return memCache.data;
  try {
    const p = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null");
    if (p && Date.now() - p.ts < CACHE_TTL) { memCache = p; return p.data; }
  } catch { }
  return null;
}
function writeCache(data: GuruSearchResult[]) {
  memCache = { data, ts: Date.now() };
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(memCache)); } catch { }
}
export function clearGuruCache() {
  memCache = null;
  try { sessionStorage.removeItem(CACHE_KEY); } catch { }
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────

const HIST_KEY = "sehati_nip_history";
const MAX_HIST = 8;

function loadHistory(): GuruSearchResult[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) ?? "[]"); } catch { return []; }
}
export function saveToHistory(s: GuruSearchResult) {
  const next = [s, ...loadHistory().filter((x) => x.nip !== s.nip)].slice(0, MAX_HIST);
  localStorage.setItem(HIST_KEY, JSON.stringify(next));
}
export function clearNipHistory() { localStorage.removeItem(HIST_KEY); }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function Hi({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const i = norm(text).indexOf(norm(q));
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: "rgba(23,158,255,0.28)", color: "inherit", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function NipSearchInput({
  value, onChange, onSelect, loading, disabled,
  strategy = "local", listAllFn, searchByNipFn,
}: Props) {
  const [open, setOpen] = useState(false);
  const [allGuru, setAllGuru] = useState<GuruSearchResult[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [results, setResults] = useState<GuruSearchResult[]>([]);
  const [history, setHistory] = useState<GuruSearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [searching, setSearching] = useState(false);

  // Deteksi mode: angka → NIP, huruf → nama
  const isNipMode = !value || /^\d/.test(value);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  // Load semua guru sekali (strategy=local)
  useEffect(() => {
    if (strategy !== "local" || !listAllFn) return;
    const cached = readCache();
    if (cached) { setAllGuru(cached); return; }
    setLoadingAll(true);
    setLoadErr(null);
    listAllFn()
      .then((d) => {
        if (!Array.isArray(d)) throw new Error(`Bukan array: ${JSON.stringify(d).slice(0, 80)}`);
        setAllGuru(d);
        writeCache(d);
      })
      .catch((err) => {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message ?? err?.message ?? "Error tidak diketahui";
        console.error("[NipSearchInput]", status ? `HTTP ${status} —` : "", msg);
        setLoadErr(
          status === 404 ? "Endpoint /transaksi/guru/list belum ada di backend" :
            status === 401 || status === 403 ? "Tidak punya akses endpoint ini" :
              `Gagal memuat (${msg})`
        );
      })
      .finally(() => setLoadingAll(false));
  }, [retryCount]); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const searchLocal = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); return; }
    const nq = norm(q);
    setResults(
      allGuru.filter((s) => norm(s.nip).includes(nq) || norm(s.nama).includes(nq))
        .slice(0, 8),
    );
  }, [allGuru]);

  const searchRemote = useCallback(async (q: string) => {
    if (q.length < 3 || !searchByNipFn) { setResults([]); return; }
    setSearching(true);
    try { const r = await searchByNipFn(q); setResults(r ? [r] : []); }
    catch { setResults([]); }
    finally { setSearching(false); }
  }, [searchByNipFn]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    setActiveIdx(-1);
    setOpen(true);
    if (!v.trim()) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    if (strategy === "local") {
      searchLocal(v);
    } else {
      timer.current = setTimeout(() => searchRemote(v), 300);
    }
  }

  function handleSelect(s: GuruSearchResult) {
    onChange(s.nip);
    onSelect(s.nip);
    saveToHistory(s);
    setHistory(loadHistory());
    setOpen(false);
    setResults([]);
    setActiveIdx(-1);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, displayItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSelect(displayItems[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); setActiveIdx(-1); }
  }

  const displayItems = useMemo<GuruSearchResult[]>(() => {
    if (value.trim().length >= 2 && results.length > 0) return results;
    if (!value.trim()) return history;
    return [];
  }, [value, results, history]);

  const isSpinning = searching || (loadingAll && !allGuru.length);
  const showHistory = !value.trim() && history.length > 0;
  const showEmpty = value.trim().length >= 2 && !isSpinning && results.length === 0;
  const canNama = strategy === "local" && allGuru.length > 0;

  return (
    <div ref={dropRef} className="nis-root">

      {/* ── Input ── */}
      <div
        className="nis-input-wrap"
        style={{
          borderColor: open ? "rgba(23,158,255,.6)" : "var(--tr-border-input)",
          boxShadow: open ? "0 0 0 3px rgba(23,158,255,.10)" : "none",
        }}
      >
        <div className="nis-input-icon">
          {isSpinning || loading
            ? <div className="nis-spinner" />
            : <Search size={14} style={{ color: "var(--tr-text-dimmed)" }} />}
        </div>

        <input
          ref={inputRef}
          type="text"
          inputMode={isNipMode ? "numeric" : "text"}
          value={value}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={canNama ? "NIP atau nama guru..." : "Ketik NIP guru..."}
          disabled={disabled}
          autoComplete="off"
          autoFocus
          className="nis-input-field"
        />

        {canNama && !value && (
          <div className="nis-cap-badge">
            <Users size={9} /> NIP+Nama
          </div>
        )}

        {value && !isSpinning && (
          <button
            type="button"
            className="nis-clear-btn"
            onClick={() => { onChange(""); setResults([]); setOpen(false); inputRef.current?.focus(); }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {loadErr && (
        <div className="nis-load-err">
          <AlertCircle size={11} style={{ flexShrink: 0 }} />
          <span className="nis-err-text">{loadErr}</span>
          <button
            type="button"
            className="nis-retry-btn"
            onClick={() => { clearGuruCache(); setRetryCount((n) => n + 1); }}
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* ── Dropdown ── */}
      {open && (displayItems.length > 0 || showEmpty || isSpinning) && (
        <div className="nis-dropdown">

          {showHistory && (
            <div className="nis-drop-header">
              <span className="nis-drop-header-label">
                <Clock size={10} /> Terakhir dilayani
              </span>
              <button
                className="nis-drop-clear-btn"
                onClick={() => { clearNipHistory(); setHistory([]); setOpen(false); }}
              >
                Hapus
              </button>
            </div>
          )}
          {!showHistory && results.length > 0 && (
            <div className="nis-drop-header">
              <span className="nis-drop-header-label">
                <Search size={10} /> {results.length} ditemukan
              </span>
            </div>
          )}

          <div className="nis-drop-list">
            {isSpinning ? (
              <div className="nis-drop-loading">
                <div className="nis-spinner" /> Memuat...
              </div>
            ) : showEmpty ? (
              <div className="nis-drop-empty">Guru tidak ditemukan</div>
            ) : displayItems.map((s, i) => (
              <button
                key={s.nip}
                type="button"
                className={`nis-drop-item ${i === activeIdx ? "active" : ""}`}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <SharedAvatar size={40} className="w-full h-full" fotoUrl={s.fotoUrl} nama={s.nama} />
                <div className="nis-drop-item-info">
                  <div className="nis-drop-item-nama">
                    <Hi text={s.nama} q={value} />
                  </div>
                  <div className="nis-drop-item-meta">
                    <span className="nis-drop-item-nis">
                      <Hi text={s.nip} q={value} />
                    </span>
                    <span>{s.peran}</span>
                  </div>
                </div>
                {i === activeIdx && (
                  <span className="nis-drop-enter-hint">Enter ↵</span>
                )}
              </button>
            ))}
          </div>

          <div className="nis-drop-footer">
            <span>↑↓ navigasi</span>
            <span>Enter pilih</span>
            <span>Esc tutup</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}