"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import "./admin.css";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/admin/dashboard": { title: "Dashboard", subtitle: "Ringkasan data & aktivitas" },
  "/admin/siswa": { title: "Data Siswa", subtitle: "Kelola seluruh data siswa" },
  "/admin/guru": { title: "Data Guru", subtitle: "Kelola seluruh data guru" },
  "/admin/kantin": { title: "Mitra Kantin", subtitle: "Kelola mitra kantin sekolah" },
  "/admin/kelas": { title: "Manajemen Kelas", subtitle: "Atur kelas & rombongan belajar" },
  "/admin/leaderboard": { title: "Leaderboard", subtitle: "Peringkat siswa terbaik" },
  "/admin/voucher": { title: "Voucher & Poin", subtitle: "Kelola voucher dan poin siswa" },
  "/admin/analytics": { title: "Laporan & Analitik", subtitle: "Lihat laporan dan statistik" },
  "/admin/login-logs": { title: "Riwayat Login", subtitle: "Pantau aktivitas masuk pengguna sistem" },
  "/admin/pengaturan": { title: "Pengaturan", subtitle: "Konfigurasi sistem" },
};

function getPageMeta(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  for (const key of Object.keys(PAGE_META)) {
    if (pathname.startsWith(key)) return PAGE_META[key];
  }
  return { title: "Admin", subtitle: "Panel Admin Sehati" };
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { title, subtitle } = getPageMeta(pathname);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setMobileOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="admin-layout-container">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        {mobileOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="main-content-area">
          <Header title={title} subtitle={subtitle} onMenuClick={() => setMobileOpen(true)} />
          <main className="admin-content" key={pathname}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
