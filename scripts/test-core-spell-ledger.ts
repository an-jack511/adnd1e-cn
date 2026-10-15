import assert from 'node:assert/strict';
import { newKnowabilityState, recordKnowabilityAttempt } from '../src/character/engine/core-spell-acquisition';
import {
  addArcaneSource,
  assessSpellEligibility,
  castPreparedSpell,
  createCoreSpellLedger,
  projectSpellLedgerForPlayer,
  recordArcaneTranscription,
  recordDivineGrant,
  recordRecoverySession,
  type ArcaneSourceEntity,
  type DivineGrantRecord,
} from '../src/character/engine/core-spell-ledger';
import { arcaneTranscriptionRule, spellIdentityRule, type CoreSpellDefinitionRef } from '../src/character/rules/core-spell-ledger';

const spell = (definitionId: string, listId: CoreSpellDefinitionRef['listId'], level: number, displayName: string): CoreSpellDefinitionRef => ({
  definitionId, rulesetId: 'adnd1e-core@1', listId, level, displayName, sourceIds: [`phb:spell-table:${listId}:${level}`],
});
const missile = spell('adnd1e-core:magic-user:1:magic-missile', 'magic-user', 1, 'Magic Missile');
const sameNamedOtherList = spell('adnd1e-core:illusionist:6:magic-missile', 'illusionist', 6, 'Magic Missile');
assert.equal(spellIdentityRule.displayNameIsUnique, false);
assert.notEqual(missile.definitionId, sameNamedOtherList.definitionId, 'same display name must not collapse distinct definitions');

const group = [missile, ...Array.from({ length: 5 }, (_, index) => spell(`adnd1e-core:magic-user:1:test-${index}`, 'magic-user', 1, `Test ${index}`))];
let knowability = newKnowabilityState(9, group.map(entry => entry.definitionId));
for (const entry of group) knowability = recordKnowabilityAttempt(knowability, entry.definitionId, 1);
assert.ok(knowability.knownSpellIds.includes(missile.definitionId));

let arcane = createCoreSpellLedger({ id: 'ledger-mu', characterId: 'pc-1', careerId: 'career-mu', tradition: 'magic-user' });
const scroll: ArcaneSourceEntity = {
  id: 'source-scroll-1', spell: missile, kind: 'scroll', publicKind: 'undisclosed', publicLabel: null, consumed: false,
  private: { ownerId: 'npc-secret-1', locationId: 'vault-secret-9', provenance: 'Taken from the red archmage', dmNotes: ['Secret patron is the enemy.'] },
};
arcane = addArcaneSource(arcane, scroll);
assert.throws(() => recordArcaneTranscription(arcane, {
  id: 'copy-with-unsourced-price', sourceEntityId: scroll.id, targetSpellbookId: 'book-a', knowability, outcome: 'success', actualCostGp: 100,
}), /rulingId/);
arcane = recordArcaneTranscription(arcane, {
  id: 'copy-1', sourceEntityId: scroll.id, targetSpellbookId: 'book-a', knowability, outcome: 'success',
  actualCostGp: 100, actualDurationMinutes: 240, rulingId: 'ruling-copy-1',
});
assert.equal(arcane.arcaneSources[0].consumed, true, 'successful learning from a scroll consumes the source');
assert.equal(arcane.spellbookEntries.length, 1);
assert.equal(arcane.transcriptionAttempts[0].cost.status, 'unknown');
assert.equal(arcaneTranscriptionRule.duration.status, 'unknown');

assert.equal(assessSpellEligibility(arcane, {
  spell: missile, maximumUsableSpellLevel: 1, preparedCapacityAtLevel: 2, currentlyReadyAtLevel: 0,
  knowability, spellbookEntryId: arcane.spellbookEntries[0].id,
}).status, 'eligible');
assert.deepEqual(assessSpellEligibility(arcane, {
  spell: missile, maximumUsableSpellLevel: 1, preparedCapacityAtLevel: 2, currentlyReadyAtLevel: 0, knowability,
}).reasons, ['present-spellbook-entry-required']);

arcane = recordRecoverySession(arcane, {
  id: 'recovery-too-short',
  requested: [{ copyId: 'unused-copy', spell: missile, preparedFrom: { kind: 'spellbook-entry', id: arcane.spellbookEntries[0].id } }],
  actualRestHours: 3, actualStudyOrPrayerMinutes: 15, interruption: 'none', preparedCapacityByLevel: { 1: 2 },
});
assert.equal(arcane.recoverySessions.at(-1)?.status, 'needs-rest');
assert.equal(arcane.preparedCopies.length, 0, 'incomplete recovery must not mint a prepared spell');

arcane = recordRecoverySession(arcane, {
  id: 'recovery-interrupted',
  requested: [{ copyId: 'also-unused-copy', spell: missile, preparedFrom: { kind: 'spellbook-entry', id: arcane.spellbookEntries[0].id } }],
  actualRestHours: 4, actualStudyOrPrayerMinutes: 15, interruption: 'possible', preparedCapacityByLevel: { 1: 2 },
});
assert.equal(arcane.recoverySessions.at(-1)?.status, 'needs-dm');

arcane = recordRecoverySession(arcane, {
  id: 'recovery-complete',
  requested: [
    { copyId: 'prepared-1', spell: missile, preparedFrom: { kind: 'spellbook-entry', id: arcane.spellbookEntries[0].id } },
    { copyId: 'prepared-2', spell: missile, preparedFrom: { kind: 'spellbook-entry', id: arcane.spellbookEntries[0].id } },
  ],
  actualRestHours: 4, actualStudyOrPrayerMinutes: 30, interruption: 'none', preparedCapacityByLevel: { 1: 2 }, completedAt: 'CY 576, day 42, 08:00',
});
assert.equal(arcane.preparedCopies.filter(copy => copy.status === 'ready').length, 2, 'repeated preparation creates two independent copies');
assert.throws(() => recordRecoverySession(arcane, {
  id: 'over-capacity', requested: [{ copyId: 'prepared-3', spell: missile, preparedFrom: { kind: 'spellbook-entry', id: arcane.spellbookEntries[0].id } }],
  actualRestHours: 4, actualStudyOrPrayerMinutes: 15, interruption: 'none', preparedCapacityByLevel: { 1: 2 }, completedAt: 'later',
}), /capacity exceeded/);

const firstCasting = castPreparedSpell(arcane, { castingId: 'cast-1', preparedCopyId: 'prepared-1', occurredAt: 'CY 576, day 42, 09:00', componentState: 'satisfied' });
assert.equal(firstCasting.status, 'cast');
if (firstCasting.status !== 'cast') throw new Error('narrowing failed');
arcane = firstCasting.ledger;
assert.equal(arcane.preparedCopies.find(copy => copy.id === 'prepared-1')?.status, 'expended');
assert.equal(arcane.preparedCopies.find(copy => copy.id === 'prepared-2')?.status, 'ready');
assert.throws(() => castPreparedSpell(arcane, { castingId: 'cast-again', preparedCopyId: 'prepared-1', occurredAt: 'later', componentState: 'satisfied' }), /ready prepared copy/);
const held = castPreparedSpell(arcane, { castingId: 'cast-needs-dm', preparedCopyId: 'prepared-2', occurredAt: 'later', componentState: 'needs-dm' });
assert.equal(held.status, 'needs-dm');
assert.equal(held.ledger.revision, arcane.revision, 'needs-DM cast must not consume or mutate');

const arcaneProjectionText = JSON.stringify(projectSpellLedgerForPlayer(arcane));
for (const secret of ['npc-secret-1', 'vault-secret-9', 'red archmage', 'Secret patron', 'ruling-copy-1']) {
  assert.equal(arcaneProjectionText.includes(secret), false, `player projection leaked: ${secret}`);
}

const cure = spell('adnd1e-core:cleric:1:cure-light-wounds', 'cleric', 1, 'Cure Light Wounds');
const light = spell('adnd1e-core:cleric:1:light', 'cleric', 1, 'Light');
let divine = createCoreSpellLedger({ id: 'ledger-cleric', characterId: 'pc-2', careerId: 'career-cleric', tradition: 'cleric' });
const grant: DivineGrantRecord = {
  id: 'grant-1', tradition: 'cleric', requestedSpell: cure, grantedSpell: light, authority: 'dm-adjudicated', status: 'granted',
  publicMessage: 'Your prayer is answered with Light.',
  private: { trueAuthorityId: 'secret-deity-avatar', reason: 'A hidden test of obedience', dmNotes: ['Do not reveal the intermediary.'] },
};
divine = recordDivineGrant(divine, grant);
assert.equal(divine.spellbookEntries.length, 0, 'divine bestowal must not create an arcane book entry');
assert.equal(assessSpellEligibility(divine, {
  spell: light, maximumUsableSpellLevel: 1, preparedCapacityAtLevel: 1, currentlyReadyAtLevel: 0,
}).status, 'eligible');
assert.deepEqual(assessSpellEligibility(divine, {
  spell: light, maximumUsableSpellLevel: 1, preparedCapacityAtLevel: 1, currentlyReadyAtLevel: 0,
  knowability, spellbookEntryId: 'book-entry-is-not-divine-evidence',
}).reasons, ['arcane-evidence-not-applicable-to-divine-spells']);
divine = recordRecoverySession(divine, {
  id: 'divine-recovery', requested: [{ copyId: 'divine-prepared-1', spell: light, preparedFrom: { kind: 'divine-grant', id: grant.id } }],
  actualRestHours: 4, actualStudyOrPrayerMinutes: 15, interruption: 'confirmed', rulingId: 'ruling-rest-1',
  preparedCapacityByLevel: { 1: 1 }, completedAt: 'CY 576, day 42, dawn',
});
assert.equal(divine.preparedCopies[0].status, 'ready');
assert.throws(() => recordRecoverySession(divine, {
  id: 'reuse-grant', requested: [{ copyId: 'divine-prepared-2', spell: light, preparedFrom: { kind: 'divine-grant', id: grant.id } }],
  actualRestHours: 4, actualStudyOrPrayerMinutes: 15, interruption: 'none', preparedCapacityByLevel: { 1: 2 }, completedAt: 'tomorrow',
}), /only one prepared copy/);
const divineProjectionText = JSON.stringify(projectSpellLedgerForPlayer(divine));
for (const secret of ['secret-deity-avatar', 'hidden test', 'Do not reveal', 'ruling-rest-1']) {
  assert.equal(divineProjectionText.includes(secret), false, `divine player projection leaked: ${secret}`);
}

assert.throws(() => addArcaneSource(divine, scroll), /Divine ledgers/);
assert.throws(() => recordDivineGrant(arcane, grant), /Arcane ledgers/);

console.log('PASS: core spell ledger separates arcane/divine acquisition, stable spell IDs, physical sources/books, unknown copying facts, independent prepared copies, casting consumption, gated recovery, capacity and secret-safe projection.');
