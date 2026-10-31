import type { ConnectionId } from './connection-options';
import type { ImageReference } from './types';
import { connectionOptions } from './connection-options';

export function agentTemplate(selected: readonly ConnectionId[]) {
  const guides: Record<ConnectionId, string> = {
    gmail: 'Gmail: use gmail_search and gmail_read to find and summarise emails. Read current information before answering.',
    calendar: 'Calendar: use calendar_list before calendar_create, calendar_update, or calendar_delete. Ask for unclear dates and times.',
    tasks: 'Tasks: use agenda_list, task_create, and task_complete for plans and reminders. Confirm requested changes through the tools.',
    notifications: 'Phone alerts: use request_notification for explicitly requested or urgent updates.',
  };
  return '# My agent\n\nDescribe what this agent helps you do.\n\n## Instructions\nBe accurate and helpful. Ask when details are unclear. Never claim an action succeeded before its tool succeeds.\n\n## Connections\n' + (selected.length ? selected.map(id => '- ' + guides[id]).join('\n') : 'No external connections selected.') + '\n';
}
export function agentMarkdownError(value: string): string | null {
  if (!/^#\s+\S[^\n]*$/m.test(value.trim().split('\n')[0] ?? '')) return 'Start AGENT.md with # followed by your agent’s name.';
  const name = value.trim().split('\n')[0].replace(/^#\s+/, '').trim();
  if (name.length > 200) return 'Keep the agent name under 200 characters.';
  if (value.length > 16000) return 'Keep AGENT.md under 16,000 characters.';
  return null;
}
export function connectorSummary(ids: readonly ConnectionId[]) {
  return ids.length ? ids.map(id => connectionOptions.find(item => item.id === id)?.name).filter(Boolean).join(', ') : 'No external connections';
}
export type CreatedAgent = { id: string; name: string; description: string; enabled: boolean; image: ImageReference; icon: 'brief'; document: string; connectorIds: ConnectionId[]; missingSetup: string[] };
