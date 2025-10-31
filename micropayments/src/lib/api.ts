export type UserType = "PAYER" | "RECIPIENT";
export type StreamStatus = "PENDING" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
export type TransactionType = "STREAM_START" | "STREAM_STOP" | "WITHDRAWAL" | "DEPOSIT";

export interface INonceRequest {
  walletAddress: string;
}

export interface INonceResponse {
  nonce: string;
  expiresAt: Date;
}

export interface IWalletAuthRequest {
  walletAddress: string;
  signature: string;
  nonce: string;
  // allow sending multiple roles so a user can be both payer and recipient
  userType: UserType;
  name: string;
  email: string;
}

export interface IWalletAuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    walletAddress: string;
    email: string;
    name: string;
    // backend may return stored roles as an array
    userType: UserType;
  };
}

export interface IJwtPayload {
  userId: string;
  walletAddress: string;
}

export interface IAuthUser {
  id: string;
  walletAddress: string;
  email?: string;
  name?: string;
}

// New streaming types
export interface StreamCalculation {
  streamId: string;
  currentBalance: string;
  claimableAmount: string;
  totalStreamed: string;
  withdrawnAmount: string;
  progress: number; // Percentage 0-100
  isActive: boolean;
  ratePerSecond: string;
  startTime: number; // Unix timestamp
  endTime: number | null; // Unix timestamp
  lastCalculated: number; // Unix timestamp
}

export interface WithdrawalLimits {
  maxWithdrawalsPerDay: number;
  withdrawalsUsedToday: number;
  remainingWithdrawals: number;
  canWithdraw: boolean;
  dayIndex: number; // Days since stream start
  nextWithdrawalTime: number | null; // Unix timestamp when next withdrawal is allowed
}

export interface StreamUser {
  id: string;
  walletAddress: string;
  name: string | null;
  email: string | null;
}

export interface StreamDetails {
  id: string;
  onChainStreamId?: number;
  payer: StreamUser;
  recipient: StreamUser;
  tokenAddress: string;
  totalAmount: string;
  status: StreamStatus;
  startTime: number; // Unix timestamp
  endTime: number | null; // Unix timestamp
  calculation: StreamCalculation;
  withdrawalLimits: WithdrawalLimits;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

export interface CreateStreamRequest {
  recipientAddress: string;
  tokenAddress: string;
  flowRate: string; // Rate per second
  totalAmount: string;
  ratePerSecond: string;
  duration: number; // Duration in seconds
  maxWithdrawalsPerDay?: number;
}

export interface PreparedTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  chainId: number;
}

export interface CreateStreamResponse {
  stream: StreamDetails;
  transaction: PreparedTransaction;
}

export interface WithdrawalRequest {
  streamId: string;
  amount: string;
}

export interface WithdrawalResponse {
  transaction: PreparedTransaction;
  withdrawalLimits: WithdrawalLimits;
}

export interface UserBalance {
  balances: Array<{
    tokenAddress: string;
    totalEarned: string;
    totalWithdrawn: string;
    availableBalance: string;
  }>;
  activeStreams: StreamCalculation[];
  totalActiveStreams: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: "STREAM_UPDATE" | "NOTIFICATION";
  data: StreamCalculation | { type: string; streamId: string; message: string; timestamp: number };
  timestamp: number;
}

const TOKEN_KEY = "ll:token";
const REFRESH_KEY = "ll:refresh";

export class ApiClient {
  baseUrl: string;
  storing: Storage;

  constructor(baseUrl = "/api", storage: Storage = typeof window !== "undefined" ? localStorage : ({} as Storage)) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.storing = storage;
  }

  get token(): string | null {
    try { return this.storing.getItem(TOKEN_KEY); } catch { return null; }
  }
  get refreshToken(): string | null {
    try { return this.storing.getItem(REFRESH_KEY); } catch { return null; }
  }

  setTokens(token: string, refreshToken: string) {
    try {
      this.storing.setItem(TOKEN_KEY, token);
      this.storing.setItem(REFRESH_KEY, refreshToken);
    } catch { /* noop */ }
  }

  clearTokens() {
    try {
      this.storing.removeItem(TOKEN_KEY);
      this.storing.removeItem(REFRESH_KEY);
    } catch { /* noop */ }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  async request<T = unknown>(path: string, opts: RequestInit = {}, retryOn401 = true): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.headers) {
      if (opts.headers instanceof Headers) {
        (opts.headers as Headers).forEach((v, k) => { headers[k] = v; });
      } else if (Array.isArray(opts.headers)) {
        (opts.headers as [string, string][]).forEach(([k, v]) => { headers[k] = v; });
      } else {
        Object.assign(headers, opts.headers as Record<string, string>);
      }
    }
    const token = this.token;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(this.baseUrl + path, { ...opts, headers });
    if (res.status === 401 && retryOn401 && this.refreshToken) {
      const ok = await this.attemptRefresh();
      if (ok) return this.request<T>(path, opts, false);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText || `Request failed: ${res.status}`);
    }

    // parse JSON and unwrap common envelope { success: boolean, data: ... }
    let payload: unknown = null;
    try {
      payload = await res.json();
      if (payload && typeof payload === "object" && ("success" in payload) && ("data" in payload)) {
        payload = (payload as { data: unknown }).data;
      }
    } catch {
      payload = null;
    }
    return payload as T;
  }

  private async attemptRefresh(): Promise<boolean> {
    const refresh = this.refreshToken;
    if (!refresh) return false;
    try {
      const res = await fetch(this.baseUrl + "/users/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        this.clearTokens();
        return false;
      }
      const payload = await res.json();
      if (payload?.token && payload?.refreshToken) {
        this.setTokens(String(payload.token), String(payload.refreshToken));
        return true;
      }
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async getNonce(body: INonceRequest): Promise<INonceResponse> {
    const res = await this.request<{ nonce: string; expiresAt: string }>("/auth/nonce", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { nonce: res.nonce, expiresAt: new Date(res.expiresAt) };
  }

  async walletAuth(body: IWalletAuthRequest): Promise<IWalletAuthResponse> {
    const res = await this.request<IWalletAuthResponse>("/auth/wallet", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res?.token && res?.refreshToken) this.setTokens(res.token, res.refreshToken);
    return res;
  }

  async refreshTokens(): Promise<IWalletAuthResponse> {
    const refresh = this.refreshToken;
    if (!refresh) throw new Error("No refresh token");
    const res = await fetch(this.baseUrl + "/users/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const payload = await res.json();
    if (payload?.token && payload?.refreshToken) this.setTokens(String(payload.token), String(payload.refreshToken));
    return payload as IWalletAuthResponse;
  }

  // Streaming API methods
  async createStream(request: CreateStreamRequest): Promise<CreateStreamResponse> {
    return this.request<CreateStreamResponse>("/streams", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getStream(streamId: string): Promise<StreamDetails> {
    return this.request<StreamDetails>(`/streams/${streamId}`);
  }

  async getUserStreams(
    status?: StreamStatus,
    page = 1,
    limit = 10
  ): Promise<{
    streams: StreamDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    return this.request(`/streams?${params.toString()}`);
  }

  async withdrawFromStream(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    return this.request<WithdrawalResponse>(`/streams/withdraw`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: request.streamId,
        amount: request.amount
      })
    });
  }

  async cancelStream(streamId: string): Promise<PreparedTransaction> {
    return this.request<PreparedTransaction>(`/streams/${streamId}/cancel`, {
      method: "POST",
    });
  }

  async confirmStreamTransaction(
    streamId: string,
    transactionHash: string,
    onChainStreamId?: number
  ): Promise<StreamDetails> {
    return this.request<StreamDetails>(`/streams/${streamId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ transactionHash, onChainStreamId }),
    });
  }

  async getUserBalance(tokenAddress?: string): Promise<UserBalance> {
    const params = tokenAddress ? `?tokenAddress=${tokenAddress}` : "";
    return this.request<UserBalance>(`/users/balance${params}`);
  }

  // WebSocket connection management
  createWebSocketConnection(): WebSocket | null {
    if (typeof window === "undefined") return null;

    const token = this.token;
    if (!token) return null;

    // For WebSocket, we need to connect to the server root, not /api
    const wsBaseUrl = this.baseUrl.replace(/^http/, "ws").replace(/\/api$/, "");
    const ws = new WebSocket(`${wsBaseUrl}/ws?token=${encodeURIComponent(token)}`);

    return ws;
  }

  // Convenience helpers that delegate to request(...)
  async get<T = unknown>(path: string, opts: RequestInit = {}) {
    return this.request<T>(path, { ...opts, method: "GET" });
  }

  async post<T = unknown>(path: string, body?: unknown, opts: RequestInit = {}) {
    const init = { ...opts, method: "POST" } as RequestInit;
    if (body !== undefined) init.body = JSON.stringify(body);
    return this.request<T>(path, init);
  }

  async put<T = unknown>(path: string, body?: unknown, opts: RequestInit = {}) {
    const init = { ...opts, method: "PUT" } as RequestInit;
    if (body !== undefined) init.body = JSON.stringify(body);
    return this.request<T>(path, init);
  }

  async delete<T = unknown>(path: string, body?: unknown, opts: RequestInit = {}) {
    const init = { ...opts, method: "DELETE" } as RequestInit;
    if (body !== undefined) init.body = JSON.stringify(body);
    return this.request<T>(path, init);
  }
}

// compute runtime base URL:
// - in browser prefer NEXT_PUBLIC_API_BASE_URL (exposed to client builds), fallback to API_BASE_URL or "/api"
// - on server prefer API_BASE_URL, fallback to NEXT_PUBLIC_API_BASE_URL or http://localhost:3000
const getRuntimeBaseUrl = () => {
  try {
    const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const serverUrl = process.env.API_BASE_URL || "";
    if (typeof window !== "undefined") {
      // client runtime
      // - prefer client-exposed NEXT_PUBLIC_API_BASE_URL when set
      // - ensure the returned client base ends with "/api" (avoid double slashes)
      if (publicUrl && publicUrl.length > 0) {
        try {
          const u = new URL(publicUrl);
          const normalizedPath = (u.pathname || "").replace(/\/+$/, "");
          // if pathname is empty or "/", use origin + /api
          if (!normalizedPath || normalizedPath === "") {
            return u.origin + "/api";
          }
          // if already ends with /api, return full url without trailing slash
          if (normalizedPath.endsWith("/api")) {
            return u.origin + normalizedPath;
          }
          // otherwise append /api to the existing pathname
          return u.origin + normalizedPath + "/api";
        } catch {
          // relative path (e.g. "/v1" or "/api") — normalize and ensure /api suffix
          const rel = publicUrl.replace(/\/+$/, "");
          return rel.endsWith("/api") ? rel : rel + "/api";
        }
      }
      return "/api";
    } else {
      // server runtime (SSR / node):
      // - prefer server-side API_BASE_URL, fallback to NEXT_PUBLIC_API_BASE_URL, then localhost
      return serverUrl && serverUrl.length > 0
        ? serverUrl
        : publicUrl && publicUrl.length > 0
        ? publicUrl
        : "http://localhost:3000";
    }
  } catch {
    return "/api";
  }
};

export const api = new ApiClient(getRuntimeBaseUrl());
