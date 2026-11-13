// POST /api/health/feedback { card_id, kind: 'not_now' | 'wrong', reason? } → hides that card for this viewer.
// "This is wrong" keeps the reason (already paid, wrong amount, don't flag this vendor) to tune the rules.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody, route } from '@/lib/api';
import { readState, writeState } from '@/lib/health/state';
import { healthView } from '@/lib/health/view';

const Body = z.object({ card_id: z.string(), kind: z.enum(['not_now', 'wrong']), reason: z.string().max(200).optional() });

export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;
  const state = await readState();
  const { card_id, kind, reason } = body.data;
  const next = {
    ...state,
    muted: [...new Set([...state.muted, card_id])],
    feedback: kind === 'wrong' ? [...state.feedback, { card_id, reason: reason ?? 'This is wrong' }] : state.feedback,
  };
  return writeState(NextResponse.json(healthView(next)), next);
});
