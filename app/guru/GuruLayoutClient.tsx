"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import "./dashboard/dashboard.css";

export default function GuruLayoutClient({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["guru"]}>{children}</ProtectedRoute>;
}
