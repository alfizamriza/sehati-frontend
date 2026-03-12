"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Coins } from "lucide-react";
import Confetti from "react-confetti";
import { Achievement, markAchievementsAsDisplayed } from "@/lib/services/siswa";

interface AchievementPopupProps {
  achievements: Achievement[];
  onClose: () => void;
}

export default function AchievementPopup({ achievements, onClose }: AchievementPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(true);

  const currentAchievement = achievements[currentIndex];

  useEffect(() => {
    // Stop confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const handleNext = async () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowConfetti(true);
    } else {
      // Mark all as displayed
      const achievementIds = achievements.map((a) => a.id);
      await markAchievementsAsDisplayed(achievementIds);
      onClose();
    }
  };

  const badgeColorMap: Record<string, string> = {
    orange: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    yellow: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    blue: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    purple: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    gold: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
    diamond: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
    green: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 450,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          border: "2px solid rgba(251, 191, 36, 0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow Effect */}
        <div
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: `radial-gradient(circle, ${badgeColorMap[currentAchievement.badgeColor] || badgeColorMap.blue} 0%, transparent 70%)`,
            opacity: 0.15,
            pointerEvents: "none",
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            zIndex: 10,
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", padding: "32px 24px 24px", position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(251, 191, 36, 0.15)",
              padding: "6px 16px",
              borderRadius: 20,
              marginBottom: 20,
            }}
          >
            <Sparkles size={16} color="#fbbf24" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>
              PENCAPAIAN BARU!
            </span>
          </div>

          {/* Icon Badge */}
          <div
            style={{
              width: 120,
              height: 120,
              margin: "0 auto 24px",
              borderRadius: "50%",
              background: badgeColorMap[currentAchievement.badgeColor] || badgeColorMap.blue,
              display: "grid",
              placeItems: "center",
              fontSize: 56,
              boxShadow: `0 20px 60px ${badgeColorMap[currentAchievement.badgeColor]?.split(" ")[1]?.split(",")[0] || "rgba(59,130,246,0.4)"}`,
              animation: "float 3s ease-in-out infinite",
            }}
          >
            {currentAchievement.icon}
          </div>

          {/* Achievement Name */}
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "0 0 8px",
              lineHeight: 1.2,
            }}
          >
            {currentAchievement.nama}
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              margin: "0 0 20px",
              lineHeight: 1.5,
            }}
          >
            {currentAchievement.deskripsi}
          </p>

          {/* Coins Reward */}
          {currentAchievement.coinsReward > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(251, 191, 36, 0.1)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                padding: "10px 20px",
                borderRadius: 12,
              }}
            >
              <Coins size={20} color="#fbbf24" />
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24" }}>
                +{currentAchievement.coinsReward} Koin
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            background: "rgba(255,255,255,0.03)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, opacity: 0.5 }}>
            {currentIndex + 1} dari {achievements.length}
          </span>
          <button
            onClick={handleNext}
            className="btn btn-primary"
            style={{
              background: badgeColorMap[currentAchievement.badgeColor] || badgeColorMap.blue,
              border: "none",
            }}
          >
            {currentIndex < achievements.length - 1 ? "Selanjutnya" : "Tutup"}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
