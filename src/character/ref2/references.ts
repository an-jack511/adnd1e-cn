import data from '../../data/public/card-references.json';
import {itemIndex} from '../../data/public/item-index';
import {isWeapon} from './weapons';
import {blankRow,type Card,type CollectionName} from './model';
export type Reference={id:string;kind:string;name:string;source:string;href:string;description:string;values:Record<string,string>};
export const references:Reference[]=[...data as unknown as Reference[],...itemIndex.filter(item=>item.category!=='魔法物品'&&isWeapon(item)&&!item.catalogHidden).map(item=>({id:`weapon-proficiency-${item.id}`,kind:'proficiencies',name:`${item.nameZh}（武器）`,source:item.source.map(s=>s.book).join('／'),href:`/equipment/${item.id}/`,description:'武器熟练项；专精和非熟练惩罚按职业规则另外处理。',values:{name:item.nameZh,ability:'武器',modifier:'',weaponId:item.id}}))];
export function selectReferences(card:Card,kind:CollectionName,ids:string[]){
 const known=new Map(references.filter(r=>r.kind===kind).map(r=>[r.id,r])),selected=new Set(ids.filter(id=>known.has(id)));
 card.rows[kind]=card.rows[kind].filter(row=>!known.has(row.values.referenceId)||selected.has(row.values.referenceId));
 for(const id of selected){
  if(card.rows[kind].some(row=>row.values.referenceId===id))continue;
  const record=known.get(id)!,row=card.rows[kind].find(r=>Object.values(r.values).every(v=>!v.trim()))??blankRow();
  row.values={...row.values,...Object.fromEntries(Object.entries(record.values).filter(([,v])=>typeof v==='string')) as Record<string,string>,referenceId:id,referenceSource:record.source};
  if(!card.rows[kind].includes(row))card.rows[kind].push(row);
 }
}
