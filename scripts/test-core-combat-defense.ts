import assert from 'node:assert/strict';
import {coreCombatBase,coreAttackTarget,mostFavorableBaseSaves,printedFighterPerLevelBonus} from '../src/character/engine/core-combat';
import {attackMatrices,attackBands,savingBands,savingMatrices,opponentArmorClasses,type MatrixFamily} from '../src/character/rules/core-combat-matrices';
import {coreDefense,type DefenseSelection,ordinaryArmorAc} from '../src/character/engine/core-defense';
import type {CoreInventoryLedger} from '../src/character/engine/core-inventory';
import {admittedFighter} from './fixtures/admitted-fighter';
import {previewSheetAction,commitSheetAction} from '../src/character/actions/campaign-actions';
import {campaignSheet} from '../src/character/application/campaign-sheet';
import {parseCoreCampaignArchive} from '../src/character/workflows/core-campaign-runtime';
import {commitCoreCampaignAction} from '../src/character/workflows/core-campaign-runtime';
import type {InitialCoreClassId} from '../src/character/rules/core-progression';

const families:Record<InitialCoreClassId,[MatrixFamily,MatrixFamily]>={cleric:['cleric','cleric'],druid:['cleric','cleric'],fighter:['fighter','fighter'],paladin:['fighter','fighter'],ranger:['fighter','fighter'],'magic-user':['arcane','arcane'],illusionist:['arcane','arcane'],thief:['thief','thief'],assassin:['thief','thief'],monk:['cleric','thief']};
for(const [career,[attack,save]] of Object.entries(families))for(let level=1;level<=25;level++){
  const row=coreCombatBase(career as InitialCoreClassId,level),a=attackBands[attack].findIndex(([low,high])=>level>=low&&(high===null||level<=high)),s=savingBands[save].findIndex(([low,high])=>level>=low&&(high===null||level<=high));
  assert.deepEqual(row.saves.map(v=>v.target),savingMatrices[save][s]);assert.deepEqual(row.attackBand,attackBands[attack][a]);assert.deepEqual(row.savingBand,savingBands[save][s]);
  for(const ac of opponentArmorClasses)assert.equal(coreAttackTarget(career as InitialCoreClassId,level,ac),attackMatrices[attack][ac+10][a]);
}
// Page-image spot anchors independent of the arrays; full728-cell audit is documented separately.
assert.deepEqual(coreCombatBase('fighter',1).saves.map(v=>v.target),[14,15,16,17,17]);
assert.equal(coreAttackTarget('fighter',1,-5),20);assert.equal(coreAttackTarget('fighter',1,0),20);assert.equal(coreAttackTarget('fighter',1,1),19);
assert.deepEqual(coreCombatBase('monk',4).attackBand,[4,6]);assert.deepEqual(coreCombatBase('monk',4).savingBand,[1,4]);
assert.deepEqual(mostFavorableBaseSaves([{classId:'cleric',level:1},{classId:'thief',level:1}]).map(s=>s.target),[10,12,14,16,15]);
assert.equal(printedFighterPerLevelBonus('fighter',2),0);assert.equal(printedFighterPerLevelBonus('fighter',2,true),1);
for(const level of [0,-1,1.5,NaN,Infinity])assert.throws(()=>coreCombatBase('fighter',level));
for(const ac of [-11,11,1.5,NaN])assert.throws(()=>coreAttackTarget('fighter',1,ac));
assert.throws(()=>coreCombatBase('bard' as InitialCoreClassId,1));
const selection:DefenseSelection={armorItemId:null,shieldItemId:null,ordinaryEquipmentConfirmed:true,note:'actual table facts'};
const ledger:CoreInventoryLedger={revision:0,locations:[{id:'self',kind:'character',label:'carried',parentLocationId:null},{id:'vault',kind:'storage',label:'vault',parentLocationId:null}],items:[],wallets:[]};
const item=(id:string,definitionId:string)=>({id,definitionId,label:definitionId,quantity:1,locationId:'self',weight:{kind:'unknown' as const},bulk:'unknown' as const,bulkRulingId:null,acquiredByEventId:'purchase'});
const inventory={...ledger,items:[item('plate','armor-plate'),item('leather','armor-leather'),item('wood','shield-small-wooden'),item('large','shield-large')]};
const defense=(classId:InitialCoreClassId,level=1,dexterity=18,chosen=selection,stock=inventory)=>coreDefense({classId,level,dexterity,selection:chosen,inventory:stock});
assert.equal(coreDefense({classId:'fighter',level:1,dexterity:18,selection:null,inventory}).ac,null,'carried plate is not automatically worn');
assert.equal(defense('fighter').ac,6);assert.equal(defense('fighter',1,18,{...selection,armorItemId:'plate',shieldItemId:'large'}).ac,-2);
assert.equal(defense('fighter',1,3,{...selection,armorItemId:'plate',shieldItemId:'large'}).ac,6);
assert.equal(defense('monk',5).ac,7);assert.equal(defense('monk',17).ac,-3);assert.equal(defense('monk',18).status,'needs-dm');
assert.equal(defense('magic-user',1,18,{...selection,armorItemId:'plate'}).status,'needs-dm');
assert.equal(defense('monk',1,18,{...selection,shieldItemId:'wood'}).status,'needs-dm');
assert.equal(defense('druid',1,18,{...selection,armorItemId:'leather',shieldItemId:'wood'}).ac,3);
assert.equal(defense('druid',1,18,{...selection,shieldItemId:'large'}).status,'needs-dm','unknown shield material is not inferred');
assert.equal(defense('fighter',1,18,{...selection,armorItemId:'absent'}).status,'needs-dm');
assert.equal(defense('fighter',1,18,{...selection,armorItemId:'plate'},{...inventory,items:inventory.items.map(i=>({...i,locationId:'vault'}))}).status,'needs-dm');
for(const location of [{id:'nested',kind:'container' as const,label:'backpack',parentLocationId:'self'},{id:'nested',kind:'worn' as const,label:'not the character',parentLocationId:'vault'}]){
  const nested={...inventory,locations:[...inventory.locations,location],items:inventory.items.map(i=>({...i,locationId:'nested'}))};
  assert.equal(defense('fighter',1,18,{...selection,armorItemId:'plate'},nested).status,'needs-dm','containers and worn-under-storage cannot preserve old equippedAC');
}
for(const [definitionId,ac] of Object.entries(ordinaryArmorAc))assert.equal(defense('fighter',1,12,{...selection,armorItemId:'armor'},{...ledger,items:[item('armor',definitionId)]}).ac,ac);
let archive=admittedFighter();const unchanged=JSON.stringify(archive);
const plan=previewSheetAction(archive,{type:'character.equipDefense',selection},{id:'confirm-none',actorId:'table-player',at:'recorded time'});
assert.equal(JSON.stringify(archive),unchanged);archive=commitSheetAction(archive,plan);
assert.equal(campaignSheet(archive).defense.ac,10);assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(archive))),archive);
const snapshot=JSON.stringify(archive);assert.throws(()=>previewSheetAction(archive,{type:'character.equipDefense',selection:{...selection,armorItemId:'absent'}},{id:'bad-armor',actorId:'table-player',at:'recorded time'}));assert.equal(JSON.stringify(archive),snapshot);
let armored=admittedFighter(true);assert.equal(campaignSheet(armored).defense.ac,null);
armored=commitSheetAction(armored,previewSheetAction(armored,{type:'character.equipDefense',selection:{...selection,armorItemId:'mail-one',shieldItemId:'shield-one'}},{id:'equip-mail',actorId:'table-player',at:'recorded time'}));
assert.equal(campaignSheet(armored).defense.ac,4);assert.equal(campaignSheet(armored).defense.withoutShield,5);
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(armored))),armored);
armored=commitCoreCampaignAction(armored,{id:'lose-mail',actorId:'table-player',at:'recorded time',expectedRevision:armored.runtime.transaction.revision,intent:{type:'consume-item',itemId:'mail-one',quantity:1,reason:'lost equipment',sourceId:'project:fixture-loss'}});
assert.equal(campaignSheet(armored).defense.status,'needs-dm','lost worn item must not silently become unarmored or keep cachedAC');
console.log('PASS: core combat family/band/AC lookup, repeated20 anchors, explicit ordinary defense, class restrictions, monkAC, no implicit equipment, portable replay and atomic rejection.');
