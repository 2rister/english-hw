const { chromium } = require(process.env.PLAYWRIGHT_PATH || `${process.cwd()}/_hw-engine/node_modules/playwright`);
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const url = process.env.QUEST_URL || 'http://127.0.0.1:8765/';
  await page.goto(url, { waitUntil: 'networkidle' });
  assert.match(await page.title(), /Street Style Quest/);
  assert.equal(await page.locator('.day-card').count(), 7);
  await page.locator('.day-card').first().click();

  const items = await page.evaluate(() => {
    const base=window.QUEST_DATA.days[0].questions;
    return [...base,...base.filter(q=>['mc','type'].includes(q.type)).slice(0,6)];
  });
  for (const item of items) {
    await page.locator('.option', { hasText: item.a }).click();
    await page.locator('#nextButton').click();
  }
  await page.waitForSelector('.completion');
  assert.match(await page.locator('.completion').innerText(), /Fitting complete/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('street-style-quest-v1')));
  assert.equal(stored.days.day1.complete, true);
  assert.ok(stored.badges.includes('recall'));

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#backButton').click();
  assert.match(await page.locator('.day-card').first().innerText(), /Complete/);
  assert.notEqual(await page.locator('#xpValue').innerText(), '0');

  await page.screenshot({ path: process.env.QUEST_SCREENSHOT || '/tmp/street-style-quest-mobile.png', fullPage: true });
  console.log(JSON.stringify({ ok: true, viewport: '390x844', persisted: true, badge: 'recall' }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
