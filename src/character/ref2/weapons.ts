import type {Item} from '../../schemas';
import {blankRow,type Card,type Row} from './model';
import {acceptsItem} from './item-roles';
export type WeaponMode='handHeld'|'missile';
export const isWeapon=(item:Item)=>acceptsItem(item,'weapons');
export function weaponMode(item:Item,requested?:string):WeaponMode {
 return requested==='missile'&&item.weaponCombat?.missile ? 'missile' : item.weaponCombat?.handHeld ? 'handHeld' : item.weaponCombat?.missile||/弓|弩|bow|crossbow/i.test(item.nameZh+' '+item.nameEn) ? 'missile':'handHeld';
}
/** Explicitly fill printed weapon data; personal combat adjustments remain untouched. */
export function fillWeapon(row:Row,item:Item,requested?:string,catalog:readonly Item[]=[]){
 item=weaponWithBase(item,catalog,row.values.base_weapon);
 const mode=weaponMode(item,requested),combat=item.weaponCombat?.[mode],hand=mode==='handHeld'?item.weaponCombat?.handHeld:undefined,missile=mode==='missile'?item.weaponCombat?.missile:undefined;
 const length=hand?.length??item.length??'',space=hand?.spaceRequired??item.spaceRequired??'',speed=hand?.speedFactor??(mode==='handHeld'?item.speedFactor:'')??'';
 const compact=(text:string)=>text.replace(/c\.\s*/gi,'约').replace(/\s*ft\.?/gi,'尺').replace(/\s*in\.?/gi,'寸').replace(/\s+/g,'');
 const notes=missile?`短${missile.range.short}／中${missile.range.medium}／远${missile.range.long}`:[speed&&`速${speed}`,length&&`长${compact(length)}`,space&&`宽${compact(space)}`].filter(Boolean).join('；');
 Object.assign(row.values,{name:item.id,mode,sm:item.damageSmallMedium??'',large:item.damageLarge??'',length,space,speed,attacks:missile?.fireRate??'',notes:notes||(!item.weaponCombat?'请填写基础武器型号；特殊效果见原条目':''),weaponDataSource:item.id});
 for(let ac=0;ac<=10;ac++)row.values[`ac_${ac}`]=combat?.armorClassAdjustments[ac]??'';
}
/** Change only picker-managed weapon rows, preserving existing overrides and custom rows. */
export function selectWeapons(card:Card,ids:string[],catalog:readonly Item[]){
 const known=new Map(catalog.filter(item=>isWeapon(item)).map(item=>[item.id,item]));
 const selected=new Set(ids.filter(id=>known.has(id)));
 card.rows.weapons=card.rows.weapons.filter(row=>!known.has(row.values.weaponPickerId)||selected.has(row.values.weaponPickerId));
 const existing=new Set(card.rows.weapons.map(row=>row.values.name));
 for(const id of selected)if(!existing.has(id)){
  const row=card.rows.weapons.find(row=>Object.values(row.values).every(value=>!value.trim()))??blankRow();
  fillWeapon(row,known.get(id)!,undefined,catalog);row.values.weaponPickerId=id;
  if(!card.rows.weapons.includes(row))card.rows.weapons.push(row);
 }
}

export function enhancement(item:Item){const match=item.nameEn.match(/\+(\d)(?:\s|,|$)/);return item.category==='魔法物品'&&match&&!/curs|versus|vs\.|against|slay/i.test(item.nameEn)?Number(match[1]):0;}
export function weaponWithBase(item:Item,catalog:readonly Item[],explicit=''):Item{
 if(item.weaponCombat)return item;
 const base=catalog.find(i=>i.id===explicit||explicit&&i.nameZh===explicit)??catalog.filter(i=>i.category!=='魔法物品'&&i.weaponCombat&&item.nameZh.includes(i.nameZh.replace(/与鞘$/,''))).sort((a,b)=>b.nameZh.length-a.nameZh.length)[0];
 return base?{...base,...item,weight:item.weight==='未列'?base.weight:item.weight,damageSmallMedium:item.damageSmallMedium??base.damageSmallMedium,damageLarge:item.damageLarge??base.damageLarge,weaponCombat:base.weaponCombat}:item;
}
