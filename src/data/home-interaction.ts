import type { Reply, Snapshot, Finding, Agent } from './types';

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
export function homeFindings(snapshot:Snapshot,agents:Agent[]=[]){
  const cards=[...snapshot.findings];
  for(const agent of agents){
    if(agent.enabled===false||cards.some(card=>card.agentId===agent.id))continue;
    cards.push({id:'agent:'+agent.id,agentId:agent.id,title:agent.name,image:agent.image,blocks:[{id:'empty',type:'paragraph',text:'No updates yet.'}],suggestions:[]});
  }
  const featured=cards.find(item=>item.id===snapshot.featuredFindingId)??cards[0]??null;
  const seen=new Set<string>(featured?[featured.agentId??featured.id]:[]);
  const others=cards.filter(item=>{
    const key=item.agentId??item.id;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
  return {featured,others};
}
export function findingPreview(finding:Finding){
  for(const block of finding.blocks){
    if(block.type==='paragraph')return block.text;
    if(block.type==='numbered-list')return block.items.map(item=>item.text).join(' · ');
    if(block.type==='table')return block.title;
  }
  return finding.blocks.find(block=>block.type==='heading')?.text??'';
}
