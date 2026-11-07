import {bindFilterChoices,checkedValues,matchesChoices} from './filter-choices';
import {priceInGold} from './item-price';
import dragonItemVersions from '../data/public/dragon-item-versions.json';
export function initLibraryBrowser(){
 const root=document.querySelector<HTMLElement>('.library-catalog');if(!root)return;
 const frame=root.querySelector<HTMLIFrameElement>('#library-detail-frame')!,full=root.querySelector<HTMLAnchorElement>('#library-full-entry')!,title=root.querySelector('#library-current-title')!;
 const rows=[...root.querySelectorAll<HTMLTableRowElement>('tr[data-library-id]')].map(row=>({row,record:JSON.parse(row.dataset.record!)}));
 const params=new URLSearchParams(location.search),picker=params.get('mode')==='select'&&window.parent!==window;
 const requestedKind=params.get('use');
 const selectionKind=picker&&['gear','weapons','magic'].includes(requestedKind??'')?requestedKind:null;
 if(selectionKind)for(const link of document.querySelectorAll<HTMLAnchorElement>('a[href="/equipment/"],a[href="/equipment/magic-items/"]'))link.hidden=true;
 const eligibleIds=new Set(rows.filter(({record})=>!selectionKind||record.selectionKind===selectionKind).map(({row})=>row.dataset.libraryId!));
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
  const tbody=root!.querySelector('tbody')!;sorted.forEach(({row})=>tbody.append(row));
  root!.querySelectorAll('[aria-sort]').forEach(th=>th.setAttribute('aria-sort','none'));button.closest('th')!.setAttribute('aria-sort',ascending?'ascending':'descending');
 });
 function applyFilters(){
  const values=Object.fromEntries(inputs.map(input=>[input.id.replace('library-',''),input.value.trim().toLowerCase()]));let shown=0;
  for(const {row,record} of rows){
   row.hidden=!eligibleIds.has(row.dataset.libraryId!)||!(values.name??'').split(/\s+/).filter(Boolean).every(word=>record.search.includes(word))||groups.some(group=>!matchesChoices(checkedValues(group),record.facets[group]??[]))||!!values.price&&priceInGold(record.price??'')>Number(values.price)||!!values.speed&&record.speed!==values.speed||!!values.damage&&!record.damage.includes(values.damage);if(!row.hidden)shown++;
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
  const count=()=>{root.querySelector('#library-selected-count')!.textContent=`已选 ${selected.size} 件`;root.querySelectorAll<HTMLInputElement>('.library-check input').forEach(input=>input.checked=selected.has(input.value));};
  root.querySelectorAll<HTMLInputElement>('.library-check input').forEach(input=>{input.disabled=!eligibleIds.has(input.value);input.addEventListener('change',()=>{input.checked&&eligibleIds.has(input.value)?selected.add(input.value):selected.delete(input.value);count();});});
  root.querySelector('[data-library-apply]')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-items-selected',ids:[...selected]},location.origin));
  root.querySelector('[data-library-cancel]')!.addEventListener('click',()=>parent.postMessage({type:'adnd1e-item-picker-cancel'},location.origin));
  window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='adnd1e-item-selection'||!Array.isArray(event.data.ids)||!event.data.ids.every((id:unknown)=>typeof id==='string'))return;selected=new Set(event.data.ids.filter((id:string)=>eligibleIds.has(id)));count();});
  parent.postMessage({type:'adnd1e-item-picker-ready'},location.origin);
 }
}
