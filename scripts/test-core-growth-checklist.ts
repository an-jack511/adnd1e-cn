import assert from 'node:assert/strict';
import { newCoreCreation, selectCoreCandidate } from '../src/character/workflows/core-create';
import { newCoreAdvancement } from '../src/character/workflows/core-advancement';
import { deriveCoreGrowthChecklist } from '../src/character/workflows/core-growth-checklist';
import type { InitialCoreClassId } from '../src/character/rules/core-progression';
function fixture(classId:InitialCoreClassId){const scores={STR:18,INT:18,WIS:18,DEX:18,CON:18,CHA:18};return selectCoreCandidate(newCoreCreation({name:classId,generation:{draftId:'d',draftRevision:1,batchId:'b',method:'DMG:I',scores}}),{raceId:'human',subraceId:null,sex:'male',alignmentId:classId==='druid'?'TN':classId==='monk'?'LN':'LG',initialScores:scores,classIds:[classId],mode:'single',campaign:{allowedRaceIds:['human'],bardEnabled:false}});}
const fighter=fixture('fighter'),before=JSON.stringify(fighter);
const fighterGrowth=deriveCoreGrowthChecklist(fighter,newCoreAdvancement({classId:'fighter',level:4,xp:0,constitution:18,levelCap:'unlimited'}));
assert.equal(fighterGrowth.weaponSlots.totalSlots,5);assert.ok(fighterGrowth.tasks.some(t=>t.id==='weapon-proficiency-growth'));
assert.ok(!deriveCoreGrowthChecklist(fighter,newCoreAdvancement({classId:'fighter',level:4,xp:0,constitution:18,levelCap:'unlimited'}),['dagger','spear','sword-long','sword-short','dart']).tasks.some(t=>t.id==='weapon-proficiency-growth'));
assert.equal(JSON.stringify(fighter),before);
const mage=fixture('magic-user'),magicGrowth=deriveCoreGrowthChecklist(mage,newCoreAdvancement({classId:'magic-user',level:2,xp:0,constitution:18,levelCap:'unlimited'}));
assert.ok(magicGrowth.tasks.some(t=>t.id==='spell-growth'));assert.equal(mage.tasks.find(t=>t.id==='initial-spells')!.status,'pending','Derived capacity never grants spell knowledge');
const druid=deriveCoreGrowthChecklist(fixture('druid'),newCoreAdvancement({classId:'druid',level:3,xp:0,constitution:18,levelCap:'unlimited'}));assert.ok(druid.tasks.some(t=>t.id.startsWith('capability:')));
assert.throws(()=>deriveCoreGrowthChecklist(fighter,newCoreAdvancement({classId:'thief',level:4,xp:0,constitution:18,levelCap:'unlimited'})),/match/);
console.log('PASS: sourced weapon-slot, divine ability and arcane capacity growth tasks recompute without writing grants or changing creation facts.');
