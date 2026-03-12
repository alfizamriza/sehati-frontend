# Frontend Structure Guide

Dokumen ini menjadi acuan struktur folder `sehati-frontend` agar konsisten, scalable, dan mudah onboarding.

## Kondisi Saat Ini

- Routing sudah baik karena dipisah per role di `app/`:
  - `app/admin`
  - `app/guru`
  - `app/kantin`
  - `app/siswa`
- Service layer sudah dipisah dari UI (`lib/services`), tapi belum konsisten penamaan file dan pengelompokan domain.

## Standar Struktur yang Direkomendasikan

```text
sehati-frontend/
  app/                    # Route (Next.js App Router)
  components/             # Shared UI component lintas fitur
  lib/
    services/             # API/service layer
      admin/
      guru/
      kantin/
      siswa/
      shared/
    hooks/                # Reusable hooks
    middleware/           # Auth / guard / cross-cutting logic
  types/                  # Shared global types
  public/                 # Static assets
  docs/                   # Arsitektur, guideline, ADR
```

## Naming Convention

- Folder dan file: `kebab-case`
- React component: `PascalCase`
- Service function: `camelCase`
- Hindari nama file campur case seperti `Profil.service.ts` atau `Leaderboard.service.ts`
- Gunakan nama standar seperti `profil-siswa.service.ts`, `leaderboard-sekolah.service.ts`, `laporan-pelanggaran.service.ts`

Contoh:

- `riwayat-kantin.service.ts` (baik)
- `profil.service.ts` (baik)
- `leaderboard.service.ts` (baik)

## Service Layer Convention

- Setiap domain punya barrel file `index.ts`:
  - `lib/services/admin/index.ts`
  - `lib/services/guru/index.ts`
  - `lib/services/kantin/index.ts`
  - `lib/services/siswa/index.ts`
  - `lib/services/shared/index.ts`
- Page/component sebaiknya import dari barrel domain.

Contoh:

```ts
import { fetchRiwayat } from "@/lib/services/kantin";
import { logout } from "@/lib/services/shared";
```

## Migration Plan (Aman Bertahap)

1. Gunakan barrel per domain (sudah bisa dipakai sekarang).
2. Rapikan nama file service yang masih tidak konsisten (dengan file re-export sementara).
3. Pisahkan UI reusable berdasarkan domain jika ukurannya membesar:
   - `components/kantin/*`
   - `components/guru/*`
4. Tambahkan test untuk service kritikal (auth/transaksi/riwayat).

## Prinsip Utama

- Keep routes stable, refactor internals.
- Satu domain, satu pintu import.
- Hindari duplikasi style/component lintas role.
