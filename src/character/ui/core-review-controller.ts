import { admitCoreCreation, approveCreationTask, decideEligibilityIssue, parseCoreCreation, type CoreCreation } from '../workflows/core-create';
import { createRuntimeFromAdmittedCoreCreation } from '../workflows/core-admission';
import { coreEligibilityPack } from '../rules/core-eligibility';

export function startCoreReview(){
  const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
  const status=element('review-status'),summary=element('review-summary'),tasks=element('review-tasks'),issues=element('review-issues');
  let current:CoreCreation|null=null;
  function download(value:unknown,suffix:string){
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`${(current?.name||'character').replace(/[\\/:*?"<>|]/g,'_')}.${suffix}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function render(){
    if(!current)return;
    summary.textContent=`${current.name||'未命名'} · 修订 ${current.revision} · ${current.status}`;
    tasks.replaceChildren();issues.replaceChildren();
    for(const task of current.tasks){
      const li=document.createElement('li');li.textContent=`${task.id}：${task.status}。${task.note}`;
      if(task.facts){const detail=document.createElement('details'),title=document.createElement('summary'),facts=document.createElement('pre');title.textContent='查看原始事实与计算结果';facts.textContent=JSON.stringify(task.facts,null,2);detail.append(title,facts);li.append(detail);}
      const sources=document.createElement('p');sources.textContent=`来源：${task.sourceIds.join('；')||'尚未记录'}`;li.append(sources);
      if(current.status!=='admitted'&&task.status==='needs-dm'&&task.facts){
        const button=document.createElement('button');button.type='button';button.textContent='确认此任务的已记录事实';
        button.addEventListener('click',()=>{try{
          const actorId=element<HTMLInputElement>('review-actor').value.trim(),reason=element<HTMLTextAreaElement>('review-reason').value.trim();
          current=approveCreationTask(current!,task.id,{actorId,reason,at:new Date().toISOString(),sourceIds:task.sourceIds});render();status.textContent='已保留原始事实并记录 DM 确认，请导出保存。';
        }catch(error){status.textContent=(error as Error).message;}});li.append(button);
      }
      tasks.append(li);
    }
    const evaluation=current.evaluation as {issues:{id:string;message:string;sourceIds:string[]}[]}|null;
    for(const issue of evaluation?.issues??[]){
      const box=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=issue.message;box.append(legend);
      const source=document.createElement('p');source.textContent=issue.sourceIds.map(id=>{const item=coreEligibilityPack.sources.find(s=>s.id===id);return item?`${item.book} p.${item.printedPage} (${id})`:id;}).join('；');box.append(source);
      const existing=current.decisions.find(d=>d.issueId===issue.id),note=document.createElement('p');note.textContent=existing?`${existing.actorId}：${existing.choice}；${existing.reason}`:'等待裁定';box.append(note);
      if(current.status!=='admitted')for(const [choice,label] of [['accepted-exception','记录接受例外'],['rejected','记录拒绝']] as const){
        const button=document.createElement('button');button.type='button';button.textContent=label;
        button.addEventListener('click',()=>{try{const actorId=element<HTMLInputElement>('review-actor').value.trim(),reason=element<HTMLTextAreaElement>('review-reason').value.trim();if(!actorId||!reason)throw new Error('请填写 DM 身份和裁定理由。');current=decideEligibilityIssue(current!,{issueId:issue.id,choice,actorId,reason,sourceIds:issue.sourceIds});render();status.textContent='已记录裁定，请导出保留。';}catch(error){status.textContent=(error as Error).message;}});box.append(button);
      }
      issues.append(box);
    }
    element<HTMLButtonElement>('review-export').disabled=false;
    element<HTMLButtonElement>('review-admit').disabled=current.status!=='ready-for-review';
    element<HTMLButtonElement>('review-runtime').disabled=current.status!=='admitted';
  }
  element<HTMLInputElement>('review-file').addEventListener('change',async event=>{
    const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
    try{if(file.size>4*1024*1024)throw new Error('创建进度文件超过 4 MiB，请使用档案检查页保全原件。');const parsed=parseCoreCreation(JSON.parse(await file.text()));current=parsed;render();status.textContent='已导入并重新检查资格；请保留本地原文件。';}catch(error){status.textContent=`导入失败，当前记录未替换：${(error as Error).message}`;}
  });
  element('review-export').addEventListener('click',()=>{if(current)download(current,'adnd1e-core-creation');});
  element('review-admit').addEventListener('click',()=>{try{if(!current)throw new Error('请先导入创建进度。');const actorId=element<HTMLInputElement>('review-actor').value.trim(),scope=element<HTMLInputElement>('review-scope').value.trim();if(!actorId||!scope)throw new Error('请填写 DM 身份与准入战役范围。');current=admitCoreCreation(current,{actorId,scope,at:new Date().toISOString()});render();status.textContent='准入已记录。请导出创建记录及事件档案保存到本地。';}catch(error){status.textContent=(error as Error).message;}});
  element('review-runtime').addEventListener('click',()=>{try{if(current)download(createRuntimeFromAdmittedCoreCreation({document:current}),'adnd1e-core-admission-runtime');}catch(error){status.textContent=(error as Error).message;}});
}
