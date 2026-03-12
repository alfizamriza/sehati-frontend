"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, History, User } from "lucide-react";
import "@/app/siswa/siswa.css";
export default function BottomNavSiswa() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Beranda", href: "/siswa/dashboard", icon: LayoutDashboard },
    { name: "Leaderboard", href: "/siswa/leaderboard", icon: Trophy },
    { name: "Riwayat", href: "/siswa/riwayat", icon: History },
    { name: "Profil", href: "/siswa/profil", icon: User },
  ];

  return (
    <nav className="bottom-nav-container">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link 
            key={link.name} 
            href={link.href} 
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span>{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}