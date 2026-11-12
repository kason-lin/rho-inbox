import { z } from 'zod';
import { json, parseBody, route } from '@/lib/api';
import { insertEvent, latestOpenInvoice } from '@/lib/inbox';
import { SCENARIOS, scenarioFor, simulate, type Scenario } from '@/lib/simulator';
import { SOURCES } from '@/lib/types';

const Body = z.object({
  source: z.enum(SOURCES).optional(),
  scenario: z.enum(SCENARIOS).optional(),
});

// POST /api/simulate  { source?: 'cards'|…, scenario?: 'unusual_charge'|… }
// Fires one realistic event; the inbox picks it up over Supabase Realtime.
export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;

  const rng = Math.random;
  const scenario: Scenario =
    body.data.scenario ??
    (body.data.source ? scenarioFor(body.data.source, rng) : SCENARIOS[Math.floor(rng() * SCENARIOS.length)]);

  const lastInvoice = scenario === 'invoice_progress' ? await latestOpenInvoice() : null;
  const event = await insertEvent(simulate(scenario, rng, new Date(), lastInvoice));
  return json({ scenario, event }, 201);
});
