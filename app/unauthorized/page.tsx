"use client";

import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "linear-gradient(160deg,#0b1220,#111827 45%,#1f2937)",
        color: "#fff",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          padding: "28px 24px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>
          ERROR 403
        </p>
        <h1 style={{ marginTop: 8, marginBottom: 10, fontSize: "1.6rem", lineHeight: 1.2 }}>
          Akses Ditolak
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
          Kamu tidak punya izin untuk membuka halaman ini. Masuk dengan akun role yang sesuai.
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
          <Link
            href="/auth"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              textDecoration: "none",
              color: "#0b1220",
              background: "#34d399",
              fontWeight: 700,
            }}
          >
            Kembali ke Login
          </Link>
          <Link
            href="/"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              textDecoration: "none",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            Ke Halaman Awal
          </Link>
        </div>
      </section>
    </main>
  );
}
