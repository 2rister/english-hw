const { chromium } = require('../../tutoring/hasieva-sofia/go-getter-4/mini-app/node_modules/playwright-core');
const { servePublishRoot } = require('../../tutoring/hasieva-sofia/go-getter-4/mini-app/backend/e2e-server.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '../../tutoring/hasieva-sofia/go-getter-4/supabase/functions/_shared/vocab/unit2.json')));
const read = page => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('learncore-vocab-space-v1'); open.onerror = () => reject(open.error);
  open.onsuccess = () => { const db = open.result, tx = db.transaction('profiles'); const request = tx.objectStore('profiles').get('preview'); request.onsuccess = () => { resolve(request.result); db.close(); }; };
}));
(async () => {
  const server = await servePublishRoot();
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
    await page.goto(server.baseUrl + '/tutoring/');
    await page.locator('.unit-card').filter({ hasText: 'Vocab Space' }).click();
    await page.locator('.vocab-unit').click();
    await page.getByRole('button', { name: /^Слушаю и пишу/ }).click();
    await page.locator('#answer').waitFor();
    let state = await read(page), item = bank.items.find(item => item.id === state.session.ids[0]);
    assert.equal(await page.getByText(item.english, { exact: true }).isVisible(), false);
    const audio = page.waitForResponse(response => response.url().endsWith('/' + item.id + '.mp3'));
    await page.getByRole('button', { name: 'Послушать слово или выражение', exact: true }).click();
    assert.equal((await audio).status(), 200);
    await page.locator('#answer').fill('synthetic-wrong'); await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    await page.locator('.vocab-feedback.is-wrong').waitFor();
    await page.reload(); await page.locator('.vocab-feedback.is-wrong').waitFor();
    assert.equal((await read(page)).events[0].correct, false);
    await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
    state = await read(page); item = bank.items.find(item => item.id === state.session.ids[state.session.index]);
    await page.getByRole('button', { name: 'Нужна подсказка' }).click();
    await page.locator('#answer').fill(item.english); await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    await page.getByText('Верно с опорой.', { exact: true }).waitFor();
    assert.equal((await read(page)).events.at(-1).hinted, true);
    await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
    for (let step = 0; step < 20; step++) {
      state = await read(page); if (state.session.index >= state.session.ids.length) break;
      item = bank.items.find(item => item.id === state.session.ids[state.session.index]);
      await page.locator('#answer').fill(item.english); await page.getByRole('button', { name: 'Проверить', exact: true }).click();
      await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
    }
    await page.getByRole('button', { name: 'К плану подготовки →' }).click();
    await page.getByRole('button', { name: /^Диктант · все 81/ }).click();
    await page.locator('#answer').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Нужна подсказка' }).count(), 0);
    await page.goto(server.baseUrl + '/vocab-space/#words');
    await page.getByRole('heading', { name: 'Сначала закончи диктант.' }).waitFor();
    await page.getByRole('button', { name: 'Продолжить диктант →' }).click();
    for (let i = 0; i < 81; i++) {
      state = await read(page); item = bank.items.find(item => item.id === state.session.ids[state.session.index]);
      await page.locator('#answer').fill(item.english); await page.getByRole('button', { name: 'Записать ответ →', exact: true }).click();
      if (i < 80) { await page.locator('#answer').waitFor(); assert.equal(await page.locator('.vocab-feedback').count(), 0); }
    }
    await page.getByRole('heading', { name: '81 / 81 самостоятельных ответов верны' }).waitFor();
    state = await read(page); assert.equal(state.events.filter(event => event.mode === 'exam').length, 81);
    assert.equal(state.events.some(event => event.confirmed), false);
    await page.getByRole('button', { name: 'К плану подготовки →' }).click();
    await page.getByRole('button', { name: /^Диктант на бумаге/ }).click();
    await page.getByRole('button', { name: 'Записала · дальше →', exact: true }).evaluate(element => { element.click(); element.click(); });
    await page.waitForFunction(() => document.querySelector('.vocab-session-head')?.textContent.includes('2 / 9'));
    assert.equal((await read(page)).session.index, 1);
    for (let i = 1; i < 9; i++) await page.getByRole('button', { name: 'Записала · дальше →', exact: true }).click();
    await page.getByRole('heading', { name: 'Теперь проверь на листе.' }).waitFor();
    await page.getByRole('checkbox').first().check(); await page.getByRole('button', { name: 'Сохранить самопроверку' }).click();
    await page.getByRole('heading', { name: 'Самопроверка сохранена.' }).waitFor();
    state = await read(page); assert.equal(state.events.filter(event => event.mode === 'paper').length, 9);
    assert.equal(state.events.filter(event => event.mode === 'paper').some(event => event.correct !== null), false);
    await page.getByRole('button', { name: 'К плану подготовки →' }).click();
    await page.getByRole('heading', { name: 'Home & Housework', exact: true }).waitFor();
    const race = await page.evaluate(async () => {
      const { openStore } = await import('/vocab-space/progress.mjs');
      const a = await openStore('synthetic-multitab'), b = await openStore('synthetic-multitab');
      await Promise.all([a.save({ events: [{ requestId: 'A', confirmed: false }], session: null }), b.save({ events: [{ requestId: 'B', confirmed: false }], session: null })]);
      const data = await a.load(); return data.events.map(event => event.requestId).sort();
    });
    assert.deepEqual(race, ['A', 'B']);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.evaluate(() => Object.keys(localStorage).some(key => /vocab/i.test(key))), false);
    assert.deepEqual(errors, []);
    // Shared Apps Script availability must not gate the independent vocabulary card.
    const blocked = await browser.newContext();
    await blocked.route('**/telegram-web-app.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'window.Telegram={WebApp:{initData:"synthetic",initDataUnsafe:{user:{id:123}},ready(){},expand(){},onEvent(){},BackButton:{onClick(){},show(){},hide(){}}}};' }));
    await blocked.route('https://script.google.com/**', route => route.abort());
    const second = await blocked.newPage(); await second.goto(server.baseUrl + '/tutoring/');
    const card = second.locator('.unit-card').filter({ hasText: 'Vocab Space' }); await card.waitFor(); assert.equal(await card.isEnabled(), true);
    assert.equal(await second.locator('#app').evaluate(el => el.inert), false);
    await blocked.close();
    const clean = await browser.newContext({ viewport: { width: 390, height: 844 } }), preview = await clean.newPage();
    await preview.goto(server.baseUrl + '/vocab-space/#unit-2');
    await preview.getByRole('button', { name: /^Слушаю и пишу/ }).waitFor();
    await preview.screenshot({ path: process.env.VOCAB_SCREENSHOT || '/tmp/vocab-space-mobile.png', fullPage: true });
    await clean.close();
    console.log('PASS: catalog → Vocab Space → Unit 2; real audio HTTP; error/hint evidence; reload; 81-answer hidden-key exam; paper self-report; IndexedDB isolation; mobile layout; independent launch despite blocked legacy backend.');
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
