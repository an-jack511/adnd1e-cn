/** Reuse the full spell library inside the character card's selection dialog. */
export function initSpellPicker() {
  if(new URLSearchParams(location.search).get('mode')!=='prepare' || parent===window)return;
  document.documentElement.classList.add('spell-picker');
  document.querySelector<HTMLElement>('#spell-selection-toolbar')!.hidden=false;
  const selected=new Set<string>();
  const checks=new Map<string,HTMLInputElement>();
  const update=()=>document.querySelector('#spell-selection-count')!.textContent=`已勾选 ${selected.size} 种法术（包含当前筛选外的选择）`;
  const header=document.createElement('th');header.scope='col';header.textContent='准备';
  document.querySelector('#spell-results thead tr')!.prepend(header);
  for(const row of document.querySelectorAll<HTMLTableRowElement>('#spell-results tr[data-record]')) {
    const record=JSON.parse(row.dataset.record!);
    const cell=document.createElement('td'),check=document.createElement('input');check.type='checkbox';check.name='prepared-spell';check.value=record.id;check.setAttribute('aria-label',`准备 ${row.cells[0].textContent}`);
    check.addEventListener('change',()=>{check.checked?selected.add(record.id):selected.delete(record.id);update();});
    cell.append(check);row.prepend(cell);checks.set(record.id,check);
    const link=row.querySelector('a');if(link){link.target='_blank';link.rel='noopener';}
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin || event.source!==parent || event.data?.type!=='adnd1e-card-selection' || !Array.isArray(event.data.ids))return;
    selected.clear();for(const id of event.data.ids)if(typeof id==='string' && checks.has(id))selected.add(id);
    for(const [id,check] of checks)check.checked=selected.has(id);update();
  });
  document.querySelector('#apply-spell-selection')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-spells-selected',ids:[...selected]},location.origin));
  document.querySelector('#cancel-spell-selection')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-spell-picker-cancel'},location.origin));
  update();parent.postMessage({type:'adnd1e-spell-picker-ready'},location.origin);
}
