# SEHATI Frontend

Frontend aplikasi SEHATI berbasis Next.js (App Router) untuk role:

- Admin
- Guru
- Kantin
- Siswa

## Menjalankan Project

```bash
npm install
npm run dev
```

Akses: `http://localhost:3000`

## Struktur Utama

```text
app/                  # Route per role (admin/guru/kantin/siswa)
components/           # Reusable component lintas halaman
lib/
  services/           # API/service layer
  hooks/              # Reusable hooks
  middleware/         # Middleware/helper lintas fitur
types/                # Shared types
public/               # Static assets
docs/                 # Dokumentasi arsitektur
```

Detail struktur dan standar penamaan ada di:

- `docs/FRONTEND_STRUCTURE.md`

## Konvensi Service

Gunakan import service dari domain entry point:

- `@/lib/services/admin`
- `@/lib/services/guru`
- `@/lib/services/kantin`
- `@/lib/services/siswa`
- `@/lib/services/shared`

Contoh:

```ts
import { fetchRiwayat } from "@/lib/services/kantin";
import { logout } from "@/lib/services/shared";
```

## Catatan

- Untuk refactor besar, prioritaskan menjaga URL route tetap stabil.
- Lakukan migrasi bertahap dari import file langsung ke import domain entry point.
