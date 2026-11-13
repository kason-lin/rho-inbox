// GET /api/health/forecast → projected checking balance, the shortfall and the alert.
// Add ?transfer=20000&pay_date=2026-11-30 to preview a plan without saving it (used by the approval sheet).
import { json, route } from '@/lib/api';
import { readState } from '@/lib/health/state';
import { healthView } from '@/lib/health/view';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const q = new URL(req.url).searchParams;
  const transfer = q.get('transfer');
  const payDate = q.get('pay_date');
  const whatIf = transfer !== null && payDate ? { transfer_amount: Number(transfer), pay_date: payDate } : undefined;
  return json(healthView(await readState(), whatIf));
});
