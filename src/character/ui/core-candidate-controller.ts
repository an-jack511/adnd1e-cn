import { readLibrary } from '../creation/storage';
import { coreAbilityIds, coreEligibilityPack as pack, coreAlignmentIds } from '../rules/core-eligibility';
import { evaluateCoreEligibility, type CoreCandidate } from '../engine/core-eligibility';
import { newCoreCreation, recordCreationTask, selectCoreCandidate } from '../workflows/core-create';
import { calculateCoreInitialHp, calculateCoreStartingMoney } from '../engine/core-starting-resources';
import { getCoreProgressionRow, type InitialCoreClassId } from '../rules/core-progression';
import { startingMoneyFamilyByClass, startingMoneyRules } from '../rules/core-starting-resources';
import { planCoreLanguages, type LanguageSelectionInput } from '../engine/core-languages';
import type { CoreAlignmentId as LanguageAlignmentId, CoreLanguageCareerId, CoreRaceId as LanguageRaceId } from '../rules/core-languages';
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
export function startCoreCandidate(){
  const draftSelect=get<HTMLSelectElement>('core-draft'),raceSelect=get<HTMLSelectElement>('core-race'),subrace=get<HTMLSelectElement>('core-subrace');
  const status=get('core-status'),results=get('core-results'),issues=get('core-issues'),classes=get('core-classes');
  const resources=get<HTMLElement>('core-resources'),hpHelp=get('core-hp-help'),moneyHelp=get('core-money-help'),resourceStatus=get('core-resource-status');
  const languages=get<HTMLElement>('core-languages'),languageAutomatic=get('core-language-automatic'),languageSlots=get('core-language-slots'),languageStatus=get('core-language-status');
  let evaluated:ReturnType<typeof selectCoreCandidate>|null=null;
  function message(value:string,error=false){status.textContent=value;status.dataset.error=String(error);}
  let drafts:ReturnType<typeof readLibrary>=[];
  try{drafts=readLibrary(localStorage).filter(d=>d.scores!==null&&d.activeBatch!==null);draftSelect.replaceChildren(new Option('选择已确认属性草稿',''),...drafts.map(d=>new Option(`${d.name||'未命名'} · ${Object.values(d.scores!).join('/')}`,d.id)));}
  catch(e){message((e as Error).message,true);}
  raceSelect.replaceChildren(...pack.races.map(r=>new Option(r.label,r.id)));
  get<HTMLSelectElement>('core-alignment').replaceChildren(...coreAlignmentIds.map(id=>new Option(id,id)));
  for(const c of pack.classes.filter(c=>c.id!=='bard')){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=c.id;input.name='core-class';label.append(input,document.createTextNode(' '+c.label));classes.append(label);}
  function renderSubraces(){const r=pack.races.find(x=>x.id===raceSelect.value)!;subrace.replaceChildren(new Option(r.subraceIds.length?'请选择原书亚种':'不适用',''),...r.subraceIds.map(id=>new Option(id,id)));subrace.disabled=!r.subraceIds.length;}
  raceSelect.addEventListener('change',renderSubraces);renderSubraces();
  function invalidate(){evaluated=null;get<HTMLButtonElement>('core-export').disabled=true;resources.hidden=true;languages.hidden=true;resourceStatus.textContent='先完成核心资格检查。';}
  for(const element of document.querySelectorAll('#core-draft,#core-race,#core-subrace,#core-sex,#core-alignment,#core-mode,input[name=core-class]'))element.addEventListener('change',invalidate);
  function randomFaces(count:number,sides:number){const values:number[]=[];while(values.length<count){const raw=new Uint32Array(1);crypto.getRandomValues(raw);const ceiling=Math.floor(0x100000000/sides)*sides;if(raw[0]<ceiling)values.push(raw[0]%sides+1);}return values;}
  function parseFaces(id:string,count:number,sides:number){const field=get<HTMLInputElement>(id),manual=get<HTMLSelectElement>(id+'-mode').value==='manual';const values=manual?field.value.split(/[，,\s]+/).filter(Boolean).map(Number):randomFaces(count,sides);if(values.length!==count||values.some(v=>!Number.isSafeInteger(v)||v<1||v>sides))throw new Error(`需要 ${count} 个 1–${sides} 的骰面结果。`);field.value=values.join(', ');return{values,method:manual?'physical-or-external':'browser-crypto'};}
  function parseHpFaces(classId:InitialCoreClassId,count:number,sides:number){const field=get<HTMLInputElement>(`core-hp-faces-${classId}`),manual=get<HTMLSelectElement>('core-hp-faces-mode').value==='manual';const values=manual?field.value.split(/[，,\s]+/).filter(Boolean).map(Number):randomFaces(count,sides);if(values.length!==count||values.some(v=>!Number.isSafeInteger(v)||v<1||v>sides))throw new Error(`${classId} 需要 ${count} 个 1–${sides} 的骰面结果。`);field.value=values.join(', ');return{values,method:manual?'physical-or-external':'browser-crypto'};}
  function renderResourcePlan(){
    if(!evaluated?.candidate)return;const ids=evaluated.candidate.classIds as InitialCoreClassId[];
    resources.hidden=false;
    const rollFields=get('core-hp-class-rolls');rollFields.replaceChildren();
    const descriptions:string[]=[];for(const id of ids){const row=getCoreProgressionRow(id,1);if(row.status==='unknown')continue;descriptions.push(`${id} ${row.row.hitDiceGained}d${row.row.hitDieSides}`);const label=document.createElement('label');label.textContent=`${id} 骰面（逗号分隔）`;const input=document.createElement('input');input.id=`core-hp-faces-${id}`;input.inputMode='numeric';label.append(input);rollFields.append(label);}
    hpHelp.textContent=`${descriptions.join('；')}。各职业分别掷适用生命骰并逐骰应用该职业体质修正；合计后除以 ${ids.length}，不足半点舍、半点以上进。`;
    if(ids.length!==1){moneyHelp.textContent='多职业起始金钱在当前已核资料中未封口，系统不会相加或择优。';return;}
    const id=ids[0],money=startingMoneyRules[startingMoneyFamilyByClass[id]];moneyHelp.textContent=`${id}：${money.diceCount}d${money.dieSides}${money.multiplierGp===1?'':' × '+money.multiplierGp} gp（PHB p.35）。`;
  }
  const alignmentMap:Record<string,LanguageAlignmentId>={LG:'lawful-good',NG:'neutral-good',CG:'chaotic-good',LN:'lawful-neutral',TN:'true-neutral',CN:'chaotic-neutral',LE:'lawful-evil',NE:'neutral-evil',CE:'chaotic-evil'};
  function currentLanguagePlan(selections:readonly LanguageSelectionInput[]=[]){if(!evaluated?.candidate)throw new Error('请先检查核心资格。');const result=evaluated.evaluation as ReturnType<typeof evaluateCoreEligibility>;return planCoreLanguages({raceId:evaluated.candidate.raceId as LanguageRaceId,alignmentId:alignmentMap[evaluated.candidate.alignmentId],intelligence:result.adjustedScores.INT,careers:evaluated.candidate.classIds.map(classId=>({classId:classId as CoreLanguageCareerId,level:1})),selections});}
  function renderLanguagePlan(){const plan=currentLanguagePlan();languages.hidden=false;languageAutomatic.textContent=`自动语言：${plan.automaticLanguages.map(item=>item.languageId).join('、')||'无'}${plan.automaticCommunications.length?`；特殊交流：${plan.automaticCommunications.join('、')}`:''}。普通语言学习期：${plan.ordinaryStudyMonths}个月。`;languageSlots.replaceChildren();for(const entitlement of plan.entitlements)for(let index=0;index<entitlement.count;index++){const wrap=document.createElement('div');wrap.dataset.entitlement=entitlement.entitlementId;const label=document.createElement('label');label.textContent=`${entitlement.kind} ${index+1}/${entitlement.count}`;let field:HTMLInputElement|HTMLSelectElement;if(entitlement.allowedLanguageIds){field=document.createElement('select');field.append(new Option('请选择',''),...entitlement.allowedLanguageIds.map(id=>new Option(id,id)));}else{field=document.createElement('input');field.placeholder='由 DM 许可的稳定语言 ID';}field.className='core-language-choice';label.append(field);wrap.append(label);if(entitlement.requiresDmApproval){const approve=document.createElement('label');approve.textContent='DM 已确认战役可用及取得方式';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='core-language-approved';approve.prepend(checkbox);wrap.append(approve);}languageSlots.append(wrap);}languageStatus.textContent=plan.entitlements.length?'请填满需要的语言位；不确定的选择可保留为需 DM。':'没有额外语言位，仍会记录自动语言。';}
  get('core-evaluate').addEventListener('click',()=>{
    try{
      const draft=drafts.find(d=>d.id===draftSelect.value);if(!draft?.scores||!draft.activeBatch)throw new Error('请先选择已确认六项属性的草稿。');
      const classIds=Array.from(document.querySelectorAll<HTMLInputElement>('input[name=core-class]:checked')).map(x=>x.value) as CoreCandidate['classIds'];
      const mode=get<HTMLSelectElement>('core-mode').value as CoreCandidate['mode'];
      const initialScores=draft.scores as unknown as CoreCandidate['initialScores'];
      const candidate:CoreCandidate={raceId:raceSelect.value as CoreCandidate['raceId'],subraceId:subrace.value||null,sex:get<HTMLSelectElement>('core-sex').value as CoreCandidate['sex'],alignmentId:get<HTMLSelectElement>('core-alignment').value as CoreCandidate['alignmentId'],initialScores,classIds,mode,campaign:{allowedRaceIds:pack.races.map(r=>r.id),bardEnabled:false}};
      const result=evaluateCoreEligibility(candidate);
      let creation=newCoreCreation({name:draft.name,generation:{draftId:draft.id,draftRevision:draft.revision,batchId:draft.activeBatch.id,method:draft.activeBatch.method,scores:initialScores}});evaluated=selectCoreCandidate(creation,candidate);
      results.replaceChildren();for(const id of coreAbilityIds){const item=document.createElement('div');item.textContent=`${id} ${draft.scores[id]} → ${result.adjustedScores[id]}`;results.append(item);}
      issues.replaceChildren();
      if(!result.issues.length){const li=document.createElement('li');li.textContent='核心资格检查没有发现阻断项；仍须完成HP、金钱、装备、语言、熟练和法术等创建任务。';issues.append(li);}
      for(const item of result.issues){const li=document.createElement('li');const refs=item.sourceIds.map(id=>{const s=pack.sources.find(x=>x.id===id);return s?`${s.book} p.${s.printedPage}`:id;}).join('、');li.textContent=`${item.verdict==='forbidden'?'禁止':'需DM'}：${item.message}（${refs}）`;issues.append(li);}
      const caps=Object.entries(result.classLevelCaps).map(([id,value])=>`${id}: ${value==='unlimited'?'不限':value==='needs-dm'?'待DM':value}`).join('；');
      message(`${result.verdict==='allowed'?'核心资格允许':result.verdict==='forbidden'?'核心资格不合法':'核心资格需要DM裁定'}。等级上限：${caps}` ,result.verdict==='forbidden');
      get<HTMLButtonElement>('core-export').disabled=false;
      if(result.verdict!=='forbidden'){renderResourcePlan();renderLanguagePlan();}else{resources.hidden=true;languages.hidden=true;}
    }catch(e){evaluated=null;results.replaceChildren();issues.replaceChildren();get<HTMLButtonElement>('core-export').disabled=true;message((e as Error).message,true);}
  });
  get('core-hp-record').addEventListener('click',()=>{
    try{if(!evaluated?.candidate)throw new Error('请先检查核心资格。');const ids=evaluated.candidate.classIds as InitialCoreClassId[];
      const rollsByClass:Partial<Record<InitialCoreClassId,number[]>>={},methods:Record<string,string>={};for(const id of ids){const row=getCoreProgressionRow(id,1);if(row.status==='unknown')throw new Error(row.reason);const roll=parseHpFaces(id,row.row.hitDiceGained,row.row.hitDieSides);rollsByClass[id]=roll.values;methods[id]=roll.method;}
      const con=(evaluated.evaluation as ReturnType<typeof evaluateCoreEligibility>).adjustedScores.CON,plan=calculateCoreInitialHp({classIds:ids,constitution:con,rollsByClass});
      evaluated=recordCreationTask(evaluated,'hp',{status:'complete',sourceIds:[...plan.sourceIds],note:`一级生命值 ${plan.actualAward}`,facts:{...plan,rollMethods:methods}});resourceStatus.textContent=`已记录 HP ${plan.actualAward}；${ids.map(id=>`${id}: ${(rollsByClass[id]??[]).join(', ')}`).join('；')}。`;
    }catch(e){resourceStatus.textContent=(e as Error).message;}
  });
  get('core-money-record').addEventListener('click',()=>{
    try{if(!evaluated?.candidate)throw new Error('请先检查核心资格。');const ids=evaluated.candidate.classIds as InitialCoreClassId[];
      if(ids.length!==1){const plan=calculateCoreStartingMoney({classIds:ids,faces:[]});if(plan.status!=='needs-dm')throw new Error('Unexpected multi-class money plan.');evaluated=recordCreationTask(evaluated,'money',{status:'needs-dm',sourceIds:[...plan.sourceIds],note:plan.reason,facts:{reason:plan.reason}});resourceStatus.textContent='起始金钱已记录为需要DM处理；没有相加或择优。';return;}
      const rule=startingMoneyRules[startingMoneyFamilyByClass[ids[0]]],roll=parseFaces('core-money-faces',rule.diceCount,rule.dieSides),plan=calculateCoreStartingMoney({classIds:ids,faces:roll.values});if(plan.status!=='calculated')throw new Error(plan.reason);
      evaluated=recordCreationTask(evaluated,'money',{status:'complete',sourceIds:[...plan.sourceIds],note:`起始金钱 ${plan.gp} gp`,facts:{...plan,rollMethod:roll.method}});resourceStatus.textContent=`已记录 ${plan.gp} gp；原始骰面 ${plan.faces.join(', ')}。`;
    }catch(e){resourceStatus.textContent=(e as Error).message;}
  });
  get('core-language-record').addEventListener('click',()=>{try{if(!evaluated?.candidate)throw new Error('请先检查核心资格。');const selections:LanguageSelectionInput[]=[];for(const wrap of languageSlots.querySelectorAll<HTMLElement>('[data-entitlement]')){const field=wrap.querySelector<HTMLInputElement|HTMLSelectElement>('.core-language-choice')!,languageId=field.value.trim();if(!languageId)continue;const entitlementId=wrap.dataset.entitlement!,approved=wrap.querySelector<HTMLInputElement>('.core-language-approved')?.checked??true;selections.push({entitlementId,languageId,dmApproved:approved,acquisition:entitlementId==='intelligence-extra'?'pre-existing-at-creation':'class-level-grant'});}const plan=currentLanguagePlan(selections);if(plan.selections.some(item=>item.status==='invalid'))throw new Error(plan.selections.find(item=>item.status==='invalid')!.reason??'语言选择无效。');const open=Object.values(plan.openSlots).reduce((sum,value)=>sum+value,0),needsDm=plan.selections.some(item=>item.status==='needs-dm'),taskStatus=needsDm?'needs-dm':open?'pending':'complete';evaluated=recordCreationTask(evaluated,'languages',{status:taskStatus,sourceIds:[...plan.sourceIds],note:needsDm?'语言选择等待 DM 批准。':open?`仍有 ${open} 个语言位未填写。`:'语言计划已完整记录。',facts:{...plan}});languageStatus.textContent=needsDm?'已保存；至少一项等待 DM 批准。':open?`已保存；仍有 ${open} 个语言位未填写。`:'语言计划已记录完成。';}catch(error){languageStatus.textContent=(error as Error).message;}});
  get('core-export').addEventListener('click',()=>{
    if(!evaluated)return;const blob=new Blob([JSON.stringify(evaluated,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(evaluated.name||'adnd1e-core-creation').replace(/[\\/:*?"<>|]/g,'_')+'.adnd1e-core-creation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);message('已请求下载核心创建进度文件；它不是完整人物档案或入场许可。');
  });
}
