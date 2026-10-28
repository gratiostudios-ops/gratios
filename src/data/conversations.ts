import type { SavedMessage } from './types';

/** Cards from the same agent share its history; orchestration has a separate chat. */
export function conversationKey(value: { agentId?: string; role?: string; findingId?: string | null }): string {
  if (value.role === 'orchestrator') return '__general__';
  return value.agentId ? 'agent:' + value.agentId : value.findingId ?? '__general__';
}

/** Only requests submitted in this app session belong in the live reply area. */
export function sessionMessage(messages: SavedMessage[], acceptedIds: ReadonlySet<string>): SavedMessage | undefined {
  return [...messages].reverse().find(message => acceptedIds.has(message.id));
}
