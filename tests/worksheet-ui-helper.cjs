// Exercise real worksheet tabs and creation instead of the retired owner selector.
module.exports=page=>({
 async switchTo(owner){const name=owner==='demo-admin'?'Sheet 1':'Second private worksheet';const tab=page.locator('#sheet-worksheet-tabs button[role=tab]').filter({hasText:name});if(await tab.count())await tab.click();else{await page.locator('#sheet-insert-menu-trigger').click();await page.locator('#sheet-insert-sheet').click();await page.locator('#sheet-worksheet-name').fill(name);await page.locator('#sheet-worksheet-apply').click();}await page.waitForFunction(()=>!document.getElementById('sheet-workspace').inert);},
 async owner(){const text=await page.locator('#sheet-worksheet-tabs button[aria-selected=true]').textContent();return text==='Sheet 1'?'demo-admin':'demo-user';},
 async current(){return page.evaluate(()=>{const name=document.querySelector('#sheet-worksheet-tabs button[aria-selected=true]').textContent;return [...previewSheets.values()].find(s=>(s.sheet_name||'Sheet 1')===name);});}
});
