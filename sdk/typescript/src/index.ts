export interface AresClientOptions {
  apiBase?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface AresHealthResponse {
  ok: boolean;
  service: string;
  ts: string;
}

export interface AresScoreResponse {
  agentId: string;
  agentIdHex: string;
  ari: number;
  tier: string;
  actions: number;
  since: string | null;
}

export interface AresAction {
  address?: string;
  agentId?: string;
  agentIdHex?: string;
  actionId: string;
  scores: number[];
  status?: string;
  timestamp: string;
  seq?: number;
  ari?: number;
  tier?: string;
  actionsCount?: number;
  source?: string;
  isDisputed?: boolean;
}

export interface AresDispute {
  actionId: string;
  accepted: boolean;
  reason?: string;
  timestamp?: string;
}

export interface AresAgentResponse {
  found: boolean;
  address?: string;
  agentId?: string;
  agentIdHex?: string;
  operator?: string;
  registeredAt?: string;
  ari?: number;
  tier?: string;
  since?: string | null;
  actionsCount?: number;
  actions?: AresAction[];
  disputes?: AresDispute[];
  source?: string;
}

export interface AresLeaderboardEntry {
  address: string;
  agentId?: string;
  agentIdHex?: string;
  ari: number;
  tier: string;
  actions: number;
  since: string | null;
  disputes?: number;
  hasDispute?: boolean;
}

export interface AresLeaderboardResponse {
  items: AresLeaderboardEntry[];
  nextCursor: number | null;
}

export interface AresPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface AresActionsResponse {
  items: AresAction[];
  nextCursor: string | null;
  pagination?: AresPagination;
}

function resolveApiBase(options: AresClientOptions): string {
  const apiBase = options.apiBase || options.baseUrl;
  if (!apiBase) {
    throw new Error('AresClient requires `apiBase`.');
  }
  return apiBase.replace(/\/$/, '');
}

export class AresClient {
  private readonly apiBase: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AresClientOptions) {
    this.apiBase = resolveApiBase(options);
    this.fetchImpl = options.fetch || fetch;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.apiBase}${path}`, {
      headers: {
        accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ARES API request failed (${response.status} ${response.statusText}) for ${path}`);
    }

    return await response.json() as T;
  }

  async getAgent(address: string): Promise<AresAgentResponse> {
    return await this.request<AresAgentResponse>(`/v1/agent/${encodeURIComponent(address)}`);
  }

  async getScore(address: string): Promise<AresScoreResponse> {
    return await this.request<AresScoreResponse>(`/v1/score/${encodeURIComponent(address)}`);
  }

  async getLeaderboard(): Promise<AresLeaderboardResponse> {
    return await this.request<AresLeaderboardResponse>('/v1/leaderboard');
  }

  async getActions(limit?: number): Promise<AresActionsResponse> {
    const query = typeof limit === 'number'
      ? `?limit=${encodeURIComponent(String(limit))}`
      : '';
    return await this.request<AresActionsResponse>(`/v1/actions${query}`);
  }

  async healthCheck(): Promise<AresHealthResponse> {
    return await this.request<AresHealthResponse>('/v1/health');
  }
}
