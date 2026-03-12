"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

export function LoadingState({
  message = "Memuat data...",
  minHeight = "60vh",
}: {
  message?: string;
  minHeight?: string;
}) {
  return (
    <div
      style={{
        minHeight,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        color: "rgba(255,255,255,0.78)",
        padding: "24px",
      }}
    >
      <div>
        <Loader2 size={34} style={{ marginBottom: 12, color: "#179EFF" }} />
        <p style={{ margin: 0, color: "rgba(255,255,255,0.55)" }}>{message}</p>
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kesalahan",
  message = "Data tidak bisa dimuat saat ini.",
  onRetry,
  compact = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: compact ? "auto" : "60vh",
        padding: compact ? "12px" : "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 14,
          padding: "16px 18px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "#FCA5A5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontWeight: 700 }}>
          <AlertTriangle size={16} /> {title}
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: 12,
              borderWidth: 0,
              borderStyle: "solid",
              borderColor: "transparent",
              background: "#EF4444",
              color: "#fff",
              borderRadius: 10,
              padding: "9px 12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  );
}
