/**
 * End-to-end check against a running dev server: the Business health story from start to finish
 * (with its own demo cookie, like a browser). Nothing to seed: all data is in src/data/business-health/.
 *
 *   npm run dev -- -p 3100   (in another terminal)
 *   npm run smoke
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`);
}

let cookie = '';   // the Business health demo state, kept like a browser would
async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: res.status, body: await res.json() };
}

async function main() {
  // ---------- Business health: the story in order ----------
  await call('POST', '/api/health/reset');
  const inbox = await call('GET', '/api/health/inbox');
  const inv = inbox.body.invoices[0];
  check('1. Oct 3: the Northbeam invoice is in the inbox', inv?.vendor === 'Northbeam Studio' && inv.amount === 55000 && inv.due === '2026-12-02', `${inv?.vendor} ${inv?.amount} due ${inv?.due}`);
  check('   nothing to decide on Oct 3', (await call('GET', '/api/health/forecast')).body.alert === null);

  check('   all 7 tools start connected (read-only)', (await call('GET', '/api/health/state')).body.connected.length === 7);
  check('   disconnecting a tool works', (await call('POST', '/api/health/state', { disconnect: 'aws' })).body.connected.length === 6);
  await call('POST', '/api/health/state', { connect: 'all' });

  await call('POST', '/api/health/state', { date: '2026-11-18' });
  const nov18 = (await call('GET', '/api/health/forecast')).body;
  check('2. Nov 18 alert text matches the spec', nov18.alert?.text === 'A $55K invoice is due in 14 days. Checking will be $19,800 short.', nov18.alert?.text);
  check('3. forecast: $19,800 short on Dec 2', nov18.forecast.shortfall === 19800 && nov18.forecast.low.date === '2026-12-02');
  check('   every timeline item has a source link', nov18.forecast.events.every((e: { source: { href: string } }) => e.source.href.startsWith('/')));
  check('   needs you: money owed, unused tool, spend', nov18.needs_you.cards.map((c: { type: string }) => c.type).join() === 'money_owed,subscription,spend');
  check('   invoice line items add up to $55,000', nov18.invoice.lines.reduce((t: number, l: { amount: number }) => t + l.amount, 0) === 55000);

  const preview = (await call('GET', '/api/health/forecast?transfer=15000&pay_date=2026-12-02')).body.preview;
  check('4. editing to $15K previews a $4,800 gap', preview.shortfall === 4800);
  check('   a teammate can’t approve', (await call('POST', '/api/health/approve', { transfer_amount: 25000, pay_date: '2026-12-02', as: 'ana' })).status === 403);
  check('   paying after the due date is refused', (await call('POST', '/api/health/approve', { transfer_amount: 25000, pay_date: '2026-12-03', as: 'kason' })).status === 422);
  const approved = await call('POST', '/api/health/approve', { transfer_amount: 25000, pay_date: '2026-12-02', as: 'kason' });
  check('   approve $25K + pay Dec 2: gap gone', approved.status === 200 && approved.body.forecast.shortfall === 0, `lowest ${approved.body.forecast?.low.balance}`);
  check('   invoice shows as scheduled, receipt exists', approved.body.obligations.find((o: { kind: string }) => o.kind === 'invoice').status === 'scheduled' && !!approved.body.approval.reference);
  check('   approving twice is refused', (await call('POST', '/api/health/approve', { transfer_amount: 25000, pay_date: '2026-12-02', as: 'kason' })).status === 409);
  check('   the Figma duplicate shows up next', approved.body.needs_you.cards[0].type === 'duplicate' && approved.body.forecast_before.shortfall === 19800);

  const undone = await call('POST', '/api/health/undo');
  check('   Undo brings the gap back', undone.body.approval === null && undone.body.forecast.shortfall === 19800);
  await call('POST', '/api/health/approve', { transfer_amount: 25000, pay_date: '2026-12-02', as: 'kason' });

  check('   a teammate can’t dispute', (await call('POST', '/api/health/act', { card_id: 'dup-figma', action: 'dispute', as: 'ana' })).status === 403);
  const disputed = await call('POST', '/api/health/act', { card_id: 'dup-figma', action: 'dispute', as: 'kason' });
  const cancelled = await call('POST', '/api/health/act', { card_id: 'sub-miro', action: 'cancel', as: 'kason' });
  check('   dispute + cancel: both handled, crossed out', disputed.status === 200 && cancelled.body.needs_you.handled.length === 3);
  const wrong = await call('POST', '/api/health/feedback', { card_id: 'spend', kind: 'wrong', reason: 'The split by purpose is wrong' });
  check('   "This is wrong" removes the card', wrong.body.needs_you.cards.length === 0);

  const spend = (await call('GET', '/api/health/spend')).body;
  check('5. Claude $50K = $32K building + $18K running', spend.claude.purposes.map((p: { amount: number }) => p.amount).join() === '32000,18000' && spend.claude.matches_charge);
  check('   OpenAI: $300 not in the usage report', spend.match.find((m: { name: string }) => m.name === 'OpenAI')?.difference === 300);

  await call('POST', '/api/health/reset');
  check('   Reset demo goes back to Oct 3', (await call('GET', '/api/health/state')).body.date === '2026-10-03');

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
