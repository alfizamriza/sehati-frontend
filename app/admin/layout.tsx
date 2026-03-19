// app/admin/layout.tsx
// JANGAN taruh <html> atau <body> di sini

"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import "./admin.css";

// Mapping pathname → title & subtitle
const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/admin/dashboard":   { title: "Dashboard",          subtitle: "Ringkasan data & aktivitas" },
  "/admin/siswa":       { title: "Data Siswa",          subtitle: "Kelola seluruh data siswa" },
  "/admin/guru":        { title: "Data Guru",           subtitle: "Kelola seluruh data guru" },
  "/admin/kantin":      { title: "Mitra Kantin",        subtitle: "Kelola mitra kantin sekolah" },
  "/admin/kelas":       { title: "Manajemen Kelas",     subtitle: "Atur kelas & rombongan belajar" },
  "/admin/leaderboard": { title: "Leaderboard",         subtitle: "Peringkat siswa terbaik" },
  "/admin/voucher":     { title: "Voucher & Poin",      subtitle: "Kelola voucher dan poin siswa" },
  "/admin/analytics":   { title: "Laporan & Analitik",  subtitle: "Lihat laporan dan statistik" },
  "/admin/login-logs":  { title: "Riwayat Login",       subtitle: "Pantau aktivitas masuk pengguna sistem" },
  "/admin/pengaturan":  { title: "Pengaturan",          subtitle: "Konfigurasi sistem" },
};

function getPageMeta(pathname: string) {
  // Exact match dulu
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Prefix match (untuk sub-route seperti /admin/siswa/detail/123)
  for (const key of Object.keys(PAGE_META)) {
    if (pathname.startsWith(key)) return PAGE_META[key];
  }
  return { title: "Admin", subtitle: "Panel Admin Sehati" };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { title, subtitle } = getPageMeta(pathname);

  // Tutup sidebar otomatis saat pindah halaman
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Tutup sidebar saat resize ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cegah body scroll saat sidebar mobile terbuka
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="admin-layout-container">
        {/* Sidebar — terima mobileOpen & onClose */}
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Overlay gelap saat sidebar mobile terbuka */}
        {mobileOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Area kanan: header + konten */}
        <div className="main-content-area">
          <Header
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setMobileOpen(true)}
          />
          <main className="admin-content">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
