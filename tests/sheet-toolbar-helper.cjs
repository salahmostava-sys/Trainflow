// Operation regressions open the command dropdown containing a control.
module.exports=function useSheetDropdowns(page){
  page.addInitScript(()=>{ window.__IBTA_TEST_AUTOMATION__ = true; });
  const locate=page.locator.bind(page),actions=new Set(['click','dblclick','focus','hover','fill','check','uncheck','selectOption']),chain=new Set(['locator','first','last','nth','filter']);
  const reveal=async locator=>{const menu=await locator.evaluate(el=>el.closest('.sheet-command-popover')?.dataset.trigger);if(menu&&await locator.evaluate(el=>!el.closest('.sheet-command-popover').matches(':popover-open'))){const trigger=locate('#'+menu);await reveal(trigger);await trigger.click();}};
  const wrap=locator=>new Proxy(locator,{get(target,key){
    const value=target[key];if(typeof value!=='function')return value;
    if(chain.has(key))return (...args)=>wrap(value.apply(target,args));
    if(!actions.has(key))return value.bind(target);
    return async(...args)=>{
      await reveal(target);
      return value.apply(target,args);
    };
  }});
  page.locator=(...args)=>wrap(locate(...args));
};
