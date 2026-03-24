"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Coins } from "lucide-react";
import Confetti from "react-confetti";
import { Achievement, markAchievementsAsDisplayed } from "@/lib/services/siswa";

interface AchievementPopupProps {
  achievements: Achievement[];
  onClose: () => void;
}

// ─── badge color → gradient map ───────────────────────────────────────────────
const BADGE_GRADIENT: Record<string, string> = {
  orange: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
  yellow: "linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)",
  blue: "linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)",
  purple: "linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)",
  gold: "linear-gradient(135deg,#fbbf24 0%,#d97706 100%)",
  diamond: "linear-gradient(135deg,#a78bfa 0%,#8b5cf6 100%)",
  green: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
};

// solid color untuk glow / box-shadow
const BADGE_GLOW: Record<string, string> = {
  orange: "rgba(245,158,11,0.45)",
  yellow: "rgba(251,191,36,0.45)",
  blue: "rgba(59,130,246,0.45)",
  purple: "rgba(139,92,246,0.45)",
  gold: "rgba(245,158,11,0.45)",
  diamond: "rgba(167,139,250,0.45)",
  green: "rgba(16,185,129,0.45)",
};

// Untuk teks di light mode (warna lebih gelap dari badge)
const BADGE_TEXT_LIGHT: Record<string, string> = {
  orange: "#b45309",
  yellow: "#92400e",
  blue: "#1d4ed8",
  purple: "#5b21b6",
  gold: "#b45309",
  diamond: "#5b21b6",
  green: "#065f46",
};

export default function AchievementPopup({ achievements, onClose }: AchievementPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const ach = achievements[currentIndex];
  const gradient = BADGE_GRADIENT[ach.badgeColor] ?? BADGE_GRADIENT.blue;
  const glowColor = BADGE_GLOW[ach.badgeColor] ?? BADGE_GLOW.blue;
  const textLight = BADGE_TEXT_LIGHT[ach.badgeColor] ?? "#1d4ed8";

  // Detect system / page theme — honour data-theme pada <html>
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Reset confetti on new achievement
  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, [currentIndex]);

  const handleNext = async () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      await markAchievementsAsDisplayed(achievements.map((a) => a.id));
      onClose();
    }
  };

  // ── Computed styles ─────────────────────────────────────────────────────────
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    background: isDark
      ? "rgba(2,6,23,0.65)"
      : "rgba(241,245,249,0.55)",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    // Liquid glass — different per theme
    ...(isDark ? {
      background: "rgba(15,23,42,0.88)",
      border: "2px solid rgba(251,191,36,0.28)",
      backdropFilter: "blur(36px) saturate(1.4) brightness(0.9)",
      WebkitBackdropFilter: "blur(36px) saturate(1.4) brightness(0.9)",
      boxShadow: [
        "inset 0 1.5px 0 rgba(255,255,255,0.14)",
        "0 28px 70px rgba(0,0,0,0.55)",
        "0 10px 28px rgba(0,0,0,0.35)",
      ].join(","),
    } : {
      background: "rgba(255,255,255,0.82)",
      border: "1px solid rgba(255,255,255,0.92)",
      backdropFilter: "blur(36px) saturate(2) brightness(1.04)",
      WebkitBackdropFilter: "blur(36px) saturate(2) brightness(1.04)",
      boxShadow: [
        "inset 0 1.5px 0 rgba(255,255,255,1)",
        "0 28px 70px rgba(31,38,135,0.18)",
        "0 10px 28px rgba(31,38,135,0.10)",
      ].join(","),
    }),
  };

  const newBadgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 16px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: 22,
    ...(isDark ? {
      background: "rgba(251,191,36,0.13)",
      border: "1px solid rgba(251,191,36,0.28)",
      color: "#fbbf24",
    } : {
      background: "rgba(245,158,11,0.10)",
      border: "1px solid rgba(245,158,11,0.28)",
      color: textLight,
    }),
  };

  const iconWrapStyle: React.CSSProperties = {
    width: 110,
    height: 110,
    margin: "0 auto 22px",
    borderRadius: "50%",
    background: gradient,
    display: "grid",
    placeItems: "center",
    fontSize: 52,
    position: "relative",
    animation: "achFloat 3s ease-in-out infinite",
    boxShadow: isDark
      ? `0 0 0 6px rgba(255,255,255,0.07), 0 0 40px ${glowColor}`
      : `0 0 0 6px rgba(255,255,255,0.7), 0 0 0 10px rgba(255,255,255,0.28), 0 12px 32px ${glowColor}`,
  };

  const achNameStyle: React.CSSProperties = {
    fontSize: "1.45rem",
    fontWeight: 900,
    margin: "0 0 8px",
    lineHeight: 1.2,
    letterSpacing: "-0.4px",
    color: isDark ? "#f8fafc" : "#0f172a",
  };

  const achDescStyle: React.CSSProperties = {
    fontSize: "0.86rem",
    fontWeight: 500,
    margin: "0 0 20px",
    lineHeight: 1.6,
    color: isDark ? "rgba(255,255,255,0.55)" : "#64748b",
  };

  const coinsChipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 22px",
    borderRadius: 14,
    ...(isDark ? {
      background: "rgba(251,191,36,0.10)",
      border: "1px solid rgba(251,191,36,0.3)",
    } : {
      background: "rgba(245,158,11,0.09)",
      border: "1.5px solid rgba(245,158,11,0.26)",
      boxShadow: "0 2px 10px rgba(245,158,11,0.10)",
    }),
  };

  const footerStyle: React.CSSProperties = {
    padding: "14px 22px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    ...(isDark ? {
      background: "rgba(255,255,255,0.03)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
    } : {
      background: "rgba(248,250,252,0.65)",
      borderTop: "1px solid rgba(0,0,0,0.06)",
    }),
  };

  const nextBtnStyle: React.CSSProperties = {
    padding: "11px 24px",
    borderRadius: 14,
    border: "none",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    fontWeight: 800,
    cursor: "pointer",
    color: "#fff",
    background: gradient,
    boxShadow: `0 4px 16px ${glowColor}`,
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 400}
          height={typeof window !== "undefined" ? window.innerHeight : 800}
          recycle={false}
          numberOfPieces={200}
          colors={["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#ec4899"]}
        />
      )}

      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>

        {/* Radial glow backdrop */}
        <div style={{
          position: "absolute",
          top: "-40%",
          left: "-40%",
          width: "180%",
          height: "180%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 65%)`,
          opacity: isDark ? 0.18 : 0.10,
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: "50%",
        }} />

        {/* Liquid glass refraction highlight */}
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: "inherit",
          background: isDark
            ? `radial-gradient(ellipse 70% 50% at 22% 15%, rgba(255,255,255,0.08) 0%, transparent 55%),
               radial-gradient(ellipse 55% 40% at 78% 82%, rgba(255,255,255,0.03) 0%, transparent 50%)`
            : `radial-gradient(ellipse 70% 50% at 22% 15%, rgba(255,255,255,0.55) 0%, transparent 55%),
               radial-gradient(ellipse 55% 40% at 78% 82%, rgba(255,255,255,0.22) 0%, transparent 50%)`,
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              zIndex: 10,
              transition: "background 0.15s, color 0.15s",
              background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
              color: isDark ? "#fff" : "#64748b",
            }}
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div style={{ textAlign: "center", padding: "32px 24px 20px" }}>

            {/* "Pencapaian Baru" badge */}
            <div style={newBadgeStyle}>
              <Sparkles size={14} />
              Pencapaian Baru!
            </div>

            {/* Floating icon */}
            <div style={iconWrapStyle}>
              {/* Inner shine */}
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: isDark
                  ? "radial-gradient(ellipse 60% 50% at 35% 22%, rgba(255,255,255,0.18) 0%, transparent 55%)"
                  : "radial-gradient(ellipse 60% 50% at 35% 22%, rgba(255,255,255,0.45) 0%, transparent 55%)",
                pointerEvents: "none",
                zIndex: 1,
              }} />
              <span style={{ position: "relative", zIndex: 2 }}>{ach.icon}</span>
            </div>

            <h2 style={achNameStyle}>{ach.nama}</h2>
            <p style={achDescStyle}>{ach.deskripsi}</p>

            {ach.coinsReward > 0 && (
              <div style={coinsChipStyle}>
                <Coins size={20} color={isDark ? "#fbbf24" : textLight} />
                <span style={{
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: isDark ? "#fbbf24" : textLight,
                }}>
                  +{ach.coinsReward} Koin
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <span style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: isDark ? "rgba(255,255,255,0.3)" : "#94a3b8",
            }}>
              {currentIndex + 1} dari {achievements.length}
            </span>
            <button
              onClick={handleNext}
              style={nextBtnStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 22px ${glowColor}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${glowColor}`;
              }}
            >
              {currentIndex < achievements.length - 1 ? "Selanjutnya →" : "Tutup"}
            </button>
          </div>
        </div>
      </div>

      {/* Float + shimmer keyframes */}
      <style>{`
        @keyframes achFloat {
          0%,100% { transform: translateY(0) rotate(-1deg); }
          50%      { transform: translateY(-10px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}