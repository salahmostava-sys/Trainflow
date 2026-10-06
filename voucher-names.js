/* Editable voucher names are separate from notes and persist with the voucher. */
const VoucherNames=(()=>{
  'use strict';
    const tr=(ar,en)=>currentLang==='ar'?ar:en;
  function cell(code){const box=document.createElement('div'),input=document.createElement('input');box.className='col-trainee-name';input.type='text';input.maxLength=200;input.dir='auto';input.value=state.voucherNames?.[code]||'';input.placeholder=tr('اسم المتدرب','Trainee name');input.setAttribute('aria-label',tr('اسم المتدرب للفاوتشر ','Trainee name for voucher ')+code);input.disabled=Cloud.role()==='copy_only';input.addEventListener('click',e=>e.stopPropagation());input.addEventListener('pointerdown',e=>e.stopPropagation());input.onchange=async()=>{const next=input.value.trim();input.disabled=true;if(await Cloud.saveVoucherName(code,next))showToast(tr('تم حفظ اسم المتدرب','Trainee name saved'));else{input.disabled=Cloud.role()==='copy_only';input.value=state.voucherNames?.[code]||'';}};box.appendChild(input);return box;}
  return {cell};
})();
