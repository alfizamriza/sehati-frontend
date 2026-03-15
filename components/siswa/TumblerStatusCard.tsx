"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface TumblerStatusCardProps {
  hadir: boolean;
  nama?: string;
}

const HAPPY_MESSAGES = [
  "Keren! Kamu udah bantu bumi hari ini 🌍",
  "Tumbler hero sejati! Terus semangat ya!",
  "Mantap! Kamu berhasil kurangi sampah plastik!",
  "Luar biasa! Streak kamu makin panjang nih!",
  "Selamat! Hari ini kamu sudah ramah lingkungan!",
];

const SAD_MESSAGES = [
  "Aduh, tumbler ketinggalan nih… Besok jangan lupa ya!",
  "Yuk bawa tumbler besok, bumi butuh kamu! 🌱",
  "Sayang banget… Ayo mulai lagi besok, semangat!",
  "Jangan menyerah! Besok pasti lebih baik 💪",
  "Oops! Tumbler di rumah ya? Besok ingat dibawa!",
];

export default function TumblerStatusCard({ hadir, nama }: TumblerStatusCardProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [msgIdx] = useState(() => Math.floor(Math.random() * 5));

  const message = hadir ? HAPPY_MESSAGES[msgIdx] : SAD_MESSAGES[msgIdx];
  const lottieUrl = hadir
    ? "https://lottie.host/2e9240de-fe05-4065-80d2-964b8b542a2e/VFOwi2DWFh.lottie"
    : "https://lottie.host/dc2f5bf4-5a4a-424a-91fa-996e614b8c69/kDFS3rDX7c.lottie";

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js"
        type="module"
        onLoad={() => setScriptLoaded(true)}
        strategy="lazyOnload"
      />

      <div className={`tumbler-card ${hadir ? "tumbler-card-happy" : "tumbler-card-sad"}`}>
        <div className="tumbler-orb" />

        {/* Lottie */}
        <div className="tumbler-lottie-wrap">
          {scriptLoaded ? (
            /* @ts-ignore */
            <dotlottie-wc
              src={lottieUrl}
              style={{ width: "100%", height: "100%" }}
              autoplay
              loop
            />
          ) : (
            <div className="tumbler-lottie-placeholder">
              {hadir ? "😊" : "😠"}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="tumbler-content">
          <div className="tumbler-status-badge">
            <span className={`status-dot ${hadir ? "dot-green" : "dot-red"}`} />
            <span>{hadir ? "Tumbler Terbawa! 🎉" : "Tumbler Terlupa 😞"}</span>
          </div>
          {/* 
          {nama && (
            <p className="tumbler-nama">
              Hei, <strong>{nama.split(" ")[0]}</strong>!
            </p>
          )} */}

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
          .tumbler-card:hover {
            transform: translateY(-2px);
          }
          .tumbler-card-happy {
            background: linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(5,150,105,0.08) 100%);
            border-color: rgba(16,185,129,0.35);
            box-shadow: 0 8px 32px rgba(16,185,129,0.12);
          }
          .tumbler-card-sad {
            background: linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(185,28,28,0.08) 100%);
            border-color: rgba(239,68,68,0.35);
            box-shadow: 0 8px 32px rgba(239,68,68,0.12);
          }
          .tumbler-orb {
            position: absolute;
            width: 160px;
            height: 160px;
            border-radius: 50%;
            top: -60px;
            right: -40px;
            filter: blur(50px);
            pointer-events: none;
            opacity: 0.3;
          }
          .tumbler-card-happy .tumbler-orb { background: #10b981; }
          .tumbler-card-sad  .tumbler-orb { background: #ef4444; }

          .tumbler-lottie-wrap {
            flex-shrink: 0;
            width: 92px;
            height: 92px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .tumbler-lottie-placeholder {
            font-size: 56px;
            line-height: 1;
          }

          .tumbler-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .tumbler-status-badge {
            display: inline-flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            font-size: 0.82rem;
            font-weight: 700;
            color: rgba(0, 0, 0, 0.88);
            letter-spacing: 0.2px;
          }
          @media (prefers-color-scheme: dark){
            .tumbler-status-badge {
              color: rgba(255,255,255,0.88);
            }
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .dot-green {
            background: #10b981;
            box-shadow: 0 0 6px rgba(16,185,129,0.8);
            animation: dotPulse 1.5s ease-in-out infinite;
          }
          .dot-red {
            background: #ef4444;
            box-shadow: 0 0 6px rgba(239,68,68,0.8);
            animation: dotPulse 1.5s ease-in-out infinite;
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(0.7); }
          }

          .tumbler-nama {
            margin: 0;
            font-size: 0.84rem;
            color: rgba(255,255,255,0.6);
          }
          .tumbler-nama strong {
            color: rgba(255,255,255,0.9);
          }

          /* ── MARQUEE ── */
          .tumbler-marquee-wrap {
            overflow: hidden;
            width: 100%;
            border-radius: 6px;
            padding: 5px 0;
            border-top: 1px solid rgba(255,255,255,0.08);
            margin-top: 2px;
          }
          .tumbler-marquee-track {
            display: flex;
            white-space: nowrap;
            animation: marquee 20s linear infinite;
          }
          /*
            FIX: font-size pakai satuan rem yang tetap,
            tidak inherit dari container yang bisa lebih besar di mobile.
            0.72rem = 11.5px pada base 16px — konsisten di semua ukuran layar.
          */
          .tumbler-marquee-text {
            font-size: 0.72rem;
            font-weight: 600;
            flex-shrink: 0;
            line-height: 1.4;
          }
          .tumbler-card-happy .tumbler-marquee-text { color: rgba(16,185,129,0.8); }
          .tumbler-card-sad   .tumbler-marquee-text { color: rgba(239,68,68,0.75); }

          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          /* Mobile tweaks */
          @media (max-width: 640px) {
            .tumbler-card {
              padding: 14px;
              grid-template-columns: 72px minmax(0, 1fr);
              gap: 12px;
            }
            .tumbler-lottie-wrap {
              width: 72px;
              height: 72px;
            }
            .tumbler-lottie-placeholder {
              font-size: 44px;
            }
            /* Teks sedikit lebih kecil di HP kecil */
            .tumbler-marquee-text {
              font-size: 0.68rem;
            }
          }

          @media (max-width: 380px) {
            .tumbler-marquee-text {
              font-size: 0.64rem;
            }
          }
        `}</style>
      </div>
    </>
  );
}