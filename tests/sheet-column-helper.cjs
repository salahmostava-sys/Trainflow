module.exports=function columnTools(page){
  page.addInitScript(()=>{window.__IBTA_TEST_AUTOMATION__=true;});
  const select=async column=>{
    let letter='';for(let n=column+1;n;n=Math.floor((n-1)/26))letter=String.fromCharCode(65+(n-1)%26)+letter;
    await page.locator('#sheet-address').fill(letter+'1');await page.locator('#sheet-address').press('Enter');
  };
  const action=async name=>{
    const menu=page.locator('#sheet-cell-format-menu-items');
    if(!await menu.evaluate(el=>el.matches(':popover-open')))await page.locator('#sheet-cell-format-menu-trigger').click();
    if(['hide-cols','show-cols'].includes(name)){
      const visibility=page.locator('#sheet-cell-format-menu-visibility-items');
      if(!await visibility.evaluate(el=>el.matches(':popover-open')))await page.locator('#sheet-cell-format-menu-visibility-trigger').click();
    }
    await page.locator('#sheet-cell-format-menu-'+name).click();
  };
  return {
    async hide(column){await select(column);await action('hide-cols');},
    async showAll(){await action('show-cols');},
    async width(column,pixels){await select(column);page.once('dialog',dialog=>dialog.accept(String(pixels)));await action('column-width');}
  };
};
