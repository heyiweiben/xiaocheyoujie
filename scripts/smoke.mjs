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

const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
if (faviconHref !== '/favicon.png?v=2') throw new Error(`Square brand favicon missing: ${faviconHref}`);
const heroPhoto = page.locator('.hero-photo');
if (await heroPhoto.getAttribute('src') !== '/brand/brand-life-hero-phone.webp?v=1') throw new Error('Approved phone digital-key hero is not active');
const heroAlt = await heroPhoto.getAttribute('alt');
for (const phrase of ['手机屏幕', '纯电小车', '锁车图标', '电量状态']) {
  if (!heroAlt?.includes(phrase)) throw new Error(`Chinese hero accessibility description missing: ${phrase}`);
}
await page.waitForFunction(() => { const image = document.querySelector('.hero-photo'); return image?.complete && image.naturalWidth === 1024 && image.naturalHeight === 1536; });
const retiredHero = await page.request.get(`${baseURL}/brand/brand-life-hero.webp`);
if (retiredHero.ok()) throw new Error('Retired traditional-key hero is still publicly deployed');
const headerLogo = page.locator('.site-header .brand-lockup');
if (await headerLogo.getAttribute('src') !== '/brand/xiaocheyoujie-horizontal-white-2048.png') throw new Error('Official horizontal brand lockup missing from header');
if (await page.locator('.site-header .brand-mark, .site-header .brand-copy').count()) throw new Error('Hand-built header brand remains instead of official lockup');
const publishedCards = page.locator('.published-solution-card');
if (await publishedCards.count() !== 6) throw new Error(`Expected 6 published Xiaohongshu solutions, got ${await publishedCards.count()}`);
const publishedText = await publishedCards.allInnerTexts();
for (const title of ['魔教座驾', '敢去远方', '车顶箱和行李篮', '旅行车味', '有点心动', '上世纪的旅行车']) {
  if (!publishedText.some((text) => text.includes(title))) throw new Error(`Published solution missing: ${title}`);
}
const publishedHrefs = await publishedCards.evaluateAll((cards) => cards.map((card) => ({ href: card.href, target: card.getAttribute('target'), rel: card.getAttribute('rel') })));
for (const link of publishedHrefs) {
  const url = new URL(link.href);
  if (url.hostname !== 'www.xiaohongshu.com' || !url.pathname.startsWith('/explore/')) throw new Error(`Invalid published Xiaohongshu link: ${link.href}`);
  if (!url.searchParams.get('xsec_token') || url.searchParams.get('xsec_source') !== 'pc_search') throw new Error(`Xiaohongshu validation parameters missing: ${link.href}`);
  if (link.target !== '_blank' || link.rel !== 'noopener') throw new Error(`External-link behavior is not configured for Xiaohongshu: ${JSON.stringify(link)}`);
}
for (const card of await publishedCards.all()) await card.scrollIntoViewIfNeeded();
await page.waitForFunction(() => [...document.querySelectorAll('.published-solution-card img')].every((image) => image.complete && image.naturalWidth > 0));
const mediaRatios = await page.locator('.published-solution-card img').evaluateAll((images) => images.map((image) => ({
  src: image.getAttribute('src'),
  natural: image.naturalWidth / image.naturalHeight,
  rendered: image.getBoundingClientRect().width / image.getBoundingClientRect().height,
})));
for (const media of mediaRatios) {
  if (Math.abs(media.natural - media.rendered) > 0.015) throw new Error(`Published artwork ratio changed: ${JSON.stringify(media)}`);
}
const homeText = await page.locator('main').innerText();
for (const forbidden of ['网站内容结构样例', '本地网站原型', '公开文案尚未经过用户最终确认', '获得证据后', '第一份内容先解决']) {
  if (homeText.includes(forbidden)) throw new Error(`Prototype wording leaked to homepage: ${forbidden}`);
}
if (!(await page.locator('a[href="mailto:xiaocheyoujie@proton.me"]').count())) throw new Error('Public contact email missing');
if (!(await page.locator('a[href="/en/"]').count())) throw new Error('English language entry missing');
if (await page.locator('.about-mark img').count()) throw new Error('Distorted standalone brand mark is still used in About section');
if (!(await page.locator('.about-brand-word').count())) throw new Error('Typography-based About brand panel missing');

const visualSystem = await page.evaluate(() => {
  const style = (selector) => getComputedStyle(document.querySelector(selector));
  return {
    bodyFont: style('body').fontFamily,
    h1Font: style('h1').fontFamily,
    h1AccentFont: style('h1 em').fontFamily,
    h2Font: style('h2').fontFamily,
    moodAnimation: style('.mood-track').animationName,
    pathBackgrounds: [...document.querySelectorAll('.published-solution-card')].map((card) => getComputedStyle(card).backgroundColor),
    pathRadii: [...document.querySelectorAll('.published-solution-card')].map((card) => getComputedStyle(card).borderRadius),
  };
});
if (new Set([visualSystem.bodyFont, visualSystem.h1Font, visualSystem.h1AccentFont, visualSystem.h2Font]).size !== 1) {
  throw new Error(`Typography system is not unified: ${JSON.stringify(visualSystem)}`);
}
if (visualSystem.moodAnimation !== 'none') throw new Error('Decorative marquee still makes the page visually noisy');
if (new Set(visualSystem.pathBackgrounds).size !== 1 || new Set(visualSystem.pathRadii).size !== 1) {
  throw new Error(`Solution cards do not share one visual system: ${JSON.stringify(visualSystem)}`);
}
const proofLayout = await page.locator('.proof-flow').evaluate((flow) => ({
  scrollWidth: flow.scrollWidth,
  clientWidth: flow.clientWidth,
  itemHeights: [...flow.children].map((item) => item.getBoundingClientRect().height),
  itemAlignments: [...flow.children].map((item) => getComputedStyle(item).alignContent),
}));
if (proofLayout.scrollWidth !== proofLayout.clientWidth || Math.max(...proofLayout.itemHeights) > 145 || proofLayout.itemAlignments.includes('end')) {
  throw new Error(`Validation steps still resemble empty image cards: ${JSON.stringify(proofLayout)}`);
}

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
if (await page.locator('.prototype-note').count()) throw new Error('Prototype disclosure leaked to public article');
const articleText = await page.locator('.article-shell').innerText();
for (const forbidden of ['网站内容结构样例', '本地网站原型', '尚未经过用户最终确认']) {
  if (articleText.includes(forbidden)) throw new Error(`Prototype wording leaked to article: ${forbidden}`);
}
if (!articleText.includes('适用边界')) throw new Error('Article lacks concrete customer-facing boundaries');
await page.locator('.article-hero').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const image = document.querySelector('.article-hero');
  return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
});
await page.screenshot({ path: resolve(outDir, 'sample-mobile-390x844.png') });

const english = await page.goto(`${baseURL}/en/`, { waitUntil: 'networkidle' });
if (!english?.ok()) throw new Error(`English home returned ${english?.status()}`);
if ((await page.locator('html').getAttribute('lang')) !== 'en') throw new Error('English document lang missing');
if ((await page.locator('h1').innerText()).replace(/\s+/g, ' ').trim() !== 'Small Car, Solved. Better Life, Designed.') throw new Error('Approved English brand line is missing');
if (!(await page.locator('a[href="mailto:xiaocheyoujie@proton.me"]').count())) throw new Error('English contact email missing');
if (!(await page.locator('a[href="/"]').filter({ hasText: '中文' }).count())) throw new Error('Chinese language return missing');
if (await page.locator('.published-solution-card').count() !== 6) throw new Error('English published-solution set is incomplete');
const englishHeroAlt = await page.locator('.hero-photo').getAttribute('alt');
for (const phrase of ['electric city car', 'lock icon', 'battery status']) {
  if (!englishHeroAlt?.includes(phrase)) throw new Error(`English hero accessibility description missing: ${phrase}`);
}
const englishWidth = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
if (englishWidth.viewport !== englishWidth.document) throw new Error(`English horizontal overflow: ${JSON.stringify(englishWidth)}`);
const englishA11y = await new AxeBuilder({ page }).analyze();
const englishBlocking = englishA11y.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
if (englishBlocking.length) throw new Error(`English home accessibility: ${englishBlocking.map((item) => item.id).join(', ')}`);

const englishA10 = await page.goto(`${baseURL}/en/solutions/a10-city-departure/`, { waitUntil: 'networkidle' });
if (!englishA10?.ok()) throw new Error(`English A10 returned ${englishA10?.status()}`);
const englishArticleText = await page.locator('main').innerText();
if (!englishArticleText.includes('international markets')) throw new Error('English A10 overseas-market context missing');
const englishA10A11y = await new AxeBuilder({ page }).analyze();
const englishA10Blocking = englishA10A11y.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
if (englishA10Blocking.length) throw new Error(`English A10 accessibility: ${englishA10Blocking.map((item) => item.id).join(', ')}`);

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
