import type { GatewayClient } from './api';
import type { DataSource, MobileData, Reply, SavedMessage, SendRequest } from './types';

export type MessageStatus = Pick<SavedMessage, 'id' | 'status' | 'reply' | 'error'> & { conversationId: string };
export function createRemoteSource(client: GatewayClient, uuid: () => string): DataSource {
  let disposed = false;
  let foreground = true;
  let stopStream: (() => void) | undefined;
  let chatPaused = false;
  const subscribers = new Set<(conversations: MobileData['conversations']) => void>();
  let latestConversations: MobileData['conversations'] | undefined;
  const submissions = new Map<string, string>();
  const completedSubmissions = new Map<string, string>();
  const cancelledSubmissions = new Set<string>();
  const cancelledMessages = new Set<string>();
  const attempts = new Map<string, { controller: AbortController; messageId?: string }>();
  const timing = new Map<string, { started: number; received: Set<string> }>();
  const statuses = new Map<string, SavedMessage>();
  const waiters = new Map<string, { resolve(reply: Reply): void; reject(error: Error): void }>();
  const assertActive = () => { if (disposed) throw new Error('Session ended.'); };
  const sanitizeChat = (conversations: MobileData['conversations']): MobileData['conversations'] => {
    const hiddenReplies = new Set<string>();
    for (const thread of conversations) for (const message of thread.messages) {
      if (cancelledMessages.has(message.id)) for (const reply of message.replies ?? []) hiddenReplies.add(reply.id);
    }
    return conversations.map(thread => ({ ...thread,
      messages: thread.messages.map(message => cancelledMessages.has(message.id) ? { ...message, status: 'cancelled', reply: undefined, replies: [] } : message),
      history: thread.history?.filter(message => !hiddenReplies.has(message.id)),
    }));
  };
  const settle = (status: SavedMessage) => {
    statuses.set(status.id, status);
    const trace=timing.get(status.id);
    for(const reply of status.replies??[])if(trace&&!trace.received.has(reply.id)){
      trace.received.add(reply.id);
      console.log(JSON.stringify({event:'app_reply_received',timestamp:new Date().toISOString(),messageId:status.id,replyId:reply.id,durationSeconds:(performance.now()-trace.started)/1000}));
    }
    if(trace&&status.status!=='queued'&&status.status!=='running')timing.delete(status.id);
    const waiter = waiters.get(status.id);
    if (!waiter || status.status === 'queued' || status.status === 'running') return;
    waiters.delete(status.id);
    if (status.status === 'cancelled') waiter.reject(new Error('Request cancelled'));
    else if (status.status === 'failed') waiter.reject(new Error(status.error || 'The agent could not complete your request.'));
    else waiter.resolve(status.reply ?? { text: '' });
  };
  const startStream = () => {
    if (disposed || chatPaused || !foreground || stopStream || !subscribers.size) return;
    stopStream = client.stream<MobileData['conversations']>('/gateway/chat/events', incoming => {
      const conversations = sanitizeChat(incoming);
      latestConversations = conversations;
      for (const conversation of conversations) for (const status of conversation.messages) settle(status);
      for (const subscriber of subscribers) subscriber(conversations);
    }, error => {
      for (const waiter of waiters.values()) waiter.reject(error);
      waiters.clear();
    });
  };
  return {
    async load() { return (await this.loadMobile!()).snapshot; },
    async loadMobile() { assertActive(); const result = await client.request<MobileData>('/gateway/mobile' + (subscribers.size ? '?chat=0' : '')); assertActive(); return { ...result, snapshot: { ...result.snapshot, findings: result.snapshot.findings.filter(card => !card.submissionId || !cancelledSubmissions.has(card.submissionId)) }, conversations: latestConversations ?? result.conversations }; },
    subscribeChat(callback) {
      subscribers.add(callback); startStream();
      return () => { subscribers.delete(callback); if (!subscribers.size) { stopStream?.(); stopStream = undefined; } };
    },
    async saveDocument(id, text) { assertActive(); await client.request('/gateway/documents/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ text }) }); assertActive(); },
    async markCardSeen(id) { assertActive(); return client.request('/gateway/cards/' + encodeURIComponent(id) + '/seen', { method: 'POST', body: '{}' }); },
    async completeTask(taskId) { assertActive(); const item=(await client.request<{items:{id:string;kind:string}[]}>('/gateway/agenda?timezone='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone))).items.find(item=>item.id===taskId); await client.request((item?.kind==='calendar'?'/gateway/calendar-reminders/':'/gateway/tasks/')+encodeURIComponent(taskId),{method:'PATCH',body:JSON.stringify({completed:true})}); },
    async restoreTask(task) { assertActive(); await client.request((task.kind==='calendar'?'/gateway/calendar-reminders/':'/gateway/tasks/')+encodeURIComponent(task.id),{method:'PATCH',body:JSON.stringify({completed:false})}); },
    setForeground(value) { foreground = value; if (value) startStream(); else { stopStream?.(); stopStream = undefined; } },
    dispose() {
      for (const attempt of attempts.values()) attempt.controller.abort();
      attempts.clear(); timing.clear();
      completedSubmissions.clear(); cancelledSubmissions.clear();
      disposed = true; stopStream?.(); stopStream = undefined; subscribers.clear(); submissions.clear(); statuses.clear();
      for (const waiter of waiters.values()) waiter.reject(new Error('Session ended.'));
      waiters.clear();
    },
    async cancelMessage(request) {
      assertActive();
      const key = JSON.stringify(request);
      const submissionId = submissions.get(key) ?? completedSubmissions.get(key);
      if (!submissionId) throw new Error('No active request to cancel');
      cancelledSubmissions.add(submissionId);
      const attempt = attempts.get(submissionId);
      attempt?.controller.abort();
      if (attempt?.messageId) {
        cancelledMessages.add(attempt.messageId);
        waiters.get(attempt.messageId)?.reject(new Error('Request cancelled'));
        waiters.delete(attempt.messageId);
      }
      if (submissions.get(key) === submissionId) submissions.delete(key);
      completedSubmissions.delete(key);
      attempts.delete(submissionId);
      if (latestConversations) {
        latestConversations = sanitizeChat(latestConversations);
        for (const subscriber of subscribers) subscriber(latestConversations);
      }
      if (![...submissions.values()].some(id => !cancelledSubmissions.has(id))) {
        chatPaused = true;
        stopStream?.(); stopStream = undefined;
      }
      return { cardIds: [], submissionId };
    },
    async sendMessage(request: SendRequest, onAccepted?: (messageId: string, submissionId?: string) => void): Promise<Reply> {
      assertActive();
      const key = JSON.stringify(request);
      const idempotencyKey = submissions.get(key) ?? uuid();
      const requestStarted=performance.now();
      console.log(JSON.stringify({event:'app_send',timestamp:new Date().toISOString(),submissionId:idempotencyKey}));
      const previousSubmission = completedSubmissions.get(key);
      if (previousSubmission) attempts.delete(previousSubmission);
      completedSubmissions.delete(key);
      submissions.set(key, idempotencyKey);
      chatPaused = false;
      startStream();
      const attempt: { controller: AbortController; messageId?: string } = { controller: new AbortController() };
      attempts.set(idempotencyKey, attempt);
      const status = await client.request<MessageStatus>('/gateway/messages', { method: 'POST', body: JSON.stringify({ ...request, idempotencyKey }), signal: attempt.controller.signal });
      assertActive();
      if (cancelledSubmissions.has(idempotencyKey)) { cancelledMessages.add(status.id); throw new Error('Request cancelled'); }
      attempt.messageId = status.id;
      timing.set(status.id,{started:requestStarted,received:new Set()});
      console.log(JSON.stringify({event:'app_message_accepted',timestamp:new Date().toISOString(),submissionId:idempotencyKey,messageId:status.id,durationSeconds:(performance.now()-requestStarted)/1000}));
      onAccepted?.(status.id, idempotencyKey);
      // A reply can arrive before the POST acknowledgement. Replay the latest
      // snapshot after marking this request as belonging to the current session.
      if (latestConversations) for (const subscriber of subscribers) subscriber(latestConversations);
      const reply = await new Promise<Reply>((resolve, reject) => {
        waiters.set(status.id, { resolve, reject });
        // Completion can reach the stream before the POST returns.
        settle(statuses.get(status.id) ?? { ...status, text: request.text });
        startStream();
      });
      submissions.delete(key);
      completedSubmissions.set(key, idempotencyKey);
      return reply;
    },
  };
}
