import names from '../data/terminology/names.json';

type Category = 'spell'|'item'|'monster'|'class'|'race'|'proper';
const normalize=(name:string)=>name.normalize('NFKC').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').trim().replace(/\s+/g,' ').toLowerCase();
const byName=new Map(names.map(entry=>[`${entry.category}:${normalize(entry.en)}`,entry]));
export function nameAliases(category:Category,nameEn:string):string[] {
  return byName.get(`${category}:${normalize(nameEn)}`)?.aliases??[];
}
export function canonicalName(category:Category,nameEn:string,current:string):string {
  const row=byName.get(`${category}:${normalize(nameEn)}`);
  return row&&(row.status.startsWith('verified')||row.status.startsWith('adapted'))?row.zh:current;
}
export function findNamedEntry<T extends {id:string;nameZh:string;nameEn:string}>(catalog:readonly T[],category:Category,value:string):T|undefined {
  const direct=catalog.find(entry=>entry.id===value||entry.nameZh===value||normalize(entry.nameEn)===normalize(value));
  if(direct)return direct;
  const candidates=catalog.filter(entry=>nameAliases(category,entry.nameEn).includes(value));
  return candidates.length===1?candidates[0]:undefined;
}
/** Refresh only catalog-owned labels; handwritten labels and unknown IDs survive. */
export function currentItemLabel(item:{nameZh:string;nameEn:string},value:string):string {
  return value===item.nameZh||nameAliases('item',item.nameEn).includes(value)?item.nameZh:value;
}

/** Modernize bilingual citation captions without changing stored source evidence. */
export function sourceSectionLabel(value:string):string {
  const english=normalize(value);
  const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  let result=value;
  for(const row of names){
    if(!row.status.startsWith('verified')&&!row.status.startsWith('adapted'))continue;
    if(!new RegExp(`(?<![a-z])${escape(normalize(row.en))}(?![a-z])`).test(english))continue;
    for(const alias of [...row.aliases].sort((a,b)=>b.length-a.length)){
      result=result.replace(new RegExp(`(?<![\\u3400-\\u9fff])${escape(alias)}(?![\\u3400-\\u9fff])`,'g'),row.zh);
    }
  }
  return result;
}
