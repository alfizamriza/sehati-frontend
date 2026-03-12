# SEHATI - Frontend Aplikasi Edukasi & Transaksi

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

Repositori ini berisi kode sumber untuk bagian antarmuka (*frontend*) dari aplikasi **SEHATI**, yang dikembangkan sebagai bagian dari Tugas Akhir / Skripsi. Aplikasi ini menggunakan arsitektur modern berbasis **Next.js (App Router)** dan dirancang untuk memfasilitasi kebutuhan integrasi sistem akademik dan transaksi di lingkungan sekolah.

## 👥 Hak Akses & Fitur Utama

Arsitektur aplikasi ini membagi fungsionalitas ke dalam empat peran (*role*) entitas utama, masing-masing dengan antarmuka yang disesuaikan secara spesifik:

1. **🧑‍💻 Admin**
   - Manajemen data inti ekosistem sekolah (Siswa, Guru, dll.)
   - Konfigurasi sistem, *monitoring*, dan pemantauan aktivitas (*Dashboard & Analytics*)
   - Manajemen validasi data secara terpusat.

2. **👨‍🏫 Guru**
   - Pemantauan metrik akademik siswa.
   - Interaksi dan manajemen evaluasi kelas.
   - Visibilitas terhadap riwayat serta prestasi dari siswa terkait.

3. **🏪 Kantin**
   - Manajemen produk, inventaris, dan etalase digital.
   - Konfirmasi transaksi, pencatatan pendapatan bayar, dan riwayat pesanan.
   - Pemindai kode QR (*QR Scanner*) terintegrasi untuk finalisasi transaksi siswa.

4. **🎓 Siswa**
   - Akses penuh terhadap *Leaderboard* akademik (*Kelas, Antar-Kelas, Jenjang, Sekolah*).
   - Penggunaan fasilitas integrasi transaksi kantin dan aktivasi kupon/voucher.
   - Pengelolaan dompet digital internal dan penelusuran riwayat aktivitas (*Activity Logs*).

## 🛠️ Teknologi Utama (*Tech Stack*)

Proyek ini dibangun menggunakan *library* JavaScript/TypeScript modern guna menjamin performa (*fast loading*), skalabilitas, serta tingkat *maintainability* yang tinggi:

- **Framework:** [Next.js](https://nextjs.org/) v16 (App Router)
- **Library UI:** [React](https://react.dev/) v19
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) v4 & [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **State Management & Data Fetching:** [React Query](https://tanstack.com/query/latest) & [Axios](https://axios-http.com/)
- **Autentikasi & BaaS:** [Supabase](https://supabase.com/)
- **Utilitas Tambahan Terintegrasi:** 
  - `recharts`: Untuk representasi visual dan grafik relasional pada Dashboard.
  - `jspdf` & `html2canvas`: Digunakan untuk keperluan ekspor dan *generate* laporan PDF.
  - `@yudiel/react-qr-scanner` & `qrcode`: Fungsionalitas konversi dan pemindaian *barcode*/QR Code.
  - `framer-motion` & `tw-animate-css`: Transisi dan *micro-animations* *user-interface*.

## 📂 Struktur Direktori Implementasi

Pendekatan rancang bangun menggunakan pemisahan *concern* (*separation of concerns*) berbasis peran (*Feature-sliced design* lokal):

```text
sehati-frontend/
├── app/                  # Routing spesifik berbasis App Router per entitas (admin/guru/kantin/siswa)
├── components/           # Reusable UI component (atomic folder & shadcn components)
├── lib/                  # Logika fungsional fundamental
│   ├── services/         # Layer pemanggilan API (dipisah per role/domain)
│   ├── hooks/            # Custom Hooks React untuk state reusability
│   └── middleware/       # Middleware, helper, utilitas lintas-fitur
├── types/                # Definisi deklarasi TypeScript yang digunakan secara global
├── public/               # Direktori aset-aset gambar, font lokal, icon (statis)
└── docs/                 # Dokumentasi arsitektur, flow diagram, dan best-practices
```

> **Untuk pedoman penamaan file (*naming conventions*) dan skema folder mendalam, silakan rujuk ke:** `docs/FRONTEND_STRUCTURE.md`

## 🚀 Prasyarat & Panduan Instalasi Lokal

Pastikan Anda memiliki **Node.js (LTS)** dan pengelola paket (`npm` atau `pnpm`) terpasang di sistem sebelum memulai.

1. **Instalasi Modul (*Dependencies*)**
   ```bash
   npm install
   ```

2. **Konfigurasi Variabel Lingkungan (*Environment Variables*)**
   Siapkan file `.env.local` di [*root* direktori] dengan menyesuaikan *endpoint* ke *backend server*:
   ```env
   # Contoh isi referensi (sesuaikan dengan URL instance backend)
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. **Inisialisasi Mode Pengembangan (*Development*)**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara otomatis di port *default* via `http://localhost:3000`.

4. **Produksi (*Production Build*)**
   ```bash
   npm run build
   npm run start
   ```

## 📝 Aturan Integrasi Service & Refactoring

Dalam rangka mempertahankan konsistensi arsitektur *codebase* selama proses penyusunan skripsi:

1. **Konvensi Impor Lapisan Service:**
   Bila ingin memanggil fungsionalitas logika API, *import* WAJIB dilakukan melalui *domain entry point* langsung (melalui indeks / *barrel pattern* apabila tersedia).

   - **Benar (✅)**
     ```typescript
     import { fetchRiwayat } from "@/lib/services/kantin";
     import { logout } from "@/lib/services/shared";
     ```
   - **Target Refactoring Selanjutnya:** Lakukan secara bertahap penghapusan impor skema statis file individual jika masih ditemukan.

2. **Stabilitas *Routing*:** Untuk refaktor skala besar, rutinitas modifikasi harus diupayakan agar tidak mengubah hierarki direktori utama (URL Routes) di `app/` guna menjaga integrasi referensi komponen yang ada.

---
*Kode sumber ini adalah bagian hak milik pengembangan dalam rangkaian tugas akhir institusi pendidikan (2026).*
