// GET /api/health/obligations → everything Loop Labs owes soon (invoices found in email, payroll, scheduled bills).
import { json, route } from '@/lib/api';
import { obligations } from '@/lib/health/forecast';
import { readState } from '@/lib/health/state';
import { invoicesFor } from '@/lib/health/view';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const state = await readState();
  return json({ date: state.date, obligations: obligations(invoicesFor(state), state.approval) });
});
