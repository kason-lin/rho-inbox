/**
 * Walks the Business health story in a headless Chrome and saves README screenshots to docs/screenshots/.
 * Uses your installed Google Chrome with a throwaway profile (a fresh demo cookie, so it starts on Oct 3).
 *
 *   npm run screenshots
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT = 'docs/screenshots';

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(700);   // let fades and fetches settle
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`✓ ${OUT}/${name}.png`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`);   // old screenshots from earlier versions
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  // Home: Rho's dashboard, with Business health on top
  await page.goto(`${BASE}/?as=kason`);
  await page.getByText('Top outflows').waitFor();
  await shot(page, '00-home');

  // Connect tools (read-only)
  await page.goto(`${BASE}/business-health/connect`);
  await page.getByRole('button', { name: 'Connect all (read-only)' }).click();
  await page.getByText('Connected (read-only)').first().waitFor();
  await shot(page, '01-connect');

  // 1. The invoice email (Oct 3)
  await page.goto(`${BASE}/mailbox?email=em-northbeam-invoice`);
  await page.getByText('Rho found an invoice').waitFor();
  await shot(page, '02-inbox');

  // 2. Jump to Nov 18 → the alert
  await page.getByRole('button', { name: 'Nov 18' }).click();
  await page.waitForURL('**/alert');
  await page.getByText('Checking will be $19,800 short.').first().waitFor();
  await shot(page, '03-alert');

  // 3. Review → Business health tab
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await page.getByText('Coming up').first().waitFor();
  await page.getByText('Needs you').first().waitFor();
  await shot(page, '04-business-health', true);

  // Proof → approval sheet
  await page.goto(`${BASE}/business-health/proof`);
  await page.getByRole('button', { name: /Review the fix/ }).click();
  await page.getByText('Gap closed.').waitFor();
  await shot(page, '05-approval-sheet');

  // 4. Approve → done + receipt
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByText('covered and scheduled').first().waitFor();
  await shot(page, '06-done');

  // 5. Where it goes: tap the building slice
  await page.goto(`${BASE}/business-health/spend`);
  await page.getByText('Building the product').first().click();
  await page.getByText('Tag as R&D').waitFor();
  await shot(page, '07-spend-by-purpose');

  // Architecture
  await page.goto(`${BASE}/architecture`);
  await page.locator('svg[id^="m"]').first().waitFor({ timeout: 15_000 });
  await shot(page, '08-architecture', true);

  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
