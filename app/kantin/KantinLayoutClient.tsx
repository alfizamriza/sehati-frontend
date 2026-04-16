"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function KantinLayoutClient({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["kantin"]}>{children}</ProtectedRoute>;
}
