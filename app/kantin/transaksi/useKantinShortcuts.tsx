"use client";

import { useEffect, useCallback } from "react";

/**
 * useKantinShortcuts
 *
 * Semua shortcut keyboard untuk kasir kantin.
 * Dipanggil sekali di TransaksiPage, menerima ref dan callback dari parent.
 *
 * Shortcut aktif:
 *  F2           → fokus input NIS
 *  F3           → buka scanner QR
 *  F8           → set uang = total (nominal pas) — hanya saat kalkulator terbuka
 *  F9           → bayar tunai (buka konfirmasi, metode tunai)
 *  F10          → bayar voucher (buka modal voucher)
 *  Enter        → konfirmasi bayar (hanya saat modal konfirmasi terbuka)
 *  Escape       → tutup modal aktif
 *  Ctrl+R       → reset / transaksi baru
 *  Ctrl+Del     → kosongkan keranjang
 *  Backspace    → hapus item terakhir dari keranjang
 *                 (hanya aktif saat input NIS tidak fokus)
 *  1-9          → tambah produk ke-N dari kategori aktif
 *                 (hanya aktif saat tidak ada modal terbuka & siswa sudah ter-scan)
 */

export interface ShortcutHandlers {
  // Ref
  nisInputRef: React.RefObject<HTMLInputElement | null>;

  // State yang dibutuhkan untuk guard
  hasSiswa: boolean;
  hasCart: boolean;
  isModalOpen: boolean;   // apakah modal apapun sedang terbuka
  isModalKonfirmasi: boolean;
  isModalTunai: boolean;   // kalkulator tunai sedang terbuka

  // Callbacks
  onOpenScanner: () => void;
  onOpenTunai: () => void;   // buka konfirmasi tunai
  onOpenVoucher: () => void;   // buka modal voucher
  onKonfirmasi: () => void;   // eksekusi bayar
  onCloseModal: () => void;   // tutup modal aktif
  onReset: () => void;   // reset semua
  onClearCart: () => void;   // kosongkan keranjang
  onRemoveLastItem: () => void;   // hapus item terakhir
  onSetUangPas: (total: number) => void; // set uang = total
  totalBayar: number;

  // Produk di kategori aktif — untuk shortcut 1-9
  produkAktif: Array<{ id: number; stok: number }>;
  onAddProduk: (id: number) => void;
}

export function useKantinShortcuts(handlers: ShortcutHandlers) {
  const {
    nisInputRef,
    hasSiswa, hasCart,
    isModalOpen, isModalKonfirmasi, isModalTunai,
    onOpenScanner, onOpenTunai, onOpenVoucher,
    onKonfirmasi, onCloseModal, onReset,
    onClearCart, onRemoveLastItem, onSetUangPas,
    totalBayar, produkAktif, onAddProduk,
  } = handlers;

  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    const inInput = tag === "input" || tag === "textarea" || tag === "select";

    // ── F2: fokus input NIS ──────────────────────────────
    if (e.key === "F2") {
      e.preventDefault();
      nisInputRef.current?.focus();
      nisInputRef.current?.select();
      return;
    }

    // ── F3: buka scanner ────────────────────────────────
    if (e.key === "F3") {
      e.preventDefault();
      if (!isModalOpen) onOpenScanner();
      return;
    }

    // ── Escape: tutup modal aktif ────────────────────────
    if (e.key === "Escape" && isModalOpen) {
      e.preventDefault();
      onCloseModal();
      return;
    }

    // ── Enter: konfirmasi bayar ──────────────────────────
    if (e.key === "Enter" && isModalKonfirmasi && !inInput) {
      e.preventDefault();
      onKonfirmasi();
      return;
    }

    // ── F8: uang pas (hanya saat kalkulator terbuka) ────
    if (e.key === "F8" && isModalTunai) {
      e.preventDefault();
      onSetUangPas(totalBayar);
      return;
    }

    // ── F9: bayar tunai ──────────────────────────────────
    if (e.key === "F9") {
      e.preventDefault();
      if (hasSiswa && hasCart && !isModalOpen) onOpenTunai();
      return;
    }

    // ── F10: bayar voucher ───────────────────────────────
    if (e.key === "F10") {
      e.preventDefault();
      if (hasSiswa && hasCart && !isModalOpen) onOpenVoucher();
      return;
    }

    // ── Ctrl+R: reset transaksi ──────────────────────────
    if (e.key === "r" && e.ctrlKey) {
      e.preventDefault();
      if (!isModalOpen) onReset();
      return;
    }

    // ── Ctrl+Delete: kosongkan keranjang ─────────────────
    if (e.key === "Delete" && e.ctrlKey) {
      e.preventDefault();
      if (!isModalOpen && hasCart) onClearCart();
      return;
    }

    // ── Backspace: hapus item terakhir ───────────────────
    // Hanya aktif saat TIDAK sedang focus di input dan tidak ada modal
    if (e.key === "Backspace" && !inInput && !isModalOpen && hasCart) {
      e.preventDefault();
      onRemoveLastItem();
      return;
    }

    // ── 1-9: tambah produk ke-N ──────────────────────────
    // Hanya aktif saat tidak ada modal terbuka, siswa ada, dan tidak sedang di input
    if (
      !isModalOpen && hasSiswa && !inInput &&
      e.key >= "1" && e.key <= "9"
    ) {
      const idx = parseInt(e.key) - 1;
      const produk = produkAktif[idx];
      if (produk && produk.stok > 0) {
        e.preventDefault();
        onAddProduk(produk.id);
        // Visual flash feedback di CSS via data-attr (opsional)
        const cards = document.querySelectorAll(".produk-card-item");
        const card = cards[idx] as HTMLElement | undefined;
        if (card) {
          card.classList.add("shortcut-flash");
          setTimeout(() => card.classList.remove("shortcut-flash"), 250);
        }
      }
      return;
    }

    // ── Numpad 1-5: nominal tunai cepat ──────────────────
    if (isModalTunai && e.code.startsWith("Numpad")) {
      const numpadMap: Record<string, number> = {
        Numpad1: 1_000,
        Numpad2: 5_000,
        Numpad3: 10_000,
        Numpad4: 50_000,
        Numpad5: 100_000,
      };
      const nominal = numpadMap[e.code];
      if (nominal !== undefined) {
        e.preventDefault();
        onSetUangPas(nominal);
      }
    }
  }, [
    nisInputRef, hasSiswa, hasCart, isModalOpen,
    isModalKonfirmasi, isModalTunai,
    onOpenScanner, onOpenTunai, onOpenVoucher,
    onKonfirmasi, onCloseModal, onReset,
    onClearCart, onRemoveLastItem, onSetUangPas,
    totalBayar, produkAktif, onAddProduk,
  ]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);
}

/**
 * ShortcutHintBar
 *
 * Bar kecil di bawah halaman yang menampilkan shortcut aktif saat ini.
 * Muncul/hilang sesuai konteks (ada siswa, ada keranjang, dll).
 */
export function ShortcutHintBar({
  hasSiswa, hasCart, isModalOpen,
}: {
  hasSiswa: boolean;
  hasCart: boolean;
  isModalOpen: boolean;
}) {
  if (isModalOpen) return null;

  return (
    <div className="shortcut-hint-bar">
      <span className="shortcut-hint-item">
        <kbd>F2</kbd> NIS
      </span>
      <span className="shortcut-hint-item">
        <kbd>F3</kbd> Scanner
      </span>
      {hasSiswa && hasCart && (
        <>
          <span className="shortcut-hint-sep">·</span>
          <span className="shortcut-hint-item">
            <kbd>F9</kbd> Tunai
          </span>
          <span className="shortcut-hint-item">
            <kbd>F10</kbd> Voucher
          </span>
          <span className="shortcut-hint-item">
            <kbd>Backspace</kbd> Hapus terakhir
          </span>
          <span className="shortcut-hint-item">
            <kbd>Ctrl</kbd>+<kbd>Del</kbd> Kosongkan
          </span>
        </>
      )}
      {hasSiswa && (
        <>
          <span className="shortcut-hint-sep">·</span>
          <span className="shortcut-hint-item">
            <kbd>1</kbd>–<kbd>9</kbd> Produk
          </span>
        </>
      )}
      <span className="shortcut-hint-sep">·</span>
      <span className="shortcut-hint-item">
        <kbd>Ctrl</kbd>+<kbd>R</kbd> Reset
      </span>
    </div>
  );
}
