import { installCardStyle } from './card-style';

/** Snapshot the visible, already-computed card into the measured REF2 renderer.
 * The source record and its calculations remain owned by the normal editor.
 */
export function installExactPrinting(form:HTMLFormElement,collect:()=>void){
 const controlValue=(control:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)=>control instanceof HTMLInputElement&&control.type==='checkbox'?control.checked:control instanceof HTMLSelectElement?control.selectedOptions[0]?.textContent?.trim()||control.value:control.value;
 const currentStyle=installCardStyle();
 function open(mode:'preview'|'print', spellsOnly=false){
  collect();
  const fields=Object.fromEntries([...form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[name]')].map(control=>[control.name,controlValue(control)]));
  const rows=Object.fromEntries([...form.querySelectorAll<HTMLElement>('[data-repeater]')].map(section=>[section.dataset.repeater,[...section.querySelectorAll<HTMLElement>('[data-card-row]')].map(row=>({values:Object.fromEntries([...row.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-cell]')].map(control=>[control.dataset.cell,controlValue(control)]))}))]));
  const derived=[...form.querySelectorAll('[data-derived]')].map(el=>[...el.querySelectorAll('strong')].map(el=>el.textContent||''));
  const ammunitionBoxes=[...form.querySelectorAll<HTMLInputElement>('[data-repeater="ammunition"] input[type="checkbox"]')].map(c=>c.checked);
  const preparedSpells=[...form.querySelectorAll('.prepared-spell')].map(entry=>({
   name:entry.querySelector('h3')?.textContent||'',
   rules:entry.querySelector('.spell-quick-rules')?.textContent||'',
   source:entry.querySelector('.spell-source')?.textContent||'',
   counts:[...entry.querySelectorAll<HTMLInputElement>('.prepared-controls input')].map(input=>input.value),
  }));
  const spellFields=Object.fromEntries([...form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-card-panel="spells"] [name]')].map(control=>[control.name,control.value]));
  const snapshot={fields,rows,derived,ammunitionBoxes,preparedSpells,spellFields};
  try{sessionStorage.setItem('adnd1e-ref2-print-record',JSON.stringify(snapshot));}
  catch{const status=document.querySelector('#character-status');if(status)status.textContent='无法建立打印副本，请先导出人物数据备份。';return;}
  const style=currentStyle();
  const preview=window.open(`/character/${style}/?from=character&mode=${mode}${spellsOnly?'&spells=only':''}`,'_blank');
  if(!preview){const status=document.querySelector('#character-status');if(status)status.textContent='浏览器拦截了打印窗口；允许本站弹出窗口后重试。';}
 }
 document.querySelector('#print-prepared-spells')?.addEventListener('click',()=>open('print',true));
 document.querySelector('#print-ref2-character')?.addEventListener('click',()=>open('print'));
 document.querySelector('#preview-ref2-character')?.addEventListener('click',()=>open('preview'));
}
