import type {Item} from '../../schemas';
import {blankRow,type Card} from './model';
import {cardName} from './labels';
import {acceptsItem} from './item-roles';
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
 for(const row of card.rows.gear){const item=resolveItem(catalog,row.values.itemId||row.values.item||'');if(item){owned.add(item.id);result.push({item,quantity:row.values.quantity?Math.max(0,Number(row.values.quantity)||0):1});}}
 for(const row of card.rows.weapons){const item=resolveItem(catalog,row.values.name||'');if(item&&!owned.has(item.id)){owned.add(item.id);result.push({item,quantity:1});}}
 for(const row of card.rows.ammunition){const item=resolveItem(catalog,row.values.itemId||row.values.name||'');if(item&&!owned.has(item.id)){owned.add(item.id);result.push({item,quantity:Math.max(0,(Number(row.values.count)||0)-(Number(row.values.used)||0))});}}
 return result;
}
