// POST /api/health/feedback { card_id, kind: 'not_now' | 'wrong' } → hides that card for this viewer
// ("This is wrong" would also tune the rules in a real build; here it's remembered in the demo state).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody, route } from '@/lib/api';
import { readState, writeState } from '@/lib/health/state';
import { healthView } from '@/lib/health/view';

const Body = z.object({ card_id: z.string(), kind: z.enum(['not_now', 'wrong']) });

export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;
  const state = await readState();
  const next = { ...state, muted: [...new Set([...state.muted, body.data.card_id])] };
  return writeState(NextResponse.json(healthView(next)), next);
});
