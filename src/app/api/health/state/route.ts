// GET  /api/health/state → the viewer's demo state (date, connected tools, approval).
// POST /api/health/state { date?, connect? } → jump the demo calendar or connect a tool ('all' connects every tool).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { json, parseBody, route } from '@/lib/api';
import { DATA, DEMO_DATES } from '@/lib/health/data';
import { readState, writeState } from '@/lib/health/state';

export const dynamic = 'force-dynamic';

const Body = z.object({
  date: z.enum([DEMO_DATES.invoiceArrives, DEMO_DATES.alert]).optional(),
  connect: z.string().optional(),
});

export const GET = route(async () => json(await readState()));

export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;
  const state = await readState();
  const ids = DATA.connections.tools.map(t => t.id);
  const { date, connect } = body.data;
  if (connect && connect !== 'all' && !ids.includes(connect)) return json({ error: `Unknown tool "${connect}"` }, 400);

  const next = {
    ...state,
    date: date ?? state.date,
    connected: connect === 'all' ? ids : connect ? [...new Set([...state.connected, connect])] : state.connected,
  };
  return writeState(NextResponse.json(next), next);
});
