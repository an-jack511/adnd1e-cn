import type {Item} from '../../schemas';
import {blankRow,type Card,type Row} from './model';
export type WeaponMode='handHeld'|'missile';
export const isWeapon=(item:Item)=>item.category==='武器'||item.subCategory==='武器';
export function weaponMode(item:Item,requested?:string):WeaponMode {
 return requested==='missile'&&item.weaponCombat?.missile ? 'missile' : item.weaponCombat?.handHeld ? 'handHeld' : item.weaponCombat?.missile ? 'missile':'handHeld';
}
/** Explicitly fill printed weapon data; personal combat adjustments remain untouched. */
export function fillWeapon(row:Row,item:Item,requested?:string){
 const mode=weaponMode(item,requested),combat=item.weaponCombat?.[mode],hand=mode==='handHeld'?item.weaponCombat?.handHeld:undefined,missile=mode==='missile'?item.weaponCombat?.missile:undefined;
 const length=hand?.length??item.length??'',space=hand?.spaceRequired??item.spaceRequired??'',speed=hand?.speedFactor??(mode==='handHeld'?item.speedFactor:'')??'';
 const notes=missile?`短 ${missile.range.short}／中 ${missile.range.medium}／远 ${missile.range.long}`:[speed&&`速度 ${speed}`,length&&`长 ${length}`,space&&`空间 ${space}`].filter(Boolean).join('；');
 Object.assign(row.values,{name:item.id,mode,sm:item.damageSmallMedium??'',large:item.damageLarge??'',length,space,speed,attacks:missile?.fireRate??'',notes,weaponDataSource:item.id});
 for(let ac=0;ac<=10;ac++)row.values[`ac_${ac}`]=combat?.armorClassAdjustments[ac]??'';
}
/** Change only picker-managed weapon rows, preserving existing overrides and custom rows. */
export function selectWeapons(card:Card,ids:string[],catalog:readonly Item[]){
 const known=new Map(catalog.filter(isWeapon).map(item=>[item.id,item]));
 const selected=new Set(ids.filter(id=>known.has(id)));
 card.rows.weapons=card.rows.weapons.filter(row=>!known.has(row.values.weaponPickerId)||selected.has(row.values.weaponPickerId));
 const existing=new Set(card.rows.weapons.map(row=>row.values.name));
 for(const id of selected)if(!existing.has(id)){
  const row=card.rows.weapons.find(row=>Object.values(row.values).every(value=>!value.trim()))??blankRow();
  fillWeapon(row,known.get(id)!);row.values.weaponPickerId=id;
  if(!card.rows.weapons.includes(row))card.rows.weapons.push(row);
 }
}
