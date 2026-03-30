"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";

interface TumblerStatusCardProps {
  hadir: boolean;
  izin?: boolean;
  izinTipe?: string | null; // "sakit" | "izin" | "tanpa_keterangan"
  nama?: string;
}

const HAPPY_MESSAGES = [
  "Keren! Kamu udah bantu bumi hari ini",
  "Tumbler hero sejati! Terus semangat ya!",
  "Mantap! Kamu berhasil kurangi sampah plastik!",
  "Luar biasa! Streak kamu makin panjang nih!",
  "Selamat! Hari ini kamu sudah ramah lingkungan!",
];

const SAD_MESSAGES = [
  "Aduh, tumbler ketinggalan nih… Besok jangan lupa ya!",
  "Yuk bawa tumbler besok, bumi butuh kamu!",
  "Sayang banget… Ayo mulai lagi besok, semangat!",
  "Jangan menyerah! Besok pasti lebih baik",
  "Oops! Tumbler di rumah ya? Besok ingat dibawa!",
];

const IZIN_MESSAGES = [
  "Semoga lekas pulih ya! Streak kamu tetap aman",
  "Istirahat yang cukup, besok semangat lagi!",
  "Tidak apa-apa, kesehatanmu lebih penting!",
  "Get well soon! Streak tidak putus kok",
  "Pulih dulu ya, bumi tetap menantimu!",
];

function getTipeLabel(tipe?: string | null): string {
  if (tipe === "sakit") return "Sakit";
  if (tipe === "izin") return "Izin";
  if (tipe === "tanpa_keterangan") return "Tanpa Keterangan";
  return "Izin";
}

export default function TumblerStatusCard({
  hadir,
  izin = false,
  izinTipe,
  nama,
}: TumblerStatusCardProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [msgIdx] = useState(() => Math.floor(Math.random() * 5));

  // Determine mode
  const mode: "hadir" | "izin" | "tidak" = izin ? "izin" : hadir ? "hadir" : "tidak";

  const message =
    mode === "hadir"
      ? HAPPY_MESSAGES[msgIdx]
      : mode === "izin"
        ? IZIN_MESSAGES[msgIdx]
        : SAD_MESSAGES[msgIdx];

  const lottieUrl =
    mode === "hadir"
      ? "https://lottie.host/2e9240de-fe05-4065-80d2-964b8b542a2e/VFOwi2DWFh.lottie"
      : mode === "izin"
        ? "https://lottie.host/c88ad455-6adb-4493-94ae-71111d2ff630/F9tAg6Rxh7.lottie"
        : "https://lottie.host/dc2f5bf4-5a4a-424a-91fa-996e614b8c69/kDFS3rDX7c.lottie";

  const placeholder = mode === "hadir" ? "😊" : mode === "izin" ? "🤒" : "😞";

  const tipeLabel = getTipeLabel(izinTipe);

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js"
        type="module"
        onLoad={() => setScriptLoaded(true)}
        strategy="lazyOnload"
      />

      <div className={`tumbler-card tumbler-card-${mode}`}>
        <div className="tumbler-orb" />

        {/* Lottie */}
        <div className="tumbler-lottie-wrap">
          <dotlottie-wc
            src={lottieUrl}
            style={{ width: "100%", height: "100%" }}
            autoplay
            loop
          />

        </div>

        {/* Content */}
        <div className="tumbler-content">
          {/* Status badge */}
          <div className="tumbler-status-badge">
            <span className={`status-dot dot-${mode === "hadir" ? "green" : mode === "izin" ? "blue" : "red"}`} />
            <span>
              {mode === "hadir"
                ? "Tumbler Terbawa!"
                : mode === "izin"
                  ? `${tipeLabel} Hari Ini`
                  : "Tumbler Terlupa"}
            </span>
          </div>

          {/* Izin: streak safe notice */}
          {mode === "izin" && (
            <div className="tumbler-izin-notice">
              <span className="izin-shield">🔒</span>
              <span>Streak kamu aman, tidak putus</span>
            </div>
          )}

          {/* Marquee */}
          <div className="tumbler-marquee-wrap">
            <div className="tumbler-marquee-track">
              <span className="tumbler-marquee-text">
                {message}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;{message}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;
              </span>
              <span className="tumbler-marquee-text" aria-hidden>
                {message}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;{message}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;
              </span>
            </div>
          </div>
        </div>

        <style jsx>{`
          .tumbler-card {
            position: relative;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
            border-radius: 20px;
            padding: 16px;
            display: grid;
            grid-template-columns: 92px minmax(0, 1fr);
            align-items: center;
            gap: 14px;
            overflow: hidden;
            border: 1px solid;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }
          .tumbler-card:hover { transform: translateY(-2px); }

          /* Hadir — hijau */
          .tumbler-card-hadir {
            background: linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(5,150,105,0.08) 100%);
            border-color: rgba(16,185,129,0.35);
            box-shadow: 0 8px 32px rgba(16,185,129,0.12);
          }
          /* Tidak — merah */
          .tumbler-card-tidak {
            background: linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(185,28,28,0.08) 100%);
            border-color: rgba(239,68,68,0.35);
            box-shadow: 0 8px 32px rgba(239,68,68,0.12);
          }
          /* Izin — biru */
          .tumbler-card-izin {
            background: linear-gradient(135deg, rgba(96,165,250,0.14) 0%, rgba(37,99,235,0.08) 100%);
            border-color: rgba(96,165,250,0.35);
            box-shadow: 0 8px 32px rgba(96,165,250,0.12);
          }

          /* Glow orb */
          .tumbler-orb {
            position: absolute;
            width: 160px; height: 160px;
            border-radius: 50%;
            top: -60px; right: -40px;
            filter: blur(50px);
            pointer-events: none;
            opacity: 0.28;
          }
          .tumbler-card-hadir .tumbler-orb { background: #10b981; }
          .tumbler-card-tidak  .tumbler-orb { background: #ef4444; }
          .tumbler-card-izin  .tumbler-orb { background: #60a5fa; }

          /* Lottie */
          .tumbler-lottie-wrap {
            flex-shrink: 0;
            width: 92px; height: 92px;
            display: flex; align-items: center; justify-content: center;
          }
          .tumbler-lottie-placeholder { font-size: 56px; line-height: 1; }

          /* Content */
          .tumbler-content {
            flex: 1; min-width: 0;
            display: flex; flex-direction: column; gap: 6px;
          }

          /* Status badge */
          .tumbler-status-badge {
            display: inline-flex; align-items: center; flex-wrap: wrap;
            gap: 6px; font-size: 0.82rem; font-weight: 700;
            color: rgba(0,0,0,0.88); letter-spacing: 0.2px;
          }
          @media (prefers-color-scheme: dark) {
            .tumbler-status-badge { color: rgba(255,255,255,0.88); }
          }

          /* Status dot */
          .status-dot {
            width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
            animation: dotPulse 1.5s ease-in-out infinite;
          }
          .dot-green { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.8); }
          .dot-red   { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.8); }
          .dot-blue  { background: #60a5fa; box-shadow: 0 0 6px rgba(96,165,250,0.8); }
          @keyframes dotPulse {
            0%,100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.5; transform: scale(0.7); }
          }

          /* Izin streak-safe notice */
          .tumbler-izin-notice {
            display: inline-flex; align-items: center; gap: 5px;
            font-size: 0.74rem; font-weight: 600;
            background: rgba(96,165,250,0.12);
            border: 1px solid rgba(96,165,250,0.28);
            color: #93c5fd;
            border-radius: 999px;
            padding: 3px 10px;
            width: fit-content;
          }
          @media (prefers-color-scheme: light) {
            .tumbler-izin-notice {
              background: rgba(59,130,246,0.08);
              border-color: rgba(59,130,246,0.25);
              color: #1d4ed8;
            }
          }
          .izin-shield { font-size: 12px; line-height: 1; }

          /* Marquee */
          .tumbler-marquee-wrap {
            overflow: hidden; width: 100%; border-radius: 6px;
            padding: 5px 0;
            border-top: 1px solid rgba(255,255,255,0.08);
            margin-top: 2px;
          }
          .tumbler-marquee-track {
            display: flex; white-space: nowrap;
            animation: marquee 20s linear infinite;
          }
          .tumbler-marquee-text {
            font-size: 0.72rem; font-weight: 600;
            flex-shrink: 0; line-height: 1.4;
          }
          .tumbler-card-hadir .tumbler-marquee-text { color: rgba(16,185,129,0.80); }
          .tumbler-card-tidak  .tumbler-marquee-text { color: rgba(239,68,68,0.75); }
          .tumbler-card-izin  .tumbler-marquee-text { color: rgba(96,165,250,0.80); }
          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          /* Responsive */
          @media (max-width: 640px) {
            .tumbler-card {
              padding: 14px;
              grid-template-columns: 72px minmax(0, 1fr);
              gap: 12px;
            }
            .tumbler-lottie-wrap { width: 72px; height: 72px; }
            .tumbler-lottie-placeholder { font-size: 44px; }
            .tumbler-marquee-text { font-size: 0.68rem; }
          }
          @media (max-width: 380px) {
            .tumbler-marquee-text { font-size: 0.64rem; }
            .tumbler-izin-notice  { font-size: 0.68rem; }
          }
        `}</style>
      </div>
    </>
  );
}