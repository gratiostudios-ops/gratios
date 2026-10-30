import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { registerPhonePush } from '../notifications';
import * as Crypto from 'expo-crypto';
import { mobileCache } from './mobile-cache';
import { createRefreshQueue } from './refresh-queue';
import {applyCompletion,applyPendingCompletions,type CompletionUpdate} from './agenda-state';
import { conversationKey, sessionMessage } from './conversations';
import { demoData } from './demo';
import { createDemoSource } from './source';
import { createRemoteSource } from './remote';
import { demoMode, gateway } from '../auth/Auth';
import type { DataSource, MobileData, Reply, SendRequest, Snapshot, Task } from './types';

type Conversation = { status: 'idle' | 'thinking' | 'reply' | 'error'; reply?: Reply; replies?: { id: string; reply: Reply }[]; sent: boolean; messageId?: string; stopFailed?: boolean };
const idle: Conversation = { status: 'idle', sent: false };
const emptyData: MobileData = {
  snapshot: { tasks: [], findings: [] }, agents: [], feed: [], documents: { preferences: '' }, conversations: [],
  profile: { name: '', email: '', dob: '', avatar: { asset: 'mail' }, interests: [], preferences: [] },
};
const demoMobile: MobileData = {
  snapshot: demoData.snapshot, agents: demoData.agents, profile: demoData.profile, feed: demoData.feed,
  documents: { ...Object.fromEntries(demoData.agents.map(agent => [agent.id, agent.document])), preferences: '# Preferences\n\n' + demoData.profile.preferences.map(text => '- ' + text).join('\n') + '\n' }, conversations: [],
};
function useData(source: DataSource) {
  const [data, setData] = useState<MobileData>(demoMode ? demoMobile : emptyData);
  const latestData=useRef(data);
  latestData.current=data;
  const completionUpdates=useRef(new Map<string,CompletionUpdate>());
  const [loading, setLoading] = useState(true);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [cacheIdentity] = useState(() => gateway.cacheIdentity);
  const [cache] = useState(() => !demoMode && gateway.cacheIdentity ? mobileCache.open(gateway.cacheIdentity) : null);
  const hydrated = useRef(false);
  const pending = useRef(new Set<string>());
  const sessionMessages = useRef(new Set<string>());
  const mutedConversations = useRef(new Set<string>());
  const activeRequests = useRef(new Map<string, { request: SendRequest; cancelled: boolean; stopping: boolean; messageId?: string; submissionId?: string }>());
  const mounted = useRef(true);
  const revision = useRef(0);
  const chatRevision = useRef(0);
  const messageStates = useRef(new Map<string, string>());
  const reportedNotificationFailures = useRef(new Set<string>());
  const refresh = useMemo(() => createRefreshQueue(async () => {
    const loadRevision = revision.current;
    const loadedChatRevision = chatRevision.current;
    const next = source.loadMobile ? await source.loadMobile() : { ...demoMobile, snapshot: await source.load() };
    if (!mounted.current || cacheIdentity && cacheIdentity !== gateway.cacheIdentity) return;
    if (loadRevision !== revision.current) return true;
    setData(previous => applyPendingCompletions({...next,
      ...(next.agendaError?{agendaItems:previous.agendaItems,snapshot:{...next.snapshot,tasks:previous.snapshot.tasks}}:{}),
      ...(next.agendaTasksError&&!next.agendaError?{agendaItems:[...(previous.agendaItems??[]).filter(item=>item.kind==='task'),...(next.agendaItems??[]).filter(item=>item.kind==='calendar')],snapshot:{...next.snapshot,tasks:[...previous.snapshot.tasks.filter(item=>item.kind==='task'),...next.snapshot.tasks.filter(item=>item.kind==='calendar')]}}:{}),
      ...(loadedChatRevision===chatRevision.current?{}:{conversations:previous.conversations}),
    },completionUpdates.current)); setLoading(false);
    if(next.agendaError||next.agendaTasksError)console.warn(next.agendaError??next.agendaTasksError);
    if (cache && !next.agendaError && !next.agendaTasksError && !completionUpdates.current.size) void cache.write(next).catch(() => {});
    const failures = next.notificationFailures ?? [];
    if (failures.some(failure => !reportedNotificationFailures.current.has(failure.id))) {
      console.warn('A notification could not be delivered to your phone.');
    }
    for (const failure of failures) reportedNotificationFailures.current.add(failure.id);
  }), [source, cache, cacheIdentity]);
  useEffect(() => {
    mounted.current = true;
    let foreground = AppState.currentState === 'active';
    source.setForeground?.(foreground);
    const unsubscribeChat = source.subscribeChat?.(next => {
      if (!mounted.current) return;
      chatRevision.current++;
      let completed = false;
      for (const thread of next) for (const message of thread.messages) {
        const prior = messageStates.current.get(message.id);
        if (message.status === 'completed' && prior !== 'completed') completed = true;
        messageStates.current.set(message.id, message.status);
      }
      if (completed) { revision.current++; void refresh().catch(error => console.warn('Could not refresh cards', error)); }
      setData(previous => ({ ...previous, conversations: next }));
      setConversations(previous => {
        const restored = { ...previous };
        for (const thread of next) {
          const key = conversationKey(thread);
          if (mutedConversations.current.has(key)) continue;
          const message = sessionMessage(thread.messages, sessionMessages.current);
          if (!message) continue;
          if (message.status === 'cancelled') { restored[key] = { status: 'idle', sent: true }; continue; }
          const working = message.status === 'queued' || message.status === 'running';
          restored[key] = { status: working ? 'thinking' : message.status === 'failed' ? 'error' : 'reply',
            sent: true, messageId: message.id, replies: message.replies,
            reply: message.status === 'failed' ? { text: message.error || 'The agent could not complete your request.', actions: [{ id: 'retry', label: 'Try again', message: message.text }] } : message.reply };
        }
        return restored;
      });
    });
    const update = () => { void refresh().catch(error => { if (mounted.current) { console.warn(error instanceof Error ? error.message : 'Could not load your updates.'); setLoading(false); } }); };
    void (async () => {
      if (cache && !hydrated.current) {
        const cached = await cache.read();
        if (!mounted.current) return;
        hydrated.current = true;
        if (cached && chatRevision.current === 0) {
          setData(cached); setLoading(false);
        }
      }
      update();
    })();
    const unsubscribe = source.subscribe?.(snapshot => { if (mounted.current) { setData(previous => ({ ...previous, snapshot })); setLoading(false); } });
    const subscription = AppState.addEventListener('change', state => { foreground = state === 'active'; source.setForeground?.(foreground); if (foreground) update(); });
    const interval = setInterval(() => { if (foreground) update(); }, 10000);
    return () => { mounted.current = false; unsubscribe?.(); unsubscribeChat?.(); subscription.remove(); clearInterval(interval); source.dispose?.(); };
  }, [source, refresh, cache]);
  const changeCompletion=useCallback(async(task:Task,completed:boolean)=>{
    if(completionUpdates.current.has(task.id))return false;
    setActionErrors(previous => ({ ...previous, [task.id]: '' }));
    const before=latestData.current;
    const previousItem=before.agendaItems?.find(item=>item.id===task.id);
    const previousBanner=before.snapshot.tasks.find(item=>item.id===task.id);
    const update:CompletionUpdate={completed,...(!completed?{task}:{})};
    completionUpdates.current.set(task.id,update);
    revision.current++;
    setData(previous=>applyCompletion(previous,task.id,update));
    try{
      if(completed)await source.completeTask(task.id,task.kind);
      else await source.restoreTask(task);
      return true;
    }catch{
      if(mounted.current){
        setData(previous=>applyCompletion(previous,task.id,{completed:previousItem?.completed??!completed,...(previousBanner?{task:previousBanner}:{})}));
        setActionErrors(previous => ({ ...previous, [task.id]: completed?'Could not mark that item done. Please try again.':'Could not undo that item. Please try again.' }));
      }
      return false;
    }finally{
      completionUpdates.current.delete(task.id);
      revision.current++;
    }
  },[source]);
  const completeTask=useCallback((id:string,kind:Task['kind']='task')=>changeCompletion({id,kind,title:''},true),[changeCompletion]);
  const restoreTask=useCallback((task:Task)=>changeCompletion(task,false),[changeCompletion]);
  const send = useCallback(async (findingId: string | null, text: string, agentId?: string) => {
    const target = agentId ?? data.snapshot.findings.find(card => card.id === findingId)?.agentId;
    const key = conversationKey({ agentId: target, findingId });
    if (!text.trim() || pending.current.has(key)) return;
    revision.current++;
    mutedConversations.current.delete(key);
    for (const thread of data.conversations) if (conversationKey(thread) === key) for (const message of thread.messages) sessionMessages.current.delete(message.id);
    const operation: { request: SendRequest; cancelled: boolean; stopping: boolean; messageId?: string; submissionId?: string } = {
      request: { findingId, text: text.trim(), ...(target ? { agentId: target } : {}) }, cancelled: false, stopping: false,
    };
    activeRequests.current.set(key, operation);
    pending.current.add(key);
    setConversations(previous => ({ ...previous, [key]: { status: 'thinking', sent: true } }));
    try {
      const reply = await source.sendMessage(operation.request, (messageId, submissionId) => {
        operation.messageId = messageId; operation.submissionId = submissionId;
        if (!operation.cancelled) sessionMessages.current.add(messageId);
      });
      if (mounted.current && !operation.cancelled) setConversations(previous => ({ ...previous, [key]: { ...previous[key], status: 'reply', sent: true, ...(reply.text ? { reply: { ...reply } } : {}) } }));
    } catch (error) {
      if (mounted.current && !operation.cancelled) setConversations(previous => ({ ...previous, [key]: { ...previous[key], status: 'error', sent: true, reply: { text: error instanceof Error ? error.message : 'Could not send your message. Please try again.', actions: [{ id: 'retry', label: 'Try again', message: text }] } } }));
    } finally {
      if (!operation.cancelled && activeRequests.current.get(key) === operation) pending.current.delete(key);
      if (mounted.current && !operation.cancelled) { revision.current++; void refresh().catch(error => console.warn('Could not refresh cards', error)); }
    }
  }, [source, refresh, data.snapshot.findings, data.conversations]);
  const cancel = useCallback(async (findingId: string | null = null, agentId?: string) => {
    const target = agentId ?? data.snapshot.findings.find(card => card.id === findingId)?.agentId;
    const key = conversationKey({ agentId: target, findingId });
    const operation = activeRequests.current.get(key);
    if (!operation || operation.stopping) return;
    operation.cancelled = true; operation.stopping = true;
    mutedConversations.current.add(key);
    if (operation.messageId) sessionMessages.current.delete(operation.messageId);
    revision.current++;
    setConversations(previous => ({ ...previous, [key]: { status: 'thinking', sent: true } }));
    if (operation.submissionId) setData(previous => ({ ...previous, snapshot: { ...previous.snapshot, findings: previous.snapshot.findings.filter(card => card.submissionId !== operation.submissionId) } }));
    try {
      const result = await source.cancelMessage?.(operation.request);
      revision.current++;
      if (mounted.current) {
        setData(previous => ({ ...previous, snapshot: { ...previous.snapshot, findings: previous.snapshot.findings.filter(card => !result?.cardIds.includes(card.id)) } }));
        setConversations(previous => ({ ...previous, [key]: { status: 'idle', sent: true } }));
      }
      activeRequests.current.delete(key); pending.current.delete(key);
    } catch {
      if (mounted.current) setConversations(previous => ({ ...previous, [key]: { ...previous[key], status: 'error', sent: true, stopFailed: true, reply: { text: 'Could not stop the response on this device. Tap stop again to retry.' } } }));
    } finally { operation.stopping = false; }
  }, [source, refresh, data.snapshot.findings]);
  const saveDocument = useCallback(async (id: string, text: string) => {
    revision.current++;
    if (source.saveDocument) await source.saveDocument(id, text);
    revision.current++;
    if (mounted.current) setData(previous => ({ ...previous, documents: { ...previous.documents, [id]: text } }));
  }, [source]);
  const seenInFlight = useRef(new Set<string>());
  const markCardSeen = useCallback(async (id: string) => {
    if (!source.markCardSeen || seenInFlight.current.has(id)) return;
    const card = data.snapshot.findings.find(item => item.id === id);
    if (!card || card.firstSeenAt) return;
    seenInFlight.current.add(id);
    try {
      const times = await source.markCardSeen(id);
      if (mounted.current) setData(previous => ({ ...previous, snapshot: { ...previous.snapshot,
        findings: previous.snapshot.findings.map(item => item.id === id ? { ...item, ...times } : item) } }));
    } finally { seenInFlight.current.delete(id); }
  }, [source, data.snapshot.findings]);
  useEffect(() => {
    const expire = () => setData(previous => {
      const findings = previous.snapshot.findings.filter((card, index) => index < 4 || !card.expiresAt || Date.parse(card.expiresAt) > Date.now());
      return findings.length === previous.snapshot.findings.length ? previous : { ...previous, snapshot: { ...previous.snapshot, findings } };
    });
    expire();
    const now = Date.now();
    const times = data.snapshot.findings.slice(4).flatMap(card => card.expiresAt ? [Date.parse(card.expiresAt)] : []).filter(time => Number.isFinite(time) && time > now);
    const timer = times.length ? setTimeout(expire, Math.max(0, Math.min(...times) - Date.now())) : undefined;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') expire(); });
    return () => { if (timer) clearTimeout(timer); subscription.remove(); };
  }, [data.snapshot.findings]);
  useEffect(() => {
    if (demoMode || Platform.OS === 'web') return;
    const controller = new AbortController();
    let removeTokenListener: (() => void) | undefined;
    let registering = false;
    let lastIssue: string | undefined;
    const register = async (requestPermission: boolean) => {
      if (registering || controller.signal.aborted) return;
      registering = true;
      try {
        const message = await registerPhonePush(controller.signal, requestPermission);
        if (controller.signal.aborted || !mounted.current) return;
        if (message) {
          if (message !== lastIssue) console.warn(message);
          lastIssue = message;
          return;
        }
        lastIssue = undefined;
        if (!removeTokenListener) {
          const notifications = await import('expo-notifications');
          if (controller.signal.aborted) return;
          const subscription = notifications.addPushTokenListener(() => { void register(false); });
          removeTokenListener = () => subscription.remove();
        }
      } catch (failure) {
        if (!controller.signal.aborted && mounted.current) {
          const message = 'Phone notification registration failed. ' + (failure instanceof Error ? failure.message : 'Reopen the app to retry.');
          if (message !== lastIssue) console.warn(message);
          lastIssue = message;
        }
      } finally { registering = false; }
    };
    void register(true);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void register(false); });
    return () => { controller.abort(); foreground.remove(); removeTokenListener?.(); };
  }, []);
  return {
    ...data, loading, actionErrors, completeTask, restoreTask, send, cancel, refresh, saveDocument, isDemo: demoMode,
    conversation: (id: string | null, agentId?: string) => {
      const target = agentId ?? data.snapshot.findings.find(card => card.id === id)?.agentId;
      return conversations[conversationKey({ agentId: target, findingId: id })] ?? idle;
    },
    markCardSeen,
  };
}
const Context = createContext<ReturnType<typeof useData> | null>(null);
export function AppDataProvider({ children, dataSource }: { children: React.ReactNode; dataSource?: DataSource }) {
  const [source] = useState(() => dataSource ?? (demoMode ? createDemoSource() : createRemoteSource(gateway, Crypto.randomUUID)));
  return <Context.Provider value={useData(source)}>{children}</Context.Provider>;
}
export function useAppData() { const value = useContext(Context); if (!value) throw new Error('AppDataProvider is required'); return value; }
