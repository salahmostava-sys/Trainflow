const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
  const server=spawn(process.execPath,[path.join(__dirname,'../tools/design-preview.cjs')],{env:{...process.env,IBTA_PREVIEW_PORT:'4188'},stdio:['ignore','pipe','inherit']});
  await new Promise(resolve=>server.stdout.once('data',resolve));const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4188');
    await page.locator('#account-menu-btn').click();await page.locator('#settings-btn').click();await page.locator('#settings-tab-inventory').click();
    await page.waitForFunction(()=>!document.getElementById('inventory-auto-save').disabled);
    assert.equal(await page.locator('#inventory-auto-time').inputValue(),'16:59');assert.equal(await page.locator('#inventory-auto-enabled').isChecked(),false);
    assert.match(await page.locator('#inventory-auto-connection').textContent(),/غير مربوطة/);
    await page.locator('#inventory-auto-enabled').check();await page.locator('#inventory-auto-save').click();await page.waitForFunction(()=>document.getElementById('inventory-auto-status').textContent.includes('أكمل ربط'));
    await page.locator('#inventory-auto-phone-id').fill('123456789012');await page.locator('#inventory-auto-template').fill('ibta_inventory_daily');await page.locator('#inventory-auto-token').fill('test_token_for_local_preview_only');
    await page.locator('#inventory-auto-time').fill('16:45');await page.locator('#inventory-auto-save').click();await page.waitForFunction(()=>document.getElementById('inventory-auto-status').textContent.includes('16:45'));
    assert.equal(await page.locator('#inventory-auto-token').inputValue(),'');assert.equal(await page.evaluate(()=>window.previewDelivery.time),'16:45');
    assert.equal(await page.evaluate(()=>Object.hasOwn(window.previewDelivery,'token')),false);
    await page.locator('#inventory-auto-time').fill('16:50');await page.locator('#inventory-auto-save').click();await page.waitForFunction(()=>document.getElementById('inventory-auto-status').textContent.includes('16:50'));
    assert.equal(await page.evaluate(()=>window.previewDeliveryCalls.at(-1).token),'','Blank token preserves the server token');
    await page.evaluate(()=>{window.previewDelivery.last={at:'2026-10-04T13:50:00Z',state:'accepted',error:null};});await page.locator('#inventory-auto-refresh').click();await page.waitForFunction(()=>document.getElementById('inventory-auto-last').textContent.includes('قبلت خدمة'));
    await page.locator('#lang-btn').click();assert.match(await page.locator('#inventory-auto-last').textContent(),/check delivery/);assert.equal(await page.locator('#inventory-auto-save').textContent(),'Save sending settings');
    await page.locator('#inventory-auto-enabled').uncheck();await page.locator('#inventory-auto-save').click();await page.waitForFunction(()=>document.getElementById('inventory-auto-status').textContent.includes('off'));
    await page.locator('#inventory-auto-token').fill('unsaved_private_token');await page.evaluate(()=>InventoryDelivery.reset());assert.equal(await page.locator('#inventory-auto-token').inputValue(),'');
    await page.setViewportSize({width:390,height:844});await page.locator('#inventory-auto-settings').screenshot({path:path.join(__dirname,'../artifacts/inventory-auto-mobile.png')});
    assert.deepEqual(errors,[]);console.log('PASS: daily Saudi-time settings, disconnected guard, token privacy, persistence, status, translation, disable and sign-out cleanup');
  }finally{await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
