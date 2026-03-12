import type { AnalyticsStat, TopStudent, ProgressClass, ActivityItem } from "./types";

export const analyticsStatsDummy: AnalyticsStat[] = [
  {
    key: "students",
    label: "Total Siswa Aktif",
    value: "324",
    icon: "👥",
    iconClass: "blue",
    changeText: "↑ +12 dari bulan lalu",
  },
  {
    key: "coins",
    label: "Coins Beredar",
    value: "45,680",
    icon: "🪙",
    iconClass: "orange",
    changeText: "↑ +8.5% dari bulan lalu",
  },
  {
    key: "compliance",
    label: "Tingkat Kepatuhan",
    value: "87.3%",
    icon: "✅",
    iconClass: "green",
    changeText: "↑ +3.2% dari bulan lalu",
  },
  {
    key: "violations",
    label: "Pelanggaran",
    value: "42",
    icon: "⚠️",
    iconClass: "red",
    changeText: "↓ -15% dari bulan lalu",
    negative: true,
  },
  {
    key: "transactions",
    label: "Transaksi Kantin",
    value: "1,247",
    icon: "💳",
    iconClass: "purple",
    changeText: "↑ +18% dari bulan lalu",
  },
  {
    key: "vouchers",
    label: "Voucher Terpakai",
    value: "124",
    icon: "🎟️",
    iconClass: "cyan",
    changeText: "↑ +22% dari bulan lalu",
  },
  {
    key: "streak",
    label: "Rata-rata Streak",
    value: "8.5",
    icon: "🔥",
    iconClass: "orange",
    changeText: "↑ +1.2 dari bulan lalu",
  },
  {
    key: "teachers",
    label: "Guru Aktif",
    value: "24",
    icon: "👨‍🏫",
    iconClass: "blue",
    changeText: "Semua aktif",
  },
];

export const topStudentsDummy: TopStudent[] = [
  {
    id: "t1",
    rank: 1,
    name: "Alfi Zamriza",
    meta: "XII RPL 1 • Streak: 28 hari",
    coins: 450,
  },
  {
    id: "t2",
    rank: 2,
    name: "Siti Aminah",
    meta: "XII RPL 1 • Streak: 25 hari",
    coins: 420,
  },
  {
    id: "t3",
    rank: 3,
    name: "Budi Santoso",
    meta: "XII RPL 1 • Streak: 22 hari",
    coins: 395,
  },
];

export const progressByClassDummy: ProgressClass[] = [
  { id: "c1", name: "XII RPL 1", value: 92, color: "blue" },
  { id: "c2", name: "XII RPL 2", value: 88, color: "green" },
  { id: "c3", name: "XI RPL 1", value: 85, color: "orange" },
  { id: "c4", name: "XI RPL 2", value: 82, color: "orange" },
  { id: "c5", name: "X RPL 1", value: 78, color: "red" },
];

export const activityDummy: ActivityItem[] = [
  {
    id: "a1",
    tone: "success",
    icon: "✅",
    text: "Alfi Zamriza mencapai streak 30 hari!",
    time: "2 menit yang lalu",
  },
  {
    id: "a2",
    tone: "info",
    icon: "📊",
    text: "XII RPL 1 mencapai kepatuhan 95% hari ini",
    time: "15 menit yang lalu",
  },
  {
    id: "a3",
    tone: "warning",
    icon: "🎟️",
    text: 'Voucher "Gratis Mie Ayam" telah digunakan 50 kali',
    time: "1 jam yang lalu",
  },
  {
    id: "a4",
    tone: "success",
    icon: "🏆",
    text: "Siti Aminah naik ke peringkat 2 leaderboard",
    time: "2 jam yang lalu",
  },
];






