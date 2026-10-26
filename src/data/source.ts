import { demoData } from './demo';
import type { DataSource, Reply, Snapshot } from './types';

export interface DemoSource extends DataSource {
  publishSnapshot(snapshot: Snapshot): void;
}

export function createDemoSource(initial: Snapshot = demoData.snapshot, delayMs = demoData.typingDelayMs): DemoSource {
  let snapshot = initial;
  const listeners = new Set<(snapshot: Snapshot) => void>();
  const publishSnapshot = (next: Snapshot) => {
    snapshot = next;
    listeners.forEach(listener => listener(snapshot));
  };
  return {
    publishSnapshot,
    async load() { return snapshot; },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async completeTask(taskId) {
      publishSnapshot({ ...snapshot, tasks: snapshot.tasks.filter(task => task.id !== taskId) });
    },
    async sendMessage({ text }) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      const value = text.toLowerCase();
      let reply: Reply = demoData.replies.default;
      if (value.includes('shorter')) reply = demoData.replies.shorter;
      else if (value.includes('draft') && value.includes('good')) reply = demoData.replies.done;
      else if (value.includes('draft') || value.includes('jacob')) reply = demoData.replies.draft;
      else if (value.includes('confirm')) reply = demoData.replies.confirm;
      else if (value.includes('reschedule')) reply = demoData.replies.reschedule;
      else if (value.includes('details')) reply = demoData.replies.details;
      else if (value.includes('flight') || value.includes('route')) reply = demoData.replies.flights;
      return reply;
    },
  };
}
