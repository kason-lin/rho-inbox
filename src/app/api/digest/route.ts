import { json, route } from '@/lib/api';
import { getCheckin } from '@/lib/checkin/store';
import { resolveViewer } from '@/lib/checkin/viewer';
import { digestFacts, getDigest } from '@/lib/digest';
import { loadEvents } from '@/lib/inbox';
import { adminClient } from '@/lib/supabase/admin';
import { buildThreads, summarize } from '@/lib/threads';

export const dynamic = 'force-dynamic';

// GET /api/digest?as=kason → { text, source: 'claude' | 'template', generated_at, note? }
// Three sentences summarizing the week, written from the viewer's role-filtered Check-in.
export const GET = route(async (req: Request) => {
  const viewer = await resolveViewer(new URL(req.url).searchParams.get('as'));
  if ('response' in viewer) return viewer.response;
  const [view, events] = await Promise.all([getCheckin(adminClient(), viewer.user), loadEvents()]);
  const facts = digestFacts(view, summarize(buildThreads(events)).unread);
  return json({ ...(await getDigest(facts)), facts });
});
