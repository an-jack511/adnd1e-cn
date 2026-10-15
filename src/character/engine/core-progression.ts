import { coreProgressionPack as pack, getCoreProgressionRow, type CoreClassId, type ProgressionRow } from '../rules/core-progression';
export type AdvancementStatus='not-eligible'|'eligible'|'needs-dm'|'unknown';
export interface AdvancementCheck {status:AdvancementStatus;targetLevel:number;row:ProgressionRow|null;reasons:readonly string[];sourceIds:readonly string[]}
export function checkCoreAdvancement(input:{classId:CoreClassId;currentLevel:number;xp:number;levelCap:number|'unlimited'|'needs-dm'|null}):AdvancementCheck{
  if(!Number.isSafeInteger(input.currentLevel)||input.currentLevel<0||!Number.isSafeInteger(input.xp)||input.xp<0)throw new Error('Invalid level or XP.');
  const targetLevel=input.currentLevel+1,found=getCoreProgressionRow(input.classId,targetLevel);
  if(found.status==='unknown')return{status:'unknown',targetLevel,row:null,reasons:[found.reason],sourceIds:[]};
  const row=found.row,reasons:string[]=[];
  if(input.levelCap==='needs-dm'||input.levelCap===null)reasons.push('种族/职业等级上限尚待DM解释。');
  else if(input.levelCap!=='unlimited'&&targetLevel>input.levelCap)reasons.push(`目标等级超过已采用上限 ${input.levelCap}。`);
  if(found.status==='needs-dm')reasons.push(found.reason);
  const table=input.classId==='bard'?pack.paths.bard.progression:pack.classes[input.classId as Exclude<CoreClassId,'bard'>];
  for(const gate of table.advancementGates.filter(g=>targetLevel>=g.fromLevel))reasons.push(gate.note);
  if(input.xp<row.xpMin)return{status:'not-eligible',targetLevel,row,reasons:[`还差 ${row.xpMin-input.xp} XP 才达到候升门槛。`,...reasons],sourceIds:row.citationIds};
  return{status:reasons.length?'needs-dm':'eligible',targetLevel,row,reasons,sourceIds:row.citationIds};
}
export interface HpAwardPlan {status:'calculated';classId:CoreClassId;targetLevel:number;rolls:readonly number[];adjustedDice:readonly number[];constitutionAdjustment:number;fixedHp:number;actualAward:number;sourceIds:readonly string[]}
/** Single-career or already-adopted Bard-path HP component only. Multiclass averaging is deliberately outside this function. */
export function calculateCoreHpAward(input:{classId:CoreClassId;targetLevel:number;constitution:number;rolls:readonly number[]}):HpAwardPlan{
  const found=getCoreProgressionRow(input.classId,input.targetLevel);if(found.status==='unknown')throw new Error(found.reason);
  const row=found.row;if(!Number.isSafeInteger(input.constitution)||input.constitution<3||input.constitution>18)throw new Error('CON outside verified 3–18 range.');
  if(input.rolls.length!==row.hitDiceGained)throw new Error(`Expected ${row.hitDiceGained} HP die roll(s).`);
  for(const roll of input.rolls)if(!Number.isSafeInteger(roll)||roll<1||roll>row.hitDieSides)throw new Error(`Invalid d${row.hitDieSides} HP roll.`);
  const fighter=(pack.constitution.fighterCareerIds as readonly string[]).includes(input.classId);
  const adjustment=(fighter?pack.constitution.fighterAdjustment:pack.constitution.ordinaryAdjustment)[input.constitution as keyof typeof pack.constitution.ordinaryAdjustment];
  const adjustedDice=input.rolls.map(roll=>Math.max(pack.constitution.minimumAdjustedHpPerDie,roll+adjustment));
  const actualAward=adjustedDice.reduce((a,b)=>a+b,0)+row.fixedHpGained;
  return{status:'calculated',classId:input.classId,targetLevel:input.targetLevel,rolls:[...input.rolls],adjustedDice,constitutionAdjustment:adjustment,fixedHp:row.fixedHpGained,actualAward,sourceIds:[...new Set(row.citationIds)]};
}
