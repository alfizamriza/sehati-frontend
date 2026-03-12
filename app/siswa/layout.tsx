"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["siswa"]}>{children}</ProtectedRoute>;
}
