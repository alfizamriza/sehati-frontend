"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  History,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Users,
  Monitor,
  Clock3,
} from "lucide-react";
import { ErrorState, LoadingState } from "@/components/common/AsyncState";
import { getLoginLogs, type LoginAuditLogItem } from "@/lib/services/admin";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function roleLabel(role: LoginAuditLogItem["role"]) {
  switch (role) {
    case "admin":
      return "Admin";
    case "guru":
      return "Guru";
    case "siswa":
      return "Siswa";
    case "kantin":
      return "Kantin";
    default:
      return role;
  }
}

function statusLabel(status: LoginAuditLogItem["status"]) {
  return status === "success" ? "Berhasil" : "Gagal";
}

function summarizeUserAgent(userAgent: string | null) {
  if (!userAgent) return "Tidak tersedia";

  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iOS/i.test(userAgent)) return "iPhone / iPad";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Macintosh|Mac OS/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";

  return userAgent.length > 48 ? `${userAgent.slice(0, 48)}...` : userAgent;
}

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LoginAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");

  const load = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getLoginLogs(100);
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil riwayat login.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredLogs = useMemo(() => {
    if (statusFilter === "all") return logs;
    return logs.filter((item) => item.status === statusFilter);
  }, [logs, statusFilter]);

  const stats = useMemo(() => {
    const successCount = logs.filter((item) => item.status === "success").length;
    const failedCount = logs.length - successCount;
    const uniqueUsers = new Set(logs.map((item) => `${item.role}:${item.actorIdentifier}`)).size;

    return {
      total: logs.length,
      success: successCount,
      failed: failedCount,
      users: uniqueUsers,
    };
  }, [logs]);

  if (loading) {
    return <LoadingState message="Memuat riwayat login..." />;
  }

  if (error && logs.length === 0) {
    return (
      <ErrorState
        title="Riwayat Login Gagal Dimuat"
        message={error}
        onRetry={() => {
          setError(null);
          load(true);
        }}
      />
    );
  }

  return (
    <div className="login-log-page">
      <section className="glass-card login-log-hero">
        <div className="card-header-fancy login-log-hero-header">
          <div className="header-title-box">
            <div className="icon-indicator blue" />
            <h3>Audit Login Sistem</h3>
          </div>
          <button
            type="button"
            className="hero-refresh-btn"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={12} className={refreshing ? "spin" : ""} />
            {refreshing ? "Memperbarui..." : "Refresh"}
          </button>
        </div>

        <div className="login-log-hero-copy">
          <p>
            Pantau siapa yang login, kapan mereka masuk, dari perangkat apa, dan
            apakah percobaan login berhasil atau gagal.
          </p>
          {error && <div className="guru-password-error">{error}</div>}
        </div>

        <div className="login-log-stats">
          <div className="login-log-stat-card">
            <div className="login-log-stat-icon blue">
              <History size={18} />
            </div>
            <div>
              <div className="login-log-stat-value">{stats.total}</div>
              <div className="login-log-stat-label">Total log</div>
            </div>
          </div>
          <div className="login-log-stat-card">
            <div className="login-log-stat-icon green">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="login-log-stat-value">{stats.success}</div>
              <div className="login-log-stat-label">Login berhasil</div>
            </div>
          </div>
          <div className="login-log-stat-card">
            <div className="login-log-stat-icon red">
              <ShieldX size={18} />
            </div>
            <div>
              <div className="login-log-stat-value">{stats.failed}</div>
              <div className="login-log-stat-label">Login gagal</div>
            </div>
          </div>
          <div className="login-log-stat-card">
            <div className="login-log-stat-icon amber">
              <Users size={18} />
            </div>
            <div>
              <div className="login-log-stat-value">{stats.users}</div>
              <div className="login-log-stat-label">Akun tercatat</div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card">
        <div className="table-section-header">
          <div className="table-section-title">
            <Clock3 size={16} />
            <span>100 aktivitas login terbaru</span>
          </div>
          <div className="table-section-actions">
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill primary ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                Semua
              </button>
              <button
                type="button"
                className={`filter-pill green ${statusFilter === "success" ? "active" : ""}`}
                onClick={() => setStatusFilter("success")}
              >
                Berhasil
              </button>
              <button
                type="button"
                className={`filter-pill red ${statusFilter === "failed" ? "active" : ""}`}
                onClick={() => setStatusFilter("failed")}
              >
                Gagal
              </button>
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="empty-state login-log-empty">
            <div className="empty-state-icon">
              <History size={22} />
            </div>
            <div className="empty-state-text">
              Belum ada data login untuk filter yang dipilih.
            </div>
          </div>
        ) : (
          <div className="table-container login-log-table-wrap">
            <table className="custom-table login-log-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pengguna</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Perangkat</th>
                  <th>IP</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="login-log-primary">{formatDateTime(item.loginAt)}</div>
                      <div className="login-log-secondary">
                        {new Date(item.loginAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="login-log-primary">
                        {item.actorName || item.actorIdentifier}
                      </div>
                      <div className="login-log-secondary">{item.actorIdentifier}</div>
                    </td>
                    <td>
                      <span className={`role-badge ${item.role === "admin" ? "konselor" : item.role === "guru" ? "wali_kelas" : "guru_mapel"}`}>
                        {roleLabel(item.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status === "success" ? "active" : "inactive"}`}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td>
                      <div className="login-log-device">
                        <Monitor size={14} />
                        <span>{summarizeUserAgent(item.userAgent)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="login-log-primary">{item.ipAddress || "-"}</div>
                    </td>
                    <td>
                      <div className="login-log-note">
                        {item.status === "failed"
                          ? item.failureReason || "Login gagal"
                          : "Autentikasi berhasil"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
