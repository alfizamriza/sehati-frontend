"use client";

import { useEffect } from "react";
import RouteErrorView from "@/components/common/RouteErrorView";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global route error:", error);
  }, [error]);

  return (
    <RouteErrorView
      title="Aplikasi Mengalami Gangguan"
      description="Terjadi kesalahan tak terduga. Silakan coba muat ulang halaman."
      onRetry={reset}
    />
  );
}
