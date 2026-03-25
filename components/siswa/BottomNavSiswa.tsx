import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  History,
  User,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { hasPermission } from "@/lib/services/auth.service";
import "@/app/siswa/siswa.css";

export default function BottomNavSiswa() {
  const pathname = usePathname();
  const canManageAbsensi = useSyncExternalStore(
    () => () => {},
    () => hasPermission("manage_absensi"),
    () => false,
  );
  const canManagePelanggaran = useSyncExternalStore(
    () => () => {},
    () => hasPermission("manage_pelanggaran"),
    () => false,
  );

  const navLinks = [
    { name: "Beranda", href: "/siswa/dashboard", icon: LayoutDashboard },
    { name: "Leaderboard", href: "/siswa/leaderboard", icon: Trophy },
    { name: "Riwayat", href: "/siswa/riwayat", icon: History },
    { name: "Profil", href: "/siswa/profil", icon: User },
  ];

  // Jika siswa OSIS, tambahkan menu Absensi secara dinamis
  if (canManageAbsensi) {
    navLinks.splice(2, 0, { name: "Absensi", href: "/siswa/absensi", icon: ClipboardList });
  }

  if (canManagePelanggaran) {
    navLinks.splice(3, 0, { name: "Pelanggaran", href: "/siswa/pelanggaran", icon: ShieldAlert });
  }

  return (
    <nav className="bottom-nav-container">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
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
