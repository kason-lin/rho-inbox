import { z } from 'zod';
import { error, json, parseBody, route } from '@/lib/api';
import { runCheckin } from '@/lib/checkin/store';
import { getEvent, insertEvent, latestOpenInvoice } from '@/lib/inbox';
import { SCENARIOS, scenarioFor, simulate, type Scenario } from '@/lib/simulator';
import { adminClient } from '@/lib/supabase/admin';
import { SOURCES } from '@/lib/types';

const Body = z.object({
  source: z.enum(SOURCES).optional(),
  scenario: z.enum([...SCENARIOS, 'duplicate_charge']).optional(),
});

// POST /api/simulate  { source?: 'cards'|…, scenario?: 'duplicate_charge'|'unusual_charge'|… }
// Fires one realistic event; the inbox picks it up over Supabase Realtime.
export const POST = route(async (req: Request) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;

  if (body.data.scenario === 'duplicate_charge') return duplicateCharge();

  const rng = Math.random;
  const scenario: Scenario =
    (body.data.scenario as Scenario | undefined) ??
    (body.data.source ? scenarioFor(body.data.source, rng) : SCENARIOS[Math.floor(rng() * SCENARIOS.length)]);

  const lastInvoice = scenario === 'invoice_progress' ? await latestOpenInvoice() : null;
  const event = await insertEvent(simulate(scenario, rng, new Date(), lastInvoice));
  return json({ scenario, event }, 201);
});

/**
 * A vendor bills the same amount twice: copy a recent subscription charge to "just now", then let the
 * Check-in engine spot it. It becomes an urgent card, and its Inbox row arrives live.
 */
async function duplicateCharge() {
  const db = adminClient();
  const since = new Date(Date.now() - 13 * 86_400_000).toISOString();
  const { data: recent, error: e1 } = await db
    .from('transactions').select('*').eq('method', 'card').eq('recurring', true).gte('occurred_at', since)
    .order('amount', { ascending: false });   // the biggest recent charge makes the clearest demo
  if (e1) throw new Error(e1.message);
  const { data: flagged, error: e2 } = await db.from('checkin_cards').select('vendor').eq('type', 'suspicious_charge');
  if (e2) throw new Error(e2.message);

  const taken = new Set((flagged ?? []).map(f => f.vendor));
  const original = (recent ?? []).find(t => !taken.has(t.vendor) && t.vendor !== 'Mixpanel');
  if (!original) return error('No recent subscription charge left to duplicate. Run npm run seed to reset.', 409);

  const { id: _id, ...copy } = original;
  const { error: e3 } = await db.from('transactions').insert({ ...copy, recurring: false, occurred_at: new Date().toISOString() });
  if (e3) throw new Error(e3.message);

  const briefing = await runCheckin(db);
  const card = briefing.cards.find(c => c.type === 'suspicious_charge' && c.vendor === original.vendor);
  const { data: row } = await db.from('checkin_cards').select('id, inbox_event_id').eq('type', 'suspicious_charge').eq('vendor', original.vendor).eq('status', 'proposed').maybeSingle();
  const event = row?.inbox_event_id ? await getEvent(row.inbox_event_id) : null;
  return json({ scenario: 'duplicate_charge', card: card ? { ...card, id: row?.id } : null, event }, 201);
}
