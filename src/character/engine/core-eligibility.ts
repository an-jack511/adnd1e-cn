import { coreEligibilityPack as pack, coreAbilityIds, coreClassIds, coreRaceIds,
  type CoreAbilityId, type CoreAlignmentId, type CoreClassId, type CoreLevelLimit,
  type CorePredicate, type CoreRaceId } from '../rules/core-eligibility';

export type Verdict='allowed'|'forbidden'|'needs-dm';
export interface EligibilityIssue {id:string;verdict:Exclude<Verdict,'allowed'>;message:string;sourceIds:readonly string[]}
export interface CoreCandidate {
  raceId:CoreRaceId;subraceId:string|null;sex:'male'|'female';alignmentId:CoreAlignmentId;
  initialScores:Record<CoreAbilityId,number>;classIds:readonly CoreClassId[];
  mode:'single'|'multiclass';campaign:{allowedRaceIds:readonly CoreRaceId[];bardEnabled:boolean};
}
export interface CoreEligibilityResult {
  verdict:Verdict;adjustedScores:Record<CoreAbilityId,number>;issues:readonly EligibilityIssue[];
  classLevelCaps:Readonly<Record<CoreClassId,number|null|'unlimited'|'needs-dm'>>;sourceIds:readonly string[];
}
const race=(id:CoreRaceId)=>pack.races.find(r=>r.id===id)!;
const career=(id:CoreClassId)=>pack.classes.find(c=>c.id===id)!;
const issue=(id:string,verdict:EligibilityIssue['verdict'],message:string,sourceIds:readonly string[]):EligibilityIssue=>({id,verdict,message,sourceIds});
function predicate(p:CorePredicate,scores:Record<CoreAbilityId,number>,subrace:string|null):boolean|null{
  if('all'in p){const values=p.all.map(v=>predicate(v,scores,subrace));return values.includes(false)?false:values.includes(null)?null:true;}
  if('any'in p){const values=p.any.map(v=>predicate(v,scores,subrace));return values.includes(true)?true:values.includes(null)?null:false;}
  if('subraceId'in p)return subrace===null?null:p.subraceId===subrace;
  const value=scores[p.ability];return p.op==='lt'?value<p.value:p.op==='eq'?value===p.value:value>=p.value;
}
function resolveCap(limit:CoreLevelLimit,scores:Record<CoreAbilityId,number>,subrace:string|null):number|null|'unlimited'|'needs-dm'{
  if(limit.kind==='unlimited')return'unlimited';if(limit.kind==='fixed')return limit.value;
  if(limit.kind==='ineligible'||limit.kind==='unknown')return'needs-dm';
  for(const candidate of limit.cases){const match=predicate(candidate.when,scores,subrace);if(match===null)return'needs-dm';if(match)return candidate.value;}
  return limit.otherwise??'needs-dm';
}
export function evaluateCoreEligibility(candidate:CoreCandidate):CoreEligibilityResult{
  if(!coreRaceIds.includes(candidate.raceId)||!candidate.classIds.length||candidate.classIds.some(id=>!coreClassIds.includes(id)))throw new Error('Unknown core race or career.');
  if(new Set(candidate.classIds).size!==candidate.classIds.length)throw new Error('Duplicate career in candidate.');
  if((candidate.mode==='single'&&candidate.classIds.length!==1)||(candidate.mode==='multiclass'&&candidate.classIds.length<2))throw new Error('Career mode does not match career count.');
  for(const ability of coreAbilityIds){const value=candidate.initialScores[ability];if(!Number.isSafeInteger(value)||value<3||value>18)throw new Error(`Invalid initial ${ability}.`);}
  const r=race(candidate.raceId),issues:EligibilityIssue[]=[];const sourceIds=new Set<string>(r.sourceIds);
  if(!candidate.campaign.allowedRaceIds.includes(candidate.raceId))issues.push(issue('campaign-race','forbidden','本战役未启用该核心种族。',['phb-13']));
  if(r.subraceIds.length&&candidate.subraceId===null)issues.push(issue('subrace-required','needs-dm','该种族的等级上限需要先确定原书亚种。',r.sourceIds));
  if(candidate.subraceId!==null&&!r.subraceIds.includes(candidate.subraceId))issues.push(issue('subrace-unknown','forbidden','所选亚种不在核心规则包中。',r.sourceIds));
  const adjusted={} as Record<CoreAbilityId,number>;
  for(const ability of coreAbilityIds){
    const range=r.abilityRanges[ability],raw=candidate.initialScores[ability],change=r.abilityAdjustments[ability];let value=raw+change;
    range.sourceIds.forEach(id=>sourceIds.add(id));
    const maximum=candidate.sex==='male'?range.maleMax:range.femaleMax;
    if(range.pendingIds.length)issues.push(issue(`pending-range-${ability}`,'needs-dm',`${ability} 的核心原表存在未决冲突，不能自动采用一个上限。`,range.sourceIds));
    if(maximum!==null&&value>maximum)value=maximum;
    if(value<range.min){
      if(change<0)issues.push(issue(`racial-minimum-${ability}`,'needs-dm',`${ability} 经种族减值低于表列最小值；原书顺序解释尚未封口。`,range.sourceIds));
      else issues.push(issue(`racial-minimum-${ability}`,'forbidden',`${ability} 低于该种族的核心最小值 ${range.min}。`,range.sourceIds));
    }
    adjusted[ability]=value;
  }
  for(const restriction of pack.lowAbilityRestrictions){if(adjusted[restriction.ability]<=restriction.maximum&&candidate.classIds.some(id=>id!==restriction.onlyClassId))issues.push(issue(restriction.id,'forbidden',`${restriction.ability} ${restriction.maximum} 或更低时只能选择 ${career(restriction.onlyClassId).label}。`,restriction.sourceIds));}
  const selected=candidate.classIds.map(career);
  for(const c of selected){
    c.sourceIds.forEach(id=>sourceIds.add(id));
    if(c.id==='bard')issues.push(issue('bard-not-fresh','forbidden','吟游诗人不是可直接选择的一级职业，必须使用独立履历路径。',c.sourceIds));
    for(const [ability,minimum] of Object.entries(c.minimumAbilities) as [CoreAbilityId,number][]){if(adjusted[ability]<minimum)issues.push(issue(`class-min-${c.id}-${ability}`,'forbidden',`${c.label}要求 ${ability} 至少 ${minimum}。`,c.sourceIds));}
    if(!c.alignmentIds.includes(candidate.alignmentId))issues.push(issue(`alignment-${c.id}`,'forbidden',`${candidate.alignmentId} 不符合${c.label}的核心阵营限制。`,c.alignmentEvidence.sourceIds));
    const permission=r.pcClasses[c.id];if(permission===false)issues.push(issue(`race-class-${c.id}`,'forbidden',`${r.label}不能按核心表选择${c.label}。`,r.sourceIds));
    else if(permission==='needs-dm')issues.push(issue(`race-class-${c.id}`,'needs-dm',`${r.label}/${c.label}需要 DM 采用明确解释。`,r.sourceIds));
  }
  if(candidate.mode==='single'&&candidate.classIds[0]==='cleric'&&candidate.raceId!=='human')issues.push(issue('nonhuman-single-cleric','needs-dm',pack.normalSingleClassCleric.note,pack.normalSingleClassCleric.sourceIds));
  if(candidate.mode==='multiclass'){
    if(candidate.raceId==='human')issues.push(issue('human-multiclass','forbidden','核心人类不能同时多职业；先后双职是另一流程。',pack.combinationPolicy.sourceIds));
    const key=[...candidate.classIds].sort().join('|');const combination=pack.multiClassCombinations.find(x=>x.raceIds.includes(candidate.raceId)&&[...x.classIds].sort().join('|')===key);
    if(!combination)issues.push(issue('unlisted-multiclass','forbidden','该种族/职业组合不在PHB明确多职业列表中。',pack.combinationPolicy.sourceIds));
    else for(const minimum of combination.additionalMinima){if(minimum.raceId===candidate.raceId&&adjusted[minimum.ability]<minimum.min)issues.push(issue(`multi-min-${minimum.classId}-${minimum.ability}`,'forbidden',`该多职业组合要求 ${minimum.ability} 至少 ${minimum.min}。`,minimum.sourceIds));}
  }
  const caps={} as Record<CoreClassId,number|null|'unlimited'|'needs-dm'>;
  for(const c of selected){
    const racial=resolveCap(r.classLevelLimits[c.id],adjusted,candidate.subraceId),intrinsic=resolveCap(c.intrinsicLevelLimit,adjusted,candidate.subraceId);
    caps[c.id]=racial==='needs-dm'||intrinsic==='needs-dm'?'needs-dm':racial==='unlimited'?intrinsic:intrinsic==='unlimited'?racial:Math.min(racial??Infinity,intrinsic??Infinity);
    if(caps[c.id]==='needs-dm')issues.push(issue(`level-cap-${c.id}`,'needs-dm',`${c.label}等级上限含未决原书条件或冲突。`,[...r.classLevelLimits[c.id].sourceIds,...c.intrinsicLevelLimit.sourceIds]));
  }
  const verdict:Verdict=issues.some(i=>i.verdict==='forbidden')?'forbidden':issues.length?'needs-dm':'allowed';
  return{verdict,adjustedScores:adjusted,issues,classLevelCaps:caps,sourceIds:[...sourceIds].sort()};
}
