"use client";

import React, { useState, useEffect } from "react";
import BrandLogo from "@/components/common/BrandLogo";

// ─── TIPS ────────────────────────────────────────────────────────────────────
const TIPS: { icon: string; text: string }[] = [
    { icon: "🌿", text: "Bawa tumbler setiap hari untuk mengumpulkan coins lebih banyak!" },
    { icon: "🔥", text: "Jaga streak harianmu agar tidak putus — konsistensi adalah kunci!" },
    { icon: "🏆", text: "Kamu bisa naik peringkat leaderboard dengan rajin hadir bawa tumbler." },
    { icon: "♻️", text: "Mengurangi plastik sekali pakai adalah kontribusi nyata untuk bumi." },
    { icon: "📅", text: "Cek kalender aktivitas untuk melihat riwayat kehadiranmu." },
    { icon: "💧", text: "Satu tumbler bisa mencegah ratusan botol plastik terbuang per tahun." },
];

// ─── LOADING PHASES ──────────────────────────────────────────────────────────
const PHASES = [
    "Menyambungkan server",
    "Memuat profil siswa",
    "Mengambil data kalender",
    "Memuat leaderboard",
    "Hampir selesai",
];

// ─── PARTICLE CONFIG ─────────────────────────────────────────────────────────
interface ParticleConfig {
    id: number;
    left: string;
    delay: string;
    duration: string;
    size: number;
    opacity: number;
}

const PARTICLES: ParticleConfig[] = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${(i * 8.1 + 3) % 94}%`,
    delay: `${((i * 0.41) % 3.8).toFixed(2)}s`,
    duration: `${(3.8 + ((i * 0.43) % 2.4)).toFixed(1)}s`,
    size: 14 + ((i * 3) % 10),
    opacity: parseFloat((0.08 + ((i * 0.03) % 0.20)).toFixed(3)),
}));

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function SehatiLoadingScreen() {
    const [tipIndex, setTipIndex] = useState(0);
    const [tipVisible, setTipVisible] = useState(true);
    const [progress, setProgress] = useState(0);
    const [dots, setDots] = useState(1);
    const [phaseIndex, setPhaseIndex] = useState(0);

    // Tip rotation with fade
    useEffect(() => {
        const id = setInterval(() => {
            setTipVisible(false);
            const inner = setTimeout(() => {
                setTipIndex((i) => (i + 1) % TIPS.length);
                setTipVisible(true);
            }, 380);
            return () => clearTimeout(inner);
        }, 2900);
        return () => clearInterval(id);
    }, []);

    // Fake progress
    useEffect(() => {
        let p = 0;
        const id = setInterval(() => {
            p += Math.random() * 7 + 1.5;
            if (p >= 92) { p = 92; clearInterval(id); }
            setProgress(p);
        }, 230);
        return () => clearInterval(id);
    }, []);

    // Dots animation
    useEffect(() => {
        const id = setInterval(() => setDots((d) => (d % 3) + 1), 500);
        return () => clearInterval(id);
    }, []);

    // Phase text rotation
    useEffect(() => {
        const id = setInterval(() => {
            setPhaseIndex((i) => Math.min(i + 1, PHASES.length - 1));
        }, 1800);
        return () => clearInterval(id);
    }, []);

    const tip = TIPS[tipIndex];

    return (
        <div className="sl-page">
            {/* Ambient blobs */}
            <div className="sl-blob sl-blob-1" />
            <div className="sl-blob sl-blob-2" />
            <div className="sl-blob sl-blob-3" />

            {/* Subtle grid */}
            <div className="sl-grid" />

            {/* Floating BrandLogo particles */}
            {PARTICLES.map((p) => (
                <div
                    key={p.id}
                    className="sl-particle"
                    style={{
                        left: p.left,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        opacity: p.opacity,
                    }}
                >
                    <BrandLogo size={p.size} alt="" />
                </div>
            ))}

            {/* Main card */}
            <div className="sl-card">

                {/* Animated logo */}
                <div className="sl-logo-wrap">
                    <div className="sl-pulse sl-pulse-outer" />
                    <div className="sl-pulse sl-pulse-inner" />
                    <div className="sl-logo-ring">
                        <div className="sl-logo-core">
                            <BrandLogo size={32} alt="SEHATI" priority />
                        </div>
                    </div>
                </div>

                {/* Brand */}
                <h1 className="sl-brand-name">SEHATI</h1>
                <p className="sl-brand-sub">Sekolah Hijau dan Anti Plastik</p>

                {/* Spinner + phase text */}
                <div className="sl-spinner-row">
                    <div className="sl-spinner" aria-hidden />
                    <span className="sl-phase-text">
                        {PHASES[phaseIndex]}{".".repeat(dots)}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="sl-progress-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="sl-progress-fill" style={{ width: `${progress}%` }}>
                        <div className="sl-progress-shimmer" />
                    </div>
                </div>
                <div className="sl-progress-pct">{Math.round(progress)}%</div>

                {/* Tip card */}
                <div
                    className="sl-tip-card"
                    style={{
                        opacity: tipVisible ? 1 : 0,
                        transform: tipVisible ? "translateY(0)" : "translateY(8px)",
                    }}
                >
                    <span className="sl-tip-icon" role="img" aria-hidden="true">{tip.icon}</span>
                    <p className="sl-tip-text">{tip.text}</p>
                </div>

                {/* Pip indicators */}
                <div className="sl-pips" role="tablist" aria-label="Tips indicator">
                    {TIPS.map((_, i) => (
                        <div
                            key={i}
                            className={`sl-pip${i === tipIndex ? " sl-pip-active" : ""}`}
                            role="tab"
                            aria-selected={i === tipIndex}
                        />
                    ))}
                </div>
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        /* ═══════════════════════════════════════
           LIGHT MODE (default)
        ═══════════════════════════════════════ */
        .sl-page {
          --sl-bg:           #eef2fb;
          --sl-card-bg:      rgba(255,255,255,0.88);
          --sl-card-border:  rgba(26,111,244,0.10);
          --sl-card-shadow:  0 28px 64px rgba(26,111,244,0.12), 0 2px 8px rgba(26,111,244,0.06);
          --sl-brand-from:   #0d1b3e;
          --sl-brand-to:     #1a6ff4;
          --sl-brand-sub:    rgba(13,27,62,0.38);
          --sl-spinner-rim:  rgba(26,111,244,0.14);
          --sl-spinner-tip:  #1a6ff4;
          --sl-phase:        rgba(13,27,62,0.42);
          --sl-track:        rgba(26,111,244,0.08);
          --sl-fill-a:       #0369a1;
          --sl-fill-b:       #1a6ff4;
          --sl-fill-c:       #059669;
          --sl-pct:          rgba(13,27,62,0.28);
          --sl-tip-bg:       rgba(26,111,244,0.05);
          --sl-tip-border:   rgba(26,111,244,0.12);
          --sl-tip-text:     rgba(13,27,62,0.58);
          --sl-pip:          rgba(26,111,244,0.18);
          --sl-pip-active:   #1a6ff4;
          --sl-ring-bg:      rgba(26,111,244,0.10);
          --sl-ring-bd:      rgba(26,111,244,0.25);
          --sl-core-a:       #1a6ff4;
          --sl-core-b:       #059669;
          --sl-core-shadow:  rgba(26,111,244,0.38);
          --sl-pulse-c:      rgba(26,111,244,0.32);
          --sl-blob-a:       rgba(26,111,244,0.11);
          --sl-blob-b:       rgba(5,150,105,0.08);
          --sl-blob-c:       rgba(99,102,241,0.05);
          --sl-grid:         rgba(26,111,244,0.022);
        }

        /* ═══════════════════════════════════════
           DARK MODE — prefers-color-scheme
        ═══════════════════════════════════════ */
        @media (prefers-color-scheme: dark) {
          .sl-page {
            --sl-bg:           #020617;
            --sl-card-bg:      rgba(255,255,255,0.025);
            --sl-card-border:  rgba(255,255,255,0.07);
            --sl-card-shadow:  0 32px 80px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.05);
            --sl-brand-from:   #ffffff;
            --sl-brand-to:     #179eff;
            --sl-brand-sub:    rgba(255,255,255,0.28);
            --sl-spinner-rim:  rgba(23,158,255,0.18);
            --sl-spinner-tip:  #179eff;
            --sl-phase:        rgba(255,255,255,0.38);
            --sl-track:        rgba(255,255,255,0.07);
            --sl-fill-a:       #0284c7;
            --sl-fill-b:       #179eff;
            --sl-fill-c:       #10b981;
            --sl-pct:          rgba(255,255,255,0.28);
            --sl-tip-bg:       rgba(255,255,255,0.04);
            --sl-tip-border:   rgba(255,255,255,0.08);
            --sl-tip-text:     rgba(255,255,255,0.56);
            --sl-pip:          rgba(255,255,255,0.15);
            --sl-pip-active:   #179eff;
            --sl-ring-bg:      rgba(23,158,255,0.18);
            --sl-ring-bd:      rgba(23,158,255,0.30);
            --sl-core-a:       #0284c7;
            --sl-core-b:       #059669;
            --sl-core-shadow:  rgba(23,158,255,0.45);
            --sl-pulse-c:      rgba(23,158,255,0.42);
            --sl-blob-a:       rgba(23,158,255,0.18);
            --sl-blob-b:       rgba(16,185,129,0.14);
            --sl-blob-c:       rgba(99,102,241,0.07);
            --sl-grid:         rgba(255,255,255,0.022);
          }
        }

        /* ═══════════════════════════════════════
           DARK MODE — explicit data-theme (Next.js)
        ═══════════════════════════════════════ */
        [data-theme="dark"] .sl-page {
          --sl-bg:           #020617;
          --sl-card-bg:      rgba(255,255,255,0.025);
          --sl-card-border:  rgba(255,255,255,0.07);
          --sl-card-shadow:  0 32px 80px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.05);
          --sl-brand-from:   #ffffff;
          --sl-brand-to:     #179eff;
          --sl-brand-sub:    rgba(255,255,255,0.28);
          --sl-spinner-rim:  rgba(23,158,255,0.18);
          --sl-spinner-tip:  #179eff;
          --sl-phase:        rgba(255,255,255,0.38);
          --sl-track:        rgba(255,255,255,0.07);
          --sl-fill-a:       #0284c7;
          --sl-fill-b:       #179eff;
          --sl-fill-c:       #10b981;
          --sl-pct:          rgba(255,255,255,0.28);
          --sl-tip-bg:       rgba(255,255,255,0.04);
          --sl-tip-border:   rgba(255,255,255,0.08);
          --sl-tip-text:     rgba(255,255,255,0.56);
          --sl-pip:          rgba(255,255,255,0.15);
          --sl-pip-active:   #179eff;
          --sl-ring-bg:      rgba(23,158,255,0.18);
          --sl-ring-bd:      rgba(23,158,255,0.30);
          --sl-core-a:       #0284c7;
          --sl-core-b:       #059669;
          --sl-core-shadow:  rgba(23,158,255,0.45);
          --sl-pulse-c:      rgba(23,158,255,0.42);
          --sl-blob-a:       rgba(23,158,255,0.18);
          --sl-blob-b:       rgba(16,185,129,0.14);
          --sl-blob-c:       rgba(99,102,241,0.07);
          --sl-grid:         rgba(255,255,255,0.022);
        }

        /* ═══════════════════════════════════════
           PAGE SHELL
        ═══════════════════════════════════════ */
        .sl-page {
          position: fixed; inset: 0;
          background: var(--sl-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          overflow: hidden;
          z-index: 9999;
          transition: background 0.3s;
        }

        /* ═══════════════════════════════════════
           AMBIENT BLOBS
        ═══════════════════════════════════════ */
        .sl-blob {
          position: fixed; border-radius: 50%;
          pointer-events: none; z-index: 0;
          animation: slBlobDrift ease-in-out infinite;
        }
        .sl-blob-1 {
          width: min(520px,90vw); height: min(520px,90vw);
          background: var(--sl-blob-a); filter: blur(min(90px,15vw));
          top:-15%; left:-15%; animation-duration:9s;
        }
        .sl-blob-2 {
          width: min(380px,70vw); height: min(380px,70vw);
          background: var(--sl-blob-b); filter: blur(min(80px,14vw));
          bottom:-12%; right:-12%;
          animation-duration:11s; animation-delay:2.5s; animation-direction:reverse;
        }
        .sl-blob-3 {
          width: min(250px,55vw); height: min(250px,55vw);
          background: var(--sl-blob-c); filter: blur(min(70px,12vw));
          top:35%; right:5%; animation-duration:7.5s; animation-delay:4s;
        }

        /* ═══════════════════════════════════════
           GRID OVERLAY
        ═══════════════════════════════════════ */
        .sl-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(var(--sl-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--sl-grid) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none; z-index: 0;
        }

        /* ═══════════════════════════════════════
           LOGO PARTICLES
        ═══════════════════════════════════════ */
        .sl-particle {
          position: fixed; bottom: -30px;
          pointer-events: none; z-index: 0;
          animation: slParticleFloat linear infinite;
          display: flex; align-items: center; justify-content: center;
        }

        /* ═══════════════════════════════════════
           CARD
        ═══════════════════════════════════════ */
        .sl-card {
          position: relative; z-index: 1;
          width: min(360px, calc(100vw - 40px));
          padding: clamp(28px,6vw,44px) clamp(22px,5vw,36px) clamp(28px,6vw,40px);
          background: var(--sl-card-bg);
          border: 1px solid var(--sl-card-border);
          border-radius: clamp(24px,5vw,36px);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: var(--sl-card-shadow);
          display: flex; flex-direction: column; align-items: center;
        }

        /* ═══════════════════════════════════════
           LOGO
        ═══════════════════════════════════════ */
        .sl-logo-wrap {
          position: relative;
          width: clamp(76px,20vw,92px); height: clamp(76px,20vw,92px);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: clamp(20px,4vw,26px);
        }
        .sl-pulse {
          position: absolute; border-radius: 50%;
          border: 2px solid var(--sl-pulse-c);
          pointer-events: none;
        }
        .sl-pulse-inner { inset:-6px; animation: slRingPulse 2.4s ease-out infinite; }
        .sl-pulse-outer { inset:-14px; animation: slRingPulse 2.4s ease-out 0.7s infinite; opacity:0.5; }
        .sl-logo-ring {
          width:100%; height:100%; border-radius:50%;
          background: var(--sl-ring-bg); border: 1.5px solid var(--sl-ring-bd);
          display:flex; align-items:center; justify-content:center; position:relative; z-index:2;
        }
        .sl-logo-core {
          width:62%; height:62%; border-radius:50%;
          background: linear-gradient(135deg, var(--sl-core-a) 0%, var(--sl-core-b) 100%);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 0 28px var(--sl-core-shadow), 0 0 56px rgba(16,185,129,0.12);
          animation: slLogoBounce 2.6s ease-in-out infinite;
        }

        /* ═══════════════════════════════════════
           BRAND TEXT
        ═══════════════════════════════════════ */
        .sl-brand-name {
          margin: 0 0 5px;
          font-size: clamp(26px,8vw,36px); font-weight:900; letter-spacing:-1px;
          background: linear-gradient(135deg, var(--sl-brand-from) 30%, var(--sl-brand-to) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height:1.05; text-align:center;
        }
        .sl-brand-sub {
          margin: 0 0 clamp(20px,4.5vw,30px);
          font-size: clamp(9px,2.5vw,11px); font-weight:700;
          letter-spacing: clamp(1.2px,0.4vw,2px);
          text-transform:uppercase; color: var(--sl-brand-sub); text-align:center;
        }

        /* ═══════════════════════════════════════
           SPINNER ROW
        ═══════════════════════════════════════ */
        .sl-spinner-row { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .sl-spinner {
          width:20px; height:20px; flex-shrink:0; border-radius:50%;
          border: 2.5px solid var(--sl-spinner-rim);
          border-top-color: var(--sl-spinner-tip);
          animation: slSpin 0.72s linear infinite;
        }
        .sl-phase-text {
          font-size: clamp(11px,3vw,13px); font-weight:600;
          color: var(--sl-phase); letter-spacing:0.2px; min-width:168px;
        }

        /* ═══════════════════════════════════════
           PROGRESS
        ═══════════════════════════════════════ */
        .sl-progress-track {
          width:100%; height:5px;
          background: var(--sl-track);
          border-radius:999px; overflow:hidden;
          margin-bottom:6px; position:relative;
        }
        .sl-progress-fill {
          height:100%; min-width:6px;
          background: linear-gradient(90deg, var(--sl-fill-a), var(--sl-fill-b), var(--sl-fill-c));
          border-radius:999px;
          transition: width 0.45s ease;
          position:relative; overflow:hidden;
        }
        .sl-progress-shimmer {
          position:absolute; inset:0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.42) 50%, transparent 100%);
          animation: slShimmer 1.8s ease-in-out infinite;
        }
        .sl-progress-pct {
          font-size:11px; font-weight:700; color: var(--sl-pct);
          align-self:flex-end;
          margin-bottom: clamp(18px,4vw,26px);
          letter-spacing:0.4px;
        }

        /* ═══════════════════════════════════════
           TIP CARD
        ═══════════════════════════════════════ */
        .sl-tip-card {
          width:100%;
          background: var(--sl-tip-bg); border: 1px solid var(--sl-tip-border);
          border-radius: clamp(14px,3vw,18px);
          padding: clamp(12px,3vw,15px) clamp(13px,3.5vw,17px);
          display:flex; align-items:flex-start; gap:12px;
          transition: opacity 0.38s ease, transform 0.38s ease;
          margin-bottom:16px;
        }
        .sl-tip-icon { font-size: clamp(18px,4.5vw,22px); line-height:1; flex-shrink:0; margin-top:1px; }
        .sl-tip-text {
          margin:0;
          font-size: clamp(11.5px,3vw,13px); font-weight:500;
          color: var(--sl-tip-text); line-height:1.56;
        }

        /* ═══════════════════════════════════════
           PIPS
        ═══════════════════════════════════════ */
        .sl-pips { display:flex; gap:6px; align-items:center; }
        .sl-pip {
          width:6px; height:6px; border-radius:50%;
          background: var(--sl-pip);
          transition: background 0.3s, transform 0.3s;
        }
        .sl-pip-active { background: var(--sl-pip-active) !important; transform:scale(1.5); }

        /* ═══════════════════════════════════════
           KEYFRAMES
        ═══════════════════════════════════════ */
        @keyframes slBlobDrift {
          0%,100% { transform: scale(1) translate(0,0); }
          33%      { transform: scale(1.08) translate(2.5%,-2.5%); }
          66%      { transform: scale(0.94) translate(-2%,1.5%); }
        }
        @keyframes slParticleFloat {
          0%   { transform:translateY(0) rotate(0deg) scale(0.85); opacity:0; }
          8%   { opacity:1; }
          50%  { transform:translateY(-58vh) rotate(200deg) scale(1.05); }
          92%  { opacity:0.6; }
          100% { transform:translateY(-115vh) rotate(380deg) scale(0.75); opacity:0; }
        }
        @keyframes slSpin { to { transform:rotate(360deg); } }
        @keyframes slShimmer {
          0%   { transform:translateX(-150%); }
          100% { transform:translateX(200%); }
        }
        @keyframes slRingPulse {
          0%,100% { opacity:0.5; transform:scale(1); }
          60%     { opacity:0;   transform:scale(1.6); }
        }
        @keyframes slLogoBounce {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-5px); }
        }

        /* ═══════════════════════════════════════
           RESPONSIVE BREAKPOINTS
        ═══════════════════════════════════════ */
        @media (min-width: 480px) {
          .sl-card { width: min(390px, calc(100vw - 48px)); }
        }
        @media (min-width: 768px) {
          .sl-card { width:400px; }
        }
        /* Very small screens (320px) */
        @media (max-width: 359px) {
          .sl-card { padding:22px 18px 24px; }
          .sl-phase-text { min-width:0; }
        }
      `}</style>
        </div>
    );
}