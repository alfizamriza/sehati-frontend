"use client";

import { useEffect, useState } from "react";
import type { ThemeKey } from "@/lib/dummy/types";

const THEME_MAP: Record<ThemeKey, { primary: string; primary2: string; gradient: string }> = {
  default: {
    primary: "#179EFF",
    primary2: "#0B6DFF",
    gradient: "linear-gradient(135deg, #179EFF 0%, #179EFF 100%)",
  },
  blue: {
    primary: "#4facfe",
    primary2: "#00f2fe",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  green: {
    primary: "#43e97b",
    primary2: "#38f9d7",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  yellow: {
    primary: "#fa709a",
    primary2: "#fee140",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  deep: {
    primary: "#30cfd0",
    primary2: "#330867",
    gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  },
  pink: {
    primary: "#f093fb",
    primary2: "#f5576c",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
};

function applyTheme(theme: ThemeKey) {
  if (typeof document === "undefined") return;
  
  const cfg = THEME_MAP[theme] ?? THEME_MAP.default;
  document.documentElement.style.setProperty("--primary", cfg.primary);
  document.documentElement.style.setProperty("--primary2", cfg.primary2);
  document.documentElement.style.setProperty("--primary-gradient", cfg.gradient);
  
  // Calculate hover color (slightly darker)
  const hoverColor = adjustBrightness(cfg.primary, -15);
  document.documentElement.style.setProperty("--primary-hover", hoverColor);
}

function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace("#", "");
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  const newR = Math.max(0, Math.min(255, r + (r * percent) / 100));
  const newG = Math.max(0, Math.min(255, g + (g * percent) / 100));
  const newB = Math.max(0, Math.min(255, b + (b * percent) / 100));
  
  // Convert back to hex
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

function applyDarkMode(enabled: boolean) {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  if (enabled) {
    html.classList.add("dark");
    html.classList.remove("light");
    html.setAttribute("data-theme", "dark");
  } else {
    html.classList.remove("dark");
    html.classList.add("light");
    html.setAttribute("data-theme", "light");
  }
}

export function useTheme() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = () => {
      // Keep accent theme configurable; default is safe fallback.
      applyTheme("default");
      applyDarkMode(media.matches);
      setLoading(false);
    };

    syncTheme();

    const handleMediaChange = () => {
      syncTheme();
    };

    media.addEventListener("change", handleMediaChange);

    return () => {
      media.removeEventListener("change", handleMediaChange);
    };
  }, []);

  return { loading };
}

