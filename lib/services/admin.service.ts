import api from "@/lib/api";
import authService from "@/lib/auth";

const DASHBOARD_CACHE_TTL_MS = 30_000;
let dashboardCache: { data: any; timestamp: number } | null = null;

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export interface LoginAuditLogItem {
  id: string;
  role: "admin" | "guru" | "siswa" | "kantin";
  actorUserId: string | null;
  actorIdentifier: string;
  actorName: string | null;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: "success" | "failed";
  failureReason: string | null;
  createdAt: string;
}

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
      totalSiswaAktif: Number(payload?.stats?.totalSiswaAktif ?? 0),
      totalGuru: Number(payload?.stats?.totalGuru ?? 0),
      totalGuruAktif: Number(payload?.stats?.totalGuruAktif ?? 0),
      totalKelas: Number(payload?.stats?.totalKelas ?? 0),
      totalCoins: Number(payload?.stats?.totalCoins ?? 0),
      totalVoucher: Number(payload?.stats?.totalVoucher ?? 0),
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

export async function getLoginLogs(limit = 50): Promise<LoginAuditLogItem[]> {
  const res = await api.get("/auth/login-logs", {
    params: { limit },
  });

  let payload: any = res.data;
  while (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    payload = (payload as ApiEnvelope).data;
  }

  return Array.isArray(payload) ? payload : [];
}
