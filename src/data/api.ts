export type Session = { access_token: string; refresh_token: string; expires_in: number; token_type: string };
export interface TokenStorage { get(): Promise<string | null>; set(token: string): Promise<void>; clear(): Promise<void> }
export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }

export class GatewayClient {
  private session: Session | null = null;
  private expiresAt = 0;
  private refreshing: Promise<void> | null = null;
  private generation = 0;
  private storageWrites: Promise<void> = Promise.resolve();
  onSessionLost?: () => void;
  constructor(readonly baseUrl: string, private storage: TokenStorage, private transport: typeof fetch = fetch) {
    if (!/^https?:\/\//.test(baseUrl)) throw new Error('Set EXPO_PUBLIC_GATEWAY_URL to your local Gateway URL.');
  }
  async publicRequest<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, false);
  }
  private async install(session: Session, generation: number) {
    const write = this.storageWrites.catch(() => {}).then(async () => {
      if (generation !== this.generation) throw new ApiError('Session ended.', 401);
      await this.storage.set(session.refresh_token);
    });
    this.storageWrites = write;
    await write;
    if (generation !== this.generation) throw new ApiError('Session ended.', 401);
    this.session = session; this.expiresAt = Date.now() + session.expires_in * 1000;
  }
  async accept(session: Session) { await this.install(session, ++this.generation); }
  async restore(): Promise<boolean> {
    const generation = this.generation;
    const token = await this.storage.get();
    if (!token) return false;
    const result = await this.publicRequest<{ session: Session }>('/auth/refresh', { refresh_token: token });
    await this.install(result.session, generation); return true;
  }
  async logout() {
    this.generation++; this.session = null; this.expiresAt = 0;
    this.onSessionLost?.();
    this.storageWrites = this.storageWrites.catch(() => {}).then(() => this.storage.clear());
    await this.storageWrites;
  }
  private async refresh() {
    if (this.refreshing) return this.refreshing;
    const generation = this.generation;
    this.refreshing = (async () => {
      const token = this.session?.refresh_token;
      if (!token) throw new ApiError('Please log in again.', 401);
      try {
        const result = await this.publicRequest<{ session: Session }>('/auth/refresh', { refresh_token: token });
        if (generation !== this.generation) throw new ApiError('Session ended.', 401);
        await this.install(result.session, generation);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && generation === this.generation) await this.logout();
        throw error;
      }
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async request<T>(path: string, init: RequestInit = {}, authenticated = true, retry = true): Promise<T> {
    const generation = this.generation;
    if (authenticated && this.expiresAt < Date.now() + 30000) await this.refresh();
    if (authenticated && generation !== this.generation) throw new ApiError('Session ended.', 401);
    const controller = new AbortController();
    const abort = () => controller.abort();
    init.signal?.addEventListener('abort', abort, { once: true });
    if (init.signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.transport(this.baseUrl.replace(/\/$/, '') + path, {
        ...init, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + (this.session?.access_token ?? '') } : {}), ...init.headers },
      });
      if (authenticated && generation !== this.generation) throw new ApiError('Session ended.', 401);
      if (response.status === 401 && authenticated && retry) { await this.refresh(); return this.request<T>(path, init, authenticated, false); }
      const value = await response.json() as { error?: string };
      if (authenticated && generation !== this.generation) throw new ApiError('Session ended.', 401);
      if (!response.ok) throw new ApiError(value.error || 'Request failed (' + response.status + ').', response.status);
      return value as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Cannot reach the local backend. Check the Gateway and Android port forwarding.');
    } finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
  }
}
