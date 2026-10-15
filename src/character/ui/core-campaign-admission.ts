import { generateCorePsionics, type PsionicGenerationInput } from '../engine/core-psionics';
import { recordCreationTask, type CoreCreation } from '../workflows/core-create';

export function renderCampaignAdmission(host:HTMLElement,read:()=>CoreCreation|null,write:(value:CoreCreation)=>void){
  host.replaceChildren();
  function label(text:string,field:HTMLElement){const node=document.createElement('label');node.textContent=text;node.append(field);return node;}
  const title=document.createElement('h2');title.textContent='战役入场与灵能';
  const campaign=document.createElement('input'),actor=document.createElement('input'),scope=document.createElement('textarea');
  const psionics=document.createElement('select');psionics.append(new Option('请选择战役设置',''),new Option('不启用 PHB 灵能','disabled'),new Option('启用 PHB 灵能','enabled'));
  const demi=document.createElement('input');demi.type='checkbox';
  const rolls:Partial<Record<keyof PsionicGenerationInput,HTMLInputElement>>={};
  const group=document.createElement('div');
  for(const [id,text] of [['potentialPercentile','潜力'],['strengthPercentile','强度'],['attackModePercentile','攻击模式数量'],['defenseModePercentile','防御模式数量'],['disciplinePercentile','学科数量']] as const){const input=document.createElement('input');input.type='number';input.min='1';input.max='100';rolls[id]=input;group.append(label(`${text} d100（00 记为 100，可留待下一步）`,input));}
  const info=document.createElement('p');info.textContent='灵能依据 PHB pp.110–111，使用未调整的 INT/WIS/CHA。生成能力数量后仍需确定具体模式与学科；当前不会把数量当成完整能力。';
  const status=document.createElement('p');status.setAttribute('role','status');
  const record=document.createElement('button');record.type='button';record.textContent='记录入场配置与灵能检查';
  host.append(title,label('战役 ID／名称 ',campaign),label('确认此设置的 DM 身份 ',actor),label('入场背景、起始地点、时间与其他约定 ',scope),label('战役灵能规则 ',psionics),label('DM 允许矮人／半身人灵能 ',demi),info,group,record,status);
  const saved=read()?.tasks.find(task=>task.id==='admission-context')?.facts;
  if(saved){campaign.value=typeof saved.campaignId==='string'?saved.campaignId:'';actor.value=typeof saved.actorId==='string'?saved.actorId:'';scope.value=typeof saved.scope==='string'?saved.scope:'';psionics.value=saved.psionicsEnabled===true?'enabled':saved.psionicsEnabled===false?'disabled':'';demi.checked=saved.demiHumanPsionics===true;}
  const psi=read()?.tasks.find(task=>task.id==='psionics')?.facts?.input;
  if(psi&&typeof psi==='object')for(const [id,field] of Object.entries(rolls)){const value=(psi as Record<string,unknown>)[id];if(typeof value==='number')field.value=String(value);}
  record.addEventListener('click',()=>{try{
    const current=read();if(!current?.candidate)throw new Error('请先完成核心身份选择。');
    if(!campaign.value.trim()||!actor.value.trim()||!scope.value.trim()||!psionics.value)throw new Error('请填写战役、DM、入场约定并选择灵能规则。');
    const candidate=current.candidate;
    const raceId=candidate.raceId==='human'||candidate.raceId==='dwarf'||candidate.raceId==='halfling'?candidate.raceId:'other';
    const input:PsionicGenerationInput={enabled:psionics.value==='enabled',raceId,demiHumanEnabledByDm:demi.checked,scores:{intelligence:current.generation.scores.INT,wisdom:current.generation.scores.WIS,charisma:current.generation.scores.CHA},...Object.fromEntries(Object.entries(rolls).filter(([,field])=>field.value.trim()).map(([id,field])=>[id,Number(field.value)]))};
    const plan=generateCorePsionics(input);
    const complete=['disabled','ineligible','no-potential'].includes(plan.status);
    let next=recordCreationTask(current,'psionics',{status:complete?'complete':'pending',sourceIds:[...plan.sourceIds],note:`灵能检查：${plan.status}${plan.status==='generated'?'；具体模式与学科尚未完成。':''}`,facts:{input,result:plan,campaignId:campaign.value.trim(),actorId:actor.value.trim()}});
    next=recordCreationTask(next,'admission-context',{status:'needs-dm',sourceIds:['project:campaign-admission-context'],note:'战役入场约定待 DM 审核。',facts:{campaignId:campaign.value.trim(),actorId:actor.value.trim(),scope:scope.value.trim(),at:new Date().toISOString(),psionicsEnabled:input.enabled,demiHumanPsionics:input.demiHumanEnabledByDm}});
    write(next);status.textContent=`入场约定已保存；灵能状态 ${plan.status}。请导出创建进度交给 DM 审核。`;
  }catch(error){status.textContent=(error as Error).message;}});
}
