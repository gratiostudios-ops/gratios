import type { MobileData } from './types';

type Store = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
const prefix = 'avocado.mobile.v1:';
/** Serial writes plus leases prevent requests from repopulating a logged-out account. */
export class MobileCache {
  private generation = 0;
  private writes: Promise<void> = Promise.resolve();
  constructor(private store: Store) {}
  open(userId: string) {
    const generation = this.generation;
    const key = prefix + encodeURIComponent(userId);
    return {
      read: async (): Promise<MobileData | null> => {
        try {
          const raw = await this.store.getItem(key);
          if (!raw || generation !== this.generation) return null;
          const value = JSON.parse(raw);
          if (value.version !== 1 || value.userId !== userId || !Array.isArray(value.data?.snapshot?.tasks) || !Array.isArray(value.data?.snapshot?.findings) || !Array.isArray(value.data.feed) || !value.data.documents || typeof value.data.documents !== 'object' || !Array.isArray(value.data.agents) || !value.data.profile || !Array.isArray(value.data.conversations)) return null;
          return value.data;
        } catch { return null; }
      },
      write: (data: MobileData) => {
        this.writes = this.writes.catch(() => {}).then(async () => {
          if (generation === this.generation) await this.store.setItem(key, JSON.stringify({ version: 1, userId, data }));
        });
        return this.writes;
      },
    };
  }
  async clear(userId: string | null) {
    this.generation++;
    this.writes = this.writes.catch(() => {}).then(async () => { if (userId) await this.store.removeItem(prefix + encodeURIComponent(userId)); });
    await this.writes;
  }
}
