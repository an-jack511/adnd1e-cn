import assert from 'node:assert/strict';
import {
  coreRelationshipsPack,
  relationshipDefinitions,
} from '../src/character/rules/core-relationships';
import {
  calculatePrivateLoyalty,
  checkHenchmanCapacity,
  evaluateHenchmanOffer,
  projectRelationshipForPlayer,
  resolvePrivateMorale,
  type PrivateRelationshipRecord,
} from '../src/character/engine/core-relationships';

// PHB13: the cap applies to henchmen, not paid workers/troops.
assert.deepEqual(checkHenchmanCapacity(3, 0), {
  maximum: 1, current: 0, remaining: 1, status: 'available', sourceIds: ['phb:13:charisma'],
});
assert.equal(checkHenchmanCapacity(18, 15).status, 'at-capacity');
assert.equal(checkHenchmanCapacity(18, 16).status, 'over-capacity');
assert.equal(relationshipDefinitions.henchman.charismaCounted, true);
assert.equal(relationshipDefinitions.hireling.charismaCounted, false);
assert.equal(relationshipDefinitions.hireling.numberLimit, 'not-limited-by-charisma');

// DMG35: minimum payment, capped payment interest, magic-item/support and CHA reaction are separate.
let offer = evaluateHenchmanOffer({ applicantLevel: 2, initialPaymentGp: 199, usableMagicItemsOffered: 0,
  quartersAndSupportPromised: true, charismaScore: 18 });
assert.equal(offer.status, 'invalid-offer');
offer = evaluateHenchmanOffer({ applicantLevel: 1, initialPaymentGp: 400, usableMagicItemsOffered: 1,
  quartersAndSupportPromised: true, charismaScore: 14 });
assert.equal(offer.status, 'chance-calculated');
assert.equal(offer.paymentInterest, 55);
assert.equal(offer.acceptanceTarget, 85); // 55 + 15 + 5 + 10
assert.equal('privateRoll' in offer, false);
assert.equal(evaluateHenchmanOffer({ applicantLevel: 1, initialPaymentGp: 100, usableMagicItemsOffered: 0,
  quartersAndSupportPromised: false, charismaScore: 9, acceptanceRoll: 1 }).status, 'rejected'); // target 0
assert.equal(evaluateHenchmanOffer({ applicantLevel: 1, initialPaymentGp: 100, usableMagicItemsOffered: 0,
  quartersAndSupportPromised: true, charismaScore: 9, acceptanceRoll: 30 }).status, 'accepted');

// DMG36-37: 50 base + CHA and selected table entries; one strongest special penalty/bonus only.
let loyalty = calculatePrivateLoyalty({ charismaScore: 15, selections: [
  { id: 'henchman' }, { id: 'service-under-1-month' }, { id: 'guard-officer-henchman' },
  { id: 'pay-average' }, { id: 'discipline-fair' }, { id: 'treatment-just' },
  { id: 'killed-faithful-witnessed' }, { id: 'dismissed-without-cause' },
  { id: 'recent-gift' }, { id: 'personally-saved-life' },
] });
assert.equal(loyalty.status, 'calculated');
assert.equal(loyalty.score, 100); // 50+15+5-5+30+0+10+10-40+25
assert.equal(loyalty.band, 'loyal');
assert.ok(loyalty.applied.some(entry => entry.id === 'killed-faithful-witnessed'));
assert.ok(!loyalty.applied.some(entry => entry.id === 'dismissed-without-cause'));
assert.ok(loyalty.applied.some(entry => entry.id === 'personally-saved-life'));
assert.ok(!loyalty.applied.some(entry => entry.id === 'recent-gift'));

loyalty = calculatePrivateLoyalty({ charismaScore: 10, selections: [{ id: 'treatment-cruel' }] });
assert.equal(loyalty.status, 'needs-dm');
assert.equal(loyalty.score, null);
loyalty = calculatePrivateLoyalty({ charismaScore: 10, selections: [{ id: 'treatment-cruel' }], cruelTreatmentResolved: 10 });
assert.equal(loyalty.score, 60);
assert.equal(loyalty.band, 'fair');
assert.throws(() => calculatePrivateLoyalty({ charismaScore: 10, selections: [{ id: 'pay-none' }, { id: 'pay-average' }] }));
assert.throws(() => calculatePrivateLoyalty({ charismaScore: 10, selections: [{ id: 'liege-alive-visible', count: 2 }] }));

// DMG67 modifiers apply to the percentile roll (positive is worse), not as loyalty bonuses.
let morale = resolvePrivateMorale({ loyaltyScore: 65, roll: 50, triggerId: 'party-quarter-eliminated',
  modifiers: [{ id: 'friend-killed' }] });
assert.equal(morale.adjustedRoll, 65);
assert.equal(morale.passed, true);
assert.equal(morale.outcome, 'holds');
morale = resolvePrivateMorale({ loyaltyScore: 65, roll: 51, triggerId: 'party-quarter-eliminated',
  modifiers: [{ id: 'friend-killed' }] });
assert.equal(morale.failureMargin, 1);
assert.equal(morale.outcome, 'fall-back-fighting');
morale = resolvePrivateMorale({ loyaltyScore: 40, roll: 80, triggerId: 'leader-slain-or-deserts' });
assert.equal(morale.failureMargin, 70);
assert.equal(morale.outcome, 'surrender');
morale = resolvePrivateMorale({ loyaltyScore: 50, roll: 55, triggerId: 'obviously-superior-force',
  modifiers: [{ id: 'enemy-slain' }] });
assert.equal(morale.adjustedRoll, 45);
assert.equal(morale.passed, true);

// Player projection is built from an allowlist and contains no DM-only score, roll, alignment or notes.
const privateRecord: PrivateRelationshipRecord = {
  id: 'rel-1', kind: 'henchman', displayName: '艾琳', status: 'active',
  contract: { startedOn: '1000-01-01', endsOn: null, payGpPerPeriod: null, payPeriod: 'adventure-share',
    treasureShare: 'half share', duties: ['accompany expeditions'], quartersProvided: true,
    foodAndClothingProvided: true, employerProvidedEquipment: ['chain mail', 'mace'] },
  observedHistory: [{ at: '1000-01-12', summary: '在桥头拒绝独自冲锋。' }],
  secret: { npcCharacterId: 'npc-secret', trueAlignment: 'LE', trueReligion: 'secret cult',
    personalityNotes: 'plans betrayal', loyalty, moraleHistory: [morale], dmNotes: ['never disclose'] },
};
const projection = projectRelationshipForPlayer(privateRecord);
const serialized = JSON.stringify(projection);
assert.equal(projection.disclosure, 'public-facts-only');
for (const secret of ['npc-secret', 'LE', 'secret cult', 'plans betrayal', 'never disclose', 'privateRoll', 'loyaltyScore']) {
  assert.equal(serialized.includes(secret), false, `player projection leaked ${secret}`);
}
assert.equal(serialized.includes('在桥头拒绝独自冲锋。'), true);

assert.equal(coreRelationshipsPack.unresolved.fullHirelingAvailabilityAndCosts.status, 'unknown');
assert.equal(coreRelationshipsPack.unresolved.classFollowers.status, 'unknown');
assert.equal(coreRelationshipsPack.loyalty.disclosure.includes('DM-private'), true);
assert.throws(() => checkHenchmanCapacity(19, 0));
assert.throws(() => resolvePrivateMorale({ loyaltyScore: 50, roll: 0, triggerId: 'obviously-superior-force' }));

console.log('PASS: core henchman/hireling distinction, PHB13 CHA cap, DMG35 offers, private loyalty/morale and allowlisted player projection; unverified relationship tables remain unknown/needs-dm.');
