import { coreDivineFirstLevelChoices } from '../rules/core-divine-first-level';
import { calculateCoreSpellCapacity, preparedCapacityByLevel } from '../engine/core-spell-capacity';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { recordCoreDivineCreation } from '../workflows/core-divine-creation';
import type { CoreCreation } from '../workflows/core-create';

export function renderDivineInitialSpells(host:HTMLElement,read:()=>CoreCreation|null,write:(value:CoreCreation)=>void){
  const doc=read();if(!doc?.candidate||doc.candidate.classIds.length!==1)return;
  const classId=doc.candidate.classIds[0];if(classId!=='cleric'&&classId!=='druid')return;
  const scores=evaluateCoreEligibility(doc.candidate).adjustedScores,capacity=calculateCoreSpellCapacity({careerId:classId,classId,level:1,model:'single',intelligence:scores.INT,wisdom:scores.WIS});
  const limits=preparedCapacityByLevel(capacity,classId),choices=coreDivineFirstLevelChoices(classId),fields:HTMLSelectElement[]=[];
  const info=document.createElement('p');info.textContent=`一环准备容量 ${limits[1]??0}；法术表 PHB p.${classId==='cleric'?40:41}。神术不进行 Chance to Know。每一位是独立副本，可重复准备同一法术。`;host.append(info);
  function label(text:string,input:HTMLElement){const node=document.createElement('label');node.textContent=text;node.append(input);return node;}
  const mode=document.createElement('select');
  mode.append(new Option('记录本次实际授予并准备','granted'),new Option('记录本次未授予／暂不准备','none'));
  host.append(label('开局神术处理',mode));
  for(let index=0;index<(limits[1]??0);index++){const select=document.createElement('select');select.append(new Option('不使用此准备位',''),...choices.map(spell=>new Option(spell.displayName,spell.definitionId)));fields.push(select);host.append(label(`一环副本 ${index+1}`,select));}
  function number(text:string){const input=document.createElement('input');input.type='number';input.min='0';host.append(label(text,input));return input;}
  const rest=number('实际休息小时'),prayer=number('实际祈祷分钟');
  rest.step='any';
  const at=document.createElement('input');at.value='待战役确认';
  const approved=document.createElement('input');approved.type='checkbox';
  const approvedText=document.createElement('span');
  const button=document.createElement('button');button.type='button';button.textContent='检查神术授予与准备';const status=document.createElement('p');status.setAttribute('role','status');host.append(button,status);
  const task=doc.tasks.find(item=>item.id==='initial-spells'),saved=task?.facts?.ledger;
  if(saved&&typeof saved==='object'){
    const ledger=saved as {divineGrants?:{grantedSpell?:{definitionId?:string}|null;status?:string}[];recoverySessions?:{actualRestMinutes?:number;actualRestHours?:number;actualStudyOrPrayerMinutes?:number;completedAt?:string|null}[]};
    if(Array.isArray(ledger.divineGrants)){
      const grants=ledger.divineGrants.filter(grant=>grant.status==='granted');
      if(task?.facts?.preparedNone===true||grants.length===0)mode.value='none';
      grants.forEach((grant,index)=>{if(fields[index]&&typeof grant.grantedSpell?.definitionId==='string')fields[index].value=grant.grantedSpell.definitionId;});
    }
    const session=Array.isArray(ledger.recoverySessions)?ledger.recoverySessions.at(-1):undefined;
    if(session){if(typeof session.actualRestMinutes==='number')rest.value=String(session.actualRestMinutes/60);else if(typeof session.actualRestHours==='number')rest.value=String(session.actualRestHours);if(typeof session.actualStudyOrPrayerMinutes==='number')prayer.value=String(session.actualStudyOrPrayerMinutes);if(typeof session.completedAt==='string')at.value=session.completedAt;}
    status.textContent=task?.note??'';
  }
  const refreshMode=()=>{
    const none=mode.value==='none';
    fields.forEach(field=>{field.disabled=none;if(none)field.value='';});
    rest.disabled=none;prayer.disabled=none;
    approvedText.textContent=none?'待战役确认本次未授予／暂不准备':'待战役确认本战役允许本次实际授予';
    if(none){rest.value='0';prayer.value='0';button.textContent='记录未授予／暂不准备';}
    else{button.textContent='检查神术授予与准备';}
  };
  mode.addEventListener('change',refreshMode);refreshMode();
  button.addEventListener('click',()=>{try{
    const current=read();if(!current)throw new Error('角色已失效。');
    if(mode.value!=='none'&&(!rest.value.trim()||!prayer.value.trim()))throw new Error('请记录实际休息、祈祷时间和完成时点。');
    const id=crypto.randomUUID();
    const grants=mode.value==='none'?[]:fields.filter(field=>field.value).map((field,index)=>{const spell=choices.find(item=>item.definitionId===field.value);if(!spell)throw new Error('法术不在已核一环表中。');return {id:`${id}:grant:${index}`,tradition:classId,requestedSpell:spell,grantedSpell:spell,authority:'dm-adjudicated' as const,status:'granted' as const,publicMessage:'开局实际授予，待创建审核确认',private:{trueAuthorityId:null,reason:'',dmNotes:[]}};});
    if(mode.value!=='none'&&!grants.length)throw new Error('请至少选择一个实际授予的神术；若本次没有授予，请切换为“未授予／暂不准备”。');
    const result=recordCoreDivineCreation(current,{grants,restHours:Number(rest.value),prayerMinutes:Number(prayer.value),completedAt:at.value.trim(),sessionId:id});write(result.document);status.textContent=result.document.tasks.find(task=>task.id==='initial-spells')!.note;
  }catch(error){status.textContent=(error as Error).message;}});
}
