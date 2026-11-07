import links from '../data/public/ua-phb-item-links.json';
import type {Item} from '../schemas';

export const uaEquipmentLinks:Readonly<Record<string,string>>=links;
export const canonicalItemId=(id:string)=>uaEquipmentLinks[id]??id;
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const listed=(value:string|undefined)=>!!value && !/^(?:\/|—|未列|见)/.test(value);

/** Reviewed identity links only; ammunition bundles and different variants stay distinct. */
export function mergeUaEquipment(catalog:Item[]):Item[] {
  const result=catalog.filter(item=>!uaEquipmentLinks[item.id]).map(item=>({...item,source:[...item.source],details:[...(item.details??[])],tags:[...item.tags],aliases:[...(item.aliases??[])]}));
  const byId=new Map(result.map(item=>[item.id,item]));
  for(const supplement of catalog.filter(item=>uaEquipmentLinks[item.id])) {
    const primary=byId.get(uaEquipmentLinks[supplement.id]);
    if (!primary) throw new Error(`Missing PHB equipment: ${supplement.id}`);
    if(primary.category!==supplement.category)throw new Error(`Equipment categories differ: ${supplement.id}`);
    const parameters=[['price','价格'],['weight','负重'],['damageSmallMedium','伤害 S/M'],['damageLarge','伤害 L'],['length','长度'],['spaceRequired','所需空间'],['speedFactor','速度因子']] as const;
    const comparison=parameters.filter(([key])=>listed(supplement[key])).map(([key,label])=>`<tr><th>${label}</th><td>${escape(primary[key]??'/')}</td><td>${escape(supplement[key]!)}</td></tr>`).join('');
    primary.details.push({title:'PHB 与 UA 合并资料',html:`<p>本条目合并两书中的同一物品。基本价格与负重采用 PHB；下表保留两书记载，UA 补充的攻击数据与说明接续列出。</p><table><thead><tr><th>参数</th><th>PHB</th><th>UA</th></tr></thead><tbody>${comparison}</tbody></table>`,source:supplement.source.find(source=>source.book==='UA')!,href:'/books/ua/ua-weapons/'});
    primary.details.push(...(supplement.details??[]));
    for(const [key] of parameters) {
      const value=supplement[key];
      if(!listed(primary[key]) && typeof value==='string' && listed(value)) primary[key]=value;
    }
    primary.weaponCombat={...primary.weaponCombat,...supplement.weaponCombat};
    primary.description=[primary.description,supplement.description].filter((value,index,values)=>values.indexOf(value)===index).join(' ');
    primary.source.push(...supplement.source.filter(source=>!primary.source.some(other=>JSON.stringify(other)===JSON.stringify(source))));
    primary.tags=[...new Set([...primary.tags,...supplement.tags])];
    primary.aliases=[...new Set([...primary.aliases,supplement.nameZh,supplement.nameEn,...(supplement.aliases??[])])];
  }
  return result;
}
