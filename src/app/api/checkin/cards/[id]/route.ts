import { error, json, route } from '@/lib/api';
import { getCard, loadAccounts } from '@/lib/checkin/store';
import { viewCard } from '@/lib/checkin/view';
import { resolveViewer } from '@/lib/checkin/viewer';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/checkin/cards/:id?as=maya → one card with its proof, prepared action and current balances.
export const GET = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const viewer = await resolveViewer(new URL(req.url).searchParams.get('as'));
  if ('response' in viewer) return viewer.response;
  const db = adminClient();
  const card = await getCard(db, (await params).id);
  if (!card) return error('Card not found', 404);
  return json({ card: viewCard(card, viewer.user), accounts: await loadAccounts(db) });
});
