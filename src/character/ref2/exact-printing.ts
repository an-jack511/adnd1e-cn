import { installCardStyle } from './card-style';

/** Snapshot the visible, already-computed card into the measured REF2 renderer.
 * The source record and its calculations remain owned by the normal editor.
 */
type FormEntry=string|boolean;
type EditorCallbacks={
 notes:()=>Record<string,FormEntry>;
 update:(id:string,bind:string,value:FormEntry)=>void;
};

export function installExactPrinting(form:HTMLFormElement,collect:()=>void,editor:EditorCallbacks){
 const controlValue=(control:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)=>control instanceof HTMLInputElement&&control.type==='checkbox'?control.checked:control instanceof HTMLSelectElement?control.selectedOptions[0]?.textContent?.trim()||control.value:control.value;
 const currentStyle=installCardStyle();
 function snapshot(){
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
  return {fields,rows,derived,ammunitionBoxes,preparedSpells,spellFields,permanentNotes:editor.notes()};
 }
 function open(mode:'preview'|'print', spellsOnly=false){
  try{sessionStorage.setItem('adnd1e-ref2-print-record',JSON.stringify(snapshot()));}
  catch{const status=document.querySelector('#character-status');if(status)status.textContent='无法建立打印副本，请先导出人物数据备份。';return;}
  const style=currentStyle();
  const preview=window.open(`/character/${style}/?from=character&mode=${mode}${spellsOnly?'&spells=only':''}`,'_blank');
  if(!preview){const status=document.querySelector('#character-status');if(status)status.textContent='浏览器拦截了打印窗口；允许本站弹出窗口后重试。';}
 }
 const frame=document.querySelector<HTMLIFrameElement>('#permanent-editor')!;
 const panel=document.querySelector<HTMLElement>('#permanent-layout')!;
 const pageButton=document.querySelector<HTMLButtonElement>('#show-permanent-layout')!;
 function display(show:boolean){
  panel.hidden=!show;
  form.classList.toggle('permanent-editor-open',show);
  pageButton.hidden=currentStyle()!=='permanent'||show;
  if(show)refresh();
 }
 function refresh(){
  if(panel.hidden)return;
  try{
   sessionStorage.setItem('adnd1e-permanent-edit-record',JSON.stringify(snapshot()));
   frame.src='/character/permanent/?from=character&mode=edit';
  }catch{display(false);}
 }
 function updateStyle(){display(currentStyle()==='permanent');}
 document.querySelector('#exact-print-style')?.addEventListener('change',updateStyle);
 window.addEventListener('storage',event=>{if(event.key==='adnd1e-character-paper-style')updateStyle();});
 pageButton.addEventListener('click',()=>display(true));
 document.querySelectorAll('[data-card-tab]').forEach(tab=>tab.addEventListener('click',()=>display(false)));
 document.addEventListener('character-record-replaced',refresh);
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  const message=event.data;
  if(message?.type==='permanent-size'&&typeof message.height==='number'&&Number.isFinite(message.height)){
   frame.style.height=Math.min(5200,Math.max(240,message.height))+'px';
  }
 });
 frame.addEventListener('permanent-field-change',event=>{
  const message=(event as CustomEvent).detail;
  if(typeof message?.id==='string'&&typeof message.bind==='string'&&(typeof message.value==='string'||typeof message.value==='boolean')){
   editor.update(message.id,message.bind,message.value);
   const record=snapshot();
   frame.contentWindow?.postMessage({type:'permanent-derived',derived:record.derived,fields:record.fields,permanentNotes:record.permanentNotes},location.origin);
  }
 });
 updateStyle();
 document.querySelector('#print-prepared-spells')?.addEventListener('click',()=>open('print',true));
 document.querySelector('#print-ref2-character')?.addEventListener('click',()=>open('print'));
 document.querySelector('#preview-ref2-character')?.addEventListener('click',()=>open('preview'));
}
