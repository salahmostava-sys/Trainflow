const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawn} = require('node:child_process');

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '../tools/design-preview.cjs')], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {...process.env, IBTA_PREVIEW_PORT: '4182'}
  });
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(Error('Preview server exited ' + code)));
  });

  const browser = await chromium.launch({headless: true, channel: 'msedge'});
  try {
    const page = await browser.newPage({viewport: {width: 1400, height: 900}});
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://127.0.0.1:4182/');
    await page.waitForSelector('#app-modal-dialog', {state: 'attached'});

    // 1. Test In-App Confirm Dialog (Cancel)
    const confirmPromise1 = page.evaluate(() => {
      return window.AppDialog.confirm({
        title: 'حذف الصفوف المحددة',
        message: 'هل تريد حذف الصفوف المحددة نهائيًا؟ يمكنك التراجع.',
        confirmText: 'حذف',
        cancelText: 'إلغاء',
        danger: true,
        icon: 'trash'
      });
    });

    await page.waitForSelector('#app-modal-dialog[open]');
    assert.equal(await page.locator('#app-modal-title').textContent(), 'حذف الصفوف المحددة');
    assert.match(await page.locator('#app-modal-desc').textContent(), /هل تريد حذف الصفوف المحددة/);
    assert.equal(await page.locator('#app-modal-confirm').textContent(), 'حذف');
    assert.ok(await page.locator('#app-modal-confirm').evaluate(el => el.classList.contains('app-modal-btn-danger')));

    // Take screenshot of deletion modal
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(__dirname, '../artifacts/app-dialog-delete.png')
    });

    await page.locator('#app-modal-cancel').click();
    const result1 = await confirmPromise1;
    assert.equal(result1, false, 'Cancel should resolve to false');
    assert.equal(await page.locator('#app-modal-dialog[open]').count(), 0);

    // 2. Test In-App Confirm Dialog (Accept)
    const confirmPromise2 = page.evaluate(() => {
      return window.AppDialog.confirm({
        title: 'تأكيد الحفظ',
        message: 'متابعة الحفظ وتحديث التغييرات؟',
        confirmText: 'تأكيد',
        cancelText: 'إلغاء',
        danger: false,
        icon: 'warning'
      });
    });

    await page.waitForSelector('#app-modal-dialog[open]');
    await page.locator('#app-modal-confirm').click();
    const result2 = await confirmPromise2;
    assert.equal(result2, true, 'Confirm should resolve to true');

    // 3. Test In-App Prompt Dialog (Edit column name)
    const promptPromise = page.evaluate(() => {
      return window.AppDialog.prompt({
        title: 'تعديل اسم العمود',
        message: 'أدخل الاسم الجديد للعمود:',
        defaultValue: 'عمود تجريبي',
        confirmText: 'حفظ التعديل',
        cancelText: 'إلغاء',
        icon: 'edit'
      });
    });

    await page.waitForSelector('#app-modal-dialog[open]');
    assert.equal(await page.locator('#app-modal-title').textContent(), 'تعديل اسم العمود');
    assert.equal(await page.locator('#app-modal-input').inputValue(), 'عمود تجريبي');

    // Take screenshot of edit prompt modal
    await page.screenshot({
      path: path.join(__dirname, '../artifacts/app-dialog-edit.png')
    });

    await page.locator('#app-modal-input').fill('رقم الهوية الوطنية');
    await page.keyboard.press('Enter');
    const promptResult = await promptPromise;
    assert.equal(promptResult, 'رقم الهوية الوطنية', 'Prompt Enter should resolve with new value');
    assert.equal(await page.locator('#app-modal-dialog[open]').count(), 0);

    // 4. Test In-App Prompt Dialog with number validation (e.g. Row Height 20-400)
    const heightPromise = page.evaluate(() => {
      return window.AppDialog.prompt({
        title: 'ارتفاع الصف',
        message: 'أدخل ارتفاع الصف المطلوب بالبكسل:',
        defaultValue: '28',
        inputType: 'number',
        min: 20,
        max: 400,
        unit: 'px',
        confirmText: 'تطبيق',
        cancelText: 'إلغاء',
        icon: 'row'
      });
    });

    await page.waitForSelector('#app-modal-dialog[open]');
    assert.equal(await page.locator('#app-modal-unit').isVisible(), true);
    await page.locator('#app-modal-input').fill('500'); // exceeds max 400
    await page.locator('#app-modal-confirm').click();

    // Verify error is shown and modal stays open
    assert.equal(await page.locator('#app-modal-error').isVisible(), true);
    assert.match(await page.locator('#app-modal-error').textContent(), /400/);

    // Now enter valid value
    await page.locator('#app-modal-input').fill('45');
    await page.locator('#app-modal-confirm').click();
    const heightResult = await heightPromise;
    assert.equal(heightResult, '45', 'Valid number input submits correctly');

    assert.deepEqual(errors, [], 'No runtime exceptions during dialog interactions');
    console.log('PASS: in-app confirm, cancel, delete styling, prompt editing, and number validation');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
