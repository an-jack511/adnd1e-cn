import {attackBands,attackMatrices,savingBands,savingMatrices,opponentArmorClasses,saveLabels,combatMatrixNotes,type MatrixFamily} from '../rules/core-combat-matrices';
import type {InitialCoreClassId} from '../rules/core-progression';
const attackFamily:Record<InitialCoreClassId,MatrixFamily>={cleric:'cleric',druid:'cleric',monk:'cleric',fighter:'fighter',paladin:'fighter',ranger:'fighter','magic-user':'arcane',illusionist:'arcane',thief:'thief',assassin:'thief'};
const savingFamily:Record<InitialCoreClassId,MatrixFamily>={...attackFamily,monk:'thief'};
function band(bands:typeof attackBands,family:MatrixFamily,level:number){
  if(!Number.isSafeInteger(level)||level<1)throw new Error('This PC lookup requires an actual positive career level; zero-level NPCs and UA routes are separate.');
  const index=bands[family].findIndex(([low,high])=>level>=low&&(high===null||level<=high));
  if(index<0)throw new Error('Level outside verified matrix.');return index;
}
function family(map:Record<InitialCoreClassId,MatrixFamily>,classId:InitialCoreClassId){if(!Object.hasOwn(map,classId))throw new Error('Unsupported career or missing Bard history; do not substitute a same-named expansion class.');return map[classId];}
export function coreCombatBase(classId:InitialCoreClassId,level:number){
  const attack=family(attackFamily,classId),save=family(savingFamily,classId),a=band(attackBands,attack,level),s=band(savingBands,save,level);
  return{classId,level,attackFamily:attack,savingFamily:save,attackBand:attackBands[attack][a],savingBand:savingBands[save][s],
    attacks:opponentArmorClasses.map((ac,i)=>({ac,target:attackMatrices[attack][i][a]})),
    saves:saveLabels.map((label,i)=>({label,target:savingMatrices[save][s][i]})),sourceIds:['dmg:74:core-pc-attack-matrices','dmg:79:core-pc-saving-matrices'],notes:combatMatrixNotes};
}
export function coreAttackTarget(classId:InitialCoreClassId,level:number,ac:number){
  if(!Number.isSafeInteger(ac)||ac< -10||ac>10)throw new Error('AC is outside the printed -10..10 matrix; do not extrapolate.');
  return coreCombatBase(classId,level).attacks[ac+10].target;
}
export function printedFighterPerLevelBonus(classId:InitialCoreClassId,level:number,enabled=false){
  coreCombatBase(classId,level);if(!enabled)return 0;
  if(classId!=='fighter'||level>17)throw new Error('This optional implementation verifies fighter 1..17 only; subclass/final-band adoption needs a separate ruling.');
  return level<17&&level%2===0?1:0;
}
/** Only numeric base-table selection; does not certify career permissions or dual-class access. */
export function mostFavorableBaseSaves(tracks:readonly {classId:InitialCoreClassId;level:number}[]){
  if(!tracks.length)throw new Error('Actual career histories are required.');
  const rows=tracks.map(t=>coreCombatBase(t.classId,t.level).saves);
  return saveLabels.map((label,i)=>({label,target:Math.min(...rows.map(r=>r[i].target))}));
}
