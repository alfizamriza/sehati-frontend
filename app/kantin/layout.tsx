"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function KantinLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["kantin"]}>{children}</ProtectedRoute>;
}
