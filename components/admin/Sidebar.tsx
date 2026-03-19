"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  UserCog,
  Store,
  School,
  Crown,
  TicketPercent,
  BarChart2,
  History,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

const nav = [
  { href: "/admin/dashboard",   label: "Dashboard",          icon: <LayoutDashboard size={20} /> },
  { href: "/admin/siswa",       label: "Data Siswa",          icon: <GraduationCap size={20} /> },
  { href: "/admin/guru",        label: "Data Guru",           icon: <UserCog size={20} /> },
  { href: "/admin/kantin",      label: "Mitra Kantin",        icon: <Store size={20} /> },
  { href: "/admin/kelas",       label: "Manajemen Kelas",     icon: <School size={20} /> },
  { href: "/admin/leaderboard", label: "Leaderboard",         icon: <Crown size={20} /> },
  { href: "/admin/voucher",     label: "Voucher & Poin",      icon: <TicketPercent size={20} /> },
  { href: "/admin/analytics",   label: "Laporan & Analitik",  icon: <BarChart2 size={20} /> },
  { href: "/admin/login-logs",  label: "Riwayat Login",       icon: <History size={20} /> },
  { href: "/admin/pengaturan",  label: "Pengaturan",          icon: <Settings size={20} /> },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      onClose();
    }
  };

  const classes = [
    "sidebar",
    isExpanded ? "expanded" : "collapsed",
    mobileOpen ? "mobile-open" : "",
  ].filter(Boolean).join(" ");

  return (
    <aside className={classes}>
      <div className="logo-section">
        <div
          className="logo-icon-bg"
          onClick={() => setIsExpanded((p) => !p)}
          title="Toggle sidebar"
        >
          <BrandLogo size={28} alt="SEHATI Admin" priority />
        </div>

        {/* Selalu ada di DOM, CSS yang atur visibilitas */}
        <div className="logo-text">ADMIN SEHATI</div>

        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
      </div>

      <ul className="nav-menu">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          return (
            <li key={item.href} title={!isExpanded && !mobileOpen ? item.label : undefined}>
              <Link
                className={`nav-link ${isActive ? "active" : ""}`}
                href={item.href}
                onClick={handleLinkClick}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="toggle-btn"
        onClick={() => setIsExpanded((p) => !p)}
        aria-label="Toggle sidebar"
      >
        {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </aside>
  );
}
