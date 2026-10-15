import assert from 'node:assert/strict';
import { calculateCoreInitialHp, calculateCoreStartingMoney, calculateSingleCareerInitialHp } from '../src/character/engine/core-starting-resources';
import { startingMoneyFamilyByClass, startingMoneyRules } from '../src/character/rules/core-starting-resources';
const expected={cleric:[3,6,10,30,180],fighter:[5,4,10,50,200],'magic-user':[2,4,10,20,80],thief:[2,6,10,20,120],monk:[5,4,1,5,20]} as const;
for(const [id,values] of Object.entries(expected)){const rule=startingMoneyRules[id as keyof typeof startingMoneyRules];assert.deepEqual([rule.diceCount,rule.dieSides,rule.multiplierGp,rule.minimumGp,rule.maximumGp],values);}
assert.equal(startingMoneyFamilyByClass.druid,'cleric');assert.equal(startingMoneyFamilyByClass.paladin,'fighter');assert.equal(startingMoneyFamilyByClass.ranger,'fighter');assert.equal(startingMoneyFamilyByClass.illusionist,'magic-user');assert.equal(startingMoneyFamilyByClass.assassin,'thief');
const fighter=calculateCoreStartingMoney({classIds:['fighter'],faces:[2,2,2,2,2]});assert.equal(fighter.status,'calculated');if(fighter.status==='calculated')assert.equal(fighter.gp,100);
const monk=calculateCoreStartingMoney({classIds:['monk'],faces:[4,4,4,4,4]});assert.equal(monk.status,'calculated');if(monk.status==='calculated')assert.equal(monk.gp,20,'monk does not multiply by ten');
assert.equal(calculateCoreStartingMoney({classIds:['fighter','magic-user'],faces:[]}).status,'needs-dm','multiclass money must not be invented');
assert.throws(()=>calculateCoreStartingMoney({classIds:['cleric'],faces:[6,6]}),/Expected 3d6/);assert.throws(()=>calculateCoreStartingMoney({classIds:['thief'],faces:[6,7]}),/Invalid d6/);
const ranger=calculateSingleCareerInitialHp({classIds:['ranger'],constitution:15,rolls:[8,1]});assert.equal(ranger.status,'calculated');if(ranger.status==='calculated')assert.deepEqual([ranger.constitutionAdjustment,ranger.actualAward],[1,11]);
assert.equal(calculateSingleCareerInitialHp({classIds:['fighter','magic-user'],constitution:15,rolls:[]}).status,'needs-dm');
const fm=calculateCoreInitialHp({classIds:['fighter','magic-user'],constitution:14,rollsByClass:{fighter:[8],'magic-user':[3]}});assert.equal(fm.status,'calculated');assert.equal(fm.actualAward,6);
const fmEven=calculateCoreInitialHp({classIds:['fighter','magic-user'],constitution:14,rollsByClass:{fighter:[7],'magic-user':[3]}});assert.equal(fmEven.actualAward,5);
const fmtDown=calculateCoreInitialHp({classIds:['fighter','magic-user','thief'],constitution:14,rollsByClass:{fighter:[5],'magic-user':[2],thief:[3]}});assert.equal(fmtDown.actualAward,3);
const fmtUp=calculateCoreInitialHp({classIds:['fighter','magic-user','thief'],constitution:14,rollsByClass:{fighter:[5],'magic-user':[3],thief:[3]}});assert.equal(fmtUp.actualAward,4);
const fmCon=calculateCoreInitialHp({classIds:['fighter','magic-user'],constitution:17,rollsByClass:{fighter:[8],'magic-user':[3]}});assert.equal(fmCon.actualAward,8,'fighter +3 and magic-user capped +2 are applied to their own dice before division');
assert.throws(()=>calculateCoreInitialHp({classIds:['fighter','fighter'],constitution:14,rollsByClass:{fighter:[8]}}),/distinct/);
console.log('PASS: PHB35 five money formulas including monk, explicit sub-class families, face validation, ranger two-die HP, and PHB19 multiclass initial HP totals, per-class CON scope and half-up division. Multiclass money remains fail-closed.');
