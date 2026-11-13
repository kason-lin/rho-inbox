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
  await page.request.post(`${BASE}/api/health/reset`);
  await shot(page, '00-home');

  // 1. The invoice email (Oct 3)
  await page.goto(`${BASE}/mailbox?email=em-northbeam-invoice`);
  await page.getByText('Rho found an invoice').waitFor();
  await shot(page, '01-inbox');

  // 2. Jump to Nov 18 → the alert (email, then text)
  await page.getByRole('button', { name: 'Jump to Wed, Nov 18 →' }).click();
  await page.waitForURL('**/mailbox?new=1');
  await page.getByText('Rho · alerts@rho.co').waitFor();
  await shot(page, '01b-alert-arrives');
  await page.goto(`${BASE}/alert`);
  await page.getByText('Why now').waitFor();
  await shot(page, '03-alert-text');
  await page.getByRole('button', { name: 'Email', exact: true }).click();
  await shot(page, '02-alert-email');

  // 3. Review → Business health tab
  await page.getByRole('link', { name: 'Review in Rho →' }).click();
  await page.getByText('Needs you').first().waitFor();
  await shot(page, '04-business-health', true);

  // Proof drawer, then the 2-step confirm
  await page.getByRole('button', { name: 'Show proof' }).click();
  await page.getByText('Why Rho flagged this').waitFor();
  await shot(page, '05-proof');
  await page.getByRole('dialog').getByRole('button', { name: /Set aside/ }).click();
  await page.getByText('Confirm · 2 steps').waitFor();
  await shot(page, '06-confirm');

  // 4. Approve → covered, with the dashed "before" line and the Figma card next
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByText('Covered. Checking now stays above zero').waitFor();
  await shot(page, '07-covered', true);

  // 5. Where it goes, with the Claude drill-down
  await page.getByRole('button', { name: 'See breakdown' }).click();
  await page.getByText('exact match').waitFor();
  await page.locator('#where-it-goes').screenshot({ path: `${OUT}/08-where-it-goes.png` });
  console.log(`✓ ${OUT}/08-where-it-goes.png`);

  // Settings → Connected tools
  await page.goto(`${BASE}/settings/connected-tools`);
  await page.getByText('What Rho never reads').waitFor();
  await shot(page, '09-connected-tools');

  // iPhone mode
  await page.goto(`${BASE}/iphone`);
  await page.getByText('Same flow, in the Rho iOS app').waitFor();
  await shot(page, '10-iphone');

  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
