// Operation regressions open the command dropdown containing a control.
module.exports=function useSheetDropdowns(page){
  const locate=page.locator.bind(page),actions=new Set(['click','dblclick','focus','hover','fill','check','uncheck','selectOption']),chain=new Set(['locator','first','last','nth','filter']);
  const wrap=locator=>new Proxy(locator,{get(target,key){
    const value=target[key];if(typeof value!=='function')return value;
    if(chain.has(key))return (...args)=>wrap(value.apply(target,args));
    if(!actions.has(key))return value.bind(target);
    return async(...args)=>{
      const menu=await target.evaluate(el=>el.closest('.sheet-command-popover')?.dataset.trigger);
      if(menu&&await target.evaluate(el=>!el.closest('.sheet-command-popover').matches(':popover-open')))await locate('#'+menu).click();
      return value.apply(target,args);
    };
  }});
  page.locator=(...args)=>wrap(locate(...args));
};
