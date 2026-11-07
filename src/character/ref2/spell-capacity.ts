import {calculateCoreSpellCapacity} from '../engine/core-spell-capacity';
import {coreClassSpellTracks, coreSpellCapacityTracks, clericWisdomAdjustments, type CoreSpellCastingClassId} from '../rules/core-spell-capacity';
import oa from '../rules/oa-spell-capacity.json';
import type {Fields} from './model';

export type CardSpellTrack = {listId:string; label:string; daily:number[]};
const labels:Record<string,string> = {cleric:'牧师',druid:'德鲁伊','magic-user':'魔法师',illusionist:'幻术师','oa-shukenja':'修贤者','oa-wu-jen':'巫人'};
const noncasters = new Set(['fighter','thief','assassin','monk','cavalier','barbarian','thief-acrobat','oa-barbarian','oa-bushi','oa-kensai','oa-monk','oa-samurai','oa-yakuza']);
const score = (fields:Fields, name:string) => /^\d+$/.test(String(fields[name]??'')) && Number(fields[name])>=3 ? Number(fields[name]) : null;

/** Capacity only: changing a level never creates or removes prepared copies. */
export function cardSpellCapacity(fields:Fields): {daily:number[]|null; tracks:CardSpellTrack[]; note:string} {
  const classId=String(fields.class??''), level=Number(fields.level);
  const unresolved=(note:string)=>({daily:null,tracks:[],note});
  if (!classId || !Number.isSafeInteger(level) || level<1) return unresolved('选择职业并填写角色等级后，自动计算每日可准备数量。');
  if (noncasters.has(classId)) return {daily:Array(10).fill(0),tracks:[],note:'此职业没有等级表授予的每日准备法术；特殊能力或战役规则可手动填写。'};
  const wisdom=score(fields,'WIS'), intelligence=score(fields,'INT');
  let tracks:CardSpellTrack[]=[], note='';
  if (Object.hasOwn(coreClassSpellTracks,classId)) {
    const id=classId as CoreSpellCastingClassId;
    for (const trackId of coreClassSpellTracks[id]) {
      const rule=coreSpellCapacityTracks[trackId];
      const row=rule.rows.find(row=>row.level===level) ?? (level>rule.rows.at(-1)!.level && rule.beyondLastRow==='explicit-maximum' ? rule.rows.at(-1) : undefined);
      if (!row && level>=rule.firstSpellUsingLevel) return unresolved('该等级超出已核对的 PHB 法术表，请勾选手动填写并核对扩展规则。');
      tracks.push({listId:rule.listId,label:labels[rule.listId],daily:row ? [...row.daily] : Array(rule.maxSpellLevel).fill(0)});
    }
    const result=calculateCoreSpellCapacity({careerId:'ref2',classId:id,level,model:id==='bard'?'bard':'single',intelligence,wisdom,bardEnabled:id==='bard'});
    if (result.status!=='needs-dm') tracks=result.tracks.map(track=>({listId:track.listId,label:labels[track.listId],daily:track.levels.map(entry=>entry.preparedCapacity)}));
    else note='当前为等级表基础数量；请补全并核对智力、感知及职业资格，以计算属性修正。';
    note=`PHB 职业等级表${id==='bard'?'（使用吟游诗人等级）':''}。${note}`;
  } else if (Object.hasOwn(oa,classId)) {
    const rule=oa[classId as keyof typeof oa], row=rule.rows.find(row=>row.level===level);
    if (!row) return unresolved('该等级超出已核对的 OA 法术表，请勾选手动填写。');
    let daily=[...row.daily];
    if (classId!=='oa-wu-jen') {
      const adjustment=wisdom===null ? undefined : clericWisdomAdjustments.find(entry=>wisdom>=entry.minWisdom && (entry.maxWisdom===null || wisdom<=entry.maxWisdom));
      daily=daily.map((base,index)=>base>0 && (wisdom===null || index<5 || wisdom>=(index===5?17:18)) ? base+(adjustment?.cumulativeBonus[index]??0) : 0);
      if (wisdom===null) note='填写感知后自动加入额外法术及高环限制。';
    }
    tracks=[{listId:classId==='oa-sohei'?'oa-shukenja':classId,label:labels[classId==='oa-sohei'?'oa-shukenja':classId],daily}];
    note=`OA 表 ${rule.source.table}，原书第 ${rule.source.printedPage} 页。${note}`;
  } else return unresolved('此职业或组合职业需要按对应资料手动填写法术数量。');
  const daily=Array(10).fill(0);
  for (const track of tracks) track.daily.forEach((count,index)=>daily[index+1]+=count);
  if (tracks.length>1) note+=' '+tracks.map(track=>`${track.label}：${track.daily.map((count,index)=>`${index+1}环 ${count}`).join('、')}`).join('；')+'。各法术表分别计算。';
  return {daily,tracks,note};
}

export function updateCardSpellSlots(fields:Fields) {
  const result=cardSpellCapacity(fields);
  if (fields.manual_spell_slots!==true) for(let level=0;level<=9;level++) fields[`spell_slots_${level}`]=result.daily ? String(result.daily[level]) : '';
  return result;
}
