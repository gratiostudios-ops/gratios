export type Session = { access_token: string; refresh_token: string; expires_in: number; token_type: string; userId?: string; notice?: string };
export interface TokenStorage { get(): Promise<string | null>; set(token: string): Promise<void>; clear(): Promise<void>; getSession?(): Promise<string | null>; setSession?(value: string): Promise<void> }
export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }

export class GatewayClient {
  private session: Session | null = null;
  private expiresAt = 0;
  private refreshing: Promise<void> | null = null;
  private generation = 0;
  private storageWrites: Promise<void> = Promise.resolve();
  onSessionLost?: () => void;
  private rejected = false;
  get cacheIdentity(): string | null {
    if (this.session?.userId) return this.session.userId;
    try { return JSON.parse(atob(this.session!.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub ?? null; } catch { return null; }
  }
  get requiresSignIn() { return this.rejected; }
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
      await this.storage.setSession?.(JSON.stringify({ session, expiresAt: Date.now() + session.expires_in * 1000 }));
    });
    this.storageWrites = write;
    await write;
    if (generation !== this.generation) throw new ApiError('Session ended.', 401);
    this.rejected = false; this.session = session; this.expiresAt = Date.now() + session.expires_in * 1000;
  }
  async accept(session: Session) { await this.install(session, ++this.generation); }
  /** Restore encrypted credentials locally; the first request revalidates in the background. */
  async restoreCached(): Promise<boolean> {
    const generation = this.generation;
    const raw = await this.storage.getSession?.();
    if (generation !== this.generation) return false;
    if (!raw) return false;
    try {
      const value = JSON.parse(raw);
      if (typeof value.session?.access_token !== 'string' || typeof value.session?.refresh_token !== 'string' || typeof value.expiresAt !== 'number') return false;
      this.session = value.session; this.expiresAt = value.expiresAt; this.rejected = false;
      return true;
    } catch { return false; }
  }
  async revalidate() { return this.refresh(); }
  async restore(): Promise<boolean> {
    const generation = this.generation;
    const token = await this.storage.get();
    if (!token) return false;
    const result = await this.publicRequest<{ session: Session }>('/auth/refresh', { refresh_token: token });
    await this.install(result.session, generation); return true;
  }
  async logout() {
    this.generation++; this.rejected = false; this.session = null; this.expiresAt = 0;
    this.storageWrites = this.storageWrites.catch(() => {}).then(() => this.storage.clear());
    await this.storageWrites;
  }
  private async refresh() {
    if (this.rejected) throw new ApiError('Sign in again to update your cached data.', 401);
    if (this.refreshing) return this.refreshing;
    const generation = this.generation;
    this.refreshing = (async () => {
      const token = this.session?.refresh_token;
      if (!token) throw new ApiError('Please log in again.', 401);
      try {
        const result = await this.publicRequest<{ session: Session }>('/auth/refresh', { refresh_token: token });
        if (generation !== this.generation) throw new ApiError('Session ended.', 401);
        await this.install({ ...result.session, userId: result.session.userId ?? this.cacheIdentity ?? undefined }, generation);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && generation === this.generation) { this.rejected = true; this.onSessionLost?.(); }
        throw error;
      }
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async request<T>(path: string, init: RequestInit = {}, authenticated = true, retry = true): Promise<T> {
    const generation = this.generation;
    if (authenticated && this.rejected) throw new ApiError('Sign in again to update your cached data.', 401);
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
      if (!response.ok) {
        const message = await response.json().catch(() => null) as { error?: string } | null;
        throw new ApiError(message?.error || (response.status === 530 ? 'The backend tunnel is offline. Keep the laptop and tunnel running.' : 'Backend returned HTTP ' + response.status + '. Please try again.'), response.status);
      }
      const value = await response.json().catch(() => { throw new ApiError('The backend returned an invalid response.', response.status); }) as { error?: string };
      if (authenticated && generation !== this.generation) throw new ApiError('Session ended.', 401);
      if (!response.ok) throw new ApiError(value.error || 'Request failed (' + response.status + ').', response.status);
      return value as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error(controller.signal.aborted ? 'The backend request timed out. Please try again.' : 'Cannot reach the backend. Check your connection and that the laptop and tunnel are running.');
    } finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
  }
}
