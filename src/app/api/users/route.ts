import { json, route } from '@/lib/api';
import { loadUsers } from '@/lib/checkin/store';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/users → the people the demo's role switcher can view as.
export const GET = route(async () => json({ users: await loadUsers(adminClient()) }));
