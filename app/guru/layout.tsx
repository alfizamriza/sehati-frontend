"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import "./dashboard/dashboard.css";

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["guru"]}>{children}</ProtectedRoute>;
}
