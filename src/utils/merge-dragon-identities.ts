import type {ClassEntry,RaceEntry,SourceReference} from '../schemas';
import {escapeRuleHtml as escapeHtml} from './spell-layout';

export type DragonIdentityLink={targetId:string;note:string};
type Identity=ClassEntry|RaceEntry;
const sourceKey=(source:SourceReference)=>JSON.stringify([source.book,source.page,source.section]);
const raceNames:Record<string,string>={human:'人类',elf:'精灵','half-elf':'半精灵',dwarf:'矮人',gnome:'侏儒',halfling:'半身人','half-orc':'半兽人'};

function versionParameters(entry:Identity):string{
 const pairs:[string,string][] = 'primeRequisite' in entry
  ? [['最低属性',Object.entries(entry.minimumAbilities).map(([key,value])=>`${key} ${value}`).join('、')||'见本版正文'],['主属性',entry.primeRequisite],['生命骰',entry.hitDie],['阵营',entry.alignment],['护甲',entry.armor],['武器',entry.weapons],['施法',entry.spellcasting],['适用种族',entry.eligibleRaces.map(id=>raceNames[id]??id).join('、')]]
  : [['属性调整／范围',entry.modifiers],['职业限制',entry.restrictions],['等级上限',entry.levelLimits],['语言',entry.languages],['移动',entry.movement],['豁免',entry.savingThrows],['侦察',entry.detection],['多职业',entry.multiclass.join('、')||'见本版正文']];
 return '<div class="table-wrap"><table class="data-table compact"><tbody>'+pairs.map(([label,value])=>'<tr><th>'+escapeHtml(label)+'</th><td>'+escapeHtml(value)+'</td></tr>').join('')+'</tbody></table></div>';
}

/** Reviewed revisions share an identity, but never overwrite its playable book rules. */
export function mergeDragonIdentities<T extends Identity>(base:T[],magazine:T[],links:Record<string,DragonIdentityLink>):T[]{
 const clone=(entry:T):T=>({...entry,source:[...entry.source],details:[...(entry.details??[])],aliases:[...(entry.aliases??[])]});
 const result=[...base,...magazine.filter(entry=>!links[entry.id])].map(clone);
 const byId=new Map(result.map(entry=>[entry.id,entry]));
 for(const version of magazine){
  const link=links[version.id];if(!link)continue;
  const primary=byId.get(link.targetId);
  if(!primary)throw new Error(`Missing Dragon identity target: ${version.id} -> ${link.targetId}`);
  if(('primeRequisite' in primary)!==('primeRequisite' in version))throw new Error(`Different identity kinds: ${version.id}`);
  if(!primary.details?.length||!version.details?.length)throw new Error(`Source rules required: ${version.id}`);
  const header='<p>'+escapeHtml(link.note)+'</p>'+versionParameters(version);
  primary.details.push(...version.details.map(detail=>({...detail,title:detail.source.book+' 版本 · '+version.nameZh,html:header+detail.html})));
  for(const source of version.source)if(!primary.source.some(existing=>sourceKey(existing)===sourceKey(source)))primary.source.push(source);
  primary.aliases=[...new Set([...(primary.aliases??[]),version.nameZh,version.nameEn,...(version.aliases??[])])];
 }
 return result;
}
