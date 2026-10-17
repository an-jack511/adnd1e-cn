import {coreArcaneCreationChoices,recordCoreArcaneCreation,type CoreArcaneCreationInput,type CoreArcaneCreationUiDraft} from '../workflows/core-arcane-creation';
import {newKnowabilityState,recordKnowabilityAttempt,intelligenceSpellRule,type KnowabilityState} from '../engine/core-spell-acquisition';
import {evaluateCoreEligibility} from '../engine/core-eligibility';
import type {CoreCreation} from '../workflows/core-create';
import {renderRuleSources} from './source-links';

const names:Record<string,string>={'read-magic':'阅读魔法','burning-hands':'燃烧之手','charm-person':'魅惑人类',enlarge:'放大术',friends:'友谊术',light:'光亮术','magic-missile':'魔法飞弹',push:'推力术','shocking-grasp':'电爪术',sleep:'睡眠术','affect-normal-fires':'影响普通火焰','dancing-lights':'舞光术','feather-fall':'羽落术','hold-portal':'封门术',jump:'跳跃术','protection-from-evil':'防护邪恶',shield:'护盾术','spider-climb':'蜘蛛攀行',ventriloquism:'口技术','comprehend-languages':'通晓语言','detect-magic':'侦测魔法',erase:'抹消术','find-familiar':'寻觅魔宠',identify:'鉴定术',mending:'修补术',message:'传讯术','unseen-servant':'无形仆役',write:'书写术','audible-glamer':'可闻幻象','change-self':'改变自身','color-spray':'彩色喷射',darkness:'黑暗术','detect-illusion':'侦测幻象','detect-invisibility':'侦测隐形','gaze-reflection':'凝视反射术',hypnotism:'催眠术','phantasmal-force':'幻影力量','wall-of-fog':'雾墙术'};
export const arcaneSpellLabel=(slug:string)=>names[slug]??slug;
const slug=(id:string)=>id.split(':').at(-1)!;
function percentile(){const raw=new Uint32Array(1),limit=Math.floor(0x100000000/100)*100;do{crypto.getRandomValues(raw);}while(raw[0]>=limit);return raw[0]%100+1;}

/** Task UI owns choices and real rolls; adapter owns all eligibility and ledger reconstruction. */
export function renderArcaneBookCreation(host:HTMLElement,read:()=>CoreCreation|null,write:(document:CoreCreation)=>void,initialPlan:CoreArcaneCreationInput['initialPlan']){
  host.replaceChildren();const creation=read();if(!creation?.candidate)return;
  const classId=initialPlan.classId,definitions=coreArcaneCreationChoices(classId),saved=creation.tasks.find(t=>t.id==='initial-spells')?.facts?.input as CoreArcaneCreationInput|undefined;
  const recorded=saved?.initialPlan.classId===classId?saved:null;
  const taskFacts=creation.tasks.find(t=>t.id==='initial-spells')?.facts;
  const planSpells=(taskFacts?.plan as {spells?:string[]}|undefined)?.spells??taskFacts?.spells as string[]|undefined;
  const plannedIds=(planSpells??[]).map(slug=>`adnd1e-core:${classId}:1:${slug}`);
  const ids=[...plannedIds,...definitions.map(s=>s.definitionId).filter(id=>!plannedIds.includes(id))],intelligence=evaluateCoreEligibility(creation.candidate).adjustedScores.INT;
  let state:KnowabilityState=newKnowabilityState(intelligence,recorded?.chanceToKnow.spellIds??ids);
  const attempts:CoreArcaneCreationInput['chanceToKnow']['attempts']=recorded?structuredClone(recorded.chanceToKnow.attempts):[];
  for(const attempt of attempts)state=recordKnowabilityAttempt(state,attempt.spellId,attempt.percentile);
  let rollMethod:CoreArcaneCreationInput['rollMethod']=recorded?.chanceToKnow.rollMethod??'physical-or-external';
  const title=document.createElement('h3');title.textContent='完成初始法术书';
  const explanation=document.createElement('p');explanation.textContent='以下是明确战役采用的取得流程，不是PHB与DMG冲突的唯一RAW解释：要求已记录的Chance to Know成功及实际来源、转录。候选集仅限已核初始表，不是完整PHB法术清单；最低可理解数量不会补发法术书。其他采用须另行裁定，不能虚构通过骰点。';
  const rule=intelligenceSpellRule(intelligence),info=document.createElement('p');info.textContent=`智力${intelligence}：成功率${rule.chancePercent}%，最低${rule.minimumPerLevel}种、最高${rule.maximumPerLevel??'不限'}种可理解法术。理解、持有书页和已经准备分别记录。`;
  const adopted=document.createElement('input');adopted.type='checkbox';adopted.checked=Boolean(recorded);
  const actor=document.createElement('input'),at=document.createElement('input'),reason=document.createElement('textarea');actor.value=recorded?.adoption.actorId??'';at.value=recorded?.adoption.at??'';reason.value=recorded?.adoption.reason??'';
  const label=(text:string,input:HTMLElement)=>{const node=document.createElement('label');node.textContent=text;node.append(input);return node;};
  host.append(title,explanation,info,label('DM明确采用上述取得与理解检查方式',adopted),label('确认采用的DM',actor),label('实际确认时间（战役记法或记录时间，明确填写）',at),label('本战役采用说明',reason));
  const sources=document.createElement('details'),sourceTitle=document.createElement('summary'),sourceBody=document.createElement('div');sourceTitle.textContent='初始授予与理解检定的原书依据';renderRuleSources(sourceBody,['phb:10:intelligence-table-ii',classId==='magic-user'?'dmg:39:initial-magic-user-spells':'dmg:39:initial-illusionist-spells']);sources.append(sourceTitle,sourceBody);host.append(sources);
  const select=document.createElement('select'),face=document.createElement('input');face.type='number';face.min='1';face.max='100';face.setAttribute('aria-label','本次实际理解检定d100');
  const one=document.createElement('button');one.type='button';one.textContent='记录本次实体骰';
  const auto=document.createElement('button');auto.type='button';auto.textContent='为剩余候选执行浏览器掷骰';
  const progress=document.createElement('p'),history=document.createElement('details'),summary=document.createElement('summary'),rolls=document.createElement('ol');summary.textContent='查看本次完整骰史';history.append(summary,rolls);
  const status=document.createElement('p');status.setAttribute('role','status');
  function pending(){return state.spellIds.filter(id=>!state.knownSpellIds.includes(id)&&!state.attempts.some(a=>a.round===state.round&&a.spellId===id));}
  function refresh(){const next=pending();select.replaceChildren(...next.map(id=>new Option(arcaneSpellLabel(slug(id)),id)));select.disabled=one.disabled=auto.disabled=state.status!=='checking';progress.textContent=`已记录${attempts.length}次，当前第${state.round}轮；可理解${state.knownSpellIds.length}种，${state.status==='checking'?'尚未完成检查':'本轮检查已停止'}。不会自动追加书中法术。`;rolls.replaceChildren(...state.attempts.map(a=>{const li=document.createElement('li');li.textContent=`第${a.round}轮 · ${arcaneSpellLabel(slug(a.spellId))} · d100=${a.percentile} · ${a.success?'成功':'失败'}`;return li;}));}
  one.onclick=()=>{try{if(attempts.length&&rollMethod==='browser-crypto')throw new Error('本轮已有浏览器骰史，不混入实体骰；请继续浏览器掷骰。');const attempt={spellId:select.value,percentile:Number(face.value)};state=recordKnowabilityAttempt(state,attempt.spellId,attempt.percentile);attempts.push(attempt);face.value='';refresh();status.textContent='实际骰点已保留在本页，完成后请保存创建进度。';}catch(error){status.textContent=(error as Error).message;}};
  auto.onclick=()=>{try{if(attempts.length&&rollMethod!=='browser-crypto')throw new Error('已有实体骰记录，本轮不混用随机方式；请继续录入实际骰。');rollMethod='browser-crypto';while(state.status==='checking'&&attempts.length<1000){const attempt={spellId:pending()[0],percentile:percentile()};state=recordKnowabilityAttempt(state,attempt.spellId,attempt.percentile);attempts.push(attempt);}refresh();status.textContent='已保留实际浏览器随机骰史；不因初始授予冲突而重掷成功。';}catch(error){status.textContent=(error as Error).message;}};
  host.append(label('本次检查法术',select),label('实际d100（00填100）',face),one,auto,progress,history);
  const savedDraft=taskFacts?.uiDraft as CoreArcaneCreationUiDraft|undefined;
  const acquired=(planSpells??[]).map(spell=>{
    const definition=definitions.find(d=>slug(d.definitionId)===spell)!;
    const row=document.createElement('details'),legend=document.createElement('summary');legend.textContent=`${arcaneSpellLabel(spell)} · 实际来源与取得结果`;row.append(legend);
    const existing=recorded?.acquisitions.find(a=>a.spellId===definition.definitionId),draft=savedDraft?.acquisitions.find(a=>a.spellId===definition.definitionId),access=document.createElement('input');access.type='checkbox';access.checked=existing?.sourceAccessConfirmed??draft?.sourceAccessConfirmed??false;
    const source=document.createElement('input');source.value=existing?.sourceLabel??draft?.sourceLabel??'';
    const outcome=document.createElement('select');outcome.append(new Option('选择实际结果',''),new Option('实际已取得并成功记入书中','success'),new Option('实际取得／转录失败','failure'));outcome.value=existing?.outcome??'';
    row.append(label('实际可用的导师／书页来源名称',source),label('已确认实际来源访问条件',access),label('实际取得结果',outcome));host.append(row);return {definition,source,access,outcome,existing,draft};
  });
  const save=document.createElement('button');save.type='button';save.textContent='检查并保存真实法术书';
  function persist(partial:boolean){try{
    const current=read();if(!current||!adopted.checked||!actor.value.trim()||!at.value.trim()||!reason.value.trim())throw new Error('请明确记录本战役采用及DM确认，不使用默认裁定。');
    if(!partial&&acquired.some(a=>!a.access.checked||!a.source.value.trim()||!a.outcome.value))throw new Error('请逐项确认实际来源与取得结果；理解成功不自动代表持有法术书。');
    const actual=acquired.filter(a=>a.access.checked&&a.source.value.trim()&&a.outcome.value);
    const acquisitions:CoreArcaneCreationInput['acquisitions']=actual.map(a=>{
      const original=a.existing;
      return {spellId:a.definition.definitionId,sourceEntityId:original?.sourceEntityId??`${current.id}:initial-source:${slug(a.definition.definitionId)}`,transcriptionId:original?.transcriptionId??`${current.id}:initial-copy:${slug(a.definition.definitionId)}`,sourceLabel:a.source.value.trim(),sourceAccessConfirmed:true,outcome:a.outcome.value as 'success'|'failure',...(original?.actualCostGp===undefined?{}:{actualCostGp:original.actualCostGp}),...(original?.actualDurationMinutes===undefined?{}:{actualDurationMinutes:original.actualDurationMinutes}),...(original?.rulingId===undefined?{}:{rulingId:original.rulingId})};
    });
    const input:CoreArcaneCreationInput={initialPlan:recorded?.initialPlan??initialPlan,rollMethod:recorded?.rollMethod??'physical-or-external',chanceToKnow:{spellIds:[...state.spellIds],attempts,rollMethod},adoption:{policy:'require-successful-checks',actorId:actor.value.trim(),at:at.value.trim(),reason:reason.value.trim(),sourceIds:recorded?.adoption.sourceIds??['phb:10:intelligence-table-ii',classId==='magic-user'?'dmg:39:initial-magic-user-spells':'dmg:39:initial-illusionist-spells']},spellbookId:recorded?.spellbookId??`${current.id}:initial-spellbook`,acquisitions};
    const uiDraft:CoreArcaneCreationUiDraft={acquisitions:acquired.map(a=>({spellId:a.definition.definitionId,sourceLabel:a.source.value.trim(),sourceAccessConfirmed:a.access.checked,outcome:(a.outcome.value||'') as ''|'success'|'failure',...(a.existing?.actualCostGp===undefined?{}:{actualCostGp:a.existing.actualCostGp}),...(a.existing?.actualDurationMinutes===undefined?{}:{actualDurationMinutes:a.existing.actualDurationMinutes}),...(a.existing?.rulingId===undefined?{}:{rulingId:a.existing.rulingId})}))};
    const result=recordCoreArcaneCreation(current,input,uiDraft);write(result.document);status.textContent=result.document.tasks.find(t=>t.id==='initial-spells')!.note;
  }catch(error){status.textContent=(error as Error).message;}}
  save.onclick=()=>persist(false);
  const checkpoint=document.createElement('button');checkpoint.type='button';checkpoint.textContent='保留当前骰史与取得进度';checkpoint.onclick=()=>persist(true);
  host.append(checkpoint,save,status);refresh();
}
