/**
 * Walks the demo story in a headless Chrome and saves README screenshots to docs/screenshots/.
 * Uses your installed Google Chrome with a throwaway profile (your own profile isn't touched).
 * It changes demo data, so it seeds first and you should seed again afterwards:
 *
 *   npm run seed && npm run screenshots && npm run seed
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT = 'docs/screenshots';

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(600);   // let fade-ins finish
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`✓ ${OUT}/${name}.png`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  // 1. The Monday email
  await page.goto(`${BASE}/mail`);
  await page.getByText('Review the $5,000 transfer').waitFor();
  await page.getByText('Your week in three sentences').waitFor();
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'));
  await shot(page, '01-email');

  // 2. The proof behind the payroll card
  await page.getByText('Review the $5,000 transfer').click();
  await page.getByRole('button', { name: /Move \$5,000 to checking/ }).waitFor();
  await shot(page, '02-proof');

  // 3. Confirm
  await page.getByRole('button', { name: /Move \$5,000 to checking/ }).click();
  await page.getByRole('button', { name: 'Approve' }).waitFor();
  await shot(page, '03-confirm');

  // 4. Done
  await page.getByRole('button', { name: 'Approve' }).click();
  await page.getByText('Payroll is covered.').waitFor();
  await shot(page, '04-done');

  // 5. Why am I seeing this? (next card)
  await page.getByText('Review it').click();
  await page.getByRole('button', { name: 'Why am I seeing this?' }).click();
  await page.getByText('Rule that fired').waitFor();
  await shot(page, '05-why');

  // 6. Inbox, with a duplicate charge arriving live
  await page.goto(`${BASE}/inbox`);
  await page.getByText('Needs action').waitFor();
  await page.evaluate(() => fetch('/api/simulate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario: 'duplicate_charge' }) }));
  await page.getByText(/charged \$[\d,.]+ twice in/).waitFor({ timeout: 15_000 });
  await shot(page, '06-inbox');

  // 7. A teammate's view of the burn card: payroll hidden, can't approve
  await page.goto(`${BASE}/checkin?as=ana`);
  await page.getByText(/^Burn up/).first().click();
  await page.getByText('Hidden for your role').first().waitFor();
  await shot(page, '07-teammate-view');

  // 8. Architecture, 9. Audit log (back as Maya)
  await page.goto(`${BASE}/architecture?as=maya`);
  await page.locator('svg[id^="m"]').first().waitFor({ timeout: 15_000 });
  await shot(page, '08-architecture', true);

  await page.goto(`${BASE}/audit`);
  await page.getByText('Transfer executed').first().waitFor();
  await shot(page, '09-audit');

  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
