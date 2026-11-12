import { z } from 'zod';
import { error, json, route } from '@/lib/api';
import { loadEvents } from '@/lib/inbox';
import { buildThreads, filterThreads } from '@/lib/threads';
import { PRIORITIES, SOURCES, STATUSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

const Query = z.object({
  source: z.enum(SOURCES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum([...STATUSES, 'inbox']).optional(),
  q: z.string().max(200).optional(),
});

// GET /api/events?source=cards&priority=needs_action&status=inbox&q=aws
export const GET = route(async (req: Request) => {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) return error(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));

  const threads = filterThreads(buildThreads(await loadEvents()), parsed.data);
  return json({ threads });
});
