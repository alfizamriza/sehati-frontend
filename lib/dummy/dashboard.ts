import type { DashboardStat, LeaderboardItem, SummaryStat, DashboardData } from "./types";

export const dashboardStatsDummy: DashboardStat[] = [
  {
    label: "Total Siswa",
    value: 324,
    change: "+12 dari bulan lalu",
    icon: "👥",
    color: "blue",
  },
  {
    label: "Total Coins",
    value: "45,680",
    change: "+8.5% dari bulan lalu",
    icon: "🪙",
    color: "orange",
  },
  {
    label: "Kepatuhan",
    value: "87.3%",
    change: "+3.2% dari bulan lalu",
    icon: "✅",
    color: "green",
  },
  {
    label: "Pelanggaran",
    value: 42,
    change: "-15% dari bulan lalu",
    icon: "⚠️",
    color: "red",
  },
];

export const leaderboardDummy: LeaderboardItem[] = [
  { id: 1, nama: "Alfi Zamriza", kelas: "XII RPL 1", streak: 25, coins: 380, avatar: "👑" },
  { id: 2, nama: "Siti Aminah", kelas: "XII RPL 1", streak: 22, coins: 350, avatar: "🥈" },
  { id: 3, nama: "Budi Santoso", kelas: "XII TKJ 2", streak: 20, coins: 320, avatar: "🥉" },
  { id: 4, nama: "Dewi Putri", kelas: "XI RPL 2", streak: 18, coins: 300 },
  { id: 5, nama: "Andi Wijaya", kelas: "XI TKJ 1", streak: 16, coins: 285 },
];

export const summaryStatsDummy: SummaryStat[] = [
  { label: "Total Kelas", value: 12, color: "#667eea" },
  { label: "Guru Aktif", value: 24, color: "#43e97b" },
  { label: "Kantin Aktif", value: 3, color: "#fa709a" },
  { label: "Voucher Aktif", value: 15, color: "#4facfe" },
];

export const dashboardDataDummy: DashboardData = {
  dashboardStats: dashboardStatsDummy,
  leaderboardDummy,
  summaryStats: summaryStatsDummy,
};


