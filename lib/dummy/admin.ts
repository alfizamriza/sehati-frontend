import type { AdminUser, AdminMenuItem } from "./types";

export const adminUser: AdminUser = {
  id: "admin-1",
  nama: "Alfi Zamriza",
  email: "admin@sehati.sch.id",
  role: "super_admin",
};

export const adminMenuItems: AdminMenuItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/admin/siswa", label: "Kelola Siswa", icon: "👥" },
  { href: "/admin/guru", label: "Kelola Guru", icon: "👨‍🏫" },
  { href: "/admin/kantin", label: "Kelola Kantin", icon: "🍽️" },
  { href: "/admin/kelas", label: "Kelola Kelas", icon: "🏫" },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/admin/voucher", label: "Kelola Voucher", icon: "🎟️" },
  { href: "/admin/analytics", label: "Analytics", icon: "📊" },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: "⚙️" },
];



