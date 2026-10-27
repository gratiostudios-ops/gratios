import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
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
  const pending = useRef(new Set<string>());
  const mounted = useRef(true);
  const refreshing = useRef<Promise<void> | null>(null);
  const revision = useRef(0);
  const refresh = useCallback((): Promise<void> => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = (async () => {
      const loadRevision = revision.current;
      const next = source.loadMobile ? await source.loadMobile() : { ...demoMobile, snapshot: await source.load() };
      if (!mounted.current || loadRevision !== revision.current) return;
      setData(next); setLoading(false);
      setConversations(previous => {
        const restored = { ...previous };
        for (const conversation of next.conversations) {
          const key = conversation.findingId ?? '__general__';
          if (pending.current.has(key)) continue;
          const message = conversation.messages[conversation.messages.length - 1];
          if (!message) continue;
          const old = previous[key];
          if (old?.messageId === message.id && (old.status === 'reply' && message.status === 'completed' && old.reply?.text === message.reply?.text || old.status === 'thinking' && ['queued', 'running'].includes(message.status) || old.status === 'error' && message.status === 'failed' && old.reply?.text === (message.error || 'The agent could not complete your request.'))) continue;
          const reply = message.reply?.text === old?.reply?.text ? old?.reply : message.reply;
          restored[key] = message.status === 'completed' ? { status: 'reply', sent: true, reply, messageId: message.id }
            : message.status === 'failed' ? { status: 'error', sent: true, reply: { text: message.error || 'The agent could not complete your request.', actions: [{ id: 'retry-' + message.id, label: 'Try again', message: message.text }] }, messageId: message.id }
              : { status: 'thinking', sent: true, messageId: message.id };
        }
        return restored;
      });
    })().finally(() => { refreshing.current = null; });
    return refreshing.current;
  }, [source]);
  useEffect(() => {
    mounted.current = true;
    let foreground = AppState.currentState === 'active';
    source.setForeground?.(foreground);
    const update = () => { void refresh().catch(error => { if (mounted.current) { setError(error instanceof Error ? error.message : 'Could not load your updates.'); setLoading(false); } }); };
    update();
    const unsubscribe = source.subscribe?.(snapshot => { if (mounted.current) { setData(previous => ({ ...previous, snapshot })); setLoading(false); } });
    const subscription = AppState.addEventListener('change', state => { foreground = state === 'active'; source.setForeground?.(foreground); if (foreground) update(); });
    const interval = setInterval(() => { if (foreground) update(); }, 10000);
    return () => { mounted.current = false; unsubscribe?.(); subscription.remove(); clearInterval(interval); source.dispose?.(); };
  }, [source, refresh]);
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
  const send = useCallback(async (findingId: string | null, text: string) => {
    const key = findingId ?? '__general__';
    if (!text.trim() || pending.current.has(key)) return;
    revision.current++;
    pending.current.add(key);
    setConversations(previous => ({ ...previous, [key]: { status: 'thinking', sent: true } }));
    try {
      const reply = await source.sendMessage({ findingId, text: text.trim() });
      if (mounted.current) setConversations(previous => ({ ...previous, [key]: { status: 'reply', sent: true, reply: { ...reply } } }));
    } catch (error) {
      if (mounted.current) setConversations(previous => ({ ...previous, [key]: { status: 'error', sent: true, reply: { text: error instanceof Error ? error.message : 'Could not send your message. Please try again.', actions: [{ id: 'retry', label: 'Try again', message: text }] } } }));
    } finally { pending.current.delete(key); if (mounted.current) void refresh().catch(() => {}); }
  }, [source, refresh]);
  const saveDocument = useCallback(async (id: string, text: string) => {
    revision.current++;
    if (source.saveDocument) await source.saveDocument(id, text);
    revision.current++;
    if (mounted.current) setData(previous => ({ ...previous, documents: { ...previous.documents, [id]: text } }));
  }, [source]);
  return {
    ...data, loading, error, completeTask, restoreTask, send, refresh, saveDocument, isDemo: demoMode,
    conversation: (id: string | null) => conversations[id ?? '__general__'] ?? idle,
    dismissError: () => setError(null),
  };
}
const Context = createContext<ReturnType<typeof useData> | null>(null);
export function AppDataProvider({ children, dataSource }: { children: React.ReactNode; dataSource?: DataSource }) {
  const [source] = useState(() => dataSource ?? (demoMode ? createDemoSource() : createRemoteSource(gateway, Crypto.randomUUID)));
  return <Context.Provider value={useData(source)}>{children}</Context.Provider>;
}
export function useAppData() { const value = useContext(Context); if (!value) throw new Error('AppDataProvider is required'); return value; }
