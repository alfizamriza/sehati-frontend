"use client";

import { LogOut, UserRound, ChevronDown, Menu, X, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import "@/app/admin/admin.css";

// Import named exports langsung dari auth — BUKAN authService.logout()
import { logout, getUser } from "@/lib/services/shared";

interface HeaderProps {
  title: string;
  subtitle: string;
  onMenuClick: () => void;
}

export default function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [displayName, setDisplayName] = useState("Admin");

  // Ambil nama user setelah mount (hindari hydration mismatch)
  useEffect(() => {
    const user = getUser(); // ambil dari localStorage via named export
    if (user?.nama) setDisplayName(user.nama);
    else if (user?.username) setDisplayName(user.username);
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".profile-container")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const handleLogout = () => {
    setShowDropdown(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    // logout() dari auth.ts sudah handle:
    // 1. Hapus localStorage
    // 2. Hapus cookies
    // 3. Redirect ke /auth via window.location.href
    logout();
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        {/* Hamburger — selalu ada di DOM, CSS atur show/hide via @media */}
        <button
          type="button"
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Buka menu navigasi"
        >
          <Menu size={22} />
        </button>

        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        <div className="profile-container">
          <div
            className="user-profile-pill"
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown((p) => !p);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setShowDropdown((p) => !p)}
          >
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-role">Administrator</div>
            </div>
            <div className="avatar-box">
              <UserRound size={18} />
            </div>
            <ChevronDown
              size={14}
              className={`arrow ${showDropdown ? "rotate" : ""}`}
            />
          </div>

          {showLogoutModal && (
            <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 420 }}
              >
                <div className="modal-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(239,68,68,0.12)",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.18)",
                      }}
                    >
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h3 className="modal-title">Keluar dari Sesi Admin</h3>
                      <div style={{ fontSize: "0.88rem", color: "var(--text-sub)" }}>
                        Anda akan diarahkan kembali ke halaman login.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setShowLogoutModal(false)}
                    aria-label="Tutup dialog"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body">
                  <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7 }}>
                    Pastikan semua perubahan penting sudah tersimpan sebelum keluar dari dashboard admin.
                  </p>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowLogoutModal(false)}
                    disabled={isLoggingOut}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={confirmLogout}
                    disabled={isLoggingOut}
                    style={{
                      background: "linear-gradient(135deg,#ef4444,#dc2626)",
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    {isLoggingOut ? "Keluar..." : "Ya, Logout"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDropdown && (
            <div className="profile-dropdown">
              <div className="dropdown-user-info">
                <strong>{displayName}</strong>
                <span>Administrator</span>
              </div>
              <hr className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item logout"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut size={16} />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
