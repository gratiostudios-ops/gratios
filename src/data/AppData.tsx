import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { registerPhonePush } from '../notifications';
import * as Crypto from 'expo-crypto';
import { mobileCache } from './mobile-cache';
import { conversationKey } from './conversations';
import { demoData } from './demo';
import { createDemoSource } from './source';
import { createRemoteSource } from './remote';
import { demoMode, gateway } from '../auth/Auth';
import type { DataSource, MobileData, Reply, Snapshot, Task } from './types';

type Conversation = { status: 'idle' | 'thinking' | 'reply' | 'error'; reply?: Reply; sent: boolean; messageId?: string };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [cacheIdentity] = useState(() => gateway.cacheIdentity);
  const [cache] = useState(() => !demoMode && gateway.cacheIdentity ? mobileCache.open(gateway.cacheIdentity) : null);
  const hydrated = useRef(false);
  const pending = useRef(new Set<string>());
  const mounted = useRef(true);
  const refreshing = useRef<Promise<void> | null>(null);
  const revision = useRef(0);
  const reportedNotificationFailures = useRef(new Set<string>());
  const refresh = useCallback((): Promise<void> => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = (async () => {
      const loadRevision = revision.current;
      const next = source.loadMobile ? await source.loadMobile() : { ...demoMobile, snapshot: await source.load() };
      if (!mounted.current || loadRevision !== revision.current || cacheIdentity && cacheIdentity !== gateway.cacheIdentity) return;
      setData(next); setLoading(false);
      if (cache) void cache.write(next).catch(() => {});
      const failures = next.notificationFailures ?? [];
      if (failures.some(failure => !reportedNotificationFailures.current.has(failure.id))) {
        setError('A notification could not be delivered to your phone.');
      }
      for (const failure of failures) reportedNotificationFailures.current.add(failure.id);
      setConversations(previous => {
        const restored = { ...previous };
        for (const conversation of next.conversations) {
          if (!conversation.messages.length && !conversation.history?.some(message => message.role === 'user')) continue;
          const key = conversationKey(conversation);
          if (pending.current.has(key)) continue;
          const latest = conversation.history?.[conversation.history.length - 1];
          const message = latest?.role === 'assistant'
            ? { id: latest.id, text: latest.text, status: 'completed' as const, reply: latest.reply ?? { text: latest.text } }
            : conversation.messages[conversation.messages.length - 1];
          if (!message) continue;
          const old = previous[key];
          if (old?.messageId === message.id && (old.status === 'reply' && message.status === 'completed' && old.reply?.text === message.reply?.text || old.status === 'thinking' && ['queued', 'running'].includes(message.status) || old.status === 'error' && message.status === 'failed' && old.reply?.text === (message.error || 'The agent could not complete your request.'))) continue;
          const reply = message.reply?.text ? (message.reply.text === old?.reply?.text ? old?.reply : message.reply) : undefined;
          restored[key] = message.status === 'completed' ? { status: 'reply', sent: true, reply, messageId: message.id }
            : message.status === 'failed' ? { status: 'error', sent: true, reply: { text: message.error || 'The agent could not complete your request.', actions: [{ id: 'retry-' + message.id, label: 'Try again', message: message.text }] }, messageId: message.id }
              : { status: 'thinking', sent: true, messageId: message.id };
        }
        return restored;
      });
    })().finally(() => { refreshing.current = null; });
    return refreshing.current;
  }, [source, cache, cacheIdentity]);
  useEffect(() => {
    mounted.current = true;
    let foreground = AppState.currentState === 'active';
    source.setForeground?.(foreground);
    const update = () => { void refresh().catch(error => { if (mounted.current) { setError(error instanceof Error ? error.message : 'Could not load your updates.'); setLoading(false); } }); };
    void (async () => {
      if (cache && !hydrated.current) {
        const cached = await cache.read();
        if (!mounted.current) return;
        hydrated.current = true;
        if (cached) {
          setData(cached); setLoading(false);
          const restored: Record<string, Conversation> = {};
          for (const conversation of cached.conversations) {
            if (!conversation.messages.length && !conversation.history?.some(message => message.role === 'user')) continue;
            const latest = conversation.history?.[conversation.history.length - 1];
            const message = latest?.role === 'assistant'
              ? { id: latest.id, status: 'completed', reply: latest.reply ?? { text: latest.text } }
              : conversation.messages[conversation.messages.length - 1];
            if (!message) continue;
            restored[conversationKey(conversation)] = { status: message.status === 'failed' ? 'error' : message.status === 'completed' ? 'reply' : 'thinking', sent: true, reply: message.reply, messageId: message.id };
          }
          setConversations(restored);
        }
      }
      update();
    })();
    const unsubscribe = source.subscribe?.(snapshot => { if (mounted.current) { setData(previous => ({ ...previous, snapshot })); setLoading(false); } });
    const subscription = AppState.addEventListener('change', state => { foreground = state === 'active'; source.setForeground?.(foreground); if (foreground) update(); });
    const interval = setInterval(() => { if (foreground) update(); }, 10000);
    return () => { mounted.current = false; unsubscribe?.(); subscription.remove(); clearInterval(interval); source.dispose?.(); };
  }, [source, refresh, cache]);
  const completeTask = useCallback(async (id: string) => {
    setData(previous => ({ ...previous, snapshot: { ...previous.snapshot, tasks: previous.snapshot.tasks.filter(task => task.id !== id) } }));
    try { await source.completeTask(id); }
    catch { if (mounted.current) setError('Could not complete that task. Please try again.'); await refresh().catch(() => {}); }
  }, [source, refresh]);
  const restoreTask = useCallback(async (task: Task) => {
    setData(previous => previous.snapshot.tasks.some(item => item.id === task.id) ? previous : { ...previous, snapshot: { ...previous.snapshot, tasks: [task, ...previous.snapshot.tasks] } });
    try { await source.restoreTask(task); }
    catch { if (mounted.current) setError('Could not undo that task. Please try again.'); await refresh().catch(() => {}); }
  }, [source, refresh]);
  const send = useCallback(async (findingId: string | null, text: string, agentId?: string) => {
    const target = agentId ?? data.snapshot.findings.find(card => card.id === findingId)?.agentId;
    const key = conversationKey({ agentId: target, findingId });
    if (!text.trim() || pending.current.has(key)) return;
    revision.current++;
    pending.current.add(key);
    setConversations(previous => ({ ...previous, [key]: { status: 'thinking', sent: true } }));
    try {
      const reply = await source.sendMessage({ findingId, text: text.trim(), ...(target ? { agentId: target } : {}) });
      if (mounted.current) setConversations(previous => ({ ...previous, [key]: { status: 'reply', sent: true, ...(reply.text ? { reply: { ...reply } } : {}) } }));
    } catch (error) {
      if (mounted.current) setConversations(previous => ({ ...previous, [key]: { status: 'error', sent: true, reply: { text: error instanceof Error ? error.message : 'Could not send your message. Please try again.', actions: [{ id: 'retry', label: 'Try again', message: text }] } } }));
    } finally { pending.current.delete(key); if (mounted.current) void refresh().catch(() => {}); }
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
      const findings = previous.snapshot.findings.filter(card => !card.expiresAt || Date.parse(card.expiresAt) > Date.now());
      return findings.length === previous.snapshot.findings.length ? previous : { ...previous, snapshot: { ...previous.snapshot, findings } };
    });
    const times = data.snapshot.findings.flatMap(card => card.expiresAt ? [Date.parse(card.expiresAt)] : []).filter(Number.isFinite);
    const timer = times.length ? setTimeout(expire, Math.max(0, Math.min(...times) - Date.now())) : undefined;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') expire(); });
    return () => { if (timer) clearTimeout(timer); subscription.remove(); };
  }, [data.snapshot.findings]);
  useEffect(() => {
    if (demoMode || Platform.OS === 'web') return;
    const controller = new AbortController();
    let removeTokenListener: (() => void) | undefined;
    void registerPhonePush(controller.signal).then(async message => {
      if (controller.signal.aborted || !mounted.current) return;
      if (message) return;
      const notifications = await import('expo-notifications');
      if (controller.signal.aborted) return;
      const subscription = notifications.addPushTokenListener(() => { void registerPhonePush(controller.signal).catch(() => {}); });
      removeTokenListener = () => subscription.remove();
    }).catch(() => {});
    return () => { controller.abort(); removeTokenListener?.(); };
  }, []);
  return {
    ...data, loading, error, completeTask, restoreTask, send, refresh, saveDocument, isDemo: demoMode,
    conversation: (id: string | null, agentId?: string) => {
      const target = agentId ?? data.snapshot.findings.find(card => card.id === id)?.agentId;
      return conversations[conversationKey({ agentId: target, findingId: id })] ?? idle;
    },
    markCardSeen,
    dismissError: () => setError(null),
  };
}
const Context = createContext<ReturnType<typeof useData> | null>(null);
export function AppDataProvider({ children, dataSource }: { children: React.ReactNode; dataSource?: DataSource }) {
  const [source] = useState(() => dataSource ?? (demoMode ? createDemoSource() : createRemoteSource(gateway, Crypto.randomUUID)));
  return <Context.Provider value={useData(source)}>{children}</Context.Provider>;
}
export function useAppData() { const value = useContext(Context); if (!value) throw new Error('AppDataProvider is required'); return value; }
