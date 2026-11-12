import { json, route } from '@/lib/api';
import { loadAudit } from '@/lib/checkin/store';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/audit → every suggestion and decision, newest first.
export const GET = route(async () => json({ entries: await loadAudit(adminClient()) }));
