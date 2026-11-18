import type {Item} from '../../schemas';
import {blankRow,type Card} from './model';
import {cardName} from './labels';
import {acceptsItem} from './item-roles';
import {withOrdinaryWeight} from '../../utils/item-weight';
export function resolveItem(catalog:readonly Item[],name:string){return catalog.find(i=>i.id===name)??catalog.find(i=>cardName(i.nameZh)===name||i.nameEn===name);}
export function syncEquipped(card:Card,catalog:readonly Item[]){
 let changed=false;
 for(const slot of ['armor_item','shield_item']){
  const item=resolveItem(catalog,String(card.fields[slot]??''));
  for(const row of card.rows.gear.filter(r=>r.values.equippedSlot===slot&&r.values.itemId!==item?.id)){delete row.values.equippedSlot;row.values.location='背包';changed=true;}
  if(!item)continue;
  let row=card.rows.gear.find(r=>r.values.itemId===item.id);
  if(!row){row=card.rows.gear.find(r=>Object.values(r.values).every(v=>!v.trim()))??blankRow();Object.assign(row.values,{itemId:item.id,item:cardName(item.nameZh),quantity:'1'});if(!card.rows.gear.includes(row))card.rows.gear.push(row);changed=true;}
  if(row.values.equippedSlot!==slot){row.values.equippedSlot=slot;row.values.location='穿戴';changed=true;}
 }
 return changed;
}
export function selectAmmunition(card:Card,ids:string[],catalog:readonly Item[]){
 const selected=new Set(ids.filter(id=>catalog.some(i=>i.id===id&&acceptsItem(i,'ammunition'))));
 card.rows.ammunition=card.rows.ammunition.filter(r=>!r.values.ammoPickerId||selected.has(r.values.ammoPickerId));
 for(const id of selected){if(card.rows.ammunition.some(r=>r.values.itemId===id))continue;const item=catalog.find(i=>i.id===id)!,row=card.rows.ammunition.find(r=>Object.values(r.values).every(v=>!v.trim()))??blankRow();Object.assign(row.values,{name:cardName(item.nameZh),itemId:id,ammoPickerId:id,count:'1',used:'0'});if(!card.rows.ammunition.includes(row))card.rows.ammunition.push(row);}
}
/** Gear is the physical inventory. Combat/ammunition views contribute only items absent from gear. */
export function carriedItems(card:Card,catalog:readonly Item[]){
 const result:{item:Item;quantity:number}[]=[],owned=new Set<string>();
 for(const row of card.rows.gear){const item=resolveItem(catalog,row.values.itemId||row.values.item||'');if(item){owned.add(item.id);result.push({item,quantity:row.values.quantity?Math.max(0,Number(row.values.quantity)||0):1});}else if(row.values.autoSpellbook==='1'&&Number(row.values.bookWeightPounds)>0){const custom={id:row.values.itemId||row.id,nameZh:row.values.item||'法术书',nameEn:'Spellbook',category:'法术书',price:'',weight:`${row.values.bookWeightPounds}磅`,description:'',tags:[],source:[{book:'Unearthed Arcana p.79'}]} as Item;result.push({item:custom,quantity:1});}}
 for(const row of card.rows.weapons){const item=resolveItem(catalog,row.values.name||'');if(item&&!owned.has(item.id)){owned.add(item.id);result.push({item,quantity:1});}}
 for(const row of card.rows.ammunition){const item=resolveItem(catalog,row.values.itemId||row.values.name||'');if(item&&!owned.has(item.id)){owned.add(item.id);result.push({item,quantity:Math.max(0,(Number(row.values.count)||0)-(Number(row.values.used)||0))});}}
 // A user-selected weapon model also applies when the same item is in gear.
 return result.map(entry=>({...entry,item:withOrdinaryWeight(entry.item,catalog,card.rows.weapons.find(row=>resolveItem(catalog,row.values.name||'')?.id===entry.item.id)?.values.base_weapon)}));
}

/** Spellbooks become carried gear only while a spell prepared from that volume remains prepared. */
export function syncSpellbookGear(card:Card){
 let data:any={};try{data=JSON.parse(String(card.fields.spellbook_records||'{}'));}catch{}
 const sources=new Map<string,{name:string;weight:number}>();
 for(const book of Array.isArray(data.books)?data.books:[])if(typeof book.id==='string')sources.set(`home:${book.id}`,{name:book.name||`主法术书 ${book.id}`,weight:45});
 for(const book of Array.isArray(data.travel)?data.travel:[])if(typeof book.instanceId==='string')sources.set(`travel:${book.instanceId}`,{name:book.name||'旅行法术书',weight:6});
 const used=new Set(card.preparedSpells.map(entry=>entry.sourceBookId).filter((id):id is string=>!!id));
 const wanted=[...used].filter(id=>sources.has(id)).map(id=>({id,...sources.get(id)!}));
 const previous=card.rows.gear.filter(row=>row.values.autoSpellbook==='1');
 card.rows.gear=card.rows.gear.filter(row=>row.values.autoSpellbook!=='1');
 for(const book of wanted){const row=previous.find(entry=>entry.values.bookSourceId===book.id)||blankRow();row.values={...row.values,itemId:`auto:${book.id}`,item:`法术书：${book.name}`,quantity:'1',location:'携带',autoSpellbook:'1',bookSourceId:book.id,bookWeightPounds:String(book.weight)};card.rows.gear.push(row);}
 return wanted.length!==previous.length||wanted.some(book=>!previous.some(row=>row.values.bookSourceId===book.id&&Number(row.values.bookWeightPounds)===book.weight));
}
