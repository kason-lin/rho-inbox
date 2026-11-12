import { json, route } from '@/lib/api';
import { runCheckin } from '@/lib/checkin/store';
import { adminClient } from '@/lib/supabase/admin';

// POST /api/checkin/run → re-run the engine now (the real thing would run Mondays at 8:00 AM).
export const POST = route(async () => {
  const briefing = await runCheckin(adminClient());
  return json({ cards: briefing.cards.map(c => ({ rank: c.rank, type: c.type, title: c.title })), others: briefing.others.length });
});
