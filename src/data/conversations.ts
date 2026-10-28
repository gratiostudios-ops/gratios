/** Cards from the same agent share its history; orchestration has a separate chat. */
export function conversationKey(value: { agentId?: string; role?: string; findingId?: string | null }): string {
  if (value.role === 'orchestrator') return '__general__';
  return value.agentId ? 'agent:' + value.agentId : value.findingId ?? '__general__';
}
