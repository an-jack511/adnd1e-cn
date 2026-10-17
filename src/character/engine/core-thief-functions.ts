import {coreThiefDexterityAdjustments,coreThiefFunctionLabels,coreThiefFunctionRows,coreThiefFunctionSourceIds,coreThiefRacialAdjustments,type CoreThiefFunctionId,type CoreThiefRaceId} from '../rules/core-thief-functions';

export type CoreThiefFunctionClass='thief'|'assassin'|'monk';
export interface CoreThiefFunctionView {id:CoreThiefFunctionId;label:string;base:number|null;dexterityAdjustment:number;racialAdjustment:number;target:number|null;available:boolean;note:string;sourceIds:readonly string[]}

function rowAt(level:number){
  if(!Number.isSafeInteger(level)||level<1||level>17)throw new Error('盗贼技能表目前只核验到1–17级。');
  return coreThiefFunctionRows[level-1];
}

/** Resolve the effective thief-function column without rolling or revealing a result. */
export function coreThiefFunctions(input:{classId:CoreThiefFunctionClass;level:number;raceId:CoreThiefRaceId;dexterity:number}):readonly CoreThiefFunctionView[]{
  const functionLevel=input.classId==='assassin'?(input.level>=3?input.level-2:null):input.level;
  if(input.classId==='monk'&&input.level<1)throw new Error('武僧等级必须为正整数。');
  if(!Number.isSafeInteger(input.dexterity)||input.dexterity<9||input.dexterity>18)throw new Error('盗贼技能调整只核验了DEX 9–18。');
  if(functionLevel===null)return Object.freeze((Object.keys(coreThiefFunctionLabels) as CoreThiefFunctionId[]).map(id=>({id,label:coreThiefFunctionLabels[id],base:null,dexterityAdjustment:0,racialAdjustment:0,target:null,available:false,note:'刺客1–2级尚无对应盗贼技能等级。',sourceIds:coreThiefFunctionSourceIds})));
  const row=rowAt(functionLevel),dex=coreThiefDexterityAdjustments[input.dexterity]??{},race=coreThiefRacialAdjustments[input.raceId];
  return Object.freeze((Object.keys(coreThiefFunctionLabels) as CoreThiefFunctionId[]).map(id=>{
    const base=row[id], dexterityAdjustment=dex[id]??0, racialAdjustment=race[id]??0, available=!(input.classId==='monk'&&id==='pick-pockets');
    return Object.freeze({id,label:coreThiefFunctionLabels[id],base,dexterityAdjustment,racialAdjustment,target:available&&base!==null?base+dexterityAdjustment+racialAdjustment:null,available,note:available?'掷百分骰；结果不高于当前目标百分比即成功。具体情境、目标修正与暗骰由DM处理。':'武僧不获得扒窃能力。',sourceIds:coreThiefFunctionSourceIds});
  }));
}

export function coreBackstabView(level:number){
  if(!Number.isSafeInteger(level)||level<1||level>17)throw new Error('背后偷袭倍数目前只核验到1–17级。');
  return Object.freeze({multiplier:Math.floor((level-1)/4)+2,attackBonus:4,sourceIds:['phb:26-27:thief-functions'] as const});
}
