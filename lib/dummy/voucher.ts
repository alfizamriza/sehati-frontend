import type { Voucher, VoucherHistory } from "./types";

export const voucherDummy: Voucher[] = [
  {
    id: "1",
    icon: "🍜",
    name: "Voucher Diskon Kantin 5K",
    receiver: "Alfi Zamriza",
    dateLabel: "Berlaku: 15 Des 2025",
    code: "SEHATI-VDK5K-001",
    status: "available",
  },
  {
    id: "2",
    icon: "🎯",
    name: "Voucher Bebas Pelanggaran 1x",
    receiver: "Siti Aminah",
    dateLabel: "Ditukar: 02 Des 2025",
    code: "SEHATI-VBP1X-010",
    status: "redeemed",
  },
  {
    id: "3",
    icon: "🥤",
    name: "Voucher Minuman Gratis",
    receiver: "Budi Santoso",
    dateLabel: "Berlaku: 20 Des 2025",
    code: "SEHATI-VMG-023",
    status: "available",
  },
  {
    id: "4",
    icon: "🍱",
    name: "Voucher Paket Hemat",
    receiver: "Dewi Putri",
    dateLabel: "Berlaku: 18 Des 2025",
    code: "SEHATI-VPH-045",
    status: "available",
  },
  {
    id: "5",
    icon: "📚",
    name: "Voucher Diskon ATK",
    receiver: "Andi Wijaya",
    dateLabel: "Berlaku: 25 Des 2025",
    code: "SEHATI-ATK-011",
    status: "available",
  },
];

export const voucherHistoryDummy: VoucherHistory[] = [
  {
    id: "h1",
    date: "01-12-2025",
    time: "10:15",
    voucherName: "Voucher Diskon Kantin 5K",
    receiver: "Alfi Zamriza",
    code: "SEHATI-VDK5K-001",
    status: "success",
  },
  {
    id: "h2",
    date: "02-12-2025",
    time: "09:30",
    voucherName: "Voucher Bebas Pelanggaran 1x",
    receiver: "Siti Aminah",
    code: "SEHATI-VBP1X-010",
    status: "success",
  },
  {
    id: "h3",
    date: "03-12-2025",
    time: "11:05",
    voucherName: "Voucher Minuman Gratis",
    receiver: "Budi Santoso",
    code: "SEHATI-VMG-023",
    status: "pending",
  },
  {
    id: "h4",
    date: "04-12-2025",
    time: "14:20",
    voucherName: "Voucher Paket Hemat",
    receiver: "Dewi Putri",
    code: "SEHATI-VPH-045",
    status: "success",
  },
];






