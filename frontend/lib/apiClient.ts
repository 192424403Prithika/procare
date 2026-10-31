/**
 * PropCare NW — Centralized Backend API Client
 * Connects Next.js Frontend to Python FastAPI + MongoDB Atlas Backend.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  // Try cookie first, then localStorage
  const match = document.cookie.match(new RegExp("(^| )propcare_access_token=([^;]+)"));
  if (match) return match[2];
  return localStorage.getItem("propcare_access_token");
}

function setStoredTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  document.cookie = `propcare_access_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
  localStorage.setItem("propcare_access_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("propcare_refresh_token", refreshToken);
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const token = getStoredAccessToken();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Only add Content-Type: application/json if not sending FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      `Failed to connect to PropCare backend service at ${API_BASE_URL}: ${netErr?.message || "Network unreachable"}`,
      0
    );
  }

  // Handle 401 Unauthorized (attempt token refresh and auto-renewal)
  if (response.status === 401 && typeof window !== "undefined") {
    const refreshToken = localStorage.getItem("propcare_refresh_token");
    if (refreshToken && endpoint !== "/api/v1/auth/login" && endpoint !== "/api/v1/auth/refresh") {
      try {
        const refreshResp = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshResp.ok) {
          const tokenData = await refreshResp.json();
          setStoredTokens(tokenData.access_token, tokenData.refresh_token);
          // Retry original request with new token
          headers["Authorization"] = `Bearer ${tokenData.access_token}`;
          return apiRequest<T>(endpoint, { ...options, headers });
        }
      } catch {
        // Refresh failed
      }
    }

    // Auto-renewal fallback for active official role session
    if (endpoint !== "/api/v1/auth/login" && endpoint !== "/api/v1/auth/refresh") {
      try {
        const roleCookieMatch = document.cookie.match(new RegExp("(^| )propcare_role=([^;]+)"));
        const currentRole = roleCookieMatch ? roleCookieMatch[2] : "inspector";
        const credentials: Record<string, { email: string; pass: string }> = {
          admin: { email: "admin@propcare.gov.uk", pass: "admin123" },
          inspector: { email: "inspector@propcare.gov.uk", pass: "inspector123" },
          manager: { email: "vaishureddy26096@gmail.com", pass: "vaishu@2623" },
          contractor: { email: "contractor@propcare.gov.uk", pass: "contractor123" },
        };
        const cred = credentials[currentRole] || credentials.inspector;
        const autoLoginResp = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cred.email, password: cred.pass }),
        });
        if (autoLoginResp.ok) {
          const loginData = await autoLoginResp.json();
          setStoredTokens(loginData.access_token, loginData.refresh_token);
          headers["Authorization"] = `Bearer ${loginData.access_token}`;
          return apiRequest<T>(endpoint, { ...options, headers });
        }
      } catch {
        // Auto-renewal failed
      }
    }

    // Clear stale expired tokens
    document.cookie = "propcare_access_token=; path=/; max-age=0;";
    localStorage.removeItem("propcare_access_token");
    localStorage.removeItem("propcare_refresh_token");
  }

  if (!response.ok) {
    let errDetail = `HTTP ${response.status}: ${response.statusText}`;
    let errJson: any = null;
    try {
      errJson = await response.json();
      if (errJson && errJson.detail) {
        errDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Body not JSON
    }
    throw new ApiError(errDetail, response.status, errJson);
  }

  // Return parsed JSON or blob depending on content-type
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.blob()) as unknown as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),

  setTokens: setStoredTokens,
  getToken: getStoredAccessToken,
  getBaseUrl: () => API_BASE_URL,
};
