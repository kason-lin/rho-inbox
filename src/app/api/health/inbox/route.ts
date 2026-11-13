// GET /api/health/inbox → the emails in the mock inbox on the demo date, plus the invoices pulled out of them.
import { json, route } from '@/lib/api';
import { readState } from '@/lib/health/state';
import { invoicesFor, visibleEmails } from '@/lib/health/view';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const state = await readState();
  return json({ date: state.date, connected: state.connected.includes('inbox'), emails: visibleEmails(state), invoices: invoicesFor(state) });
});
