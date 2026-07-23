import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = 'http://127.0.0.1:4321';
const outDir = resolve('artifacts');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

const home = await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
if (!home?.ok()) throw new Error(`Home returned ${home?.status()}`);

const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
if (width.viewport !== width.document) throw new Error(`Horizontal overflow: ${JSON.stringify(width)}`);

await page.locator('.mobile-menu summary').click();
if (!(await page.locator('.mobile-menu nav').isVisible())) throw new Error('Mobile navigation did not open');
await page.locator('.mobile-menu summary').click();

const feature = page.locator('.feature-image-wrap');
await feature.scrollIntoViewIfNeeded();
await page.waitForFunction(() => {
  const image = document.querySelector('.feature-image-wrap img');
  return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
});
await page.screenshot({ path: resolve(outDir, 'home-mobile-feature.png') });

const sample = await page.goto(`${baseURL}/solutions/a10-city-departure/`, { waitUntil: 'networkidle' });
if (!sample?.ok()) throw new Error(`Sample page returned ${sample?.status()}`);
if (!(await page.locator('h1').textContent())?.includes('A10 城市出发')) throw new Error('Sample title missing');
if (!(await page.locator('.prototype-note').isVisible())) throw new Error('Prototype disclosure missing');
await page.locator('.article-hero').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const image = document.querySelector('.article-hero');
  return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
});
await page.screenshot({ path: resolve(outDir, 'sample-mobile-390x844.png') });

if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log(JSON.stringify({ ok: true, homeStatus: home.status(), sampleStatus: sample.status(), width, browserErrors: errors.length }));
await browser.close();
