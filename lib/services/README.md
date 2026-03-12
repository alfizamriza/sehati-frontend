# Service Layer

Folder ini berisi API/service function untuk frontend.

## Domain Entry Points

- `@/lib/services/admin`
- `@/lib/services/guru`
- `@/lib/services/kantin`
- `@/lib/services/siswa`
- `@/lib/services/shared`

Gunakan import dari domain entry point agar struktur konsisten dan mudah refactor.

Contoh:

```ts
import { getAllProduk } from "@/lib/services/kantin";
import { logout } from "@/lib/services/shared";
```
