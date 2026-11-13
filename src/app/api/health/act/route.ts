// POST /api/health/act { card_id, action: 'cancel' | 'dispute', as } → acts on a card other than the invoice:
// cancel the unused tool (and lock its card), or submit the pre-filled dispute. Admins only. Saved per viewer.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import usersFile from '@/data/business-health/users.json';
import { error, parseBody, route } from '@/lib/api';
import { DATA } from '@/lib/health/data';
import { readState, writeState } from '@/lib/health/state';
import { healthView } from '@/lib/health/view';
import { viewerId } from '@/lib/health/viewer-id';

const Body = z.object({ card_id: z.string(), action: z.enum(['cancel', 'dispute']), as: z.string().optional() });

export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;
  const user = usersFile.users.find(u => u.id === viewerId(body.data.as));
  if (!user || user.role !== 'admin') return error(`${user?.name ?? 'This user'} can’t do this. An admin has to.`, 403);

  const { card_id, action } = body.data;
  const valid = (action === 'cancel' && DATA.company.subscriptions.some(s => s.id === card_id))
    || (action === 'dispute' && DATA.company.duplicate_charge.id === card_id);
  if (!valid) return error(`Can’t ${action} "${card_id}".`, 422);

  const state = await readState();
  const next = { ...state, handled: { ...state.handled, [card_id]: action === 'cancel' ? 'cancelled' as const : 'disputed' as const } };
  return writeState(NextResponse.json(healthView(next)), next);
});
