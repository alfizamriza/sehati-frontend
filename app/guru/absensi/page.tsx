"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  ArrowLeft, Keyboard, XCircle, CheckCircle2,
  ScanLine, RotateCcw, Loader2, Zap, CalendarOff,
  FlipHorizontal2,
} from "lucide-react";
import "./scanner.css";
import { scanAbsensi, getInfoHariIni, type HasilAbsensi } from "@/lib/services/absensi.service";

type ViewState = "checking" | "holiday" | "scanning" | "loading" | "success" | "error";
type CameraFacing = "environment" | "user"; // environment = belakang, user = depan

export default function ScannerPage() {
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>("checking");
  const [hasilAbsensi, setHasilAbsensi] = useState<HasilAbsensi | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [liburInfo, setLiburInfo] = useState<{ keterangan: string } | null>(null);
  const [lastScanned, setLastScanned] = useState<string>("");

  // ============================================
  // STATE KAMERA — default pakai kamera belakang
  // ============================================
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment");
  const [isFlipping, setIsFlipping] = useState(false);

  // ============================================
  // CEK HARI LIBUR SAAT HALAMAN DIBUKA
  // ============================================
  useEffect(() => {
    async function cekHariIni() {
      try {
        const info = await getInfoHariIni();
        if (info.isLibur) {
          setLiburInfo({ keterangan: info.keterangan || "" });
          setViewState("holiday");
        } else {
          setViewState("scanning");
        }
      } catch {
        setViewState("scanning");
      }
    }
    cekHariIni();
  }, []);

  const handleReset = () => {
    setHasilAbsensi(null);
    setErrorMsg("");
    setLastScanned("");
    setViewState("scanning");
  };

  // ============================================
  // TOGGLE KAMERA DEPAN / BELAKANG
  // ============================================
  const handleFlipCamera = () => {
    setIsFlipping(true);
    setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
    setTimeout(() => setIsFlipping(false), 400);
  };

  const processAttendance = async (nis: string) => {
    if (nis === lastScanned) return;
    setLastScanned(nis);
    setViewState("loading");

    try {
      const hasil = await scanAbsensi(nis);
      setHasilAbsensi(hasil);
      setViewState("success");
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message || err?.message || "";

      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.code === "HARI_LIBUR") {
          setLiburInfo({ keterangan: parsed.keterangan });
          setViewState("holiday");
          return;
        }
      } catch {}

      setErrorMsg(rawMsg || "Terjadi kesalahan");
      setViewState("error");
    }
  };

  const handleScan = (detectedCodes: any[]) => {
    if (viewState !== "scanning") return;
    if (!detectedCodes?.length) return;
    const rawValue = detectedCodes[0]?.rawValue;
    if (rawValue) processAttendance(rawValue);
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const cameraLabel = cameraFacing === "environment" ? "Kamera Belakang" : "Kamera Depan";

  return (
    <main className="dashboard-page scanner-page">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <div className="dashboard-container guru-layout-medium scanner-container">

        {/* HEADER */}
        <header className="scanner-header">
          <button className="btn-icon back-btn" onClick={() => router.back()}>
            <ArrowLeft size={17} />
          </button>
          <h2 className="page-title">Absensi Tumbler</h2>
          <div className="spacer" />
        </header>

        <div className="scanner-frame-wrapper">

          {/* CHECKING */}
          {viewState === "checking" && (
            <div className="result-card loading-card glass-panel">
              <Loader2 size={48} className="spinner-icon" />
              <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 12 }}>Memeriksa jadwal...</p>
            </div>
          )}

          {/* HARI LIBUR */}
          {viewState === "holiday" && (
            <div className="result-card holiday-card glass-panel">
              <div className="icon-badge holiday">
                <CalendarOff size={52} />
              </div>

              <h2 className="res-title">Hari Libur</h2>

              {liburInfo?.keterangan && (
                <div className="holiday-name-badge">
                  🎉 {liburInfo.keterangan}
                </div>
              )}

              <p className="holiday-date-text">{todayStr}</p>

              <p className="res-desc" style={{ marginTop: 4 }}>
                Absensi tumbler tidak dapat dilakukan pada hari libur.
                <br />
                Sampai jumpa di hari sekolah berikutnya!
              </p>

              <div className="streak-safe-box">
                <Zap size={14} color="#F59E0B" />
                <span>Streak tidak putus karena hari libur.</span>
              </div>

              <button
                className="btn-outline full-width"
                onClick={() => router.back()}
              >
                <ArrowLeft size={16} /> Kembali
              </button>
            </div>
          )}

          {/* KAMERA SCAN */}
          {viewState === "scanning" && (
            <div className="camera-view active">
              <div className="camera-feed">
                {/*
                  Key diubah setiap ganti kamera supaya Scanner
                  di-remount dan meminta stream kamera baru.
                */}
                <Scanner
                  key={cameraFacing}
                  onScan={handleScan}
                  allowMultiple={true}
                  scanDelay={2000}
                  components={{ torch: false }}
                  constraints={{ facingMode: cameraFacing }}
                  styles={{
                    container: { width: "100%", height: "100%" },
                    video: { width: "100%", height: "100%", objectFit: "cover" },
                  }}
                />
              </div>

              {/* Label kamera aktif */}
              <div className="camera-label-badge">{cameraLabel}</div>

              {/* Tombol flip kamera */}
              <button
                className={`flip-camera-btn ${isFlipping ? "spinning" : ""}`}
                onClick={handleFlipCamera}
                title="Ganti Kamera"
                aria-label="Ganti kamera depan/belakang"
              >
                <FlipHorizontal2 size={20} />
              </button>

              <div className="scan-overlay">
                <div className="scan-corner top-left" />
                <div className="scan-corner top-right" />
                <div className="scan-corner bottom-left" />
                <div className="scan-corner bottom-right" />
                <div className="scan-laser" />
              </div>
              <div className="scan-instruction">Arahkan kamera ke QR Code Siswa</div>
            </div>
          )}

          {/* LOADING PROSES */}
          {viewState === "loading" && (
            <div className="result-card loading-card glass-panel">
              <Loader2 size={56} className="spinner-icon" />
              <h2 className="res-title">Memproses...</h2>
              <p className="res-desc">Sedang mencatat absensi, harap tunggu.</p>
            </div>
          )}

          {/* SUKSES */}
          {viewState === "success" && hasilAbsensi && (
            <div className="result-card success-card glass-panel">
              <div className="icon-badge success">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="res-title">Absensi Tercatat!</h2>
              <p className="res-desc">Data berhasil disimpan.</p>

              <div className="student-detail">
                <div className="detail-row">
                  <span className="lbl">Nama</span>
                  <span className="val">{hasilAbsensi.nama}</span>
                </div>
                <div className="detail-row">
                  <span className="lbl">NIS</span>
                  <span className="val">{hasilAbsensi.nis}</span>
                </div>
                <div className="detail-row">
                  <span className="lbl">Streak</span>
                  <span className="val">🔥 {hasilAbsensi.newStreak} hari</span>
                </div>
                <div className="detail-row">
                  <span className="lbl">Koin</span>
                  <span className="val coin">
                    +{hasilAbsensi.totalCoins} koin
                    {hasilAbsensi.streakBonus > 0 && (
                      <span className="bonus-badge">
                        <Zap size={10} /> +{hasilAbsensi.streakBonus} bonus
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <button className="btn-primary full-width" onClick={handleReset}>
                <ScanLine size={18} /> Scan Berikutnya
              </button>
            </div>
          )}

          {/* ERROR */}
          {viewState === "error" && (
            <div className="result-card error-card glass-panel">
              <div className="icon-badge error">
                <XCircle size={48} />
              </div>
              <h2 className="res-title">Gagal</h2>
              <p className="res-desc">{errorMsg || "QR Code tidak terdaftar."}</p>
              <button className="btn-outline full-width" onClick={handleReset}>
                <RotateCcw size={18} /> Coba Lagi
              </button>
            </div>
          )}

        </div>

        {/* TOMBOL MANUAL — hanya saat scanning */}
        {viewState === "scanning" && (
          <div className="scanner-controls" style={{ justifyContent: "center" }}>
            <button
              className="manual-trigger-btn"
              onClick={() => router.push("/guru/absensi/manual")}
            >
              <Keyboard size={20} />
              <span>ABSENSI MANUAL</span>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .spinner-icon { animation: spin 1s linear infinite; color: #179EFF; }

        .loading-card {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 64px 24px; text-align: center;
        }

        /* ======== HOLIDAY CARD ======== */
        .holiday-card {
          display: flex; flex-direction: column; align-items: center;
          gap: 16px; padding: 40px 28px; text-align: center;
        }

        .icon-badge.holiday {
          width: 100px; height: 100px; border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.18), rgba(234,88,12,0.08));
          border: 2px solid rgba(245,158,11,0.35);
          display: grid; place-items: center;
          color: #F59E0B;
          animation: floatUp 3s ease-in-out infinite;
          box-shadow: 0 0 40px rgba(245,158,11,0.15);
        }

        .holiday-name-badge {
          background: rgba(245,158,11,0.12);
          border: 1px solid rgba(245,158,11,0.3);
          color: #FBBF24;
          border-radius: 24px; padding: 8px 20px;
          font-size: 15px; font-weight: 700;
          letter-spacing: 0.2px;
        }

        .holiday-date-text {
          color: rgba(255,255,255,0.4);
          font-size: 12px; margin: -4px 0;
        }

        .streak-safe-box {
          display: flex; align-items: center; gap: 8px;
          background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 10px 16px;
          font-size: 12px; color: rgba(255,255,255,0.65);
          width: 100%; text-align: left;
        }

        /* ======== BONUS BADGE ======== */
        .bonus-badge {
          display: inline-flex; align-items: center; gap: 3px;
          background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3);
          color: #F59E0B; border-radius: 6px; padding: 2px 7px;
          font-size: 10px; font-weight: 700; margin-left: 8px;
        }

        @media (prefers-color-scheme: light) {
          .loading-card p { color: rgba(15, 23, 42, 0.72) !important; }
          .holiday-date-text { color: rgba(15, 23, 42, 0.62) !important; }
          .streak-safe-box { color: rgba(15, 23, 42, 0.78) !important; }
          .res-desc { color: rgba(15, 23, 42, 0.74) !important; }
          .holiday-name-badge { color: #b45309 !important; background: rgba(245,158,11,0.10) !important; }
        }
      `}</style>
    </main>
  );
}