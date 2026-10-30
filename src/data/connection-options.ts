/** Only connection types supported by the existing frontend integrations. */
export const connectionOptions = [
  { id: 'gmail', name: 'Gmail' },
  { id: 'calendar', name: 'Calendar' },
  { id: 'tasks', name: 'Tasks' },
  { id: 'notifications', name: 'Phone alerts' },
] as const;
export type ConnectionId = typeof connectionOptions[number]['id'];
export function toggleConnection(selected: readonly ConnectionId[], id: ConnectionId): ConnectionId[] {
  return selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id];
}
export function needsCalendarConsent(selected: readonly ConnectionId[]) {
  // The existing Google consent flow connects Calendar and Tasks together.
  return selected.includes('calendar') || selected.includes('tasks');
}
