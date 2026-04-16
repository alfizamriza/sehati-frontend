"use client";

import "./login.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield, User, Users, Recycle, GraduationCap, Store, TriangleAlert, X, ScrollText } from "lucide-react";
import { loginUser, type LoginRequest } from "@/lib/services/shared";
import { getAllPengaturan } from "@/lib/services/settings.service";
import { BackgroundLines } from "@/components/ui/background-lines";
import BrandLogo from "@/components/common/BrandLogo";

import Script from "next/script";

/* eslint-disable @typescript-eslint/no-namespace */
// Define custom elements for TypeScript
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'dotlottie-wc': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string;
          autoplay?: boolean;
          loop?: boolean;
        };
      }
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

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

  // Policy Modals State
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
      <Script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js" type="module" strategy="lazyOnload" />
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
              <div className="robot-wrapper" style={{ width: 200, height: 200, margin: '0 0 -20px -30px' }}>
                <dotlottie-wc
                  src="https://lottie.host/190931ce-26a1-4091-98c0-783701cabbcc/NjQ4tyI9mR.lottie"
                  style={{ width: "200px", height: "200px" }}
                  autoplay
                  loop
                />
              </div>

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
                  <label htmlFor="login-identifier">{ID_LABEL[activeRole]}</label>
                  <div className="input-wrap">
                    <span className="input-icon" aria-hidden>
                      <ActiveIcon size={18} />
                    </span>
                    <input
                      id="login-identifier"
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
                    <label htmlFor="login-password" style={{ margin: 0 }}>Kata Sandi</label>
                  </div>
                  <div className="input-wrap">
                    <span className="input-icon" aria-hidden>
                      <Shield size={18} />
                    </span>
                    <input
                      id="login-password"
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
                Aplikasi Sekolah Hijau v2.0 •{" "}
                <button type="button" className="linklike-button" onClick={() => setShowTerms(true)}>Ketentuan</button> •{" "}
                <button type="button" className="linklike-button" onClick={() => setShowPrivacy(true)}>Privasi</button>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* ── SYARAT KETENTUAN ── */}
      {showTerms && (
        <div className="policy-modal-overlay" onClick={() => setShowTerms(false)}>
          <div className="policy-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="policy-modal-head">
              <div className="policy-modal-title">
                <ScrollText size={20} color="#179EFF" />
                Syarat & Ketentuan Penggunaan
              </div>
              <button className="policy-modal-close" onClick={() => setShowTerms(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="policy-modal-body">
              <h3>1. Ketentuan Umum</h3>
              <p>Selamat datang di Aplikasi SEHATI (Sekolah Hijau dan Edukasi Terintegrasi). Dengan mengakses dan menggunakan aplikasi ini, Anda setuju untuk terikat dengan seluruh syarat dan ketentuan yang berlaku di lingkungan {schoolName}.</p>

              <h3>2. Penggunaan Aplikasi</h3>
              <ul>
                <li>Akun bersifat pribadi dan tidak boleh dipindahtangankan kepada orang lain.</li>
                <li>Pengguna bertanggung jawab atas kerahasiaan kata sandi (password) masing-classing.</li>
                <li>Segala bentuk penyalahgunaan sistem yang merugikan pihak sekolah akan dikenakan sanksi sesuai aturan yang berlaku.</li>
              </ul>

              <h3>3. Sistem Peringkat & Coins</h3>
              <p>Saldo <i>Coins</i> yang terdapat pada aplikasi merupakan representasi poin untuk melihat batas aman dan peringkat kedisiplinan siswa di {schoolName}. Coins ini <b>tidak dapat ditukar</b> dengan barang atau diuangkan, melainkan berfungsi sebagai indikator kedisiplinan dan pembatasan penggunaan kemasan plastik.</p>

              <h3>4. Pelanggaran & Pengurangan Koin</h3>
              <p>Sekolah berhak mencatat pelanggaran siswa atau melakukan pengurangan <i>Coins</i> setiap kali siswa melakukan kesalahan, seperti pembelian makanan di kantin menggunakan kemasan/sampah plastik. Jika <i>Coins</i> siswa habis atau berada di bawah batas tertentu, sistem dapat memblokir akses ke fitur tertentu atau memberikan sanksi sesuai aturan yang berlaku.</p>
            </div>
            <div className="policy-modal-footer">
              <button className="policy-btn-ok" onClick={() => setShowTerms(false)}>Saya Mengerti</button>
            </div>
          </div>
        </div>
      )}

      {/* ── KEBIJAKAN PRIVASI ── */}
      {showPrivacy && (
        <div className="policy-modal-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="policy-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="policy-modal-head">
              <div className="policy-modal-title">
                <Shield size={20} color="#10b981" />
                Kebijakan Privasi
              </div>
              <button className="policy-modal-close" onClick={() => setShowPrivacy(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="policy-modal-body">
              <h3>1. Pengumpulan Data</h3>
              <p>Aplikasi SEHATI mengumpulkan data pribadi yang esensial untuk keperluan akademik dan kedisiplinan, termasuk namun tidak terbatas pada: Nama lengkap, Nomor Induk (NIS/NIP), foto profil, dan riwayat transaksi di lingkungan sekolah.</p>

              <h3>2. Penggunaan Data Pribadi</h3>
              <ul>
                <li>Memfasilitasi layanan sistem perpustakaan, absen, dan kantin sekolah.</li>
                <li>Pencatatan riwayat pelanggaran dan apresiasi/prestasi siswa untuk keperluan konseling (Bimbingan Konseling).</li>
                <li>Analisis statistik internal sekolah guna meningkatkan mutu pendidikan.</li>
              </ul>

              <h3>3. Perlindungan & Keamanan Data</h3>
              <p>Kami berkomitmen untuk melindungi data Anda. Seluruh kata sandi dienkripsi, dan akses terhadap riwayat data sensitif (misal: pelanggaran) hanya diberikan kepada Guru dan staf Konselor yang berwenang.</p>

              <h3>4. Berbagi Informasi (Sharing)</h3>
              <p>Data pribadi Anda <b>tidak akan pernah dijual</b> kepada pihak ketiga. Data hanya akan dibagikan kepada Dinas Pendidikan terkait jika diwajibkan oleh hukum atau perundang-undangan Negara Kesatuan Republik Indonesia.</p>
            </div>
            <div className="policy-modal-footer">
              <button className="policy-btn-ok" onClick={() => setShowPrivacy(false)}>Saya Mengerti</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
