import api from "@/lib/api";
import authService from "@/lib/auth";

const DASHBOARD_CACHE_TTL_MS = 30_000;
let dashboardCache: { data: any; timestamp: number } | null = null;

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export async function getDashboardData(forceRefresh = false) {
  if (
    !forceRefresh &&
    dashboardCache &&
    Date.now() - dashboardCache.timestamp < DASHBOARD_CACHE_TTL_MS
  ) {
    return dashboardCache.data;
  }

  const res = await api.get("/admin/dashboard");

  let payload: any = res.data;
  while (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    payload = (payload as ApiEnvelope).data;
  }

  const data = {
    stats: {
      totalSiswa: Number(payload?.stats?.totalSiswa ?? 0),
      totalGuru: Number(payload?.stats?.totalGuru ?? 0),
      totalKelas: Number(payload?.stats?.totalKelas ?? 0),
      totalCoins: Number(payload?.stats?.totalCoins ?? 0),
      voucherDiklaim: Number(payload?.stats?.voucherDiklaim ?? 0),
    },
    complianceChart: {
      labels: Array.isArray(payload?.complianceChart?.labels)
        ? payload.complianceChart.labels
        : [],
      data: Array.isArray(payload?.complianceChart?.data)
        ? payload.complianceChart.data
        : [],
    },
    leaderboard: Array.isArray(payload?.leaderboard) ? payload.leaderboard : [],
    recentActivities: Array.isArray(payload?.recentActivities)
      ? payload.recentActivities
      : [],
  };

  dashboardCache = {
    data,
    timestamp: Date.now(),
  };

  return data;
}

export async function getAdminUser() {
  const res = await authService.getProfileOnce();
  return res?.data ?? null;
}
