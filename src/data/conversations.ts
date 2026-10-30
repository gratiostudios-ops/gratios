import type { Reply, SavedMessage } from './types';

/** Keep partial replies and the failure in one response sequence, including retry actions. */
export function responseMessages(state: { status: string; messageId?: string; reply?: Reply; replies?: { id: string; reply: Reply }[] }) {
  const replies = state.replies ?? [];
  if (state.status === 'error' && state.reply?.text) return [...replies, { id: `${state.messageId ?? 'request'}:error:${state.reply.text}`, reply: state.reply }];
  return replies.length ? replies : state.reply?.text ? [{ id: state.messageId ?? state.reply.text, reply: state.reply }] : [];
}

/** Cards from the same agent share its history; orchestration has a separate chat. */
export function conversationKey(value: { agentId?: string; role?: string; findingId?: string | null }): string {
  if (value.role === 'orchestrator') return '__general__';
  return value.agentId ? 'agent:' + value.agentId : value.findingId ?? '__general__';
}

/** Only requests submitted in this app session belong in the live reply area. */
export function sessionMessage(messages: SavedMessage[], acceptedIds: ReadonlySet<string>): SavedMessage | undefined {
  return [...messages].reverse().find(message => acceptedIds.has(message.id));
}
