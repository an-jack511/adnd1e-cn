/** Reuse the full spell library inside the character card's selection dialog. */
export function initSpellPicker() {
  if(new URLSearchParams(location.search).get('mode')!=='prepare' || parent===window)return;
  document.documentElement.classList.add('spell-picker');
  document.querySelector<HTMLElement>('#spell-selection-toolbar')!.hidden=false;
  const selected=new Set<string>();
  const checks=new Map<string,HTMLInputElement>();
  const params=new URLSearchParams(location.search),excluded=new Set(params.getAll('exclude')),included=params.getAll('include'),includeSet=included.length?new Set(included):null,maxCount=Number(params.get('max-count')||0);
  const bandLimits=params.getAll('band').map(value=>{const [levels,limit]=value.split(':');return {levels:new Set(levels.split(',').map(Number)),limit:Number(limit)};});
  const rows=[...document.querySelectorAll<HTMLTableRowElement>('#spell-results tr[data-record]')];
  let slotLimits:Record<string,number>={},copyCounts:Record<string,number>={};
  const update=()=>{
    const countByLevel=new Map<number,number>();for(const id of selected){const row=rows.find(item=>JSON.parse(item.dataset.record!).id===id);if(row){const level=Number(JSON.parse(row.dataset.record!).facets.level[0]);countByLevel.set(level,(countByLevel.get(level)||0)+(Number(copyCounts[id])||1));}}
    for(const [id,check] of checks){const row=check.closest('tr')!,record=JSON.parse(row.dataset.record!),level=Number(record.facets.level[0]),limit=slotLimits[String(level)],atSpellLimit=Number.isFinite(limit)&&Number(countByLevel.get(level)||0)>=limit,band=bandLimits.find(item=>item.levels.has(level)),bandCount=band?[...selected].filter(selectedId=>{const selectedRow=rows.find(item=>JSON.parse(item.dataset.record!).id===selectedId);return selectedRow&&band.levels.has(Number(JSON.parse(selectedRow.dataset.record!).facets.level[0]));}).length:0,atBandLimit=!!band&&bandCount>=band.limit,totalFull=!selected.has(id)&&maxCount>0&&selected.size>=maxCount;check.disabled=excluded.has(id)||!!includeSet&&!includeSet.has(id)||!selected.has(id)&&(atSpellLimit||atBandLimit)||totalFull;check.title=excluded.has(id)?'已在法术书或其他记录中':!!includeSet&&!includeSet.has(id)?'此处不可选':!selected.has(id)&&(atSpellLimit||atBandLimit)?'本组容量已满':totalFull?'旅行法术书容量已满':'';}
    document.querySelector('#spell-selection-count')!.textContent=`已勾选 ${selected.size} 种法术${maxCount?` · 容量 ${selected.size}/${maxCount}`:''}（包含当前筛选外的选择）`;
  };
  const header=document.createElement('th');header.scope='col';header.textContent='准备';
  document.querySelector('#spell-results thead tr')!.prepend(header);
  for(const row of rows) {
    const record=JSON.parse(row.dataset.record!);
    if(excluded.has(record.id)||includeSet&&!includeSet.has(record.id))row.hidden=true;
    const cell=document.createElement('td'),check=document.createElement('input');check.type='checkbox';check.name='prepared-spell';check.value=record.id;check.setAttribute('aria-label',`准备 ${row.cells[0].textContent}`);
    check.addEventListener('change',()=>{check.checked?selected.add(record.id):selected.delete(record.id);update();});
    cell.append(check);row.prepend(cell);checks.set(record.id,check);
    const link=row.querySelector('a');if(link){link.target='_blank';link.rel='noopener';}
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin || event.source!==parent || event.data?.type!=='adnd1e-card-selection' || !Array.isArray(event.data.ids))return;
    selected.clear();for(const id of event.data.ids)if(typeof id==='string' && checks.has(id)&&!excluded.has(id)&&(!includeSet||includeSet.has(id)))selected.add(id);
    slotLimits=event.data.slots&&typeof event.data.slots==='object'?Object.fromEntries(Object.entries(event.data.slots).map(([level,value])=>[level,Number(value)]).filter(([,value])=>Number.isFinite(value))) as Record<string,number>:{};copyCounts=event.data.counts&&typeof event.data.counts==='object'?event.data.counts:{};
    for(const [id,check] of checks)check.checked=selected.has(id);update();
  });
  document.querySelector('#apply-spell-selection')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-spells-selected',ids:[...selected]},location.origin));
  document.querySelector('#cancel-spell-selection')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-spell-picker-cancel'},location.origin));
  update();parent.postMessage({type:'adnd1e-spell-picker-ready'},location.origin);
}
