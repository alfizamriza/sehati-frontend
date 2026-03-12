// ===== Admin Types =====
export interface AdminUser {
  id: string;
  nama: string;
  email: string;
  role: "super_admin" | "admin" | "operator";
}

export interface AdminMenuItem {
  href: string;
  label: string;
  icon: string;
}

// ===== Student Types =====
export interface Student {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
  coins: number;
  streak?: number;
  avatar?: string;
  status_aktif?: boolean; // Field Baru
}

// ===== Teacher Types =====
export interface Teacher {
  id: string;
  nama: string;
  nip: string;
  mapel: string;
  role: "wali_kelas" | "guru_mapel";
  kelasWali?: string;
  status_aktif?: boolean;
  password?: string;
}

// ===== Class Types =====
export interface KelasPeserta {
  nama: string;
  nis: string;
}

export interface Class {
  id: string;
  namaKelas: string;
  jenjang: "SD" | "SMP" | "SMA";
  tingkat: "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | "X" | "XI" | "XII";
  waliKelas: string;
  kapasitas: number;
  siswaAktif: number;
  peserta: KelasPeserta[];
}

// ===== Canteen Types =====
export interface Canteen {
  id: string;
  namaKantin: string;
  penanggungJawab: string;
  noHp: string;
  status: "Aktif" | "Nonaktif";
  password?: string;
  username?: string;
  status_aktif?: boolean;
}

// ===== Voucher Types =====
export type VoucherStatus = "available" | "redeemed" | "expired";

export interface Voucher {
  id: string;
  icon: string;
  name: string;
  receiver: string;
  dateLabel: string;
  code: string;
  status: VoucherStatus;
}

export interface VoucherHistory {
  id: string;
  date: string;
  time: string;
  voucherName: string;
  receiver: string;
  code: string;
  status: "success" | "pending";
}

// ===== Analytics Types =====
export type AnalyticsPeriod = "today" | "week" | "month" | "year" | "custom";

export interface AnalyticsStat {
  key:
    | "students"
    | "coins"
    | "compliance"
    | "violations"
    | "transactions"
    | "vouchers"
    | "streak"
    | "teachers";
  label: string;
  value: string;
  icon: string;
  iconClass: "blue" | "orange" | "green" | "red" | "purple" | "cyan";
  changeText: string;
  negative?: boolean;
}

export interface TopStudent {
  id: string;
  rank: 1 | 2 | 3;
  name: string;
  meta: string;
  coins: number;
}

export interface ProgressClass {
  id: string;
  name: string;
  value: number; // 0..100
  color: "blue" | "green" | "orange" | "red";
}

export interface ActivityItem {
  id: string;
  tone: "success" | "warning" | "info";
  icon: string;
  text: string;
  time: string;
}

export interface AnalyticsData {
  stats: AnalyticsStat[];
  topStudents: TopStudent[];
  progressByClass: ProgressClass[];
  activity: ActivityItem[];
}

// ===== Dashboard Types =====

export interface DashboardStat {
  label: string;
  value: string | number;
  change: string;
  icon: string;
  color: string;
}

export interface LeaderboardItem {
  id: number;
  nama: string;
  kelas: string;
  streak: number;
  coins: number;
  avatar?: string;
}

export interface SummaryStat {
  label: string;
  value: number;
  color?: string;
}

export interface DashboardData {
  dashboardStats: DashboardStat[];
  leaderboardDummy: LeaderboardItem[];
  summaryStats: SummaryStat[];
}

// ===== Settings Types =====
export type ThemeKey = "default" | "blue" | "green" | "yellow" | "deep" | "pink";

export interface SchoolInfo {
  schoolName: string;
  npsn: string;
  address: string;
  email: string;
  phone: string;
}

export interface PointsConfig {
  pointsTumbler: number;
  bonusDaily: number;
  bonusWeekly: number;
  bonusMonthly: number;
}

export interface ViolationRule {
  name: string;
  minus: number;
  active: boolean;
}

export interface NotificationSettings {
  notifAchievement: boolean;
  notifViolation: boolean;
  notifDailyReminder: boolean;
  notifWeeklyReport: boolean;
}

export interface SecuritySettings {
  twoFactor: boolean;
  sessionTimeout: number; // minutes
  allowExport: boolean;
}

export interface BackupSettings {
  autoBackup: boolean;
  backupFreq: "daily" | "weekly" | "monthly";
}

export interface Settings {
  schoolInfo: SchoolInfo;
  theme: ThemeKey;
  darkMode: boolean;
  points: PointsConfig;
  violations: ViolationRule[];
  notifications: NotificationSettings;
  security: SecuritySettings;
  backup: BackupSettings;
}
