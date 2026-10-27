import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from './types';

const storageKey = '@avocado/next-task-card-kind';
let sessionNextKind: Task['kind'] = 'task';

// Choose once per Home visit, not when a card is completed or a snapshot updates.
export function useTaskCard(tasks: Task[], loading: boolean, isActive: boolean) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opening, setOpening] = useState(0);
  const chosen = useRef(false);
  const latestTasks = useRef(tasks);
  latestTasks.current = tasks;
  const hasAvailableTasks = tasks.length > 0;

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active' && previous !== 'active') {
        chosen.current = false;
        setOpening(value => value + 1);
      }
      previous = next;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isActive) { chosen.current = false; return; }
    if (loading || !hasAvailableTasks || chosen.current) return;
    let cancelled = false;
    const choose = async () => {
      let nextKind = sessionNextKind;
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored === 'task' || stored === 'calendar') nextKind = stored;
      } catch { /* Retain session alternation if persistence is unavailable. */ }
      if (cancelled) return;
      const task = latestTasks.current.find(item => item.kind === nextKind) ?? latestTasks.current[0];
      if (!task) return;
      chosen.current = true;
      setSelectedId(task.id);
      sessionNextKind = task.kind === 'task' ? 'calendar' : 'task';
      await AsyncStorage.setItem(storageKey, sessionNextKind).catch(() => {});
    };
    void choose();
    return () => { cancelled = true; };
  }, [hasAvailableTasks, isActive, loading, opening]);

  return tasks.find(task => task.id === selectedId) ?? null;
}
