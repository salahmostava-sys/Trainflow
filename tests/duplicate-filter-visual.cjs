const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

(async () => {
  const PORT = '4188';
  const server = spawn(process.execPath, [path.join(__dirname, '../tools/design-preview.cjs')], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, IBTA_PREVIEW_PORT: PORT }
  });
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(Error('Preview server exited ' + code)));
  });

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();
    require('./sheet-toolbar-helper.cjs')(page);

    await page.goto(`http://127.0.0.1:${PORT}/`);
    await page.locator('#trainees-tab').click();
    await page.waitForFunction(() => document.getElementById('sheet-status').textContent === 'تم الحفظ');

    const cell = (r, c) => page.locator(`td[data-v="${r}"][data-col="${c}"]`);
    const paste = async (r, c, text) => {
      await cell(r, c).click();
      await cell(r, c).evaluate((el, text) => {
        const data = new DataTransfer();
        data.setData('text/plain', text);
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }, text);
    };

    const artifactsDir = path.join(__dirname, '../artifacts');
    if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

    // 1. Initial state without duplicate IDs:
    const filterBadge = page.locator('#sheet-duplicates-count');
    const filterWrapper = page.locator('#sheet-duplicates-filter');
    const filterCheckbox = page.locator('#sheet-duplicates-only');

    assert.equal(await filterBadge.textContent(), '0', 'Initially 0 duplicates');
    assert.equal(await filterWrapper.evaluate(el => el.classList.contains('active')), false);

    // 2. Click duplicate filter when 0 duplicates: verify empty state with reassurance!
    await filterCheckbox.check();
    assert.equal(await filterWrapper.evaluate(el => el.classList.contains('active')), true, 'Active styling applied');
    assert.ok(await page.locator('.sheet-empty-view-row').isVisible(), 'Empty view row rendered');
    assert.match(await page.locator('.sheet-empty-view-content strong').textContent(), /لا توجد إقامات أو هويات مكررة/, 'Reassuring empty message shown');
    
    // Screenshot 1: Empty state reassurance
    await page.screenshot({ path: path.join(artifactsDir, 'duplicate-filter-empty-state.png') });
    console.log('Saved duplicate-filter-empty-state.png');

    // Click clear button in the empty view
    await page.locator('.sheet-empty-view-btn').click();
    assert.equal(await filterCheckbox.isChecked(), false, 'Filter cleared via empty-state button');

    // 3. Paste duplicate IDs
    await paste(0, 4, '٢١٢٣٤٥٦٧٨٩');
    await paste(1, 4, '2123456789');

    // Badge should now display 2!
    await page.waitForFunction(() => document.getElementById('sheet-duplicates-count').textContent === '2');
    assert.equal(await filterBadge.textContent(), '2', 'Badge reflects 2 duplicate trainees');
    assert.ok(await filterBadge.evaluate(el => el.classList.contains('has-duplicates')), 'Badge has attention-highlighting class');

    // Filter by duplicates
    await filterCheckbox.check();
    assert.equal(await filterWrapper.evaluate(el => el.classList.contains('active')), true);
    assert.equal(await page.locator('#sheet-grid tbody tr:not(.sheet-empty-view-row)').count(), 2);

    // Verify cursor is on column 4 (ID column), NOT column 0 (Code column)!
    const activeAddress = await page.locator('#sheet-address').inputValue();
    console.log('Active address after duplicate filter check:', activeAddress);
    assert.ok(activeAddress.startsWith('E'), 'Active address is in column E (ID column), not column A');

    // Verify column 0 does NOT have focus-axis on every row
    const code0Axis = await cell(1, 0).evaluate(el => el.classList.contains('sheet-focus-axis'));
    assert.equal(code0Axis, false, 'Non-selected code numbers in column 0 are NOT highlighted with focus-axis');

    // Screenshot 2: Filter active with duplicate badge and ID focus
    await page.screenshot({ path: path.join(artifactsDir, 'duplicate-filter-active.png') });
    console.log('Saved duplicate-filter-active.png');

    console.log('PASS: all duplicate filter visual, state, badge, and cursor requirements verified successfully');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
