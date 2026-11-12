import { json, route } from '@/lib/api';
import { getCheckin } from '@/lib/checkin/store';
import { resolveViewer } from '@/lib/checkin/viewer';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/checkin?as=maya → this week's cards (max 3, ranked), "other things" lines, balances.
// Payroll details are hidden when ?as is a non-admin teammate.
export const GET = route(async (req: Request) => {
  const viewer = await resolveViewer(new URL(req.url).searchParams.get('as'));
  if ('response' in viewer) return viewer.response;
  return json(await getCheckin(adminClient(), viewer.user));
});
