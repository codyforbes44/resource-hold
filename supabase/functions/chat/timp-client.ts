/**
 * TIMP (Temporal Identity Management Protocol) Client
 * Provides session storage and semantic search across historical interactions.
 * Graceful no-op when TIMP_BASE_URL / TIMP_API_KEY are not configured.
 */

export interface TIMPSession {
  alias: string;
  content: Record<string, unknown>;
  parent_alias?: string;
  metadata?: Record<string, unknown>;
}

export interface TIMPSearchResult {
  alias: string;
  content: Record<string, unknown>;
  similarity_score: number;
  timestamp: number;
}

export class TIMPClient {
  private baseUrl: string | null;
  private apiKey: string | null;

  constructor() {
    this.baseUrl = Deno.env.get("TIMP_BASE_URL") || null;
    this.apiKey = Deno.env.get("TIMP_API_KEY") || null;
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  private async request<T>(
    path: string,
    method: string = "GET",
    body?: unknown,
    retries = 2,
  ): Promise<T | null> {
    if (!this.isConfigured) return null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            "X-API-Key": this.apiKey!,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(5000),
        });

        if (!resp.ok) {
          const t = await resp.text().catch(() => "");
          console.warn(`TIMP ${method} ${path} → ${resp.status}: ${t.slice(0, 200)}`);
          if (attempt < retries && resp.status >= 500) continue;
          return null;
        }

        return (await resp.json()) as T;
      } catch (e) {
        console.warn(`TIMP request error (attempt ${attempt + 1}):`, e);
        if (attempt >= retries) return null;
      }
    }
    return null;
  }

  /** Create or update a session in TIMP */
  async createSession(session: TIMPSession): Promise<{ alias: string; hash: string } | null> {
    return this.request("/sessions", "POST", session);
  }

  /** Semantic search across historical sessions */
  async searchSessions(
    query: string,
    topK: number = 5,
    timeDecayFactor: number = 0.1,
    minScore: number = 0.0,
  ): Promise<TIMPSearchResult[]> {
    const result = await this.request<{ results: TIMPSearchResult[] }>("/search", "POST", {
      query,
      top_k: topK,
      time_decay_factor: timeDecayFactor,
      min_score: minScore,
    });
    return result?.results || [];
  }

  /** Get a specific session by alias */
  async getSession(alias: string): Promise<TIMPSession | null> {
    return this.request(`/sessions/${encodeURIComponent(alias)}`);
  }

  /** Get TIMP service stats */
  async getStats(): Promise<Record<string, unknown> | null> {
    return this.request("/stats");
  }

  /** Health check */
  async isHealthy(): Promise<boolean> {
    if (!this.isConfigured) return false;
    const result = await this.request<{ status: string }>("/health");
    return result?.status === "healthy";
  }

  /**
   * Fire-and-forget session storage.
   * Stores a conversation turn as a TIMP session without blocking the response.
   */
  storeSessionAsync(
    conversationId: string,
    userMessage: string,
    assistantResponse: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.isConfigured) return;

    const alias = `gclaw-${conversationId}-${Date.now()}`;
    const session: TIMPSession = {
      alias,
      content: {
        user: userMessage,
        assistant: assistantResponse.slice(0, 5000),
        timestamp: new Date().toISOString(),
      },
      parent_alias: `gclaw-${conversationId}`,
      metadata: {
        conversation_id: conversationId,
        ...metadata,
      },
    };

    // Fire-and-forget — don't await
    this.createSession(session).catch((e) =>
      console.warn("TIMP async store failed:", e)
    );
  }

  /**
   * Search for relevant historical context for a query.
   * Returns a formatted context string or empty string.
   */
  async getHistoricalContext(query: string, topK: number = 3): Promise<string> {
    if (!this.isConfigured) return "";

    try {
      const results = await this.searchSessions(query, topK, 0.1, 0.3);
      if (results.length === 0) return "";

      const contextParts = results.map((r, i) => {
        const content = r.content as { user?: string; assistant?: string };
        return `[Historical ${i + 1}] (relevance: ${(r.similarity_score * 100).toFixed(0)}%)\nQ: ${content.user || "?"}\nA: ${(content.assistant || "").slice(0, 500)}`;
      });

      return `\n\n--- Historical Context (from TIMP) ---\n${contextParts.join("\n\n")}`;
    } catch (e) {
      console.warn("TIMP historical context search failed:", e);
      return "";
    }
  }
}
