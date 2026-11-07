import type {Spell, SourceReference} from '../schemas';
import {escapeRuleHtml as escapeHtml,spellRuleHeader} from './spell-layout';

export type DragonSpellLink = {targetId:string; note?:string};
const sourceKey=(source:SourceReference)=>JSON.stringify([source.book,source.page,source.section]);

/** Attach reviewed magazine versions without changing the book's playable rules. */
export function mergeDragonSpells(base:Spell[],magazine:Spell[],links:Record<string,DragonSpellLink>):Spell[]{
 const result:Spell[]=base.map(spell=>({...spell,source:[...spell.source],details:[...(spell.details??[])],tags:[...spell.tags]}));
 const byId=new Map(result.map(spell=>[spell.id,spell]));
 for(const version of magazine){
  const link=links[version.id];
  if(!link){result.push(version);continue;}
  const primary=byId.get(link.targetId);
  if(!primary)throw new Error(`Missing Dragon spell target: ${version.id} -> ${link.targetId}`);
  if(!primary.classes.some(id=>version.classes.includes(id)))throw new Error(`Different spell traditions: ${version.id}`);
  if(!primary.details?.length)throw new Error(`Book rules must be retained before merging ${version.id}`);
  const header=(link.note?'<p><strong>版本差异：</strong>'+escapeHtml(link.note)+'</p>':'')+spellRuleHeader(version);
  primary.details.push(...(version.details??[]).map(detail=>({...detail,title:detail.source.book+' 版本 · '+version.nameZh,html:header+detail.html})));
  for(const source of version.source)if(!primary.source.some(existing=>sourceKey(existing)===sourceKey(source)))primary.source.push(source);
  primary.tags=[...new Set([...primary.tags,'Dragon 杂志','杂志版本',...version.source.map(source=>source.book)])];
 }
 return result;
}
