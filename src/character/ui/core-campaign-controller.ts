import { commitCoreCampaignAction, type CoreCampaignArchive } from '../workflows/core-campaign-runtime';
import { migrateCoreCampaignImport } from '../interchange/core-campaign-migrations';
import type { PerformanceRating } from '../rules/core-training';
import { planBelowNameTraining, planNameLevelTraining } from '../engine/core-training';
import type { CoreAdvancementState } from '../workflows/core-advancement';
import type { CoinCounts, CoreInventoryLedger } from '../engine/core-inventory';
import { parseCoreCreation } from '../workflows/core-create';
import type { CoreCampaignCalendar } from '../workflows/core-calendar';
import { assessCoreEncumbranceGuideline } from '../engine/core-inventory';
import { coreEquipmentById } from '../rules/core-inventory';
import { deriveCoreGrowthChecklist } from '../workflows/core-growth-checklist';
import { renderRuleSources } from './source-links';
import { coreWeaponChoices } from '../rules/core-weapon-choices';
import { loadBrowserCampaign, saveBrowserCampaign, listBrowserCampaignSlots, recoverBrowserCampaignSnapshot } from '../workflows/core-campaign-browser-storage';
import type { CampaignSlot } from '../workflows/core-campaign-storage';
import type { CoreLifeState, SameBlowEntryRule } from '../engine/core-life-state';
import { createCoreEditorIo } from './core-editor-io';
import { resolveCoreTrainingStage } from '../engine/core-training-stage';
import { previousCoreCourseAssessments } from '../workflows/core-overrun-training';
import { checkCoreAdvancement } from '../engine/core-progression';
import { inspectCoreDatedTrainingCourse } from '../workflows/core-dated-training';
import {inspectCoreActivityConsequences,type ActivityConsequenceFinding} from '../workflows/core-activity-consequences';
import {completedCoreRestHistory} from '../workflows/core-rest-history';
import {inspectCoreTrainingLocationBoundaries,type TrainingLocationBoundary} from '../workflows/core-training-location';
import { characterLabel } from './character-labels';

export function startCoreCampaign(){
  const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
  let current:CoreCampaignArchive|null=null;
  let savedToken:string|null=null,preservedRaw:string|null=null;
  let savedSlots:CampaignSlot[]=[];
  let consequenceChoices:ActivityConsequenceFinding[]=[];
  let locationChoices:TrainingLocationBoundary[]=[];
  let savedSnapshot:CoreCampaignArchive|null=null,historyReady=false;
  const io=createCoreEditorIo(renderStorageControls);
  const status=get('operations-status');
  function storageNotice(message:string){
    const translated=message.replace('Storage changed since load.','另一页面已更新本地档案；当前候选未覆盖主件，请导出后比较。');
    status.textContent=translated;get('operations-storage-notice').textContent=translated;
  }
  function renderStorageControls(){
    get<HTMLInputElement>('operations-file').disabled=io.busy||current!==null;
    get<HTMLButtonElement>('operations-local-load').disabled=io.busy||current!==null;
    get<HTMLButtonElement>('operations-local-save').disabled=io.busy||!current||current===savedSnapshot;
    get<HTMLButtonElement>('operations-history-export').disabled=io.busy||!historyReady;
    get('operations-storage-status').textContent=(io.busy?'正在处理档案，请稍候。':'')+(!current?'尚未打开档案。':current===savedSnapshot?'当前事件进度已保存到本地；仍建议另存文件备份。':'当前事件进度尚未保存到本地；可导出文件，或保存本地档案。');
  }
  function downloadText(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function refreshSlots(){savedSlots=await listBrowserCampaignSlots();get<HTMLSelectElement>('operations-local-slots').replaceChildren(new Option('选择已保存角色与分支',''),...savedSlots.map((slot,index)=>new Option(`角色 ${index+1} · ${slot.branchId}`,String(index))));}
  refreshSlots().catch(error=>{storageNotice(`本地保存不可用：${(error as Error).message}；文件导入导出仍可使用。`);});
  function slot(){if(!current)throw new Error('请先打开档案。');return {characterId:current.runtime.transaction.characterId,branchId:current.runtime.transaction.branchId};}
  async function refreshHistory(){
    if(!current)return false;
    const expected=savedToken,loaded=await loadBrowserCampaign(slot());
    const sameBaseline=loaded.status==='ready'&&loaded.token===expected;
    const history=sameBaseline?loaded.history:[];
    historyReady=history.length>0;
    get<HTMLSelectElement>('operations-local-history').replaceChildren(...history.map(item=>new Option(`历史保存 ${item.generation} · 事件修订 ${item.archive.runtime.transaction.revision}`,String(item.generation))));
    renderStorageControls();return sameBaseline;
  }
  get('operations-local-load').addEventListener('click',async()=>{try{
    await io.run('加载本地档案',async()=>{
    if(current)throw new Error('请先导出当前进度，再刷新页面加载另一份档案。');
    const index=get<HTMLSelectElement>('operations-local-slots').value;if(!index||!savedSlots[Number(index)])throw new Error('请选择本地角色与分支。');
    const loaded=await loadBrowserCampaign(savedSlots[Number(index)]);
    if(loaded.status==='missing')throw new Error('选定档案已不在数据库中。');
    if(loaded.status==='preserved'){preservedRaw=loaded.raw;get<HTMLButtonElement>('operations-raw-export').disabled=false;throw new Error(`存储原件已保留：${loaded.reason}。可导出原件，当前未被替换。`);}
    current=loaded.archive;savedSnapshot=current;savedToken=loaded.token;render();
    const sameBaseline=await refreshHistory();storageNotice(sameBaseline?'已校验并加载本地运营档案。':'已加载档案；另一页面已更新存储基线，历史导出已停用，请保留当前文件并重新比较。');
    });
  }catch(error){storageNotice((error as Error).message);}});
  get('operations-local-save').addEventListener('click',async()=>{let savedGeneration:number|null=null;try{
    await io.run('保存本地档案',async()=>{
    if(!current)throw new Error('请先打开档案。');
    const snapshot=current,saved=await saveBrowserCampaign(slot(),structuredClone(snapshot),savedToken);
    if(saved.status!=='saved')throw new Error(saved.reason);
    savedGeneration=saved.generation;savedSnapshot=snapshot;savedToken=saved.token;renderStorageControls();
    await refreshSlots();const sameBaseline=await refreshHistory();
    storageNotice(`已保存本地第 ${saved.generation} 版。${current===snapshot?'建议同时导出文件。':'保存期间新增的操作仍未保存，请再次保存或导出。'}${sameBaseline?'':'另一页面已更新存储基线，历史导出已停用。'}`);
    });
  }catch(error){storageNotice(savedGeneration===null?`本次未保存，内存进度与存储原件保留：${(error as Error).message}`:`第 ${savedGeneration} 版已保存，但列表刷新失败；当前内存进度仍保留：${(error as Error).message}`);}});
  get('operations-history-export').addEventListener('click',async()=>{try{
    await io.run('导出历史候选',async()=>{
    if(!savedToken)throw new Error('请先加载或保存本地档案。');const generation=Number(get<HTMLSelectElement>('operations-local-history').value),recovered=await recoverBrowserCampaignSnapshot(slot(),savedToken,generation);
    downloadText(JSON.stringify(recovered.recovered,null,2),`adnd1e-recovery-generation-${generation}.json`);storageNotice('已导出历史候选；当前档案与数据库主件保持不变。');
    });
  }catch(error){storageNotice((error as Error).message);}});
  get('operations-raw-export').addEventListener('click',()=>{if(preservedRaw!==null)downloadText(preservedRaw,'adnd1e-preserved-storage-original.json');});
  get<HTMLSelectElement>('operations-new-weapon').replaceChildren(...coreWeaponChoices.map(item=>new Option(item.label,item.id)));
  function render(){
    if(!current)return;
    renderStorageControls();
    const module=current.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement');
    get('operations-summary').textContent=`${current.runtime.transaction.facts.identity.name} · 事件修订 ${current.runtime.transaction.revision}`;
    get('operations-state').textContent=module?'当前角色的事件记录已载入；详细规则依据保留在档案中。':'一级，经验 0；尚无结算事件。';
    for(const id of ['operations-xp','operations-open','operations-export','operations-income'])get<HTMLButtonElement>(id).disabled=false;
    const state=module?.data as unknown as (CoreAdvancementState&{inventory:CoreInventoryLedger|null;calendar?:CoreCampaignCalendar;lifeRecovery?:{restActivityId:string;completed:boolean;consequencePolicy?:'v1'|'v2';resolution?:{method:string}};datedLevelAwards?:{activityIds:string[];consequencePolicy?:'v1'|'v2'}[];weaponProficiencies?:{weaponId:string}[];life?:CoreLifeState;spells?:{preparedCopies:{id:string;status:string;spell:{displayName:string;level:number}}[]}})|undefined;
    const restHistory=completedCoreRestHistory(current),historyContainer=get('operations-rest-history');historyContainer.replaceChildren();
    for(const receipt of restHistory){const row=document.createElement('p');row.textContent=`事件 ${receipt.actionId} · 零 HP 事件 ${receipt.episodeId} · 休养 ${receipt.startMinute}–${receipt.endMinuteExclusive} 游戏分钟 · 完成确认至 ${receipt.completedThroughMinute} · 策略 ${receipt.consequencePolicy}。后来的零 HP 事件不会覆盖此证明。`;historyContainer.append(row);}
    if(!restHistory.length)historyContainer.textContent='尚无完整休养完成证明；Heal 解除禁令不计作休满一周。';
    if(state){const labels:Record<CoreAdvancementState['status'],string>={adventuring:'可冒险', 'eligible-needs-dm':'升级资格待补充','training-planned':'训练待安排','training-active':'训练进行中','ready-for-award':'训练完成，待授予等级','training-interrupted':'训练已中断'};get('operations-summary').textContent=`${current.runtime.transaction.facts.identity.name} · ${characterLabel(state.classId)} ${state.level}级 · ${state.xp} 经验 · ${labels[state.status]}`;}
    if(state){
      const choices=get<HTMLSelectElement>('operations-overrun-assessments'),selected=new Set([...choices.selectedOptions].map(option=>option.value));
      const eligibility=checkCoreAdvancement({classId:state.classId,currentLevel:state.level,xp:state.xp,levelCap:state.levelCap});
      const overrunPending=state.status==='adventuring'&&state.assessments.length===0&&state.history.some(entry=>entry.type==='advancement.awarded'&&entry.targetLevel===state.level)&&['eligible','needs-dm'].includes(eligibility.status);
      let priorBasis:ReturnType<typeof previousCoreCourseAssessments>=[],basisProblem=false;
      if(overrunPending){try{priorBasis=previousCoreCourseAssessments(state);}catch{basisProblem=true;}}
      choices.replaceChildren(...priorBasis.map(assessment=>new Option(`${assessment.id} · ${assessment.rating} · 原次 ${assessment.xp} XP（不重新入账）`,assessment.id,false,selected.has(assessment.id))));
      get<HTMLButtonElement>('operations-overrun-basis').disabled=!overrunPending||basisProblem;
      get('operations-overrun-summary').textContent=basisProblem?'上一课程评价引用缺失或不唯一，不能自动复用。原进度仍保留，请先导出并核对原始记录。':overrunPending?'现有 XP 仍达下一门槛，但上一课程评价已结算。请明确采用后续依据，再开启新课程。':'当前无需补记跨门槛评价依据；此入口不发放经验或等级。';
      if(overrunPending){get<HTMLDetailsElement>('operations-overrun').open=true;get<HTMLButtonElement>('operations-open').disabled=true;}
      const stage=resolveCoreTrainingStage(state.classId,state.level),routes=get<HTMLSelectElement>('operations-route'),family=get<HTMLSelectElement>('operations-cost-family');
      for(const option of routes.options)option.disabled=(option.value==='name-level')!==(stage.stage==='name-level');
      if(routes.selectedOptions[0]?.disabled)routes.value=stage.stage==='name-level'?'name-level':'tutor';
      if(stage.printedCostFamily)family.value=stage.printedCostFamily;
      family.disabled=stage.stage==='below-name'||stage.printedCostFamily!==null;
      get('operations-stage-summary').textContent=`${characterLabel(state.classId)} 的训练名号为 ${stage.title}（${stage.attainedNameLevel}级），按当前已取得的 ${state.level}级判定：${stage.stage==='below-name'?'名号前；升至名号本身仍走此阶段。':'已达名号；按表现周数自行训练，不加倍时间。'}${stage.stage==='name-level'&&stage.printedCostFamily===null?'DMG 仅列四个基础费用族；本职业的采用解释须由 DM 明确记录，不自动认定。':''}`;
      renderRuleSources(get('operations-stage-sources'),stage.sourceIds);
    }
    const life=state?.life;
    const lifeLabels:Record<string,string>={'alive':'存活','unconscious-bleeding':'昏迷／失血','unconscious-stabilized':'昏迷／已稳定','dead':'死亡','revived':'已复活','zero-hp-convalescence':'零 HP 休养'};
    const restrictionLabels:Record<string,string>={'none':'无','zero-hp-convalescence':'零 HP 休养中'};
    get('operations-life-summary').textContent=life?`HP ${life.currentHp??'待补充'} / ${life.maximumHp}；${lifeLabels[life.mortality]??life.mortality}；行动限制 ${restrictionLabels[life.actionRestriction]??life.actionRestriction}`:'首次使用前，请按实际游戏情况确认当前 HP；上限来自创建与成长记录。';
    get<HTMLButtonElement>('operations-life-initialize').disabled=!!life;
    get<HTMLButtonElement>('operations-life-settle').disabled=life?.hpSettlement!=='needs-dm';
    get<HTMLButtonElement>('operations-life-hit').disabled=life?.mortality!=='alive'||life.hpSettlement!=='settled';
    get<HTMLButtonElement>('operations-life-round').disabled=get<HTMLButtonElement>('operations-life-aid').disabled=life?.mortality!=='unconscious-bleeding';
    get<HTMLButtonElement>('operations-life-recover').disabled=!['unconscious-bleeding','unconscious-stabilized'].includes(life?.mortality??'');
    get<HTMLButtonElement>('operations-life-finish').disabled=life?.actionRestriction!=='zero-hp-convalescence';
    get<HTMLButtonElement>('operations-life-rest-restart').disabled=life?.actionRestriction!=='zero-hp-convalescence';
    get<HTMLButtonElement>('operations-life-heal-exception').disabled=life?.actionRestriction!=='zero-hp-convalescence';
    get<HTMLButtonElement>('operations-calendar').disabled=!!state?.calendar;
    const stages:Record<string,boolean>={gate:state?.status==='eligible-needs-dm',plan:state?.status==='training-planned',pay:state?.status==='training-planned'&&!!state.candidate?.training,start:state?.status==='training-planned'&&!!state.candidate?.training,segment:state?.status==='training-active',interrupt:state?.status==='training-active'||state?.status==='ready-for-award',award:state?.status==='ready-for-award'};
    for(const [id,enabled] of Object.entries(stages))get<HTMLButtonElement>(`operations-${id}`).disabled=!enabled;
    get<HTMLButtonElement>('operations-restart-training').disabled=state?.status!=='training-interrupted';
    get('operations-legacy-training').textContent=current.actions.some(action=>action.intent.type==='award-level'||(action.intent.type==='award-level-dated'&&action.intent.locationPolicy!=='v1')||((action.intent.type==='award-level-dated'||action.intent.type==='complete-zero-hp-rest')&&action.intent.consequencePolicy!=='v2'))?'本档含较早策略的完成记录，按旧行动重放保全；这不自动认证其时间、地点或全部历史活动后果。新操作须走当前校验入口。':'';
    const unplaced=state?.candidate?.segments.filter(segment=>!state.calendar?.activities.some(activity=>activity.id===`${state.id}:training:${segment.id}`))??[];
    get<HTMLSelectElement>('operations-reconcile-segment').replaceChildren(...unplaced.map(segment=>new Option(`${segment.id} · ${segment.weeksNumerator}/${segment.weeksDenominator}周`,segment.id)));
    get<HTMLButtonElement>('operations-reconcile-training').disabled=!state?.calendar||!unplaced.length||!['training-active','ready-for-award'].includes(state.status);
    get('operations-training-coverage').textContent='授级前必须将本课程全部进度与战役日历占用核对；不能用现实日期或勾选连续性代替。';
    locationChoices=[];
    if(state?.calendar&&state.candidate){
      const placed=state.candidate.segments.map(segment=>`${state.id}:training:${segment.id}`).filter(id=>state.calendar!.activities.some(activity=>activity.id===id));
      try{locationChoices=inspectCoreTrainingLocationBoundaries(state.calendar,placed).unresolved;}catch{/* Time coverage reports gaps separately; preserve the rest of the editor. */}
    }
    get<HTMLSelectElement>('operations-location-boundary').replaceChildren(...locationChoices.map((boundary,index)=>new Option(`${boundary.fromLocationId} → ${boundary.toLocationId} · 游戏分钟 ${boundary.atMinute}`,String(index))));
    get<HTMLButtonElement>('operations-location-record').disabled=!locationChoices.length;
    get('operations-location-summary').textContent=`本课程有 ${locationChoices.length} 项待核对地点边界。不同地点不自动视为瞬移；这里也不会施法、扣资源或把普通旅行算成连续训练。`;
    if(state?.status==='ready-for-award'){
      try{const coverage=inspectCoreDatedTrainingCourse(state,state.calendar??null,current.runtime.transaction.characterId);get('operations-training-coverage').textContent=`课程已记录至战役第 ${Math.floor(coverage.completedAtMinute/state.calendar!.minutesPerDay)+1}日、日内 ${coverage.completedAtMinute%state.calendar!.minutesPerDay}分钟。请填写实际授级时点，不得早于此时。`;}
      catch{get<HTMLButtonElement>('operations-award').disabled=true;get('operations-training-coverage').textContent='课程时间、地点边界或重叠后果尚未通过校验，不能授级；请核对旧进度及相应裁定。';}
    }
    consequenceChoices=[];
    if(state?.calendar){
      for(const segment of state.candidate?.segments??[]){const id=`${state.id}:training:${segment.id}`;if(state.calendar.activities.some(activity=>activity.id===id))consequenceChoices.push(...inspectCoreActivityConsequences(state.calendar,[id],'training').unresolved);}
      if(state.lifeRecovery&&!state.lifeRecovery.completed)consequenceChoices.push(...inspectCoreActivityConsequences(state.calendar,[state.lifeRecovery.restActivityId],'zero-hp-rest').unresolved);
      for(const previous of state.datedLevelAwards??[])consequenceChoices.push(...inspectCoreActivityConsequences(state.calendar,previous.activityIds,'training').unresolved);
      for(const receipt of restHistory)consequenceChoices.push(...inspectCoreActivityConsequences(state.calendar,[receipt.restActivityId],'zero-hp-rest').unresolved);
    }
    get<HTMLSelectElement>('operations-consequence-pair').replaceChildren(...consequenceChoices.map((finding,index)=>new Option(`${finding.purpose} · ${finding.status==='known-conflict'?'已知冲突':'实际兼容性待裁定'} · ${finding.protectedActivityId} / ${finding.otherActivityId}`,String(index))));
    get<HTMLButtonElement>('operations-consequence-adjudicate').disabled=!consequenceChoices.length;
    get('operations-consequence-summary').textContent=`当前及按新策略完成过的课程/休养有 ${consequenceChoices.length} 项未解决的重叠后果。后补事实也须重新审查；不自动撤级或治疗，未解决前不能再次授予完成利益。`;
    const initialCreation=parseCoreCreation(current.genesis.runtime.transaction.facts.modules[0].data);
    const spellLedger=state?.spells??initialCreation.tasks.find(task=>task.id==='initial-spells')?.facts?.ledger as {preparedCopies?:{id:string;status:string;spell:{displayName:string;level:number}}[]}|undefined;
    const readyCopies=Array.isArray(spellLedger?.preparedCopies)?spellLedger.preparedCopies.filter(copy=>copy.status==='ready'):[];
    get<HTMLSelectElement>('operations-spell-copy').replaceChildren(...readyCopies.map((copy,index)=>new Option(`${copy.spell.displayName} · ${copy.spell.level}环 · 副本${index+1}`,copy.id)));
    get<HTMLButtonElement>('operations-cast').disabled=!readyCopies.length;
    get('operations-spell-summary').textContent=`可用准备副本 ${readyCopies.length}。施放消耗与法术效果结算分别记录。`;
    const growth=get('operations-growth');growth.replaceChildren();
    if(state){for(const task of deriveCoreGrowthChecklist(initialCreation,state,state.weaponProficiencies?.map(item=>item.weaponId)).tasks){const section=document.createElement('section'),message=document.createElement('p'),sources=document.createElement('div');message.textContent=task.message;renderRuleSources(sources,task.sourceIds);section.append(message,sources);growth.append(section);}}
    get<HTMLButtonElement>('operations-learn-weapon').disabled=false;
    const inventory=state?.inventory??initialCreation.tasks.find(task=>task.id==='equipment')?.facts?.ledger as CoreInventoryLedger|undefined;
    get<HTMLSelectElement>('operations-wallet').replaceChildren(...(inventory?.wallets??[]).map(wallet=>new Option(`${wallet.label} · ${JSON.stringify(wallet.coins)}`,wallet.id)));
    get<HTMLSelectElement>('operations-item').replaceChildren(...(inventory?.items??[]).map(item=>new Option(`${item.label} × ${item.quantity}（单位 ${item.definitionId?coreEquipmentById[item.definitionId]?.purchaseUnit??'档案记录':'档案记录'}）`,item.id)));
    get<HTMLSelectElement>('operations-item-location').replaceChildren(...(inventory?.locations??[]).map(location=>new Option(location.label,location.id)));
    get<HTMLButtonElement>('operations-consume').disabled=get<HTMLButtonElement>('operations-relocate').disabled=!inventory?.items.length;
    get<HTMLButtonElement>('operations-unpack').disabled=!inventory?.items.length;
    const carrier=inventory?.locations.find(location=>location.kind==='character');
    if(inventory&&carrier){const burden=assessCoreEncumbranceGuideline({ledger:inventory,carrierLocationId:carrier.id});get('operations-burden').textContent=`已知携带重量下界 ${burden.knownWeightGp} gp 重量单位；${burden.unknownWeightItemIds.length} 件重量未知。体积与力量修正仍需按本战役确认，不能据此直接认定实际移动率。`;}
    const training=state?.candidate?.training;
    get('operations-training-summary').textContent=training?`训练 ${training.weeksNumerator}/${training.weeksDenominator} 周；原书费用 ${training.totalCostGpNumerator}/${training.totalCostGpDenominator} gp；接受费用 ${state!.candidate!.acceptedCostCp} cp；已付 ${state!.candidate!.paymentsCp.reduce((a,b)=>a+b,0)} cp。`:state?`当前阶段：${characterLabel(state.status)}。`:'尚无升级候选。';
  }
  get<HTMLInputElement>('operations-file').addEventListener('change',async event=>{
    const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
    try{
      await io.run('导入文件',async()=>{
      if(current)throw new Error('请先导出当前档案，再刷新页面打开其他文件。');
      if(file.size>8*1024*1024)throw new Error('文件超过 8 MiB，请使用档案检查页。');
      const value=JSON.parse(await file.text());
      const migration=migrateCoreCampaignImport(value);
      current=migration.archive;render();status.textContent=migration.migrated?`已按明确的档案迁移规则打开；${migration.warnings[0]}`:'已验证档案，经验操作将保留独立事件。';
      });
    }catch(error){status.textContent=(error as Error).message;}
  });
  function actor(){const actorId=get<HTMLInputElement>('operations-actor').value.trim(),at=get<HTMLInputElement>('operations-at').value.trim();if(!actorId||!at)throw new Error('请填写 DM 身份与战役时间。');return {actorId,at};}
  function commit(intent:Parameters<typeof commitCoreCampaignAction>[1]['intent']){
    if(!current)throw new Error('请先打开档案。');
    current=commitCoreCampaignAction(current,{id:crypto.randomUUID(),...actor(),expectedRevision:current.runtime.transaction.revision,intent});render();status.textContent='操作已记录，请导出保存。';
  }
  function handle(id:string,callback:()=>void){get(id).addEventListener('click',()=>{try{callback();}catch(error){status.textContent=(error as Error).message;}});}
  const reason=()=>get<HTMLTextAreaElement>('operations-reason').value.trim();
  handle('operations-overrun-basis',()=>{
    if(!get<HTMLInputElement>('operations-overrun-confirm').checked)throw new Error('请由 DM 明确确认本团采用解释；不能将其伪装为唯一 RAW。');
    commit({type:'adopt-overrun-basis',interpretation:'reuse-recorded-adventure-ratings',assessmentIds:[...get<HTMLSelectElement>('operations-overrun-assessments').selectedOptions].map(option=>option.value),reason:get<HTMLTextAreaElement>('operations-overrun-reason').value.trim()});
  });
  handle('operations-cast',()=>commit({type:'cast-prepared',copyId:get<HTMLSelectElement>('operations-spell-copy').value,components:get<HTMLSelectElement>('operations-spell-components').value as 'satisfied'|'not-required'|'needs-dm',reason:get<HTMLTextAreaElement>('operations-spell-reason').value.trim(),observedOutcome:get<HTMLTextAreaElement>('operations-spell-outcome').value.trim()}));
  handle('operations-learn-weapon',()=>commit({type:'learn-weapon',weaponId:get<HTMLSelectElement>('operations-new-weapon').value,reason:get<HTMLTextAreaElement>('operations-weapon-reason').value.trim()}));
  const lifeReason=()=>get<HTMLTextAreaElement>('operations-life-reason').value.trim();
  handle('operations-life-initialize',()=>{if(!get<HTMLInputElement>('operations-life-hp').value.trim())throw new Error('请填写实际当前 HP。');commit({type:'initialize-life',currentHp:Number(get<HTMLInputElement>('operations-life-hp').value),reason:lifeReason()});});
  handle('operations-life-settle',()=>{if(!get<HTMLInputElement>('operations-life-hp').value.trim())throw new Error('请填写当前 HP 裁定值。');commit({type:'settle-current-hp',currentHp:Number(get<HTMLInputElement>('operations-life-hp').value),reason:lifeReason()});});
  handle('operations-life-hit',()=>commit({type:'damage',amount:Number(get<HTMLInputElement>('operations-life-damage').value),cause:lifeReason(),sameBlowEntryRule:get<HTMLSelectElement>('operations-life-policy').value as SameBlowEntryRule||undefined}));
  handle('operations-life-round',()=>commit({type:'zero-hp-round',cause:lifeReason()||'无人援助的零 HP 恶化回合'}));
  handle('operations-life-aid',()=>commit({type:'friendly-aid'}));
  function lifeMinute(dayId:string,minuteId:string){
    const data=current?.runtime.transaction.facts.modules.find(module=>module.id==='core-advancement')?.data as unknown as {calendar?:CoreCampaignCalendar}|undefined;
    if(!data?.calendar)throw new Error('请先确认战役日历单位。');
    const day=Number(get<HTMLInputElement>(dayId).value),minute=Number(get<HTMLInputElement>(minuteId).value);
    if(!Number.isSafeInteger(day)||day<1||!Number.isSafeInteger(minute)||minute<0||minute>=data.calendar.minutesPerDay)throw new Error('请填写有效战役日和日内分钟。');
    return (day-1)*data.calendar.minutesPerDay+minute;
  }
  handle('operations-life-recover',()=>commit({type:'recover-zero-hp',restoredHp:Number(get<HTMLInputElement>('operations-life-hp').value),comaTurns:Number(get<HTMLInputElement>('operations-life-coma').value),restStartMinute:lifeMinute('operations-life-rest-day','operations-life-rest-minute'),locationId:get<HTMLInputElement>('operations-life-rest-location').value.trim(),healingSourceId:get<HTMLInputElement>('operations-life-heal-source').value.trim(),reason:lifeReason()}));
  handle('operations-life-finish',()=>commit({type:'complete-zero-hp-rest',completedThroughMinute:lifeMinute('operations-life-finish-day','operations-life-finish-minute'),reason:lifeReason(),consequencePolicy:'v2'}));
  handle('operations-life-rest-restart',()=>commit({type:'restart-zero-hp-rest',startMinute:lifeMinute('operations-life-rest-day','operations-life-rest-minute'),locationId:get<HTMLInputElement>('operations-life-rest-location').value.trim(),reason:lifeReason(),sourceId:get<HTMLInputElement>('operations-life-rest-restart-source').value.trim()}));
  handle('operations-life-heal-exception',()=>{
    if(!get<HTMLInputElement>('operations-life-heal-confirm').checked)throw new Error('请确认实际生效的是 Heal，而非一般 cure 或药水。');
    const data=current?.runtime.transaction.facts.modules.find(module=>module.id==='core-advancement')?.data as unknown as {life?:CoreLifeState}|undefined;
    if(!data?.life?.zeroHpEpisode)throw new Error('没有当前零 HP 事件。');
    commit({type:'resolve-heal-convalescence',spellEffect:'heal',episodeId:data.life.zeroHpEpisode.id,effectEvidenceId:get<HTMLInputElement>('operations-life-heal-evidence').value.trim(),effectiveMinute:lifeMinute('operations-life-finish-day','operations-life-finish-minute'),reason:lifeReason()});
  });
  handle('operations-gate',()=>commit({type:'accept-gate',reason:reason()}));
  handle('operations-plan',()=>{
    const state=current?.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')?.data as unknown as CoreAdvancementState|undefined;if(!state)throw new Error('请先打开升级候选。');
    if(get<HTMLSelectElement>('operations-route').value==='name-level'){
      const costFamily=get<HTMLSelectElement>('operations-cost-family').value as 'cleric'|'fighter'|'magic-user'|'thief';
      const plan=planNameLevelTraining({currentLevel:state.level,ratings:state.assessments.map(item=>item.rating),costFamily}),numerator=plan.totalCostGpNumerator*200,denominator=plan.totalCostGpDenominator,raw=get<HTMLInputElement>('operations-cost').value.trim();
      if(!raw&&numerator%denominator!==0)throw new Error('请记录整枚铜币费用与 DM 理由。');
      commit({type:'plan-name-training',costFamily,acceptedCostCp:raw?Number(raw):numerator/denominator,reason:reason()});return;
    }
    const route=get<HTMLSelectElement>('operations-route').value as 'tutor'|'self',plan=planBelowNameTraining({currentLevel:state.level,ratings:state.assessments.map(item=>item.rating),route});
    const numerator=plan.totalCostGpNumerator*200,denominator=plan.totalCostGpDenominator,raw=get<HTMLInputElement>('operations-cost').value.trim();
    if(!raw&&numerator%denominator!==0)throw new Error('原书公式产生非整枚铜币费用，请记录 DM 接受费用与理由。');
    commit({type:'plan-training',route,acceptedCostCp:raw?Number(raw):numerator/denominator,reason:reason()||undefined});
  });
  const coins=(kind:'tender'|'change'|'income')=>Object.fromEntries(['cp','sp','ep','gp','pp'].map(id=>[id,Number(get<HTMLInputElement>(`operations-${kind}-${id}`).value)])) as unknown as CoinCounts;
  handle('operations-income',()=>commit({type:'income',walletId:get<HTMLSelectElement>('operations-wallet').value,coins:coins('income'),sourceId:get<HTMLInputElement>('operations-income-source').value.trim(),reason:reason()}));
  handle('operations-consume',()=>commit({type:'consume-item',itemId:get<HTMLSelectElement>('operations-item').value,quantity:Number(get<HTMLInputElement>('operations-item-quantity').value),sourceId:get<HTMLInputElement>('operations-item-source').value.trim(),reason:get<HTMLTextAreaElement>('operations-item-reason').value.trim()}));
  handle('operations-unpack',()=>commit({type:'unpack-item',itemId:get<HTMLSelectElement>('operations-item').value,bundleCount:Number(get<HTMLInputElement>('operations-item-quantity').value),pieceInstanceId:crypto.randomUUID(),sourceId:get<HTMLInputElement>('operations-item-source').value.trim(),reason:get<HTMLTextAreaElement>('operations-item-reason').value.trim()}));
  handle('operations-relocate',()=>commit({type:'relocate-item',itemId:get<HTMLSelectElement>('operations-item').value,destinationLocationId:get<HTMLSelectElement>('operations-item-location').value,sourceId:get<HTMLInputElement>('operations-item-source').value.trim(),reason:get<HTMLTextAreaElement>('operations-item-reason').value.trim()}));
  handle('operations-pay',()=>commit({type:'pay-training',amountCp:Number(get<HTMLInputElement>('operations-payment').value),walletId:get<HTMLSelectElement>('operations-wallet').value,tender:coins('tender'),change:coins('change')}));
  handle('operations-start',()=>commit({type:'start-training'}));
  handle('operations-calendar',()=>commit({type:'configure-calendar',minutesPerDay:Number(get<HTMLInputElement>('operations-day-minutes').value),daysPerWeek:Number(get<HTMLInputElement>('operations-week-days').value)}));
  handle('operations-segment',()=>{
    const state=current?.runtime.transaction.facts.modules.find(module=>module.id==='core-advancement')?.data as unknown as {calendar?:CoreCampaignCalendar}|undefined;
    if(!state?.calendar)throw new Error('请先确认战役日历单位。');
    const day=Number(get<HTMLInputElement>('operations-training-day').value),minute=Number(get<HTMLInputElement>('operations-training-minute').value);
    if(!Number.isSafeInteger(day)||day<1||!Number.isSafeInteger(minute)||minute<0||minute>=state.calendar.minutesPerDay)throw new Error('请填写有效战役日和当天分钟。');
    commit({type:'scheduled-training-segment',startMinute:(day-1)*state.calendar.minutesPerDay+minute,locationId:get<HTMLInputElement>('operations-training-location').value.trim(),segment:{id:crypto.randomUUID(),weeksNumerator:Number(get<HTMLInputElement>('operations-weeks-n').value),weeksDenominator:Number(get<HTMLInputElement>('operations-weeks-d').value),dmConfirmedContinuous:get<HTMLInputElement>('operations-continuous').checked}});
  });
  handle('operations-interrupt',()=>commit({type:'interrupt-training',reason:reason()}));
  handle('operations-restart-training',()=>commit({type:'restart-training',reason:reason()}));
  handle('operations-reconcile-training',()=>commit({type:'reconcile-training-segment',segmentId:get<HTMLSelectElement>('operations-reconcile-segment').value,startMinute:lifeMinute('operations-training-day','operations-training-minute'),locationId:get<HTMLInputElement>('operations-training-location').value.trim(),reason:get<HTMLTextAreaElement>('operations-reconcile-reason').value.trim()}));
  handle('operations-award',()=>commit({type:'award-level-dated',awardMinute:lifeMinute('operations-award-day','operations-award-minute'),hpRolls:get<HTMLInputElement>('operations-hp').value.split(/[,，\s]+/).filter(Boolean).map(Number),consequencePolicy:'v2',locationPolicy:'v1'}));
  handle('operations-location-record',()=>{
    const boundary=locationChoices[Number(get<HTMLSelectElement>('operations-location-boundary').value)];if(!boundary)throw new Error('请选择当前课程的地点边界。');
    commit({type:'record-training-location-transition',fromActivityId:boundary.fromActivityId,toActivityId:boundary.toActivityId,method:get<HTMLSelectElement>('operations-location-method').value as 'same-physical-place'|'instantaneous-movement',continuityConfirmed:get<HTMLInputElement>('operations-location-confirm').checked,reason:get<HTMLTextAreaElement>('operations-location-reason').value.trim(),evidenceSourceId:get<HTMLInputElement>('operations-location-source').value.trim()});
  });
  handle('operations-consequence-adjudicate',()=>{
    const pair=consequenceChoices[Number(get<HTMLSelectElement>('operations-consequence-pair').value)];if(!pair)throw new Error('请选择实际重叠活动。');
    const disposition=get<HTMLSelectElement>('operations-consequence-disposition').value as 'compatible-facts'|'rule-exception';
    if(disposition==='rule-exception'&&!get<HTMLInputElement>('operations-consequence-confirm').checked)throw new Error('规则例外须明确确认，不能伪装为 RAW。');
    commit({type:'adjudicate-activity-consequence',protectedActivityId:pair.protectedActivityId,otherActivityId:pair.otherActivityId,purpose:pair.purpose,disposition,reason:get<HTMLTextAreaElement>('operations-consequence-reason').value.trim(),evidenceSourceId:get<HTMLInputElement>('operations-consequence-source').value.trim()});
  });
  get('operations-xp').addEventListener('click',()=>{try{
    if(!current)throw new Error('请先打开档案。');
    const source=get<HTMLInputElement>('operations-source').value.trim(),assessmentId=get<HTMLInputElement>('operations-assessment').value.trim(),xp=Number(get<HTMLInputElement>('operations-amount').value),rating=get<HTMLSelectElement>('operations-rating').value as PerformanceRating;
    if(!source||!assessmentId||!get<HTMLInputElement>('operations-amount').value.trim())throw new Error('请填写场次来源、结算 ID 和经验。');
    current=commitCoreCampaignAction(current,{id:crypto.randomUUID(),...actor(),expectedRevision:current.runtime.transaction.revision,intent:{type:'experience',assessment:{id:assessmentId,xp,rating,sourceIds:[source]}}});render();status.textContent='经验结算已记录，请导出保存。';
  }catch(error){status.textContent=(error as Error).message;}});
  get('operations-open').addEventListener('click',()=>{try{
    if(!current)throw new Error('请先打开档案。');
    current=commitCoreCampaignAction(current,{id:crypto.randomUUID(),...actor(),expectedRevision:current.runtime.transaction.revision,intent:{type:'open-advancement'}});render();status.textContent='升级候选已记录，等级保持不变；继续完成适用的 DM 裁定和训练。';
  }catch(error){status.textContent=(error as Error).message;}});
  get('operations-export').addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`${current.runtime.transaction.characterId.replace(/[\\/:*?"<>|]/g,'_')}.adnd1e-campaign.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='已请求导出战役事件档案；请保留上一版备份。';});
}
