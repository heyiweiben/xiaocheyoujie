import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = resolve('artifacts');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const cases = [
  { name: 'home-mobile-390x844', url: '/', width: 390, height: 844, fullPage: false },
  { name: 'home-mobile-full', url: '/', width: 390, height: 844, fullPage: true },
  { name: 'home-desktop-1440x1000', url: '/', width: 1440, height: 1000, fullPage: false },
  { name: 'home-en-mobile-390x844', url: '/en/', width: 390, height: 844, fullPage: false },
  { name: 'home-en-desktop-1440x1000', url: '/en/', width: 1440, height: 1000, fullPage: false },
];

for (const item of cases) {
  const page = await browser.newPage({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:4321${item.url}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: resolve(outDir, `${item.name}.png`), fullPage: item.fullPage });
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    h1: document.querySelector('h1')?.getBoundingClientRect().toJSON(),
    heroArt: document.querySelector('.hero-art')?.getBoundingClientRect().toJSON(),
  }));
  console.log(JSON.stringify({ case: item.name, metrics, errors }));
  await page.close();
}

await browser.close();
