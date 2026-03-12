import type { Class } from "./types";

export const kelasDummy: Class[] = [
    {
      id: "kelas-1",
      namaKelas: "XII RPL 1",
      jenjang: "SMA",
      tingkat: "XII",
      waliKelas: "Ibu Sari",
      kapasitas: 32,
      siswaAktif: 30,
      peserta: [
        { nama: "Alfi Zamriza", nis: "123456" },
        { nama: "Siti Aminah", nis: "123457" },
        { nama: "Budi Santoso", nis: "123458" },
      ],
    },
    {
      id: "kelas-2",
      namaKelas: "XI RPL 2",
      jenjang: "SMA",
      tingkat: "XI",
      waliKelas: "Pak Andi",
      kapasitas: 30,
      siswaAktif: 24,
      peserta: [
        { nama: "Budi Santoso", nis: "223456" },
        { nama: "Dewi Putri", nis: "223457" },
      ],
    },
    {
      id: "kelas-3",
      namaKelas: "X TKJ 1",
      jenjang: "SMA",
      tingkat: "X",
      waliKelas: "Ibu Dewi",
      kapasitas: 32,
      siswaAktif: 18,
      peserta: [{ nama: "Dewi Putri", nis: "323456" }],
    },
    {
      id: "kelas-4",
      namaKelas: "XI TKJ 1",
      jenjang: "SMA",
      tingkat: "XI",
      waliKelas: "Ibu Reni",
      kapasitas: 32,
      siswaAktif: 18,
      peserta: [{ nama: "Dewi Putri", nis: "323456" }],
    },
  ];
  
