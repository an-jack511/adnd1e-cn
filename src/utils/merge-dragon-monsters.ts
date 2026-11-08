import type {LibraryDetail,Monster,SourceReference} from '../schemas';
import {escapeRuleHtml as escapeHtml} from './spell-layout';

export type DragonMonsterLink={targetId:string};
export type DragonMonsterSupplement=LibraryDetail&{id:string;targetId:string};
const sourceKey=(source:SourceReference)=>JSON.stringify([source.book,source.page,source.section]);
export function monsterVersionTable(monster:Monster):string{
 const pairs=[['频率',monster.frequency],['出现数量',monster.numberAppearing],['护甲等级',monster.armorClassText??monster.armorClass??'未知'],['移动',monster.movement],['生命骰',monster.hitDice],['巢穴比例',monster.inLair],['宝藏',monster.treasureType],['攻击次数',monster.attacks],['伤害',monster.damage],['特殊攻击',monster.specialAttacks],['特殊防御',monster.specialDefenses],['魔法抗性',monster.magicResistance],['智力',monster.intelligence],['阵营',monster.alignment],['体型',monster.size],['灵能',monster.psionics],['环境',monster.environment]];
 return '<div class="table-wrap"><table class="statblock"><tbody>'+pairs.map(([label,value])=>'<tr><th scope="row">'+escapeHtml(String(label))+'</th><td>'+escapeHtml(String(value))+'</td></tr>').join('')+'</tbody></table></div>';
}

/** Attach reviewed magazine statistics and rules without changing the book version. */
export function mergeDragonMonsters(base:Monster[],magazine:Monster[],links:Record<string,DragonMonsterLink>,supplements:DragonMonsterSupplement[]=[]):Monster[]{
 const result=[...base,...magazine.filter(entry=>!links[entry.id])].map(entry=>({...entry,source:[...entry.source],details:[...(entry.details??[])],aliases:[...(entry.aliases??[])]}));
 const byId=new Map(result.map(entry=>[entry.id,entry]));
 for(const version of magazine){
  const link=links[version.id];if(!link)continue;
  const primary=byId.get(link.targetId);
  if(!primary)throw new Error(`Missing Dragon monster target: ${version.id} -> ${link.targetId}`);
  if(!version.details?.length)throw new Error(`Missing Dragon monster rules: ${version.id}`);
  primary.details.push(...version.details.map(detail=>({...detail,title:detail.source.book+' 版本 · '+version.nameZh,html:monsterVersionTable(version)+detail.html})));
  for(const source of version.source)if(!primary.source.some(existing=>sourceKey(existing)===sourceKey(source)))primary.source.push(source);
  primary.aliases=[...new Set([...primary.aliases,version.nameZh,version.nameEn,...(version.aliases??[])])];
 }
 const supplementIds=new Set<string>();
 for(const supplement of supplements){
  if(supplementIds.has(supplement.id))throw new Error(`Duplicate Dragon monster supplement: ${supplement.id}`);
  supplementIds.add(supplement.id);
  const primary=byId.get(supplement.targetId);
  if(!primary)throw new Error(`Missing Dragon monster supplement target: ${supplement.id} -> ${supplement.targetId}`);
  if(!supplement.html.trim())throw new Error(`Missing Dragon monster supplement rules: ${supplement.id}`);
  const {title,html,source,href}=supplement;
  primary.details.push({title,html,source,href});
  if(!primary.source.some(existing=>sourceKey(existing)===sourceKey(source)))primary.source.push(source);
 }
 return result;
}
