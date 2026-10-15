import { newCoreCampaignArchive, parseCoreCampaignArchive, commitCoreCampaignAction, type CoreCampaignArchive } from '../workflows/core-campaign-runtime';
import { parseCoreAdmissionArchive } from '../workflows/core-admission';
import type { PerformanceRating } from '../rules/core-training';
import { planBelowNameTraining, planNameLevelTraining } from '../engine/core-training';
import type { CoreAdvancementState } from '../workflows/core-advancement';
import type { CoinCounts, CoreInventoryLedger } from '../engine/core-inventory';
import { parseCoreCreation } from '../workflows/core-create';

export function startCoreCampaign(){
  const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
  let current:CoreCampaignArchive|null=null;
  const status=get('operations-status');
  function render(){
    if(!current)return;
    const module=current.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement');
    get('operations-summary').textContent=`${current.runtime.transaction.facts.identity.name} · 事件修订 ${current.runtime.transaction.revision}`;
    get('operations-state').textContent=module?JSON.stringify(module.data,null,2):'一级，经验 0；尚无结算事件。';
    for(const id of ['operations-xp','operations-open','operations-export','operations-income'])get<HTMLButtonElement>(id).disabled=false;
    const state=module?.data as unknown as (CoreAdvancementState&{inventory:CoreInventoryLedger|null})|undefined;
    const stages:Record<string,boolean>={gate:state?.status==='eligible-needs-dm',plan:state?.status==='training-planned',pay:state?.status==='training-planned'&&!!state.candidate?.training,start:state?.status==='training-planned'&&!!state.candidate?.training,segment:state?.status==='training-active',interrupt:state?.status==='training-active'||state?.status==='ready-for-award',award:state?.status==='ready-for-award'};
    for(const [id,enabled] of Object.entries(stages))get<HTMLButtonElement>(`operations-${id}`).disabled=!enabled;
    const initialCreation=parseCoreCreation(current.genesis.runtime.transaction.facts.modules[0].data);
    const inventory=state?.inventory??initialCreation.tasks.find(task=>task.id==='equipment')?.facts?.ledger as CoreInventoryLedger|undefined;
    get<HTMLSelectElement>('operations-wallet').replaceChildren(...(inventory?.wallets??[]).map(wallet=>new Option(`${wallet.label} · ${JSON.stringify(wallet.coins)}`,wallet.id)));
    const training=state?.candidate?.training;
    get('operations-training-summary').textContent=training?`训练 ${training.weeksNumerator}/${training.weeksDenominator} 周；原书费用 ${training.totalCostGpNumerator}/${training.totalCostGpDenominator} gp；接受费用 ${state!.candidate!.acceptedCostCp} cp；已付 ${state!.candidate!.paymentsCp.reduce((a,b)=>a+b,0)} cp。`:state?`当前阶段：${state.status}。`:'尚无升级候选。';
  }
  get<HTMLInputElement>('operations-file').addEventListener('change',async event=>{
    const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
    try{
      if(current)throw new Error('请先导出当前档案，再刷新页面打开其他文件。');
      if(file.size>8*1024*1024)throw new Error('文件超过 8 MiB，请使用档案检查页。');
      const value=JSON.parse(await file.text());
      const parsed=value?.format==='adnd1e-core-admission-runtime'?newCoreCampaignArchive(parseCoreAdmissionArchive(value)):parseCoreCampaignArchive(value);
      current=parsed;render();status.textContent='已验证档案，经验操作将保留独立事件。';
    }catch(error){status.textContent=(error as Error).message;}
  });
  function actor(){const actorId=get<HTMLInputElement>('operations-actor').value.trim(),at=get<HTMLInputElement>('operations-at').value.trim();if(!actorId||!at)throw new Error('请填写 DM 身份与战役时间。');return {actorId,at};}
  function commit(intent:Parameters<typeof commitCoreCampaignAction>[1]['intent']){
    if(!current)throw new Error('请先打开档案。');
    current=commitCoreCampaignAction(current,{id:crypto.randomUUID(),...actor(),expectedRevision:current.runtime.transaction.revision,intent});render();status.textContent='操作已记录，请导出保存。';
  }
  function handle(id:string,callback:()=>void){get(id).addEventListener('click',()=>{try{callback();}catch(error){status.textContent=(error as Error).message;}});}
  const reason=()=>get<HTMLTextAreaElement>('operations-reason').value.trim();
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
  handle('operations-pay',()=>commit({type:'pay-training',amountCp:Number(get<HTMLInputElement>('operations-payment').value),walletId:get<HTMLSelectElement>('operations-wallet').value,tender:coins('tender'),change:coins('change')}));
  handle('operations-start',()=>commit({type:'start-training'}));
  handle('operations-segment',()=>commit({type:'training-segment',segment:{id:crypto.randomUUID(),weeksNumerator:Number(get<HTMLInputElement>('operations-weeks-n').value),weeksDenominator:Number(get<HTMLInputElement>('operations-weeks-d').value),dmConfirmedContinuous:get<HTMLInputElement>('operations-continuous').checked}}));
  handle('operations-interrupt',()=>commit({type:'interrupt-training',reason:reason()}));
  handle('operations-award',()=>commit({type:'award-level',hpRolls:get<HTMLInputElement>('operations-hp').value.split(/[,，\s]+/).filter(Boolean).map(Number)}));
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
