import type { Reply, Snapshot, Finding } from './types';

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

/** Older responses and stale selections use the newest supplied eligible card. */
export function homeFindings(snapshot:Snapshot){
  const featured=snapshot.findings.find(item=>item.id===snapshot.featuredFindingId)??snapshot.findings[0]??null;
  return {featured,others:snapshot.findings.filter(item=>item.id!==featured?.id)};
}
export function findingPreview(finding:Finding){
  for(const block of finding.blocks){
    if(block.type==='paragraph'||block.type==='heading')return block.text;
    if(block.type==='numbered-list')return block.items.map(item=>item.text).join(' · ');
    if(block.type==='table')return block.title;
  }
  return '';
}
