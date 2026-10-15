import assert from 'node:assert/strict';
import { adoptResearchProposal,createSpellResearchProject,projectResearchForPlayer,recordResearchWeek,researchSuccessTarget,weeklyResearchCost } from '../src/character/engine/core-magical-research';
const facility={hasLaboratoryOrShrine:true,hasOwnLibrary:true,privateSettingConfirmed:true,materialsConfirmed:true};
let project=createSpellResearchProject({id:'research-1',characterId:'pc-1',tradition:'magic-user',characterLevel:7,researchAbility:17,proposedSpellLevel:2,proposalText:'完整二环法术条目',facility});
project=adoptResearchProposal(project,{feasibility:'possible',approvedSpellLevel:2,dmNote:'强度调整后为二环'});
assert.deepEqual(weeklyResearchCost(project,{variableGpPerLevel:100,boostGpPerLevel:0}),{baseGp:400,variableGp:200,boostGp:0,totalGp:600});
assert.equal(researchSuccessTarget(project,0),30); // 10 + INT17 + level7 - 2*spell level2
project=recordResearchWeek(project,{id:'w1',variableGpPerLevel:100,boostGpPerLevel:0,interruptedDays:0});
project=recordResearchWeek(project,{id:'w2',variableGpPerLevel:100,boostGpPerLevel:0,interruptedDays:0});
assert.throws(()=>recordResearchWeek(project,{id:'w3-no-roll',variableGpPerLevel:100,boostGpPerLevel:0,interruptedDays:0}),/private d100/);
project=recordResearchWeek(project,{id:'w3',variableGpPerLevel:100,boostGpPerLevel:0,interruptedDays:0,privateD100:31});assert.equal(project.status,'active');
project=recordResearchWeek(project,{id:'w4-interrupted',variableGpPerLevel:100,boostGpPerLevel:0,interruptedDays:1});assert.equal(project.progressWeeks,2);
project=recordResearchWeek(project,{id:'w5',variableGpPerLevel:100,boostGpPerLevel:2000,interruptedDays:0,privateD100:35});assert.equal(project.status,'succeeded');assert.equal(project.totalSpentGp,project.weeks.reduce((sum,w)=>sum+w.paidGp,0));
const projectionText=JSON.stringify(projectResearchForPlayer(project));for(const secret of ['strong', '强度调整','privateD100','d100','targetPercent','feasibility','formula'])assert.equal(projectionText.includes(secret),false,`leaked ${secret}`);

let impossible=createSpellResearchProject({id:'research-impossible',characterId:'pc-2',tradition:'cleric',characterLevel:9,researchAbility:18,proposedSpellLevel:1,proposalText:'表面合理的神术',facility:{...facility,hasOwnLibrary:false}});impossible=adoptResearchProposal(impossible,{feasibility:'impossible',approvedSpellLevel:1,dmNote:'秘密：超出神祇权能'});impossible=recordResearchWeek(impossible,{id:'i1',variableGpPerLevel:400,boostGpPerLevel:8000,interruptedDays:0});impossible=recordResearchWeek(impossible,{id:'i2',variableGpPerLevel:400,boostGpPerLevel:8000,interruptedDays:0,privateD100:1});assert.equal(impossible.status,'active','impossible research never succeeds even on 01');assert.equal(projectResearchForPlayer(impossible).status,'in-progress');assert.equal(weeklyResearchCost(impossible,{variableGpPerLevel:100,boostGpPerLevel:0}).baseGp,2000);
assert.throws(()=>createSpellResearchProject({id:'d',characterId:'p',tradition:'druid',characterLevel:7,researchAbility:16,proposedSpellLevel:8,proposalText:'x',facility}),/maximum/);
let druid=createSpellResearchProject({id:'d',characterId:'p',tradition:'druid',characterLevel:7,researchAbility:16,proposedSpellLevel:3,proposalText:'x',facility});assert.equal(druid.status,'needs-dm');assert.throws(()=>adoptResearchProposal(druid,{feasibility:'possible',approvedSpellLevel:3,dmNote:'x'}),/explicit adoption/);
assert.throws(()=>weeklyResearchCost(project,{variableGpPerLevel:99,boostGpPerLevel:0}),/100/);assert.throws(()=>weeklyResearchCost(project,{variableGpPerLevel:100,boostGpPerLevel:1000}),/2,000/);
console.log('PASS: DMG115-116 spell research costs, preparation/check weeks, interruptions, secret feasibility/rolls, confidentiality, impossible research and druid boundary.');
