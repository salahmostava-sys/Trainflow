/* Column widths are display preferences; voucher values are never stored here. */
const VoucherColumns=(()=>{
  'use strict';
  const key='trainflow_voucher_widths',minimum=[24,28,100,100,100,100,80],maximum=1000;
  const sheet=document.querySelector('.code-sheet'),head=sheet.querySelector('.code-sheet-head');let widths={};
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');for(let i=0;i<7;i++)if(Number.isFinite(saved[i])&&saved[i]>=minimum[i]&&saved[i]<=maximum)widths[i]=Math.round(saved[i]);}catch{/* optional device preference */}
  const defaults=()=>matchMedia('(max-width:700px)').matches?[44,44,172,148,240,220,104]:[32,38,172,148,240,220,80];
  const clamp=(i,width)=>Math.max(i===6&&matchMedia('(max-width:700px)').matches?90:minimum[i],Math.min(maximum,Math.round(width)));
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(widths));}catch{/* optional device preference */}};
  function sync(){[...head.children].forEach((cell,i)=>{const control=cell.querySelector('.voucher-col-resizer');if(control)control.setAttribute('aria-valuenow',String(Math.round(cell.getBoundingClientRect().width)||widths[i]||defaults()[i]||180));});}
  function apply(){
    const base=defaults(),tracks=base.map((value,i)=>widths[i]===undefined?value:clamp(i,widths[i])),tableWidth=tracks.reduce((total,width)=>total+width,0)+'px';
    sheet.style.setProperty('--voucher-columns',tracks.map(width=>width+'px').join(' '));
    sheet.style.setProperty('--voucher-fit-columns',tracks.map((width,i)=>'minmax('+(i<2||i===6?minimum[i]:0)+'px,'+width+'fr)').join(' '));
    sheet.style.setProperty('--voucher-min-width',tableWidth);sheet.style.setProperty('--voucher-table-width',tableWidth);sync();
  }
  function set(i,width){widths[i]=clamp(i,width);apply();persist();}
  function autofit(i){if(i<2||i===6){set(i,defaults()[i]);return;}const canvas=document.createElement('canvas'),context=canvas.getContext('2d');let width=minimum[i];const measure=(el,value)=>{const css=getComputedStyle(el);context.font=css.font||css.fontSize+' '+css.fontFamily;width=Math.max(width,context.measureText(value).width+32);};measure(head.children[i],head.children[i].textContent.trim());document.querySelectorAll('#code-grid .code-row').forEach(row=>{const cell=row.children[i],input=cell.querySelector('input');measure(input||cell,input?input.value:cell.textContent);});set(i,width);}
  function translate(){
    [...head.children].forEach((cell,i)=>{const handle=cell.querySelector('.voucher-col-resizer');if(!handle.dataset.bound){handle.dataset.bound='true';handle.setAttribute('aria-valuemin',String(minimum[i]));handle.setAttribute('aria-valuemax',String(maximum));
      handle.addEventListener('click',e=>e.stopPropagation());handle.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();autofit(i);});
      handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const sign=(document.documentElement.dir==='rtl'?-1:1)*(e.key==='ArrowRight'?1:-1),step=e.shiftKey?50:10;set(i,e.key==='Home'?minimum[i]:e.key==='End'?maximum:cell.getBoundingClientRect().width+sign*step);});
      handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const start=e.clientX,initial=cell.getBoundingClientRect().width,rtl=document.documentElement.dir==='rtl',previous=widths[i];handle.setPointerCapture(e.pointerId);document.body.classList.add('voucher-resizing');const move=event=>{widths[i]=clamp(i,initial+(event.clientX-start)*(rtl?-1:1));apply();};const finish=event=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);document.body.classList.remove('voucher-resizing');if(event.type==='pointercancel'){if(previous===undefined)delete widths[i];else widths[i]=previous;apply();}else persist();};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);});
    }const name=cell.textContent.trim()||(i===0?(currentLang==='ar'?'التحديد':'Selection'):(currentLang==='ar'?'الإجراءات':'Actions'));handle.setAttribute('aria-label',currentLang==='ar'?'عرض عمود '+name:name+' column width');handle.title=currentLang==='ar'?'اسحب لتغيير العرض؛ اضغط مرتين للضبط حسب المحتوى':'Drag to resize; double-click to fit contents';});apply();
  }
  window.addEventListener('resize',apply);new ResizeObserver(sync).observe(head);return {translate};
})();
