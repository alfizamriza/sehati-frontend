"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function UnauthorizedPage() {
  const router = useRouter();

  // Auto-logout: bersihkan sesi langsung saat halaman ini terbuka
  useEffect(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_id");

    // Clear cookies as well so middleware.ts also recognizes the logout
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  }, []);

  const handleReLogin = () => {
    router.push("/auth");
  };

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
          padding: "36px 28px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          textAlign: "center",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(248,113,113,0.15)",
          color: "#f87171",
          marginBottom: 16,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#f87171", letterSpacing: "0.1em", fontWeight: 700, margin: 0 }}>
          ERROR 403
        </p>
        <h1 style={{ marginTop: 8, marginBottom: 12, fontSize: "1.8rem", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
          Akses Ditolak
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, fontSize: "0.95rem" }}>
          Anda tidak memiliki izin (role) yang sesuai untuk mengakses halaman ini. Silakan login kembali dengan role yang tepat.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <button
            onClick={handleReLogin}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "none",
              color: "#0f172a",
              background: "#34d399",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <LogIn size={18} />
            Login Ulang
          </button>

          <Link
            href="/"
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              textDecoration: "none",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              fontWeight: 600,
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            <ArrowLeft size={18} />
            Halaman Awal
          </Link>
        </div>
      </section>
    </main>
  );
}
