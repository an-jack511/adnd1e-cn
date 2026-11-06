import assert from 'node:assert/strict';
import { newCoreCreation, selectCoreCandidate, recordCreationTask, approveCreationTask, admitCoreCreation, parseCoreCreation } from '../../src/character/workflows/core-create';
import { createRuntimeFromAdmittedCoreCreation, replayRegistryForCoreAdmission } from '../../src/character/workflows/core-admission';
import { calculateCoreInitialHp, calculateCoreStartingMoney } from '../../src/character/engine/core-starting-resources';
import { planCoreLanguages } from '../../src/character/engine/core-languages';
import { validateCoreWeaponSelections } from '../../src/character/engine/core-weapon-proficiency';
import { evaluateCoreEquipmentLegality } from '../../src/character/engine/core-equipment-legality';
import { commitCorePurchase, emptyCoins, moneyValueCp, type CoreInventoryLedger } from '../../src/character/engine/core-inventory';
import { generateCorePsionics } from '../../src/character/engine/core-psionics';
import { createCharacterRuntime, replayCharacter } from '../../src/character/domain/character-record';
import { newCoreCampaignArchive, commitCoreCampaignAction, parseCoreCampaignArchive, replayCoreCampaignActions } from '../../src/character/workflows/core-campaign-runtime';
import { getCoreProgressionRow } from '../../src/character/rules/core-progression';
import {completedCoreRestHistory} from '../../src/character/workflows/core-rest-history';

/** Verified engine-created fixture shared by new workspace tests. */
export function admittedFighter(withArmor=false){
const scores={STR:16,INT:9,WIS:12,DEX:12,CON:14,CHA:10};
let doc=newCoreCreation({id:withArmor?'defense-fighter':'lifecycle-fighter',name:withArmor?'Armor test fighter':'Campaign fighter',generation:{draftId:'physical-roll-record',draftRevision:1,batchId:'batch-one',method:'DMG:I',scores}});
doc=selectCoreCandidate(doc,{raceId:'human',subraceId:null,sex:'male',alignmentId:'NG',initialScores:scores,classIds:['fighter'],mode:'single',campaign:{allowedRaceIds:['human'],bardEnabled:false}});
const hp=calculateCoreInitialHp({classIds:['fighter'],constitution:14,rollsByClass:{fighter:[7]}});
doc=recordCreationTask(doc,'hp',{status:'complete',sourceIds:[...hp.sourceIds],note:'Recorded physical die',facts:{...hp,rollMethod:'physical-or-external'}});
const money=calculateCoreStartingMoney({classIds:['fighter'],faces:[4,4,4,4,4]});assert.equal(money.status,'calculated');if(money.status!=='calculated')throw new Error('Missing money');
doc=recordCreationTask(doc,'money',{status:'complete',sourceIds:[...money.sourceIds],note:'PHB roll',facts:{...money}});
const languages=planCoreLanguages({raceId:'human',alignmentId:'neutral-good',intelligence:9,careers:[{classId:'fighter',level:1}],selections:[{entitlementId:'intelligence-extra',languageId:'orcish',dmApproved:true,acquisition:'pre-existing-at-creation'}]});
assert.equal(Object.values(languages.openSlots).reduce((a,b)=>a+b,0),0);
doc=recordCreationTask(doc,'languages',{status:'complete',sourceIds:[...languages.sourceIds],note:'Automatic languages',facts:{...languages}});
const weapons=['dagger','sword-long','sword-short','spear'] as const;
const slots=validateCoreWeaponSelections({classId:'fighter',level:1,weaponIds:weapons});
const legality=weapons.map(family=>evaluateCoreEquipmentLegality({classId:'fighter',item:{kind:'weapon',id:family,family}}));assert.ok(legality.every(r=>r.verdict==='class-permitted'));
doc=recordCreationTask(doc,'proficiencies',{status:'complete',sourceIds:[...slots.sourceIds,...legality.flatMap(r=>r.sourceIds)],note:'Four distinct permitted weapons',facts:{slots,legality}});
const initial:CoreInventoryLedger={revision:0,locations:[{id:'character',kind:'character',label:doc.name,parentLocationId:null}],items:[],wallets:[{id:'purse',label:'Starting purse',locationId:'character',coins:{...emptyCoins(),gp:money.gp}}]};
const line=(instanceId:string,definitionId:string,agreedUnitPriceCp:number)=>({instanceId,definitionId,quantity:1,destinationLocationId:'character',agreedUnitPriceCp,availability:{status:'dm-approved' as const,decisionId:'dm-supply'},bulk:'unknown' as const,bulkRulingId:null});
const purchase=commitCorePurchase({ledger:initial,eventId:'starting-purchase',expectedRevision:0,walletId:'purse',lines:[line('rope-one','rope-fifty-foot',40),...withArmor?[line('mail-one','armor-chain',15000),line('shield-one','shield-large',3000)]:[]],tender:{...emptyCoins(),gp:withArmor?91:1},change:{...emptyCoins(),cp:160}});
assert.equal(moneyValueCp(purchase.next.wallets[0].coins),money.gp*200-40-(withArmor?18000:0));
doc=recordCreationTask(doc,'equipment',{status:'needs-dm',sourceIds:['phb:35:money-equipment'],note:'Needs carrying review',facts:{ledger:purchase.next,receipt:purchase.receipt}});
const psionics=generateCorePsionics({enabled:false,raceId:'human',scores:{intelligence:9,wisdom:12,charisma:10}});
doc=recordCreationTask(doc,'psionics',{status:'complete',sourceIds:[...psionics.sourceIds],note:'Campaign disabled',facts:{...psionics}});
doc=recordCreationTask(doc,'initial-spells',{status:'not-applicable',sourceIds:['project:core-first-level-noncasting-task'],note:'Fighter level one',facts:{classId:'fighter',level:1}});
doc=recordCreationTask(doc,'admission-context',{status:'needs-dm',sourceIds:['project:campaign-admission-context'],note:'Campaign entry',facts:{campaignId:'test-campaign',location:'village',day:1}});
assert.throws(()=>admitCoreCreation(doc,{actorId:'dm',at:'now',scope:'test-campaign'}),/not complete/);
doc=parseCoreCreation(JSON.parse(JSON.stringify(doc)));
for(const id of ['equipment','admission-context'] as const)doc=approveCreationTask(doc,id,{actorId:'dm',at:'2026-10-15T08:00:00Z',reason:'Verified recorded facts for campaign entry',sourceIds:doc.tasks.find(t=>t.id===id)!.sourceIds});
assert.equal(doc.status,'ready-for-review');
doc=admitCoreCreation(doc,{actorId:'dm',at:'2026-10-15T08:01:00Z',scope:'test-campaign'});
const archive=createRuntimeFromAdmittedCoreCreation({document:parseCoreCreation(JSON.parse(JSON.stringify(doc)))});
const pristine=createCharacterRuntime({characterId:doc.id,branchId:'main',name:doc.name,raceId:'human',alignment:'NG',description:`Admitted core creation ${doc.id}`});
assert.deepEqual(replayCharacter(pristine,archive.runtime.transaction.events,replayRegistryForCoreAdmission(archive)).transaction.facts,archive.runtime.transaction.facts);
assert.equal((archive.runtime.transaction.facts.modules[0].data as any).tasks.find((t:any)=>t.id==='hp').facts.actualAward,7);
let campaign=newCoreCampaignArchive(archive);
return campaign;
}

