// Existing operation regressions open the compact dropdown containing a control
// before interacting with it, using the same summary buttons as the user.
module.exports=function useSheetDropdowns(page){
  const locate=page.locator.bind(page),actions=new Set(['click','dblclick','focus','hover','fill','check','uncheck','selectOption']),chain=new Set(['locator','first','last','nth','filter']);
  const wrap=locator=>new Proxy(locator,{get(target,key){
    const value=target[key];if(typeof value!=='function')return value;
    if(chain.has(key))return (...args)=>wrap(value.apply(target,args));
    if(!actions.has(key))return value.bind(target);
    return async(...args)=>{
      const menus=await target.evaluate(el=>{const ids=[];for(let parent=el.parentElement;parent;parent=parent.parentElement)if(parent.matches('details.sheet-toolbar-menu')&&!(el.tagName==='SUMMARY'&&parent===el.parentElement))ids.unshift(parent.id);return ids;});
      for(const id of menus)if(!await locate('#'+id).evaluate(el=>el.open))await locate('#'+id+' > summary').click();
      return value.apply(target,args);
    };
  }});
  page.locator=(...args)=>wrap(locate(...args));
};
