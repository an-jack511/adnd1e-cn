import assert from 'node:assert/strict';
import {admittedFighter} from './fixtures/admitted-fighter';
import {admittedCaster} from './fixtures/admitted-caster';
import {campaignJournal} from '../src/character/application/campaign-journal';
import {renderCampaignJournal} from '../src/character/ui/campaign-journal-panel';
import {journalActivitySchema} from '../src/character/actions/journal-actions';
import {journalActivityFields} from '../src/character/ui/journal-activity-panel';
import {previewSheetAction,commitSheetAction,type SheetAction} from '../src/character/actions/campaign-actions';
import {commitCoreCampaignAction,replayCoreCampaignActions,type CampaignAction,type CoreCampaignArchive} from '../src/character/workflows/core-campaign-runtime';
import {campaignSheet} from '../src/character/application/campaign-sheet';

const secret='DM_ONLY_INDEPENDENT_SENTINEL';
let sequence=0;
function append(archive:CoreCampaignArchive,intent:CampaignAction['intent'],legacy=false){
  const action={id:`${secret}:${++sequence}`,actorId:`${secret}:actor`,at:`recorded-${9999-sequence}`,expectedRevision:archive.runtime.transaction.revision,intent};
  return legacy?replayCoreCampaignActions(archive.genesis,[...archive.actions,action]):commitCoreCampaignAction(archive,action);
}
function check(archive:CoreCampaignArchive){
  const before=JSON.stringify(archive),revision=archive.runtime.transaction.revision;
  const view=campaignJournal(archive),viewBefore=JSON.stringify(view),html=renderCampaignJournal(view);
  assert.equal(JSON.stringify(view),viewBefore,'render must not reverse/mutate caller entries');
  assert.equal(JSON.stringify(archive),before);
  assert.equal(view.revision,revision);
  assert.equal(view.entries.length,archive.actions.length);
  assert.equal(viewBefore.includes(secret),false,'raw IDs/actor/reason/source/location/payload text must be excluded');
  assert.equal(html.includes(secret),false);
  view.entries.forEach((entry,index)=>{
    assert.deepEqual(Object.keys(entry).sort(),['ordinal','title','category','recordedAt','gameTime','details'].sort());
    assert.equal(entry.ordinal,index+1);
    assert.equal(entry.recordedAt,archive.actions[index].at);
  });
  assert.deepEqual(campaignJournal(JSON.parse(before)),view);
  if(view.entries.length)view.entries[0].details.push('caller-only change');
  assert.equal(JSON.stringify(campaignJournal(archive)).includes('caller-only change'),false);
  return campaignJournal(archive);
}

// Legacy progress must not gain dates from later calendar adoption/reconciliation.
let archive=admittedFighter();
assert.deepEqual(check(archive).entries,[]);
archive=append(archive,{type:'initialize-life',currentHp:7,reason:secret});
archive=append(archive,{type:'record-defense',selection:{armorItemId:null,shieldItemId:null,ordinaryEquipmentConfirmed:true,note:secret}});
archive=append(archive,{type:'experience',assessment:{id:secret,xp:2001,rating:'E',sourceIds:[secret]}});
archive=append(archive,{type:'open-advancement'});
archive=append(archive,{type:'plan-training',route:'tutor',acceptedCostCp:0,reason:secret,confirmation:{tutorName:secret,sameClassProfessionAndAvailabilityConfirmed:true}});
archive=append(archive,{type:'start-training'});
archive=append(archive,{type:'training-segment',segment:{id:'old-a',weeksNumerator:1,weeksDenominator:2,dmConfirmedContinuous:true}},true);
const oldIndex=archive.actions.length-1,oldEntry=check(archive).entries[oldIndex];
assert.equal(oldEntry.gameTime,null);
archive=append(archive,{type:'configure-calendar',minutesPerDay:1000,daysPerWeek:5});
archive=append(archive,{type:'reconcile-training-segment',segmentId:'old-a',startMinute:2000,locationId:`${secret}:place-a`,reason:secret});
assert.deepEqual(check(archive).entries[oldIndex],oldEntry);
assert.equal(check(archive).entries.at(-1)!.gameTime,'第3天 第0分钟 → 第5天 第500分钟');
archive=append(archive,{type:'scheduled-training-segment',segment:{id:'dated-b',weeksNumerator:1,weeksDenominator:2,dmConfirmedContinuous:true},startMinute:4500,locationId:`${secret}:place-b`});
const stateId=(archive.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')!.data as {id:string}).id;
archive=append(archive,{type:'record-training-location-transition',fromActivityId:`${stateId}:training:old-a`,toActivityId:`${stateId}:training:dated-b`,method:'same-physical-place',continuityConfirmed:true,reason:secret,evidenceSourceId:secret});
assert.deepEqual(check(archive).entries.at(-1),{ordinal:archive.actions.length,title:'战役记录',category:'other',recordedAt:archive.actions.at(-1)!.at,gameTime:null,details:[]});
archive=append(archive,{type:'award-level-dated',hpRolls:[5],awardMinute:7000,consequencePolicy:'v2',locationPolicy:'v1'});
const awarded=check(archive);
assert.equal(awarded.entries.at(-1)!.gameTime,'第8天 第0分钟');
assert.ok(awarded.entries.at(-1)!.details.includes('正式达到 2 级。'));
assert.ok(awarded.entries.at(-1)!.details.some(s=>s.includes('最大 HP 5')));
assert.deepEqual(awarded.entries[oldIndex],oldEntry);

// Ordinary actual-activity entry: supported kinds only, no ruling injection/outcomes.
const apply=(request:SheetAction)=>{archive=commitSheetAction(archive,previewSheetAction(archive,request,{id:`activity-${++sequence}`,actorId:secret,at:'recorded-activity'}));};
const effects=(a:CoreCampaignArchive)=>{const s=campaignSheet(a);return {level:s.level,xp:s.xp,maximumHp:s.maximumHp,life:s.life,inventory:s.inventory,prepared:s.prepared};};
const unchangedEffects=effects(archive);
for(const [index,kind] of (['travel','adventuring','rest','study','language-study','spell-research','magic-item-manufacture','other'] as const).entries()){
  const before=JSON.stringify(archive),revision=archive.runtime.transaction.revision;
  const request={type:'character.recordActivity' as const,kind,startMinute:20000+index*20,endMinuteExclusive:20010+index*20,location:secret,actualIntervalConfirmed:true as const};
  const plan=previewSheetAction(archive,request,{id:`activity-${++sequence}`,actorId:secret,at:'recorded-activity'});
  assert.equal(JSON.stringify(archive),before,'preview must not write');
  archive=commitSheetAction(archive,plan);
  assert.equal(archive.runtime.transaction.revision,revision+1);
  assert.deepEqual(effects(archive),unchangedEffects,'occupation is not a grant, charge, rest benefit or training award');
  const last=archive.actions.at(-1)!.intent;
  assert.equal(last.type,'schedule-activity');
  assert.equal(Object.hasOwn(last,'rulings'),false);
  assert.ok(check(archive).entries.at(-1)!.gameTime);
}
const activity={type:'character.recordActivity' as const,kind:'travel' as const,startMinute:20000,endMinuteExclusive:20010,location:'actual location',actualIntervalConfirmed:true as const};
const beforeConflict=JSON.stringify(archive);
assert.throws(()=>apply(activity),/overlap/);
assert.throws(()=>apply({...activity,startMinute:50,endMinuteExclusive:40}));
assert.equal(JSON.stringify(archive),beforeConflict);
for(const extra of [{rulings:[]},{sourceIds:[secret]},{actorId:secret},{payload:{private:secret}}])assert.throws(()=>journalActivitySchema.parse({...activity,...extra}));
for(const kind of ['training','combat','spell-use','invented'])assert.throws(()=>journalActivitySchema.parse({...activity,kind}));
assert.doesNotMatch(journalActivityFields(1000),/<option value="training"/);
assert.throws(()=>previewSheetAction(admittedFighter(),activity,{id:'no-calendar',actorId:'local',at:'recorded'}),/日历/);

// Known casting offset before units exist stays undated after later adoption.
let caster=admittedCaster('cleric');
const creation=caster.genesis.runtime.transaction.facts.modules[0].data as {tasks:{id:string;facts:{ledger:{preparedCopies:{id:string}[]}}}[]};
const copyId=creation.tasks.find(t=>t.id==='initial-spells')!.facts.ledger.preparedCopies[0].id;
caster=append(caster,{type:'cast-prepared',copyId,components:'satisfied',observedOutcome:secret,reason:secret,atMinute:1500});
const undatedCast=check(caster).entries[0];
assert.equal(undatedCast.gameTime,null);
caster=append(caster,{type:'configure-calendar',minutesPerDay:1000,daysPerWeek:5});
assert.deepEqual(check(caster).entries[0],undatedCast);

const forged=structuredClone(archive);
forged.runtime.transaction.facts.modules.push({id:'secret-module',kind:'dm-only',schemaVersion:'1',visibility:'dm-private',sourceIds:[secret],data:{private:secret}});
assert.throws(()=>campaignJournal(forged),'unsupported injected private modules must fail formal replay, not be projected');
const unknown=structuredClone(archive);
(unknown.actions[0].intent as unknown as {type:string}).type='unsupported-future';
assert.throws(()=>campaignJournal(unknown),/Unsupported/);
const malicious=check(archive);
malicious.name='<script>alert(1)</script>';
malicious.entries[0].recordedAt='<img src=x onerror=alert(1)>';
malicious.entries[0].details=['<svg onload=alert(1)>'];
const escaped=renderCampaignJournal(malicious);
assert.doesNotMatch(escaped,/<script>|<img src=x|<svg onload/);
assert.match(escaped,/&lt;script&gt;/);
console.log('PASS: independent journal privacy, historical calendars, exact training/award provenance, pure reads, safe fallback/HTML, actual-activity schema/overlap/no-benefit boundaries.');
