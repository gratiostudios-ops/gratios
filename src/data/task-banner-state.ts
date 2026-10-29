import type { Task } from './types';

export type BannerState = { initialized: boolean; order: string[]; seen: Set<string>; expandedUntil: number; manual: boolean };
export const newBannerState = (): BannerState => ({ initialized: false, order: [], seen: new Set(), expandedUntil: 0, manual: false });
export function updateBanners(state: BannerState, tasks: Task[], now: number): BannerState {
  const eligible = [...tasks].filter(task => !task.dueAt || Date.parse(task.dueAt) <= now)
    .sort((a,b) => (a.dueAt ?? a.dueDate ?? '').localeCompare(b.dueAt ?? b.dueDate ?? '') || a.id.localeCompare(b.id));
  const ids = new Set(eligible.map(task => task.id));
  const arrivals = eligible.filter(task => !state.seen.has(task.id)).map(task => task.id);
  const order = [...state.order.filter(id => ids.has(id)), ...eligible.filter(task => !state.order.includes(task.id)).map(task => task.id)];
  return { ...state, initialized: true, order, seen: new Set([...state.seen, ...ids]),
    expandedUntil: !state.initialized || arrivals.length ? now + 5000 : state.expandedUntil };
}
