import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

type StandardApiResponse<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type ApiClientError = Error & {
  status?: number;
  code?: string;
  details?: unknown;
  response?: {
    status?: number;
    data?: {
      success: false;
      message: string;
      error: {
        code?: string;
        details?: unknown;
      };
    };
  };
  original?: unknown;
};

function toLogString(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

api.interceptors.request.use(
  (config) => {
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData &&
      config.headers
    ) {
      const headers = config.headers as Record<string, unknown> & {
        delete?: (key: string) => void;
      };
      if (typeof headers.delete === "function") {
        headers.delete("Content-Type");
      } else {
        delete headers["Content-Type"];
      }
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAxiosErr = axios.isAxiosError(error);
    const status = error?.response?.status;
    const path = error?.config?.url || error?.request?.responseURL;
    const method = (error?.config?.method || "").toUpperCase() || "UNKNOWN";
    const suppressErrorLog = Boolean(
      (error?.config as { suppressErrorLog?: boolean } | undefined)?.suppressErrorLog,
    );

    const serverData = (error?.response?.data || {}) as StandardApiResponse;
    const serverMessage =
      serverData?.message ||
      serverData?.error?.message ||
      error?.message ||
      "Terjadi kesalahan pada server";
    const errorCode = serverData?.error?.code;
    const details = serverData?.error?.details;
    const axiosCode = error?.code;

    if (!suppressErrorLog) {
      const logParts = [
        `kind=${isAxiosErr ? "axios" : "unknown"}`,
        `status=${status ?? "-"}`,
        `method=${method}`,
        `path=${path ?? "-"}`,
        `message=${error?.message || "Unknown client error"}`,
        `serverMessage=${serverMessage}`,
        `errorCode=${errorCode ?? "-"}`,
        `axiosCode=${axiosCode ?? "-"}`,
      ];

      console.error(`API Error | ${logParts.join(" | ")}`);

      if (details != null) {
        console.error(`API Error Details | ${toLogString(details)}`);
      }
    }

    if (status === 401 && typeof window !== "undefined") {
      const isAuthEndpoint =
        path && (path.includes("/login") || path.includes("/register"));

      if (!isAuthEndpoint) {
        localStorage.removeItem("auth_profile");
        localStorage.removeItem("auth_role");
        window.location.href = "/auth";
      }
    }

    const normalizedError = Object.assign(new Error(serverMessage), {
      name: "ApiClientError",
      status,
      code: errorCode,
      details,
      response: {
        status,
        data: {
          success: false as const,
          message: serverMessage,
          error: {
            code: errorCode,
            details,
          },
        },
      },
      original: error,
    }) as ApiClientError;

    return Promise.reject(normalizedError);
  },
);

export default api;
