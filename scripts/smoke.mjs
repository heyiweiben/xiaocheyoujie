import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = 'http://127.0.0.1:4321';
const outDir = resolve('artifacts');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

const home = await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
if (!home?.ok()) throw new Error(`Home returned ${home?.status()}`);

const homeA11y = await new AxeBuilder({ page }).analyze();
const homeBlocking = homeA11y.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
if (homeBlocking.length) throw new Error(`Home accessibility: ${JSON.stringify(homeBlocking.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })))}`);

const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
if (width.viewport !== width.document) throw new Error(`Horizontal overflow: ${JSON.stringify(width)}`);

await page.locator('.mobile-menu summary').click();
if (!(await page.locator('.mobile-menu nav').isVisible())) throw new Error('Mobile navigation did not open');
await page.waitForFunction(() => document.querySelector('.mobile-menu summary')?.getAttribute('aria-label') === '关闭导航');
await page.mouse.click(20, 200);
if (await page.locator('.mobile-menu').evaluate((menu) => menu.hasAttribute('open'))) throw new Error('Mobile navigation did not close after outside click');
await page.locator('.mobile-menu summary').click();
await page.locator('.mobile-menu nav a').first().click();
if (await page.locator('.mobile-menu').evaluate((menu) => menu.hasAttribute('open'))) throw new Error('Mobile navigation did not close after link click');
await page.waitForTimeout(800);
const solutionsTop = await page.locator('#solutions').evaluate((section) => section.getBoundingClientRect().top);
if (solutionsTop < 69) throw new Error(`Anchor hidden by sticky header: ${solutionsTop}`);
await page.locator('.mobile-menu summary').click();
await page.keyboard.press('Escape');
if (await page.locator('.mobile-menu').evaluate((menu) => menu.hasAttribute('open'))) throw new Error('Mobile navigation did not close on Escape');

const feature = page.locator('.feature-image-wrap');
await feature.scrollIntoViewIfNeeded();
await page.waitForFunction(() => {
  const image = document.querySelector('.feature-image-wrap img');
  return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
});
await page.screenshot({ path: resolve(outDir, 'home-mobile-feature.png') });

const sample = await page.goto(`${baseURL}/solutions/a10-city-departure/`, { waitUntil: 'networkidle' });
if (!sample?.ok()) throw new Error(`Sample page returned ${sample?.status()}`);
const sampleA11y = await new AxeBuilder({ page }).analyze();
const sampleBlocking = sampleA11y.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
if (sampleBlocking.length) throw new Error(`Sample accessibility: ${sampleBlocking.map((item) => item.id).join(', ')}`);
if (!(await page.locator('h1').textContent())?.includes('A10 城市出发')) throw new Error('Sample title missing');
if (!(await page.locator('.prototype-note').isVisible())) throw new Error('Prototype disclosure missing');
await page.locator('.article-hero').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const image = document.querySelector('.article-hero');
  return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
});
await page.screenshot({ path: resolve(outDir, 'sample-mobile-390x844.png') });

if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log(JSON.stringify({
  ok: true,
  homeStatus: home.status(),
  sampleStatus: sample.status(),
  width,
  browserErrors: errors.length,
  seriousOrCriticalAccessibilityViolations: homeBlocking.length + sampleBlocking.length,
}));
await context.close();
await browser.close();
