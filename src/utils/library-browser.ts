import {prioritizeSelectableRows} from './picker-order';
import {bindFilterChoices,checkedValues,matchesChoices} from './filter-choices';
import {priceInGold} from './item-price';
import dragonItemVersions from '../data/public/dragon-item-versions.json';
export function initLibraryBrowser(){
 const root=document.querySelector<HTMLElement>('.library-catalog');if(!root)return;
 const frame=root.querySelector<HTMLIFrameElement>('#library-detail-frame')!,full=root.querySelector<HTMLAnchorElement>('#library-full-entry')!,title=root.querySelector('#library-current-title')!;
 const rows=[...root.querySelectorAll<HTMLTableRowElement>('tr[data-library-id]')].map(row=>({row,record:JSON.parse(row.dataset.record!)}));
 const params=new URLSearchParams(location.search),picker=params.get('mode')==='select'&&window.parent!==window;
 const requestedKind=params.get('use');
 const selectionKind=picker&&['gear','weapons','magic','ammunition','armor','shield'].includes(requestedKind??'')?requestedKind:null;
 if(selectionKind)for(const link of document.querySelectorAll<HTMLAnchorElement>('a[href="/equipment/"],a[href="/equipment/magic-items/"]'))link.hidden=true;
 const eligibleIds=new Set(rows.filter(({record})=>!selectionKind||(record.selectionUses??[record.selectionKind]).includes(selectionKind)).map(({row})=>row.dataset.libraryId!));
 const roleLabels:Record<string,string>={gear:'装备',weapons:'武器',magic:'魔法物品',ammunition:'弹药',armor:'护甲',shield:'盾牌'};
 const unavailable=new Map<string,string>();
 if(selectionKind)for(const {row,record} of rows)if(!eligibleIds.has(row.dataset.libraryId!))unavailable.set(row.dataset.libraryId!,`不能用于${roleLabels[selectionKind]}栏`);
 let selected=new Set<string>();
 const inputs=[...root.querySelectorAll<HTMLInputElement>('.filter-grid input')];
 const groups=['category','type','source'];
 for(const input of inputs)input.value=params.get(input.id.replace('library-',''))??'';
 function preview(row:HTMLTableRowElement){const link=row.querySelector<HTMLAnchorElement>('[data-library-entry]')!;frame.src=link.href+'?view=embedded';full.href=link.href;title.textContent=link.textContent;rows.forEach(r=>r.row.classList.toggle('is-selected',r.row===row));}
 let sortKey='',ascending=true;
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-library-sort]'))button.addEventListener('click',()=>{
  const key=button.dataset.librarySort!;ascending=sortKey===key?!ascending:true;sortKey=key;
  const collator=new Intl.Collator('zh-Hans-CN',{numeric:true});
  const sorted=[...rows].sort((a,b)=>{const order=key==='price'?priceInGold(a.record.price??'')-priceInGold(b.record.price??''):collator.compare(a.record[key]??'',b.record[key]??'');return (Number.isNaN(order)?0:order)*(ascending?1:-1);});
  const tbody=root!.querySelector('tbody')!;sorted.forEach(({row})=>tbody.append(row));if(picker)prioritizeSelectableRows(tbody,'.library-check input');
  root!.querySelectorAll('[aria-sort]').forEach(th=>th.setAttribute('aria-sort','none'));button.closest('th')!.setAttribute('aria-sort',ascending?'ascending':'descending');
 });
 function applyFilters(){
  const values=Object.fromEntries(inputs.map(input=>[input.id.replace('library-',''),input.value.trim().toLowerCase()]));let shown=0;
  for(const {row,record} of rows){
   const filtered=!(values.name??'').split(/\s+/).filter(Boolean).every(word=>record.search.includes(word))||groups.some(group=>!matchesChoices(checkedValues(group),record.facets[group]??[]))||!!values.price&&priceInGold(record.price??'')>Number(values.price)||!!values.speed&&record.speed!==values.speed||!!values.damage&&!record.damage.includes(values.damage);
   row.hidden=filtered||(!picker&&!eligibleIds.has(row.dataset.libraryId!));if(!row.hidden)shown++;
  }
  root!.querySelector('#library-count')!.textContent=`显示 ${shown} / ${rows.length} 项`;root!.querySelector<HTMLElement>('.library-no-results')!.hidden=shown>0;
  const url=new URL(location.href);inputs.forEach(input=>{const key=input.id.replace('library-','');input.value?url.searchParams.set(key,input.value):url.searchParams.delete(key);});groups.forEach(group=>{url.searchParams.delete(group);checkedValues(group).forEach(value=>url.searchParams.append(group,value));});history.replaceState({},'',url);
 }
 bindFilterChoices(applyFilters);inputs.forEach(input=>input.addEventListener('input',applyFilters));applyFilters();
 for(const {row} of rows)row.querySelector('[data-library-entry]')!.addEventListener('click',event=>{const click=event as MouseEvent;if(click.ctrlKey||click.metaKey||click.shiftKey||click.altKey)return;event.preventDefault();preview(row);const url=new URL(location.href);url.searchParams.set('entry',row.dataset.libraryId!);history.replaceState({},'',url);});
 const requestedId=params.get('entry')??'';
 const canonicalId=(dragonItemVersions as Record<string,{targetId:string}>)[requestedId]?.targetId??requestedId;
 const initial=rows.find(({row})=>row.dataset.libraryId===canonicalId)??rows.find(({row})=>!row.hidden);if(initial)preview(initial.row);
 if(canonicalId!==requestedId){const url=new URL(location.href);url.searchParams.set('entry',canonicalId);history.replaceState({},'',url);}
 if(picker){
  document.documentElement.classList.add('library-picker-mode');root.querySelectorAll<HTMLElement>('.library-check,.library-selection').forEach(el=>el.hidden=false);
  const setUnavailable=(id:string,reason:string)=>{const row=rows.find(entry=>entry.row.dataset.libraryId===id)?.row;if(!row)return;const input=row.querySelector<HTMLInputElement>('.library-check input')!,cell=row.querySelector<HTMLTableCellElement>('td:not(.library-check)')!;unavailable.set(id,reason);row.classList.add('is-unavailable');row.setAttribute('aria-disabled','true');input.disabled=true;input.checked=false;selected.delete(id);let note=cell.querySelector<HTMLElement>('.library-unavailable-reason');if(!note){note=document.createElement('small');note.className='library-unavailable-reason';cell.append(note);}note.textContent=reason;};
  for(const [id,reason] of unavailable)setUnavailable(id,reason);
  const orderChoices=()=>prioritizeSelectableRows(root.querySelector<HTMLTableSectionElement>('tbody')!,'.library-check input');
  orderChoices();
  const count=()=>{root.querySelector('#library-selected-count')!.textContent=`已选 ${selected.size} 件`;root.querySelectorAll<HTMLInputElement>('.library-check input').forEach(input=>input.checked=selected.has(input.value));};
  root.querySelectorAll<HTMLInputElement>('.library-check input').forEach(input=>{input.disabled=unavailable.has(input.value);input.addEventListener('change',()=>{if(input.checked&&['armor','shield'].includes(selectionKind??''))selected.clear();input.checked&&!unavailable.has(input.value)?selected.add(input.value):selected.delete(input.value);count();});});
  root.querySelector('[data-library-apply]')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-items-selected',ids:[...selected]},location.origin));
  root.querySelector('[data-library-cancel]')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-item-picker-cancel'},location.origin));
  window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='adnd1e-item-selection'||!Array.isArray(event.data.ids)||!event.data.ids.every((id:unknown)=>typeof id==='string'))return;for(const {row} of rows){row.classList.remove('is-unavailable');row.removeAttribute('aria-disabled');row.querySelector('.library-unavailable-reason')?.remove();const input=row.querySelector<HTMLInputElement>('.library-check input')!;input.disabled=!eligibleIds.has(input.value);}unavailable.clear();for(const {row} of rows)if(!eligibleIds.has(row.dataset.libraryId!))unavailable.set(row.dataset.libraryId!,`不能用于${roleLabels[selectionKind!] }栏`);const blocked=event.data.blocked&&typeof event.data.blocked==='object'?event.data.blocked as Record<string,unknown>:{};for(const [id,reason] of Object.entries(blocked))if(typeof reason==='string')setUnavailable(id,reason);selected=new Set(event.data.ids.filter((id:string)=>eligibleIds.has(id)&&!unavailable.has(id)));count();orderChoices();});
  parent.postMessage({type:'adnd1e-item-picker-ready'},location.origin);
 }
}
