import { z } from 'zod';
import { error, json, parseBody, route } from '@/lib/api';
import { getEvent, updateStatus } from '@/lib/inbox';
import { STATUSES } from '@/lib/types';

const Body = z
  .object({
    status: z.enum(STATUSES),
    snooze_until: z.string().datetime({ offset: true }).optional(),
    apply_to_thread: z.boolean().default(false),
  })
  .refine(b => b.status !== 'snoozed' || !!b.snooze_until, { message: 'snooze_until is required when snoozing', path: ['snooze_until'] });

type Ctx = { params: Promise<{ id: string }> };

// GET /api/events/:id
export const GET = route(async (_req: Request, { params }: Ctx) => {
  const event = await getEvent((await params).id);
  return event ? json({ event }) : error('Event not found', 404);
});

// PATCH /api/events/:id  { status: 'read'|'unread'|'done'|'snoozed', snooze_until?, apply_to_thread? }
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;

  if (!(await getEvent(id))) return error('Event not found', 404);
  const { status, snooze_until, apply_to_thread } = body.data;
  const events = await updateStatus(id, status, { snoozeUntil: snooze_until, applyToThread: apply_to_thread });
  return json({ events });
});
