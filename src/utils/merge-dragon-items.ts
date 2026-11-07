import type {Item,SourceReference} from '../schemas';
import {escapeRuleHtml} from './spell-layout';

export type DragonItemLink={targetId:string;note:string};
const sourceKey=(source:SourceReference)=>JSON.stringify([source.book,source.page,source.section]);

/** Keep the book's prices and combat data; attach reviewed variants in full. */
export function mergeDragonItems(base:Item[],magazine:Item[],links:Record<string,DragonItemLink>):Item[]{
 const result:Item[]=base.map(item=>({...item,source:[...item.source],details:[...(item.details??[])],tags:[...item.tags],aliases:[...(item.aliases??[])]}));
 const byId=new Map(result.map(item=>[item.id,item]));
 for(const version of magazine){
  const link=links[version.id];
  if(!link){result.push(version);continue;}
  const primary=byId.get(link.targetId);
  if(!primary)throw new Error(`Missing Dragon item target: ${version.id} -> ${link.targetId}`);
  if(!primary.details?.length)throw new Error(`Book rules must be retained before merging ${version.id}`);
  if(primary.category!==version.category)throw new Error(`Different item categories: ${version.id}`);
  const values=[['价格',version.price],['负重',version.weight],['经验价值',version.xpValue],['伤害 S/M',version.damageSmallMedium],['伤害 L',version.damageLarge],['速度因子',version.speedFactor]].filter((pair):pair is [string,string]=>!!pair[1]);
  const header='<p>'+escapeRuleHtml(link.note)+'</p><p>'+values.map(([label,value])=>'<strong>'+label+'：</strong>'+escapeRuleHtml(value)).join('；')+'</p>';
  primary.details.push(...(version.details??[]).map(detail=>({...detail,title:detail.source.book+' 版本 · '+version.nameZh,html:header+detail.html})));
  for(const source of version.source)if(!primary.source.some(existing=>sourceKey(existing)===sourceKey(source)))primary.source.push(source);
  primary.tags=[...new Set([...primary.tags,'Dragon 杂志','杂志版本',...version.source.map(source=>source.book)])];
  primary.aliases=[...new Set([...(primary.aliases??[]),version.nameZh,version.nameEn,...(version.aliases??[])])];
 }
 return result;
}
