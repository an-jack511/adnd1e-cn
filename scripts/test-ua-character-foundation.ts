import assert from 'node:assert/strict';
import {
  uaCharacterFoundationBook, uaCharacterFoundationPack, uaCharacterFoundationSources,
  uaFoundationClassRequirements, uaMethodVDiceByClass, uaProgressionFoundations,
} from '../src/character/rules/ua-character-foundation';
import {
  applyUaStartingHitPointFloor, evaluateUaMethodV, getUaProgressionAtXp,
  reviewUaCavalierStartingPackage, reviewUaFoundationEligibility, reviewUaThiefAcrobatTransitionEquipment,
} from '../src/character/engine/ua-character-foundation';

assert.equal(uaCharacterFoundationBook.sha256, 'E06818CBCCE7E4605837AD767E9930C126F43B08D3CE358E14746C7B73EED4F4');
assert.equal(uaCharacterFoundationSources['ua:74:method-v'].pdfPages[0], 75);
assert.equal(uaCharacterFoundationPack.defaultEnabled, false);
assert.equal(uaMethodVDiceByClass.cavalier.constitution, 9);
assert.equal(uaMethodVDiceByClass.paladin.charisma, 9);
assert.equal(uaMethodVDiceByClass.barbarian.strength, 9);
assert.deepEqual(uaFoundationClassRequirements.barbarian.maximums, {wisdom:16});

const pools = (classId: keyof typeof uaMethodVDiceByClass, value = 4):Parameters<typeof evaluateUaMethodV>[0]['rolls'] => {
  const counts=uaMethodVDiceByClass[classId];
  return {strength:Array(counts.strength).fill(value),intelligence:Array(counts.intelligence).fill(value),wisdom:Array(counts.wisdom).fill(value),dexterity:Array(counts.dexterity).fill(value),constitution:Array(counts.constitution).fill(value),charisma:Array(counts.charisma).fill(value),comeliness:Array(counts.comeliness).fill(value)};
};

const methodV = evaluateUaMethodV({
  classId:'cavalier', raceStock:'human', dmApprovedClass:true, rolls:pools('cavalier'),
  classMinimums:{strength:15,dexterity:15,constitution:15,intelligence:10,wisdom:10},
});
assert.equal(methodV.legal, true);
assert.equal(methodV.rawBestThree?.strength, 12);
assert.equal(methodV.scores?.strength, 15);
assert.ok(methodV.audit.some(line => line.includes('strength')));
assert.equal(evaluateUaMethodV({classId:'fighter',raceStock:'half-elf',dmApprovedClass:true,rolls:pools('fighter')}).legal, false);
assert.equal(evaluateUaMethodV({classId:'fighter',raceStock:'human',dmApprovedClass:false,rolls:pools('fighter')}).status, 'needs-dm');
assert.throws(() => evaluateUaMethodV({...({classId:'fighter',raceStock:'human',dmApprovedClass:true,rolls:pools('fighter')}),rolls:{...pools('fighter'),strength:[7,6,6,6,6,6,6,6,6]}}), /d6/);

const baseAbilities = {strength:15,intelligence:10,wisdom:10,dexterity:15,constitution:15,charisma:12,comeliness:10};
const cavalierPending = reviewUaFoundationEligibility({classId:'cavalier',raceStock:'human',alignment:'neutral-good',abilities:baseAbilities,uaEnabled:true,dmApproved:false});
assert.equal(cavalierPending.mechanicallyEligible, true);
assert.equal(cavalierPending.readyToEnter, false);
assert.equal(cavalierPending.nextState, 'awaiting-dm');
const cavalierReady = reviewUaFoundationEligibility({classId:'cavalier',raceStock:'human',alignment:'neutral-good',abilities:baseAbilities,uaEnabled:true,dmApproved:true,socialStandingResolved:true});
assert.equal(cavalierReady.nextState, 'ready');

const paladinWrongRace = reviewUaFoundationEligibility({classId:'paladin',raceStock:'elf-high',alignment:'lawful-good',abilities:{...baseAbilities,wisdom:13,charisma:17},uaEnabled:true,dmApproved:true,socialStandingResolved:true});
assert.equal(paladinWrongRace.mechanicallyEligible, false);
const barbarianWisdom = reviewUaFoundationEligibility({classId:'barbarian',raceStock:'human',alignment:'chaotic-neutral',abilities:{...baseAbilities,wisdom:17,dexterity:14},uaEnabled:true,dmApproved:true,nativeTerritoryApproved:true});
assert.ok(barbarianWisdom.blockers.some(item => item.includes('no greater')));

const acrobatPending = reviewUaFoundationEligibility({classId:'thief-acrobat',raceStock:'halfling',alignment:'chaotic-neutral',abilities:{...baseAbilities,dexterity:16},uaEnabled:true,dmApproved:true,currentClass:'thief',currentLevel:5,trainerLevel:9,trainingWeeksCommitted:6});
assert.equal(acrobatPending.nextState, 'awaiting-training');
const acrobatReady = reviewUaFoundationEligibility({classId:'thief-acrobat',raceStock:'halfling',alignment:'chaotic-neutral',abilities:{...baseAbilities,dexterity:16},uaEnabled:true,dmApproved:true,currentClass:'thief',currentLevel:5,trainerLevel:10,trainingWeeksCommitted:6});
assert.equal(acrobatReady.readyToEnter, true);

assert.equal(getUaProgressionAtXp('barbarian', 500000).row?.level, 8);
assert.equal(getUaProgressionAtXp('barbarian', 500001).row?.level, 9);
assert.equal(getUaProgressionAtXp('thief-acrobat', 20001).row?.level, 6);
assert.equal(getUaProgressionAtXp('paladin', 0).row, null);
assert.equal(uaProgressionFoundations.cavalier.status, 'needs-dm');

assert.deepEqual(applyUaStartingHitPointFloor('barbarian', 2, 2), {classId:'barbarian',rolledHp:2,floor:7,flooredRoll:7,finalHp:9,floorApplied:true});
assert.equal(reviewUaCavalierStartingPackage('upper-upper', 130).legal, true);
assert.equal(reviewUaCavalierStartingPackage('upper-upper', 120).legal, false);
assert.equal(reviewUaThiefAcrobatTransitionEquipment(450).legal, true);
assert.equal(reviewUaThiefAcrobatTransitionEquipment(451).legal, false);

console.log('UA character foundation: ok');
