/** Synthetic preview only: checks DOM focus, not a physical iOS keyboard. */
const { webkit, devices } = require('playwright-core');
const assert = require('node:assert/strict');
const { servePublishRoot } = require('./e2e-server.cjs');

async function state(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('learncore-vocab-space-v1', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('profiles', 'readonly');
      const read = tx.objectStore('profiles').get('preview');
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
      tx.oncomplete = () => db.close();
    };
  }));
}

async function saved(page, predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const current = await state(page);
    if (predicate(current)) return current;
    await page.waitForTimeout(20);
  }
  throw Error('Synthetic checkpoint did not save: ' + JSON.stringify({index:(await state(page))?.session?.index,status:await page.locator('#saveStatus').textContent()}));
}

async function assertFocused(page) {
  assert.equal(await page.evaluate(() => window.focusAnswer === document.querySelector('#answer')), true, 'same input node survives answer advance');
  assert.equal(await page.evaluate(() => document.activeElement === window.focusAnswer), true, 'answer retains focus');
  assert.equal(await page.locator('#answer').isEnabled(), true);
  assert.equal(await page.locator('#answer').inputValue(), '');
}

(async () => {
  const server = await servePublishRoot();
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 17'] });
  const errors = [];
  await context.route('**/*', route => {
    const request = route.request();
    return new URL(request.url()).origin === server.baseUrl && request.method() === 'GET' ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(server.baseUrl + '/vocab-space/#unit-2');
    await page.getByRole('button', { name: /1 · Story gaps · 25/ }).click();
    await page.locator('#answer').waitFor();
    await page.locator('#answer').fill('saved draft');
    await saved(page, current => current.session.draft === 'saved draft');
    await page.reload();
    await page.locator('#answer').waitFor();
    assert.equal(await page.locator('#answer').inputValue(), 'saved draft');
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#answer')), false, 'reload must not focus or open keyboard');
    await page.evaluate(() => { window.focusAnswer = document.querySelector('#answer'); });
    await page.locator('#answer').focus();
    await page.locator('#answer').dispatchEvent('compositionstart');
    await page.locator('#answer').press('Enter');
    assert.equal((await state(page)).session.index, 0, 'IME Enter must not submit');
    await page.locator('#answer').dispatchEvent('compositionend');
    await page.locator('#answer').fill('');
    await page.locator('#answer').press('Enter');
    assert.equal((await state(page)).session.index, 0, 'empty answer validation keeps current word');
    for (let index = 0; index < 25; index++) {
      await page.locator('#answer').fill('synthetic answer');
      if (index === 2) await page.evaluate(() => {
        const input = document.querySelector('#answer'), form = input.form;
        form.requestSubmit();
        form.requestSubmit();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'busy edit');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      else if (index % 2 === 0) await page.locator('#answer').press('Enter');
      else await page.getByRole('button', { name: 'Save answer →', exact: true }).tap();
      await saved(page, current => current.session.index === index + 1);
      if (index < 24) await assertFocused(page);
    }
    await page.getByRole('button', { name: 'Back to the practice plan →', exact: true }).click();
    await page.getByRole('button', { name: /3 · Independent check · 25/ }).click();
    await page.locator('#answer').waitFor();
    await page.evaluate(() => { window.focusAnswer = document.querySelector('#answer'); });
    for (let index = 0; index < 25; index++) {
      await page.locator('#answer').fill('synthetic answer');
      if (index === 0) await page.locator('#answer').dispatchEvent('paste');
      if (index === 1) {
        await page.evaluate(() => {
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (value, ...args) {
            if (this.name === 'profiles' && value.session?.index === 2) {
              IDBObjectStore.prototype.put = put;
              this.transaction.abort();
              throw new Error('Synthetic save failure');
            }
            return put.call(this, value, ...args);
          };
        });
        await page.locator('#answer').press('Enter');
        await page.waitForFunction(() => document.querySelector('#saveStatus').textContent.includes('Answer not saved'));
        assert.equal((await state(page)).session.index, 1);
        assert.equal(await page.locator('#answer').inputValue(), 'synthetic answer', 'failed save retains draft');
        assert.equal(await page.evaluate(() => document.activeElement === window.focusAnswer), true);
      }
      if (index % 2 === 0) await page.locator('#answer').press('Enter');
      else await page.getByRole('button', { name: 'Save answer →', exact: true }).tap();
      const current = await saved(page, value => value.session.index === index + 1);
      assert.equal(current.session.results.length, index + 1, 'one event per answer');
      assert.equal(current.session.results[index].hinted, index === 0, 'paste state resets with the next word');
      if (index < 24) await assertFocused(page);
    }
    assert.deepEqual(errors, ['Synthetic save failure'], 'only the deliberately thrown storage fault reaches pageerror');
    console.log('PASS WebKit iPhone 17: same input and focus across 25 story + 25 independent answers; Enter/tap, composition, empty validation, draft reload without autofocus, save failure recovery, paste reset; synthetic only, all nonlocal/POST requests blocked.');
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
