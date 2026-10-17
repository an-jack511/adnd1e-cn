import assert from 'node:assert/strict';
import {admittedFighter} from './fixtures/admitted-fighter';
import {previewSheetAction,commitSheetAction,type SheetAction} from '../src/character/actions/campaign-actions';
import {growthActionSchema} from '../src/character/actions/growth-actions';
import {campaignGrowth,formatCpAsGp,parseGpToCp} from '../src/character/application/campaign-growth';
import {campaignSheet} from '../src/character/application/campaign-sheet';
import {growthFields} from '../src/character/ui/campaign-growth-panel';
import {emptyCoins} from '../src/character/engine/core-inventory';
import {newCoreAdvancement,openAdvancementCandidate,acceptAdvancementGate} from '../src/character/workflows/core-advancement';
import {parseCoreCampaignArchive} from '../src/character/workflows/core-campaign-runtime';

// Independent regression for the two findings in 10-growth-independent-review.md.
// Existing single fighter fixture only; no browser or full lifecycle/suite claim.
let archive=admittedFighter(),sequence=0;
function preview(request:SheetAction){
  return previewSheetAction(archive,request,{id:`independent-growth-${++sequence}`,actorId:'local-table',at:'independent review'});
}
function apply(request:SheetAction){archive=commitSheetAction(archive,preview(request));}
function rejects(request:SheetAction){
  const before=JSON.stringify(archive);
  assert.throws(()=>preview(request));
  assert.equal(JSON.stringify(archive),before,'failed previews must not mutate the archive');
}

for(const cp of [1,2,199,200,201,301,300000,Number.MAX_SAFE_INTEGER]){
  assert.equal(parseGpToCp(formatCpAsGp(cp)),cp,'gp text must preserve exact cp');
}
assert.equal(parseGpToCp('0.005'),1);
assert.equal(parseGpToCp('1.505'),301);
for(const value of ['0','-1','0.001','1.234','1e3','','NaN','9007199254740992']){
  assert.throws(()=>parseGpToCp(value));
}

apply({type:'character.initializeLife',currentHp:7,confirmed:true});
apply({type:'character.growth.experience',xp:2001,rating:'E',finalAwardConfirmed:true});
apply({type:'character.growth.open'});
apply({type:'character.growth.plan',route:'tutor',tutorName:'Actual fighter tutor',actualInstructionConfirmed:true});
const pay={type:'character.growth.pay' as const,walletId:'purse',exactCoinsConfirmed:true as const};
assert.equal(campaignGrowth(archive).candidate!.remainingCp,300000);
assert.match(growthFields(campaignGrowth(archive),'growth-pay').html,/name="amountGp"/);
rejects(pay); // Omission still means full balance, beyond this wallet's actual coins.
for(const amountCp of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>growthActionSchema.parse({...pay,amountCp}));
}
rejects({...pay,amountCp:300001});
rejects({...pay,amountCp:40000}); // Below course balance but above this wallet's value.

const coinsBefore=campaignSheet(archive).inventory!.wallets[0].coins;
apply({...pay,amountCp:20000}); // Original P2: actual 100gp partial payment now succeeds.
assert.equal(campaignGrowth(archive).candidate!.paidCp,20000);
assert.equal(campaignGrowth(archive).candidate!.remainingCp,280000);
assert.equal(campaignSheet(archive).inventory!.wallets[0].coins.gp,coinsBefore.gp-100);
rejects({type:'character.growth.start',actualStartConfirmed:true});
rejects({...pay,amountCp:301,tender:{...emptyCoins(),gp:2}});
rejects({...pay,amountCp:301,tender:{...emptyCoins(),gp:2},change:emptyCoins()});
const beforeChange=campaignSheet(archive).inventory!.wallets[0].coins;
apply({...pay,amountCp:301,tender:{...emptyCoins(),gp:2},change:{...emptyCoins(),cp:99}});
const afterChange=campaignSheet(archive).inventory!.wallets[0].coins;
assert.equal(afterChange.gp,beforeChange.gp-2);
assert.equal(afterChange.cp,beforeChange.cp+99);
assert.equal(campaignGrowth(archive).candidate!.remainingCp,279699);
rejects({type:'character.growth.start',actualStartConfirmed:true});
apply({type:'character.growth.income',walletId:'purse',coins:{...emptyCoins(),gp:2000},actualIncomeConfirmed:true});
apply(pay); // Optional amount omitted: clear only the true remaining amount.
assert.equal(campaignGrowth(archive).candidate!.remainingCp,0);
assert.equal(campaignGrowth(archive).candidate!.paidCp,300000);
apply({type:'character.growth.start',actualStartConfirmed:true});
assert.equal(campaignGrowth(archive).status,'training-active');
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(archive))),archive);

const assessment={id:'r',xp:2001,rating:'E' as const,sourceIds:['dmg:86:gaining-levels']};
const pending=openAdvancementCandidate({
  ...newCoreAdvancement({classId:'fighter',level:1,xp:2001,constitution:12,levelCap:1}),
  assessments:[assessment],
});
const decision={actorId:'local-dm',reason:'Actual table decision'};
const pendingBefore=JSON.stringify(pending);
assert.throws(()=>acceptAdvancementGate(pending,{...decision,classification:'factual-confirmation'}),/战役例外/);
assert.equal(JSON.stringify(pending),pendingBefore);
const exception=acceptAdvancementGate(pending,{...decision,classification:'campaign-exception'});
assert.equal(exception.status,'training-planned');
assert.equal(exception.candidate!.dmDecision!.classification,'campaign-exception');
assert.equal(exception.history.at(-1)!.classification,'campaign-exception');
const legacy=acceptAdvancementGate(pending,decision);
assert.equal(legacy.status,'training-planned','undefined legacy classification remains accepted');
assert.equal(Object.hasOwn(legacy.history.at(-1)!,'classification'),false);
assert.throws(()=>growthActionSchema.parse({type:'character.growth.gate',reason:decision.reason,dmDecisionConfirmed:true}));
const unresolved=openAdvancementCandidate({
  ...newCoreAdvancement({classId:'fighter',level:1,xp:2001,constitution:12,levelCap:'needs-dm'}),
  assessments:[assessment],
});
assert.equal(acceptAdvancementGate(unresolved,{...decision,classification:'factual-confirmation'}).status,'training-planned');
console.log('PASS: independent growth P2 regression: partial payments, exact gp/cp, actual change, unpaid start refusal, remaining balance replay, cap classification, legacy undefined boundary.');
