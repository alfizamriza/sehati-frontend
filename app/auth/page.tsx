"use client";

import "./login.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield, User, Users, Recycle, GraduationCap, Store, TriangleAlert } from "lucide-react";
import { loginUser, type LoginRequest } from "@/lib/services/shared";
import { getAllPengaturan } from "@/lib/services/settings.service";
import { BackgroundLines } from "@/components/ui/background-lines";
import BrandLogo from "@/components/common/BrandLogo";

// --- KOMPONEN ROBOT LUCU (SVG Inline) ---
const CuteRobot = () => (
  <div className="robot-wrapper">
    <svg viewBox="0 0 200 160" className="robot-svg">
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#179EFF" />
          <stop offset="100%" stopColor="#0d69ab" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="bot-float">
        <ellipse cx="100" cy="150" rx="40" ry="6" fill="rgba(0,0,0,0.2)" className="bot-shadow" />

        {/* Tangan Kiri */}
        <path d="M60 100 Q 50 110 50 120" stroke="#179EFF" strokeWidth="8" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="120" r="6" fill="#fff" />

        {/* Kaki */}
        <path d="M85 130 L 85 145" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
        <path d="M115 130 L 115 145" stroke="#334155" strokeWidth="6" strokeLinecap="round" />

        {/* Badan */}
        <rect x="70" y="80" width="60" height="50" rx="15" fill="url(#bodyGrad)" filter="url(#glow)" />
        <rect x="85" y="95" width="30" height="20" rx="4" fill="#0a0e27" />
        <circle cx="92" cy="105" r="2" fill="#34d399" className="blink-led" />
        <circle cx="100" cy="105" r="2" fill="#34d399" className="blink-led" style={{ animationDelay: '0.2s' }} />
        <circle cx="108" cy="105" r="2" fill="#34d399" className="blink-led" style={{ animationDelay: '0.4s' }} />

        {/* Kepala */}
        <g className="bot-head">
          <rect x="65" y="35" width="70" height="45" rx="12" fill="#F0F8FF" />
          <path d="M65 47 L 135 47" stroke="#e2e8f0" strokeWidth="1" />
          <g className="bot-eyes">
            <circle cx="85" cy="55" r="5" fill="#0f172a" />
            <circle cx="115" cy="55" r="5" fill="#0f172a" />
            <circle cx="87" cy="53" r="1.5" fill="white" />
            <circle cx="117" cy="53" r="1.5" fill="white" />
          </g>
          <path d="M95 68 Q 100 71 105 68" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M100 35 L 100 20" stroke="#cbd5e1" strokeWidth="3" />
          <circle cx="100" cy="15" r="4" fill="#fbbf24" className="antenna-glow" />
        </g>

        {/* Tangan Kanan (Melambaikan) */}
        <g className="bot-arm-wave" style={{ transformOrigin: '140px 100px' }}>
          <path d="M130 100 Q 150 100 155 80" stroke="#179EFF" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="155" cy="80" r="7" fill="#fff" />
        </g>
      </g>
    </svg>
  </div>
);

const ROLES = [
  { id: "admin", label: "Admin", icon: Shield },
  { id: "guru", label: "Guru", icon: Users },
  { id: "kantin", label: "Kantin", icon: Store },
  { id: "siswa", label: "Siswa", icon: GraduationCap },
] as const;

type RoleId = (typeof ROLES)[number]["id"];

export default function LoginPage() {
  const router = useRouter();
  const defaultSchoolName = "Sekolah Sukma Bangsa Pidie";
  const [activeRole, setActiveRole] = useState<RoleId>("siswa");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState(defaultSchoolName);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;

    const loadSchoolName = async () => {
      try {
        const pengaturan = await getAllPengaturan();
        const configuredSchoolName = pengaturan.find((item) => item.key === "nama_sekolah")?.value?.trim();
        if (alive && configuredSchoolName) {
          setSchoolName(configuredSchoolName);
        }
      } catch {
        if (alive) {
          setSchoolName(defaultSchoolName);
        }
      }
    };

    loadSchoolName();
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loginRequest: LoginRequest = { role: activeRole, identifier, password };
      const response = await loginUser(loginRequest);

      if (response.success) {
        const savedToken = localStorage.getItem('auth_token');
        if (!savedToken) throw new Error('Token tidak tersimpan. Silakan coba lagi.');
        await new Promise(resolve => setTimeout(resolve, 100));
        router.push(response.data.redirectTo);
      } else {
        throw new Error(response.message || 'Login gagal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const ActiveIcon = useMemo(
    () => ROLES.find((r) => r.id === activeRole)?.icon ?? User,
    [activeRole]
  );

  const roleIndex = ROLES.findIndex((r) => r.id === activeRole);

  const ID_LABEL: Record<RoleId, string> = {
    siswa: "NIS", guru: "NIP", kantin: "Username", admin: "Username",
  };

  if (!mounted) {
    return (
      <main className="login-page">
        <div className="login-wrap">
          <div className="login-card" />
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <BackgroundLines className="login-bg-lines">{null}</BackgroundLines>
      <div className="login-wrap">
        <div className="login-card is-mounted">

          {/* LEFT SECTION */}
          <section className="login-left">
            <div className="decor" />

            <div className="brand-row">
              <BrandLogo size={35} alt="SEHATI" priority color="#1a90ff" aria-hidden />
              {/* <div className="brand-badge" aria-hidden>
                
              </div> */}
              <div className="brand-title">SEHATI</div>
            </div>

            <div className="hero">
              <CuteRobot />

              <div className="hero-content">
                <div className="hero-pill">
                  <Recycle size={14} />
                  <span>{schoolName}</span>
                </div>

                <h1>
                  HALO! <br />
                  <span className="grad">SIAP MENJAGA LINGKUNGAN?</span>
                </h1>

                <p>
                  Masuk ke ekosistem sekolah hijau.
                  Kelola sampah, transaksi kantin, dan prestasi
                  dalam satu sentuhan.
                </p>
              </div>
            </div>
          </section>

          {/* RIGHT SECTION (Form) */}
          <section className="login-right">
            <div className="login-inner">
              <div className="mobile-brand">
                <BrandLogo size={35} alt="SEHATI" aria-hidden />
                {/* <div className="mobile-badge" aria-hidden>
                  <BrandLogo size={35} alt="SEHATI" />
                </div> */}
                <strong>SEHATI</strong>
              </div>

              <div className="welcome">
                <h2>Selamat Datang</h2>
                <p>Silakan masuk sesuai peran Anda.</p>
              </div>

              <div className="role-tabs">
                <div
                  className="role-indicator"
                  style={{ transform: `translateX(${roleIndex * 100}%)` }}
                />
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const isActive = role.id === activeRole;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={`role-btn ${isActive ? "active" : ""}`}
                      onClick={() => { setActiveRole(role.id); setError(null); }}
                    >
                      <Icon size={16} />
                      {role.label}
                    </button>
                  );
                })}
              </div>

              <form className="form" onSubmit={handleSubmit}>
                {error && (
                  <div className="error-message" style={{
                    padding: '12px',
                    marginBottom: '16px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '8px',
                    fontSize: '14px',
                    border: '1px solid #fecaca'
                  }}>
                    <TriangleAlert size={16} fill="#991b1b" /> {error}
                  </div>
                )}

                <div className="field">
                  <label>{ID_LABEL[activeRole]}</label>
                  <div className="input-wrap">
                    <span className="input-icon" aria-hidden>
                      <ActiveIcon size={18} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={
                        activeRole === "siswa" ? "Contoh: 12345678"
                          : activeRole === "guru" ? "Contoh: 12345678"
                            : activeRole === "kantin" ? "Contoh: kantin_ku"
                              : "Contoh: admin_sehati"
                      }
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="field">
                  <div className="pass-row">
                    <label style={{ margin: 0 }}>Kata Sandi</label>
                  </div>
                  <div className="input-wrap">
                    <span className="input-icon" aria-hidden>
                      <Shield size={18} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      style={{ paddingRight: 44 }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="toggle-pass"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button className="submit" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <><span className="spinner" /> Memproses...</>
                  ) : (
                    "Masuk Aplikasi"
                  )}
                </button>
              </form>

              <div className="footer">
                Aplikasi Sekolah Hijau v2.0 • <span>Ketentuan</span> •{" "}
                <span>Privasi</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
