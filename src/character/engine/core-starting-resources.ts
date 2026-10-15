import { calculateCoreHpAward, type HpAwardPlan } from './core-progression';
import type { InitialCoreClassId } from '../rules/core-progression';
import { startingMoneyFamilyByClass, startingMoneyRules, type StartingMoneyRule } from '../rules/core-starting-resources';
export interface StartingMoneyPlan {readonly status:'calculated';readonly classId:InitialCoreClassId;readonly rule:StartingMoneyRule;readonly faces:readonly number[];readonly gp:number;readonly sourceIds:readonly string[]}
export interface StartingResourceReferral {readonly status:'needs-dm';readonly reason:string;readonly sourceIds:readonly string[]}
export function calculateCoreStartingMoney(input:{classIds:readonly InitialCoreClassId[];faces:readonly number[]}):StartingMoneyPlan|StartingResourceReferral{
  if(input.classIds.length!==1)return{status:'needs-dm',reason:'PHB p.35按职业族给出一组起始金钱；当前已核资料未封口多职业应采用哪一组，不能自动相加或择优。',sourceIds:['phb:35:starting-money']};
  const classId=input.classIds[0],rule=startingMoneyRules[startingMoneyFamilyByClass[classId]];
  if(input.faces.length!==rule.diceCount)throw new Error(`Expected ${rule.diceCount}d${rule.dieSides} for ${classId} starting money.`);
  for(const face of input.faces)if(!Number.isSafeInteger(face)||face<1||face>rule.dieSides)throw new Error(`Invalid d${rule.dieSides} starting-money face.`);
  const gp=input.faces.reduce((sum,face)=>sum+face,0)*rule.multiplierGp;
  if(gp<rule.minimumGp||gp>rule.maximumGp)throw new Error('Starting-money total is outside the printed range.');
  return{status:'calculated',classId,rule,faces:[...input.faces],gp,sourceIds:[...new Set([...rule.sourceIds,'phb:19:class-families'])]};
}
export function calculateSingleCareerInitialHp(input:{classIds:readonly InitialCoreClassId[];constitution:number;rolls:readonly number[]}):HpAwardPlan|StartingResourceReferral{
  if(input.classIds.length!==1)return{status:'needs-dm',reason:'并行多职业一级生命值涉及PHB p.33–34的职业分别掷骰与分配规则，不能按单职业结果直接相加。',sourceIds:['phb:33-34:multiclass-hp']};
  return calculateCoreHpAward({classId:input.classIds[0],targetLevel:1,constitution:input.constitution,rolls:input.rolls});
}

export interface MulticlassInitialHpPlan {
  readonly status:'calculated'; readonly mode:'multiclass'; readonly constitution:number;
  readonly classCount:number; readonly classAwards:readonly HpAwardPlan[];
  readonly adjustedTotal:number; readonly exactNumerator:number; readonly exactDenominator:number;
  readonly actualAward:number; readonly rounding:'fractions-below-one-half-down-otherwise-up';
  readonly sourceIds:readonly string[];
}

/** PHB p.19: roll each class's appropriate dice, total with CON adjustments, divide by class count, then round halves up. */
export function calculateCoreInitialHp(input:{classIds:readonly InitialCoreClassId[];constitution:number;rollsByClass:Readonly<Partial<Record<InitialCoreClassId,readonly number[]>>>}):HpAwardPlan|MulticlassInitialHpPlan{
  if(!input.classIds.length||input.classIds.length>3)throw new Error('Initial HP needs one to three distinct core careers.');
  if(new Set(input.classIds).size!==input.classIds.length)throw new Error('Initial HP careers must be distinct.');
  if(input.classIds.length===1)return calculateCoreHpAward({classId:input.classIds[0],targetLevel:1,constitution:input.constitution,rolls:input.rollsByClass[input.classIds[0]]??[]});
  const classAwards=input.classIds.map(classId=>calculateCoreHpAward({classId,targetLevel:1,constitution:input.constitution,rolls:input.rollsByClass[classId]??[]}));
  const adjustedTotal=classAwards.reduce((sum,plan)=>sum+plan.actualAward,0),classCount=input.classIds.length;
  const actualAward=Math.floor(adjustedTotal/classCount+0.5);
  return{status:'calculated',mode:'multiclass',constitution:input.constitution,classCount,classAwards,adjustedTotal,
    exactNumerator:adjustedTotal,exactDenominator:classCount,actualAward,rounding:'fractions-below-one-half-down-otherwise-up',
    sourceIds:[...new Set(['phb:19:multiclass-hit-points',...classAwards.flatMap(plan=>plan.sourceIds)])]};
}
