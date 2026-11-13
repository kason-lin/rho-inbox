// GET /api/health/spend → this month's AI bill split into "building" vs "running", with the projects behind each.
import { json, route } from '@/lib/api';
import { spendByPurpose } from '@/lib/health/spend';

export const dynamic = 'force-dynamic';

export const GET = route(async () => json(spendByPurpose()));
