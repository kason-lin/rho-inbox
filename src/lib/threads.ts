import { allowedActions } from './actions';
import { classify } from './priority';
import type { InboxEvent, InboxThread, Priority, Source, Status } from './types';

export type ThreadFilters = {
  source?: Source;
  priority?: Priority;
  /** 'inbox' (default) = unread + read; or a single status. */
  status?: Status | 'inbox';
  q?: string;
};

/**
 * Group events into Gmail-style threads. The newest event in a thread decides how the row
 * looks: paying a bill appends "Payment scheduled", so the thread drops from Needs action to FYI.
 */
export function buildThreads(events: InboxEvent[], now: Date = new Date()): InboxThread[] {
  const byThread = new Map<string, InboxEvent[]>();
  for (const e of events) {
    const list = byThread.get(e.thread_id) ?? [];
    list.push(e);
    byThread.set(e.thread_id, list);
  }

  const threads: InboxThread[] = [];
  for (const [thread_id, list] of byThread) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const head = list[list.length - 1];
    const open = head.status !== 'done';
    const { priority, reason } = open ? classify(head, now) : { priority: 'fyi' as const, reason: null };

    let status: Status = head.status;
    if (status === 'read' && list.some(e => e.status === 'unread')) status = 'unread';

    threads.push({
      thread_id,
      source: head.source,
      head,
      events: list,
      priority,
      reason,
      status,
      actions: allowedActions(head),
    });
  }

  return threads.sort((a, b) => b.head.created_at.localeCompare(a.head.created_at));
}

export function filterThreads(threads: InboxThread[], f: ThreadFilters): InboxThread[] {
  const q = f.q?.trim().toLowerCase();
  const status = f.status ?? 'inbox';
  return threads.filter(t => {
    if (f.source && t.source !== f.source) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (status === 'inbox' ? !(t.status === 'unread' || t.status === 'read') : t.status !== status) return false;
    if (q) {
      const haystack = t.events.map(e => `${e.title} ${e.summary ?? ''} ${e.counterparty ?? ''}`).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function summarize(threads: InboxThread[]) {
  const inbox = filterThreads(threads, {});
  const needs = inbox.filter(t => t.priority === 'needs_action');
  return {
    needs_action: needs.length,
    unread: inbox.filter(t => t.status === 'unread').length,
    items: needs.map(t => ({ thread_id: t.thread_id, source: t.source, title: t.head.title, reason: t.reason })),
  };
}
