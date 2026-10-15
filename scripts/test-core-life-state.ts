import assert from 'node:assert/strict';
import {
  administerFriendlyAid,
  advanceZeroHpRound,
  applyHitPointLoss,
  assessCoreRevival,
  assessSevereZeroHpInjury,
  commitCoreRevival,
  createCoreLifeState,
  recordDmPermanentConstitutionChange,
  recordSevereZeroHpInjury,
  reviveFromZeroHp,
  type CoreLifeState,
} from '../src/character/engine/core-life-state';
import {
  constitutionSurvivalTable,
  coreRevivalMethods,
  raiseDeadEligibleRaces,
} from '../src/character/rules/core-life-state';

// The PHB table is explicit and must not be interpolated or merge its columns.
assert.equal(constitutionSurvivalTable.length, 16);
assert.deepEqual(constitutionSurvivalTable[0], { score: 3, systemShock: 35, resurrection: 40 });
assert.deepEqual(constitutionSurvivalTable.at(-1), { score: 18, systemShock: 99, resurrection: 100 });
assert.deepEqual(raiseDeadEligibleRaces, ['dwarf', 'gnome', 'half-elf', 'halfling', 'human']);
assert.notEqual(coreRevivalMethods['druid-reincarnate'].distinctOutcomeTable, coreRevivalMethods['magic-user-reincarnation'].distinctOutcomeTable);

const fresh = () => createCoreLifeState({
  actorId: 'pc-a', currentHp: 8, maximumHp: 8, initialConstitution: 15,
});

// The optional same-blow -1..-3 entry cannot silently become a campaign default.
const optional = applyHitPointLoss(fresh(), {
  damage: 10, episodeId: 'zero-1', deathId: 'death-1', cause: 'sword',
});
assert.equal(optional.status, 'needs-dm');
if (optional.status !== 'needs-dm') throw new Error('Expected optional same-blow ruling.');
assert.equal(optional.proposedHp, -2);

const strict = applyHitPointLoss(fresh(), {
  damage: 10, episodeId: 'zero-2', deathId: 'death-2', cause: 'sword', sameBlowEntryRule: 'strict-zero',
});
assert.equal(strict.status, 'applied');
if (strict.status !== 'applied') throw new Error('Expected strict-zero resolution.');
assert.equal(strict.state.mortality, 'dead');

const optionalAdopted = applyHitPointLoss(fresh(), {
  damage: 10, episodeId: 'zero-3', deathId: 'death-3', cause: 'sword', sameBlowEntryRule: 'allow-minus-three',
});
assert.equal(optionalAdopted.status, 'applied');
if (optionalAdopted.status !== 'applied') throw new Error('Expected adopted optional entry.');
assert.deepEqual([optionalAdopted.state.mortality, optionalAdopted.state.currentHp], ['unconscious-bleeding', -2]);

// Each succeeding round loses exactly one point; friendly aid stops the loss but grants no HP.
const oneRound = advanceZeroHpRound(optionalAdopted.state, { deathId: 'death-later' });
assert.equal(oneRound.status, 'declined');
assert.equal(oneRound.state.currentHp, -3);
const aided = administerFriendlyAid(oneRound.state);
assert.equal(aided.state.mortality, 'unconscious-stabilized');
assert.equal(aided.state.currentHp, -3);
assert.equal(aided.hpChanged, false);
assert.throws(() => advanceZeroHpRound(aided.state, { deathId: 'forbidden' }), /unstabilized/);

let declining = applyHitPointLoss(fresh(), {
  damage: 8, episodeId: 'zero-decline', deathId: 'unused', cause: 'fall', sameBlowEntryRule: 'strict-zero',
});
if (declining.status !== 'applied') throw new Error('Expected zero HP entry.');
for (let round = 1; round <= 10; round += 1) {
  const next = advanceZeroHpRound(declining.state, { deathId: 'death-at-minus-ten', cause: 'zero HP decline' });
  declining = { status: 'applied', state: next.state, sourceIds: next.sourceIds };
  if (round < 10) assert.equal(next.status, 'declined');
  else assert.equal(next.status, 'died');
}
assert.deepEqual([declining.state.currentHp, declining.state.mortality], [-10, 'dead']);

// -6 injury is a DM option, not an automatic wound table.
let severe = applyHitPointLoss(fresh(), {
  damage: 11, episodeId: 'zero-severe', deathId: 'unused', cause: 'fireball', sameBlowEntryRule: 'allow-minus-three',
});
if (severe.status !== 'applied') throw new Error('Expected -3 entry.');
for (let i = 0; i < 3; i += 1) severe = { status: 'applied', state: advanceZeroHpRound(severe.state, { deathId: 'unused' }).state, sourceIds: severe.sourceIds };
assert.equal(severe.state.currentHp, -6);
assert.equal(assessSevereZeroHpInjury(severe.state).status, 'needs-dm');
assert.throws(() => recordSevereZeroHpInjury(severe.state, { changeId: 'injury-1', description: 'scar', rulingId: '' }), /rulingId/);
const scarred = recordSevereZeroHpInjury(severe.state, { changeId: 'injury-1', description: 'fire scarring', rulingId: 'dm-ruling-9' });
assert.equal(scarred.permanentChanges.at(-1)?.kind, 'severe-zero-hp-injury');

// Revival from zero establishes a separate restriction even at positive HP.
const zeroRevived = reviveFromZeroHp(administerFriendlyAid(severe.state).state, { restoredHp: 6, comaTurns: 4 });
assert.deepEqual(
  [zeroRevived.state.currentHp, zeroRevived.state.mortality, zeroRevived.state.actionRestriction],
  [6, 'alive', 'zero-hp-convalescence'],
);
assert.equal(zeroRevived.convalescence.minimumRestDays, 7);
assert.equal(zeroRevived.convalescence.ordinaryHealingEndsRestriction, false);

const deadState = strict.state;

// Clerical target races and time windows remain narrower than reincarnation.
assert.equal(assessCoreRevival(deadState, {
  methodId: 'cleric-raise-dead', subjectRaceId: 'elf', deathInterval: { value: 1, unit: 'days' },
  bodyAvailable: true, casterLevel: 9, checkRoute: 'phb-resurrection-survival', percentileRoll: 1,
}).status, 'forbidden');
assert.equal(assessCoreRevival(deadState, {
  methodId: 'cleric-resurrection', subjectRaceId: 'half-orc', deathInterval: { value: 1, unit: 'years' },
  bodyAvailable: true, casterLevel: 14, checkRoute: 'phb-resurrection-survival', percentileRoll: 1,
}).status, 'forbidden');
assert.equal(assessCoreRevival(deadState, {
  methodId: 'cleric-raise-dead', subjectRaceId: 'human', deathInterval: { value: 10, unit: 'days' },
  bodyAvailable: true, casterLevel: 9, checkRoute: 'phb-resurrection-survival', percentileRoll: 1,
}).status, 'forbidden');
assert.equal(assessCoreRevival(deadState, {
  methodId: 'cleric-resurrection', subjectRaceId: 'human', deathInterval: { value: 50, unit: 'days' },
  bodyAvailable: true, casterLevel: 14, checkRoute: 'phb-resurrection-survival', percentileRoll: 1,
}).status, 'needs-dm');

// The PHB and DMG labels select observably different columns at CON 15.
const noRoute = assessCoreRevival(deadState, {
  methodId: 'cleric-raise-dead', subjectRaceId: 'human', deathInterval: { value: 2, unit: 'days' },
  bodyAvailable: true, casterLevel: 9,
});
assert.equal(noRoute.status, 'needs-dm');
assert.match(noRoute.reason, /PHB 12/);
const ready = assessCoreRevival(deadState, {
  methodId: 'cleric-raise-dead', subjectRaceId: 'human', deathInterval: { value: 2, unit: 'days' },
  bodyAvailable: true, casterLevel: 9, checkRoute: 'phb-resurrection-survival',
});
assert.deepEqual([ready.status, ready.threshold], ['ready-for-player-roll', 94]);
const phbPass = assessCoreRevival(deadState, {
  methodId: 'cleric-raise-dead', subjectRaceId: 'human', deathInterval: { value: 2, unit: 'days' },
  bodyAvailable: true, casterLevel: 9, checkRoute: 'phb-resurrection-survival', percentileRoll: 93,
});
const dmgFail = assessCoreRevival(deadState, {
  methodId: 'cleric-raise-dead', subjectRaceId: 'human', deathInterval: { value: 2, unit: 'days' },
  bodyAvailable: true, casterLevel: 9, checkRoute: 'dmg-p110-system-shock-wording', percentileRoll: 93,
});
assert.deepEqual([phbPass.status, phbPass.threshold, dmgFail.status, dmgFail.threshold], ['passed', 94, 'failed', 91]);

// Failure is final for ordinary revival and does not consume CON or a successful-revival count.
const failed = commitCoreRevival(deadState, dmgFail, { changeId: 'failed-attempt' });
assert.equal(failed.state.mortality, 'forever-dead');
assert.equal(failed.state.currentConstitution, 15);
assert.equal(failed.state.successfulOrdinaryRevivifications, 0);
assert.equal(assessCoreRevival(failed.state, {
  methodId: 'cleric-resurrection', subjectRaceId: 'human', deathInterval: { value: 1, unit: 'years' },
  bodyAvailable: true, casterLevel: 14, checkRoute: 'phb-resurrection-survival', percentileRoll: 1,
}).status, 'forbidden');
assert.equal(assessCoreRevival(failed.state, {
  methodId: 'wish-or-other-magic', subjectRaceId: 'human', deathInterval: { value: 1, unit: 'years' },
  bodyAvailable: false,
}).status, 'needs-dm');

// Success changes current CON, never initial CON, and leaves an explicit HP settlement.
const raised = commitCoreRevival(deadState, phbPass, { changeId: 'con-loss-1' });
assert.equal(raised.status, 'revived-hp-needs-dm');
assert.deepEqual(
  [raised.state.initialConstitution, raised.state.currentConstitution, raised.state.successfulOrdinaryRevivifications],
  [15, 14, 1],
);
assert.deepEqual([raised.state.currentHp, raised.state.hpSettlement, raised.state.actionRestriction], [null, 'needs-dm', 'raise-dead-bed-rest']);
assert.equal(raised.targetBedRestDays, 2);
assert.equal(raised.state.permanentChanges.at(-1)?.constitutionDelta, -1);
assert.throws(
  () => commitCoreRevival({ ...deadState, currentConstitution: 14 }, phbPass, { changeId: 'stale' }),
  /stale or belongs/,
);

const resurrectionPass = assessCoreRevival(deadState, {
  methodId: 'cleric-resurrection', subjectRaceId: 'human', deathInterval: { value: 100, unit: 'years' },
  bodyAvailable: true, casterLevel: 10, checkRoute: 'phb-resurrection-survival', percentileRoll: 1,
});
assert.equal(resurrectionPass.status, 'passed');
const resurrected = commitCoreRevival(deadState, resurrectionPass, { changeId: 'resurrection-con-loss' });
if (resurrected.status !== 'revived-hp-needs-dm') throw new Error('Expected successful clerical resurrection.');
assert.equal(resurrected.state.actionRestriction, 'none');
assert.match(resurrected.casterObligation ?? '', /track on the caster/);
assert.equal('targetBedRestDays' in resurrected, false);

// Restoring current CON does not restore the immutable revival allowance.
const restoredCon = recordDmPermanentConstitutionChange(raised.state, {
  changeId: 'restore-con', delta: 1, description: 'verified campaign magic restored CON',
  rulingId: 'dm-ruling-con', sourceIds: ['phb:12:constitution-revivification'],
});
assert.deepEqual(
  [restoredCon.initialConstitution, restoredCon.currentConstitution, restoredCon.successfulOrdinaryRevivifications],
  [15, 15, 1],
);

const atLimit: CoreLifeState = {
  ...deadState,
  successfulOrdinaryRevivifications: deadState.initialConstitution,
};
assert.equal(assessCoreRevival(atLimit, {
  methodId: 'cleric-raise-dead', subjectRaceId: 'human', deathInterval: { value: 0, unit: 'days' },
  bodyAvailable: true, casterLevel: 9, checkRoute: 'phb-resurrection-survival', percentileRoll: 1,
}).status, 'forbidden');

// The two reincarnation spells bypass the clerical survival roll but preserve distinct rebuild work.
const druidReincarnation = assessCoreRevival(deadState, {
  methodId: 'druid-reincarnate', subjectRaceId: 'half-orc', deathInterval: { value: 7, unit: 'days' },
  bodyAvailable: true,
});
assert.equal(druidReincarnation.status, 'eligible-no-survival-roll');
assert.equal(assessCoreRevival(deadState, {
  methodId: 'druid-reincarnate', subjectRaceId: 'half-orc', deathInterval: { value: 8, unit: 'days' },
  bodyAvailable: true,
}).status, 'forbidden');
assert.throws(() => commitCoreRevival(deadState, druidReincarnation, { changeId: 'new-form' }), /appearance-turn/);
const reincarnated = commitCoreRevival(deadState, druidReincarnation, { changeId: 'new-form', appearanceTurns: 5 });
assert.deepEqual(
  [reincarnated.state.mortality, reincarnated.state.actionRestriction, reincarnated.state.currentConstitution],
  ['alive', 'reincarnation-rebuild-pending', 15],
);
assert.equal(reincarnated.state.permanentChanges.at(-1)?.status, 'needs-dm');

const magicUserReincarnation = assessCoreRevival(deadState, {
  methodId: 'magic-user-reincarnation', subjectRaceId: 'elf', deathInterval: { value: 12, unit: 'days' },
  bodyAvailable: true, casterLevel: 12,
});
assert.equal(magicUserReincarnation.status, 'eligible-no-survival-roll');
const magicUserResult = commitCoreRevival(deadState, magicUserReincarnation, { changeId: 'mu-form', appearanceTurns: 2 });
assert.match(magicUserResult.state.permanentChanges.at(-1)?.description ?? '', /magic-user-table/);

console.log('PASS: zero-HP decline/aid/death, separated restrictions, clerical survival routes, revival limits/CON loss, distinct reincarnations, and DM-gated permanent changes.');
