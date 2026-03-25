"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  ArrowLeft,
  Keyboard,
  XCircle,
  CheckCircle2,
  ScanLine,
  RotateCcw,
  Loader2,
  Zap,
  CalendarOff,
  FlipHorizontal2,
  FileText,
} from "lucide-react";
import "./scanner.css";
import {
  scanAbsensi,
  getInfoHariIni,
  type HasilAbsensi,
} from "@/lib/services/absensi.service";
import BottomNavSiswa from "@/components/siswa/BottomNavSiswa";

type ViewState =
  | "checking"
  | "holiday"
  | "scanning"
  | "loading"
  | "success"
  | "error"
  | "izin";
type CameraFacing = "environment" | "user";

export default function ScannerPage() {
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>("checking");
  const [hasilAbsensi, setHasilAbsensi] = useState<HasilAbsensi | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [liburInfo, setLiburInfo] = useState<{ keterangan: string } | null>(
    null
  );
  const [izinInfo, setIzinInfo] = useState<{
    nama: string;
    message: string;
  } | null>(null);
  const [lastScanned, setLastScanned] = useState<string>("");

  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment");
  const [isFlipping, setIsFlipping] = useState(false);

  // ── Cek hari libur saat buka halaman ──
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
    setIzinInfo(null);
    setLastScanned("");
    setViewState("scanning");
  };

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
      const rawCode = err?.response?.data?.code || "";

      let code = rawCode;
      let message = rawMsg;
      try {
        const parsed = JSON.parse(rawMsg);
        code = parsed?.code || code;
        message = parsed?.message || message;
      } catch {
        /* bukan JSON */
      }

      if (code === "HARI_LIBUR") {
        const keterangan = err?.response?.data?.keterangan || "";
        setLiburInfo({ keterangan });
        setViewState("holiday");
        return;
      }

      if (code === "IZIN_HARI_INI") {
        const nama = message.split(" memiliki")[0] || "Siswa";
        setIzinInfo({ nama, message });
        setViewState("izin");
        return;
      }

      setErrorMsg(message || "Terjadi kesalahan");
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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cameraLabel =
    cameraFacing === "environment" ? "Kamera Belakang" : "Kamera Depan";

  return (
    <main className="dashboard-page scanner-page scanner-page--with-nav">
      {/* Ambient background layers */}
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <div className="dashboard-container guru-layout-medium scanner-container">

        {/* ── HEADER ── */}
        <header className="scanner-header">
          <h2 className="page-title">Absensi Tumbler</h2>
          <div className="spacer" />
        </header>

        <div className="scanner-frame-wrapper">

          {/* CHECKING */}
          {viewState === "checking" && (
            <div className="result-card loading-card">
              <Loader2 size={48} className="spinner-icon" />
              <p className="res-desc" style={{ marginTop: 4 }}>
                Memeriksa jadwal...
              </p>
            </div>
          )}

          {/* HARI LIBUR */}
          {viewState === "holiday" && (
            <div className="result-card holiday-card">
              <div className="sc-icon-badge sc-icon-badge--holiday">
                <CalendarOff size={46} />
              </div>

              <h2 className="res-title">Hari Libur</h2>

              {liburInfo?.keterangan && (
                <div className="sc-info-badge sc-info-badge--amber">
                  🎉 {liburInfo.keterangan}
                </div>
              )}

              <p className="sc-date-text">{todayStr}</p>

              <p className="res-desc">
                Absensi tumbler tidak dapat dilakukan pada hari libur.
                <br />
                Sampai jumpa di hari sekolah berikutnya!
              </p>

              <div className="sc-notice-box sc-notice-box--amber">
                <Zap size={13} color="var(--sc-amber)" />
                <span>Streak tidak putus karena hari libur.</span>
              </div>

              <button className="btn-outline full-width" onClick={() => router.back()}>
                <ArrowLeft size={16} /> Kembali
              </button>
            </div>
          )}

          {/* IZIN / SAKIT */}
          {viewState === "izin" && izinInfo && (
            <div className="result-card izin-card">
              <div className="sc-icon-badge sc-icon-badge--blue">
                <FileText size={46} />
              </div>

              <h2 className="res-title">Sedang Izin</h2>

              <div className="sc-info-badge sc-info-badge--blue">
                📋 {izinInfo.nama}
              </div>

              <p className="sc-date-text">{todayStr}</p>

              <p className="res-desc">
                Siswa ini sudah tercatat izin atau sakit hari ini.
                <br />
                Absensi tumbler tidak diperlukan.
              </p>

              <div className="sc-notice-box sc-notice-box--blue">
                <Zap size={13} color="var(--sc-blue)" />
                <span>Streak tidak putus karena siswa sudah diizinkan.</span>
              </div>

              <button className="btn-primary full-width" onClick={handleReset}>
                <ScanLine size={16} /> Scan Berikutnya
              </button>
            </div>
          )}

          {/* SCANNING */}
          {viewState === "scanning" && (
            <div className="camera-view active">
              <div className="camera-feed">
                <Scanner
                  key={cameraFacing}
                  onScan={handleScan}
                  allowMultiple={true}
                  scanDelay={2000}
                  components={{ torch: false }}
                  constraints={{ facingMode: cameraFacing }}
                  styles={{
                    container: { width: "100%", height: "100%" },
                    video: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  }}
                />
              </div>

              <div className="camera-label-badge">{cameraLabel}</div>

              <button
                className={`flip-camera-btn ${isFlipping ? "spinning" : ""}`}
                onClick={handleFlipCamera}
                title="Ganti Kamera"
                aria-label="Ganti kamera depan/belakang"
              >
                <FlipHorizontal2 size={18} />
              </button>

              <div className="scan-overlay">
                <div className="scan-corner top-left" />
                <div className="scan-corner top-right" />
                <div className="scan-corner bottom-left" />
                <div className="scan-corner bottom-right" />
                <div className="scan-laser" />
              </div>

              <div className="scan-instruction">
                Arahkan kamera ke QR Code Siswa
              </div>
            </div>
          )}

          {/* LOADING */}
          {viewState === "loading" && (
            <div className="result-card loading-card">
              <Loader2 size={54} className="spinner-icon" />
              <h2 className="res-title">Memproses...</h2>
              <p className="res-desc">
                Sedang mencatat absensi, harap tunggu.
              </p>
            </div>
          )}

          {/* SUKSES */}
          {viewState === "success" && hasilAbsensi && (
            <div className="result-card success-card">
              <div className="sc-icon-badge sc-icon-badge--success">
                <CheckCircle2 size={46} />
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
                        <Zap size={9} /> +{hasilAbsensi.streakBonus} bonus
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <button className="btn-primary full-width" onClick={handleReset}>
                <ScanLine size={17} /> Scan Berikutnya
              </button>
            </div>
          )}

          {/* ERROR */}
          {viewState === "error" && (
            <div className="result-card error-card">
              <div className="sc-icon-badge sc-icon-badge--error">
                <XCircle size={46} />
              </div>
              <h2 className="res-title">Scan Gagal</h2>
              <p className="res-desc">
                {errorMsg || "QR Code tidak terdaftar."}
              </p>
              <button className="btn-outline full-width" onClick={handleReset}>
                <RotateCcw size={17} /> Coba Lagi
              </button>
            </div>
          )}

        </div>

        {/* TOMBOL MANUAL */}
        {viewState === "scanning" && (
          <div className="scanner-controls" style={{ justifyContent: "center" }}>
            <button
              className="manual-trigger-btn"
              onClick={() => router.push("/siswa/absensi/manual")}
            >
              <Keyboard size={18} />
              <span>ABSENSI MANUAL</span>
            </button>
          </div>
        )}
      </div>

      <BottomNavSiswa />
    </main>
  );
}