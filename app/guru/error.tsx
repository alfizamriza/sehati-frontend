"use client";

import { useEffect } from "react";
import RouteErrorView from "@/components/common/RouteErrorView";

export default function RoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Role route error:", error);
  }, [error]);

  return (
    <RouteErrorView
      title="Halaman Tidak Dapat Dibuka"
      description="Terjadi kendala saat menampilkan halaman ini."
      onRetry={reset}
    />
  );
}
