import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { demoData } from './demo';
import { createDemoSource } from './source';
import type { DataSource, Reply, Snapshot, Task } from './types';

type Conversation = { status: 'idle' | 'thinking' | 'reply' | 'error'; reply?: Reply; sent: boolean };
const idle: Conversation = { status: 'idle', sent: false };
const source = createDemoSource();

function useData(source: DataSource) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ tasks: [], findings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [documents, setDocuments] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(demoData.agents.map(agent => [agent.id, agent.document])),
    preferences: '# Preferences\n\n' + demoData.profile.preferences.map(text => '- ' + text).join('\n') + '\n',
  }));
  const pending = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let receivedUpdate = false;
    const unsubscribe = source.subscribe?.(next => { receivedUpdate = true; setSnapshot(next); setLoading(false); });
    source.load().then(next => {
      if (mounted.current && !receivedUpdate) { setSnapshot(next); setLoading(false); }
    }).catch(() => { if (mounted.current) { setError('Could not load your updates.'); setLoading(false); } });
    return () => { mounted.current = false; unsubscribe?.(); };
  }, [source]);

  const completeTask = useCallback(async (id: string) => {
    // The source publishes the updated snapshot; the mock source does so immediately.
    setSnapshot(previous => ({ ...previous, tasks: previous.tasks.filter(task => task.id !== id) }));
    try { await source.completeTask(id); }
    catch {
      setError('Could not complete that task. Please try again.');
      try { setSnapshot(await source.load()); } catch { /* Keep the error visible if refresh also fails. */ }
    }
  }, [source]);

  const restoreTask = useCallback(async (task: Task) => {
    setSnapshot(previous => previous.tasks.some(item => item.id === task.id)
      ? previous
      : { ...previous, tasks: [task, ...previous.tasks] });
    try { await source.restoreTask(task); }
    catch {
      setError('Could not undo that task. Please try again.');
      try { setSnapshot(await source.load()); } catch { /* Keep the error visible if refresh also fails. */ }
    }
  }, [source]);

  const send = useCallback(async (findingId: string | null, text: string) => {
    const key = findingId ?? '__general__';
    if (!text.trim() || pending.current.has(key)) return;
    pending.current.add(key);
    setConversations(previous => ({ ...previous, [key]: { status: 'thinking', sent: true } }));
    try {
      const reply = await source.sendMessage({ findingId, text: text.trim() });
      if (mounted.current) setConversations(previous => ({ ...previous, [key]: { status: 'reply', sent: true, reply } }));
    } catch {
      if (mounted.current) setConversations(previous => ({ ...previous, [key]: { status: 'error', sent: true, reply: { text: 'Something went wrong. Please try sending your message again.' } } }));
    } finally { pending.current.delete(key); }
  }, [source]);

  return {
    snapshot, loading, error, completeTask, restoreTask, send,
    conversation: (id: string | null) => conversations[id ?? '__general__'] ?? idle,
    agents: demoData.agents, profile: demoData.profile, feed: demoData.feed, documents,
    saveDocument: (id: string, text: string) => setDocuments(previous => ({ ...previous, [id]: text })),
    dismissError: () => setError(null),
  };
}

const Context = createContext<ReturnType<typeof useData> | null>(null);
export function AppDataProvider({ children, dataSource = source }: { children: React.ReactNode; dataSource?: DataSource }) {
  return <Context.Provider value={useData(dataSource)}>{children}</Context.Provider>;
}
export function useAppData() {
  const value = useContext(Context);
  if (!value) throw new Error('AppDataProvider is required');
  return value;
}
