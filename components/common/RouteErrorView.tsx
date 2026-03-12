"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RouteErrorView({
  title = "Halaman mengalami masalah",
  description = "Terjadi kesalahan saat memproses halaman ini.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "linear-gradient(160deg,#0b1220,#111827 45%,#1f2937)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 16,
          padding: "24px 22px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FCA5A5", marginBottom: 8 }}>
          <AlertTriangle size={18} />
          <strong>{title}</strong>
        </div>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{description}</p>
        <button
          onClick={onRetry}
          style={{
            marginTop: 14,
            borderWidth: 0,
            borderStyle: "solid",
            borderColor: "transparent",
            borderRadius: 10,
            padding: "10px 13px",
            background: "#179EFF",
            color: "#fff",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <RefreshCw size={14} />
          Coba Lagi
        </button>
      </section>
    </main>
  );
}
