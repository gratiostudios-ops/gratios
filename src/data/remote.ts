import type { GatewayClient } from './api';
import type { DataSource, MobileData, Reply, SavedMessage, SendRequest } from './types';

export type MessageStatus = Pick<SavedMessage, 'id' | 'status' | 'reply' | 'error'> & { conversationId: string };
// Random request identifiers are supplied by the native crypto module at the app boundary.
export function createRemoteSource(client: GatewayClient, uuid: () => string, pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))): DataSource {
  let disposed = false;
  let foreground = true;
  const submissions = new Map<string, string>();
  const assertActive = () => { if (disposed) throw new Error('Session ended.'); };
  return {
    async load() { return (await this.loadMobile!()).snapshot; },
    async loadMobile() { assertActive(); const result = await client.request<MobileData>('/gateway/mobile'); assertActive(); return result; },
    async saveDocument(id, text) { assertActive(); await client.request('/gateway/documents/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ text }) }); assertActive(); },
    async completeTask() { throw new Error('Task completion is unavailable for Gmail summaries.'); },
    async restoreTask() { throw new Error('Task restoration is unavailable for Gmail summaries.'); },
    setForeground(value) { foreground = value; },
    dispose() { disposed = true; submissions.clear(); },
    async sendMessage(request: SendRequest): Promise<Reply> {
      assertActive();
      const key = JSON.stringify(request);
      const idempotencyKey = submissions.get(key) ?? uuid();
      submissions.set(key, idempotencyKey);
      let status = await client.request<MessageStatus>('/gateway/messages', { method: 'POST', body: JSON.stringify({ ...request, idempotencyKey }) });
      let attempts = 0;
      while (status.status === 'queued' || status.status === 'running') {
        assertActive();
        await pause(foreground ? Math.min(1000 * 1.4 ** attempts++, 10000) : 1000);
        assertActive();
        if (!foreground) continue;
        status = await client.request<MessageStatus>('/gateway/messages/' + encodeURIComponent(status.id));
      }
      assertActive();
      submissions.delete(key);
      if (status.status === 'failed') throw new Error(status.error || 'The agent could not complete your request.');
      if (!status.reply?.text) throw new Error('The agent returned an empty response.');
      return status.reply;
    },
  };
}
