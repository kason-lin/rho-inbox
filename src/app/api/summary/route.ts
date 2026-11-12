import { json, route } from '@/lib/api';
import { loadEvents } from '@/lib/inbox';
import { buildThreads, summarize } from '@/lib/threads';

export const dynamic = 'force-dynamic';

// GET /api/summary → { needs_action, unread, items: [{ thread_id, source, title, reason }] }
export const GET = route(async () => json(summarize(buildThreads(await loadEvents()))));
