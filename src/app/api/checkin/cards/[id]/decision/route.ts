import { z } from 'zod';
import { error, json, parseBody, route } from '@/lib/api';
import { decideCard } from '@/lib/checkin/store';
import { DECISIONS } from '@/lib/checkin/types';
import { resolveViewer } from '@/lib/checkin/viewer';
import { adminClient } from '@/lib/supabase/admin';

const Body = z.object({ decision: z.enum(DECISIONS), as: z.string().optional() });

// POST /api/checkin/cards/:id/decision  { decision: 'approve'|'not_now'|'wrong', as?: user id }
// Approve runs the prepared action (only admins); every tap, allowed or refused, is audited.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const body = await parseBody(req, Body);
  if ('response' in body) return body.response;
  const viewer = await resolveViewer(body.data.as);
  if ('response' in viewer) return viewer.response;

  const result = await decideCard(adminClient(), (await params).id, body.data.decision, viewer.user);
  return result.ok ? json(result) : error(result.error, result.status);
});
