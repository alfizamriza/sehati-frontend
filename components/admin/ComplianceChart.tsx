"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { useEffect, useState } from "react";

interface ComplianceChartProps {
  labels: string[];
  data:   number[];
}

// ── Read CSS variable at runtime (respects light/dark mode) ──────────────────
function getCSSVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() || fallback
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background:   getCSSVar("--chart-tooltip-bg",     "#0a0e27"),
        border:       `1px solid ${getCSSVar("--chart-tooltip-border", "rgba(255,255,255,0.12)")}`,
        borderRadius: 12,
        padding:      "10px 14px",
        color:        getCSSVar("--chart-tooltip-text",   "#fff"),
        fontSize:     13,
        fontFamily:   getCSSVar("--font-body",            "inherit"),
        boxShadow:    "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, opacity: 0.7, fontSize: 11 }}>
        {label}
      </div>
      <div style={{ color: getCSSVar("--chart-tooltip-item", "#179EFF"), fontWeight: 800, fontSize: 15 }}>
        {val}%
      </div>
      <div style={{ opacity: 0.55, fontSize: 10, marginTop: 2 }}>kepatuhan</div>
    </div>
  );
}

// ── Main chart ────────────────────────────────────────────────────────────────
export default function ComplianceChart({ labels, data }: ComplianceChartProps) {
  const chartData =
    labels?.map((label, i) => ({ name: label, value: data?.[i] ?? 0 })) ?? [];

  // Track color scheme changes so chart re-renders with correct colors
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => forceUpdate((n) => n + 1);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const lineColor  = getCSSVar("--chart-line",       "#179EFF");
  const gridColor  = getCSSVar("--chart-grid",       "rgba(255,255,255,0.07)");
  const tickColor  = getCSSVar("--chart-tick",       "rgba(255,255,255,0.40)");
  const fillStart  = getCSSVar("--chart-fill-start", "rgba(23,158,255,0.30)");
  const fillEnd    = getCSSVar("--chart-fill-end",   "rgba(23,158,255,0.00)");

  return (
    <div style={{ width: "100%", height: "260px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
        >
          <defs>
            <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={lineColor} stopOpacity={0.28} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />

          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: tickColor, fontSize: 12, fontFamily: "inherit" }}
            dy={8}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: tickColor, fontSize: 11, fontFamily: "inherit" }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: lineColor,
              strokeWidth: 1,
              strokeDasharray: "4 4",
              opacity: 0.5,
            }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#complianceGradient)"
            dot={{ fill: lineColor, strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}