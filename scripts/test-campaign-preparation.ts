import assert from 'node:assert/strict';
import {admittedCaster} from './fixtures/admitted-caster';
import {campaignSheet} from '../src/character/application/campaign-sheet';
import {previewSheetAction,commitSheetAction,type SheetAction} from '../src/character/actions/campaign-actions';
import {commitCoreCampaignAction,parseCoreCampaignArchive,type CoreCampaignArchive} from '../src/character/workflows/core-campaign-runtime';
import {campaignPreparationPlan,completeCampaignPreparation,assertPreparationHistoryCoherent,type CampaignSpellLedger,type PreparationFacts} from '../src/character/workflows/core-campaign-preparation';
import {newCoreCalendar} from '../src/character/workflows/core-calendar';
import {formatCampaignMinute} from '../src/character/application/campaign-time';

const context=(id:string)=>({id,actorId:'local-table-player',at:'recorded table time'});
const apply=(a:CoreCampaignArchive,action:SheetAction,id:string)=>commitSheetAction(a,previewSheetAction(a,action,context(id)));
const facts=(a:CoreCampaignArchive,start=300):PreparationFacts=>{
  const s=campaignSheet(a),v=s.spells!,choice=v.choices[0];
  return {choices:[{id:choice.id,kind:choice.kind,quantity:1}],restStartMinute:start,restEndMinute:start+240,studyStartMinute:start+240,studyEndMinute:start+255,locationId:'village-inn',completeRestAndNourishmentConfirmed:true,bookAccessOrDivineGrantConfirmed:true,restAfterLatestCastingConfirmed:true,lastCastingId:v.latestCastingId,initializeCalendar:{minutesPerDay:1440,daysPerWeek:7,confirmed:true}};
};
for(const career of ['magic-user','illusionist','cleric','druid'] as const){
  let a=admittedCaster(career),s=campaignSheet(a);assert.equal(s.spells?.enabled,false);
  assert.throws(()=>apply(a,{type:'character.prepareSpells',facts:facts(a)},'before-life'),/生命/);
  a=apply(a,{type:'character.initializeLife',currentHp:s.maximumHp!,confirmed:true},'init');
  a=apply(a,{type:'character.takeDamage',amount:1,cause:'actual earlier wound'},'wound');
  a=apply(a,{type:'character.castSpell',copyId:campaignSheet(a).prepared[0].id,componentsConfirmed:true,outcome:'actual table effect',atMinute:100},'cast');
  const beforeHp=campaignSheet(a).life!.currentHp,beforeInventory=campaignSheet(a).inventory;
  const request=facts(a),before=JSON.stringify(a),plan=previewSheetAction(a,{type:'character.prepareSpells',facts:request},context('prepare'));
  assert.equal(JSON.stringify(a),before,'preview does not mutate');
  a=commitSheetAction(a,plan);s=campaignSheet(a);
  assert.equal(s.prepared.filter(c=>c.status==='ready').length,1);assert.equal(s.prepared.filter(c=>c.status==='expended').length,1);assert.equal(s.life?.currentHp,beforeHp,'preparation must not heal an injured caster');assert.notEqual(s.life?.currentHp,s.maximumHp);assert.deepEqual(s.inventory,beforeInventory,'do not auto-consume food or change currency');
  assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(a))),a);assert.deepEqual(commitSheetAction(a,plan),a,'idempotent retry');
  assert.equal(s.calendar?.minutesPerDay,1440);
  const state=a.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')!.data as any,ledger=state.spells as CampaignSpellLedger;
  assert.equal(state.calendar.activities.length,2);assert.equal(state.spellPreparationCourses.length,1);
  const session=ledger.recoverySessions.at(-1)!;assert.equal(session.actualRestMinutes,240);assert.equal(session.actualStudyOrPrayerMinutes,15);
  assert.equal('rulingId' in session,false);assert.equal(JSON.stringify(ledger).includes('trueAuthorityId'),false);assert.equal(JSON.stringify(s.spells).includes('private'),false);
  if(career==='cleric'||career==='druid'){
    assert.equal(ledger.divineGrants.length,2,'new actual grant, not reactivation of initial grant');
    const continued={...request,studyStartMinute:555,studyEndMinute:570,lastCastingId:campaignSheet(a).spells!.latestCastingId};
    a=apply(a,{type:'character.prepareSpells',facts:continued},'continue-study');
    const next=a.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')!.data as any;
    assert.equal(next.calendar.activities.filter((x:any)=>x.kind==='rest').length,1,'one actual rest supports consecutive study');
    assert.equal(campaignSheet(a).prepared.filter(c=>c.status==='ready').length,2);
  }
  const snapshot=JSON.stringify(a),full={...facts(a,1000),choices:[{...request.choices[0],quantity:99}]};
  assert.throws(()=>apply(a,{type:'character.prepareSpells',facts:full},'over-capacity'));assert.equal(JSON.stringify(a),snapshot);
  assert.throws(()=>apply(a,{type:'character.prepareSpells',facts:{...facts(a,1000),choices:[{...request.choices[0],quantity:campaignSheet(a).spells!.capacity[0].maximum+1}]}},'capacity-not-size-limit'),/容量不足/);
  assert.throws(()=>apply(a,{type:'character.prepareSpells',facts:{...facts(a,1000),lastCastingId:'stale-casting'}},'stale-anchor'),/施法/);
  const ready=campaignSheet(a).prepared.find(c=>c.status==='ready')!;
  assert.throws(()=>apply(a,{type:'character.castSpell',copyId:ready.id,componentsConfirmed:true,outcome:''},'untimed'),/战役时间/);
  assert.throws(()=>apply(a,{type:'character.castSpell',copyId:ready.id,componentsConfirmed:true,outcome:'',atMinute:400},'before-copy'),/完成以前|次序/);
  a=apply(a,{type:'character.castSpell',copyId:ready.id,componentsConfirmed:true,outcome:'actual effect',atMinute:700},'cast-new');
  assert.throws(()=>apply(a,{type:'character.prepareSpells',facts:{...facts(a),choices:[request.choices[0]]}},'reuse-before-cast'),/施法/);
  const withNewTime=apply(a,{type:'character.prepareSpells',facts:facts(a,800)},'next-rest');assert.deepEqual(parseCoreCampaignArchive(withNewTime),withNewTime);
  const course=((a.runtime.transaction.facts.modules.find(m=>m.id==='core-advancement')!.data as any).spellPreparationCourses)[0];
  assert.throws(()=>commitCoreCampaignAction(a,{...context('late-combat'),expectedRevision:a.runtime.transaction.revision,intent:{type:'schedule-activity',activity:{id:'late-combat-time',actorId:a.runtime.transaction.characterId,kind:'combat',startMinute:400,endMinuteExclusive:410,locationId:'village-inn',sourceIds:['project:actual-late-history']},rulings:[{leftId:course.restActivityId,rightId:'late-combat-time',actorId:'dm',reason:'actual fact, not proof of preserved benefit',sourceIds:['project:actual-late-history']}]}}),/法术准备|课程/);
}
// Pure-table higher-level timing fixtures, not admitted character or spell-acquisition certification.
const origin=admittedCaster('magic-user').genesis.runtime.transaction.facts.modules[0].data as any;
const base=origin.tasks.find((t:any)=>t.id==='initial-spells').facts.ledger as CampaignSpellLedger;
const pure:CampaignSpellLedger={...structuredClone(base),preparedCopies:[],castings:[],spellbookEntries:Array.from({length:9},(_,i)=>({...base.spellbookEntries[0],id:`timing-entry-${i+1}`,spell:{...base.spellbookEntries[0].spell,definitionId:`timing-fixture:${i+1}`,displayName:`Timing level ${i+1}`,level:i+1}}))};
const ctx={classId:'magic-user' as const,level:20,intelligence:18,wisdom:12,characterId:pure.characterId};
for(let level=1;level<=9;level++){
  const plan=campaignPreparationPlan(pure,ctx,[{id:`timing-entry-${level}`,kind:'spellbook-entry',quantity:1}]);
  assert.equal(plan.requiredRestMinutes,[240,240,360,360,480,480,600,600,720][level-1]);assert.equal(plan.requiredStudyMinutes,level*15);
}
const batch=campaignPreparationPlan(pure,ctx,[{id:'timing-entry-1',kind:'spellbook-entry',quantity:2},{id:'timing-entry-7',kind:'spellbook-entry',quantity:1}]);assert.equal(batch.requiredRestMinutes,600);assert.equal(batch.requiredStudyMinutes,135);
assert.throws(()=>campaignPreparationPlan({...pure,spellbookEntries:pure.spellbookEntries.map(e=>({...e,status:'lost'}))},ctx,[{id:'timing-entry-1',kind:'spellbook-entry',quantity:1}]),/present/);
assert.throws(()=>campaignPreparationPlan({...pure,tradition:'cleric'},ctx,[{id:'timing-entry-1',kind:'spellbook-entry',quantity:1}]),/tradition/);
assert.equal(formatCampaignMinute(1695,1440),'第2天 04:15');assert.equal(formatCampaignMinute(1100,1000),'第2天 第100分钟');assert.equal(formatCampaignMinute(-1,1440),'战役时间待核');
const simple:PreparationFacts={choices:[{id:'timing-entry-1',kind:'spellbook-entry',quantity:1}],restStartMinute:0,restEndMinute:240,studyStartMinute:240,studyEndMinute:255,locationId:'inn',completeRestAndNourishmentConfirmed:true,bookAccessOrDivineGrantConfirmed:true,restAfterLatestCastingConfirmed:true,lastCastingId:null};
for(const change of [{restEndMinute:239,studyStartMinute:239,studyEndMinute:254},{studyEndMinute:254},{studyStartMinute:239},{initializeCalendar:undefined}]){
  const f={...simple,initializeCalendar:{minutesPerDay:1440,daysPerWeek:7,confirmed:true as const},...change};assert.throws(()=>completeCampaignPreparation({ledger:pure,context:ctx,calendar:null,courses:[],facts:f,eventId:'negative',recordedAt:'now',castingTimes:[]}));
}
const afterCast={...pure,castings:[{id:'future-first',preparedCopyId:'old1',spell:pure.spellbookEntries[0].spell,occurredAt:'logged first',observedOutcome:null},{id:'past-last',preparedCopyId:'old2',spell:pure.spellbookEntries[0].spell,occurredAt:'logged second',observedOutcome:null}]};
assert.throws(()=>completeCampaignPreparation({ledger:afterCast,context:ctx,calendar:newCoreCalendar({minutesPerDay:1440,daysPerWeek:7}),courses:[],facts:{...simple,lastCastingId:'past-last',restStartMinute:200,restEndMinute:440,studyStartMinute:440,studyEndMinute:455},eventId:'out-of-order',recordedAt:'now',castingTimes:[{castingId:'future-first',atMinute:1000},{castingId:'past-last',atMinute:100}]}),/施法/,'check all known cast times, not only last appended');
const result=completeCampaignPreparation({ledger:pure,context:ctx,calendar:newCoreCalendar({minutesPerDay:1440,daysPerWeek:7}),courses:[],facts:simple,eventId:'pure-course',recordedAt:'now',castingTimes:[]});
assert.throws(()=>assertPreparationHistoryCoherent(result.calendar,[result.course],[{castingId:'late-backfill',atMinute:100}]),/次序/);
console.log('PASS: four admitted caster lifecycles, source/capacity/rest/study gates, fresh divine grants, preserved copies, calendar continuity, timed casting, retroactive conflicts, portable replay and highest-level timing boundaries.');
