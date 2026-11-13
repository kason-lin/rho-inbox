import { json, route } from '@/lib/api';
import { loadHome } from '@/lib/home';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/home → balances, a 30-day balance line, this month's in/outflows, card spend, unpaid invoices.
export const GET = route(async () => json(await loadHome(adminClient())));
