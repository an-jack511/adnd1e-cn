import { parseCoreAdmissionArchive } from '../workflows/core-admission';
import { parseCoreCreation } from '../workflows/core-create';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { coreAbilityIds, coreEligibilityPack } from '../rules/core-eligibility';
import { renderRuleSources } from './source-links';
import { characterLabel, taskLabel } from './character-labels';

export function startCoreArchive(){
  const status=document.getElementById('archive-status')!,host=document.getElementById('archive-character')!;
  document.getElementById('archive-file')!.addEventListener('change',async event=>{
    const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
    try{
      if(file.size>4*1024*1024)throw new Error('档案超过 4 MiB，原文件保持不变。');
      const archive=parseCoreAdmissionArchive(JSON.parse(await file.text()));
      const module=archive.runtime.transaction.facts.modules.find(item=>item.id==='core-creation')!;
      const creation=parseCoreCreation(module.data),candidate=creation.candidate!,eligibility=evaluateCoreEligibility(candidate);
      const fragment=document.createDocumentFragment();
      const title=document.createElement('h2');title.textContent=creation.name;fragment.append(title);
      const identity=document.createElement('p');identity.textContent=`${coreEligibilityPack.races.find(r=>r.id===candidate.raceId)?.label??candidate.raceId} · ${candidate.classIds.map(id=>coreEligibilityPack.classes.find(c=>c.id===id)?.label??id).join(' / ')} · 一级 · ${candidate.alignmentId}`;fragment.append(identity);
      const attributes=document.createElement('dl');
      for(const id of coreAbilityIds){const term=document.createElement('dt'),value=document.createElement('dd');term.textContent=id;value.textContent=`${eligibility.adjustedScores[id]}（生成值 ${creation.generation.scores[id]}）`;attributes.append(term,value);}fragment.append(attributes);
      const admission=document.createElement('p');admission.textContent=`准入：${creation.admission!.actorId} · ${creation.admission!.at} · ${creation.admission!.scope}`;fragment.append(admission);
      for(const task of creation.tasks){
        const section=document.createElement('section'),heading=document.createElement('h3'),note=document.createElement('p');
        heading.textContent=`${taskLabel(task.id)} · ${characterLabel(task.status)}`;note.textContent=task.note;section.append(heading,note);
        if(task.facts){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='事实、计算过程与裁定';pre.textContent=JSON.stringify(task.facts,null,2);details.append(summary,pre);section.append(details);}
        const sources=document.createElement('div');renderRuleSources(sources,task.sourceIds);section.append(sources);fragment.append(section);
      }
      host.replaceChildren(fragment);status.textContent='已校验准入档案并重新计算资格与属性。此页展示一级创建记录；战役中的后续变化需使用运营档案流程。';
    }catch(error){status.textContent=`档案未替换：${(error as Error).message}`;}
  });
  document.getElementById('archive-print')!.addEventListener('click',()=>window.print());
}
