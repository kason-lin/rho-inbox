import { z } from 'zod';
import { canTakeAction, followUpFor } from '@/lib/actions';
import { error, json, parseBody, route } from '@/lib/api';
import { getEvent, insertEvent, updateStatus } from '@/lib/inbox';
import { ACTIONS } from '@/lib/types';

const Body = z.object({ action: z.enum(ACTIONS) });

// POST /api/events/:id/action  { action: 'approve'|'pay'|'dispute' }
// Marks the event done and appends the product's confirmation to the same thread.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;

  const event = await getEvent(id);
  if (!event) return error('Event not found', 404);

  const check = canTakeAction(event, body.data.action);
  if (!check.ok) return error(check.error, 409);

  const [done] = await updateStatus(id, 'done');
  const followUp = await insertEvent(followUpFor(event, body.data.action));
  return json({ event: done, follow_up: followUp });
});
