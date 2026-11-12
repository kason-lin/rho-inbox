import { z } from 'zod';
import { canTakeAction, followUpFor } from '@/lib/actions';
import { error, json, parseBody, route } from '@/lib/api';
import { decideCard, getUser } from '@/lib/checkin/store';
import { getEvent, insertEvent, updateStatus } from '@/lib/inbox';
import { adminClient } from '@/lib/supabase/admin';
import { ACTIONS } from '@/lib/types';

const Body = z.object({ action: z.enum(ACTIONS), as: z.string().default('maya') });

// POST /api/events/:id/action  { action: 'approve'|'pay'|'dispute', as?: user id }
// Marks the event done and appends the product's confirmation to the same thread.
// Check-in rows go through the Check-in decision instead, so the same guardrails apply everywhere.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;

  const event = await getEvent(id);
  if (!event) return error('Event not found', 404);

  const check = canTakeAction(event, body.data.action);
  if (!check.ok) return error(check.error, 409);

  const cardId = event.meta.checkin_card_id;
  if (typeof cardId === 'string' && event.type.startsWith('checkin_')) {
    const db = adminClient();
    const user = await getUser(db, body.data.as ?? 'maya');
    if (!user) return error('Unknown user', 404);
    const result = await decideCard(db, cardId, 'approve', user);
    return result.ok ? json(result) : error(result.error, result.status);
  }

  const [done] = await updateStatus(id, 'done');
  const followUp = await insertEvent(followUpFor(event, body.data.action));
  return json({ event: done, follow_up: followUp });
});
