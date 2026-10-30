import type { Reply } from './types';

/** Resolve from the current offset, including fast flings over multiple cards. */
export function visibleFindingId(items: readonly { id: string }[], offset: number, width: number) {
  if (!items.length || width <= 0) return null;
  const index = Math.max(0, Math.min(items.length - 1, Math.round(offset / width)));
  return items[index].id;
}

/** Show the submitted text immediately, until delivery produces output or ends. */
export function pendingRequestText(state: { status: string; requestText?: string; reply?: Reply; replies?: { reply: Reply }[] }) {
  if (state.status !== 'thinking' || state.reply?.text || state.replies?.some(message => message.reply.text)) return null;
  return state.requestText || null;
}
