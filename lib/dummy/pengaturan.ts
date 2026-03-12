import type { Settings } from "./types";

export const defaultSettings: Settings = {
  schoolInfo: {
    schoolName: "Sekolah Sukma Bangsa Pidie",
    npsn: "10101234",
    address: "Jl. Pendidikan No. 123, Pidie, Aceh",
    email: "info@sukmabangsa-pidie.sch.id",
    phone: "0653-123456",
  },
  theme: "default",
  darkMode: true,
  points: {
    pointsTumbler: 50,
    bonusDaily: 5,
    bonusWeekly: 50,
    bonusMonthly: 200,
  },
  violations: [
    { name: "Tidak Membawa Tumbler", minus: 20, active: true },
    { name: "Membuang Sampah Sembarangan", minus: 30, active: true },
    { name: "Menggunakan Plastik Sekali Pakai", minus: 15, active: true },
  ],
  notifications: {
    notifAchievement: true,
    notifViolation: true,
    notifDailyReminder: true,
    notifWeeklyReport: true,
  },
  security: {
    twoFactor: false,
    sessionTimeout: 60,
    allowExport: true,
  },
  backup: {
    autoBackup: true,
    backupFreq: "weekly",
  },
};

