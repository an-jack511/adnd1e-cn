import assert from 'node:assert/strict';
import { admittedCaster } from './fixtures/admitted-caster';
import { previewSheetAction, commitSheetAction, type SheetAction } from '../src/character/actions/campaign-actions';
import { campaignSheet } from '../src/character/application/campaign-sheet';
import { parseCoreCampaignArchive, type CoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';
import { intelligenceSpellRule } from '../src/character/engine/core-spell-acquisition';

let sequence = 0;
function apply(archive: CoreCampaignArchive, request: SheetAction): CoreCampaignArchive {
  const plan = previewSheetAction(archive, request, { id: `arcane-acquisition-${++sequence}`, actorId: 'table-recorder', at: `session-${sequence}` });
  return commitSheetAction(archive, plan);
}

let archive = admittedCaster('magic-user');
const targetId = 'adnd1e-core:magic-user:2:detect-invisibility';
const minimum = intelligenceSpellRule(9).minimumPerLevel;
const group = [targetId, ...Array.from({ length: minimum - 1 }, (_, index) => `adnd1e-core:magic-user:2:fixture-${index + 1}`)];
archive = apply(archive, {
  type: 'character.acquireArcaneSpell',
  spell: { definitionId: targetId, rulesetId: 'adnd1e-core@1', listId: 'magic-user', level: 2, displayName: 'Detect Invisibility', sourceIds: ['dmg:39:spell-acquisition'] },
  sourceEntityId: 'session-source-old-spellbook', sourceKind: 'captured-spellbook', sourceLabel: '找到的旧法术书', sourceProvenance: '团桌确认本次实际接触并可阅读该法术书。', sourceEvidenceId: 'session:source-1', targetSpellbookId: 'admitted-magic-user:spellbook', transcriptionId: 'session-transcription-1',
  knowability: { intelligence: 9, spellIds: group, attempts: group.map(spellId => ({ spellId, percentile: 1 })) }, outcome: 'success',
});
const state = archive.runtime.transaction.facts.modules.find(module => module.id === 'core-advancement')!.data as { spells?: { spellbookEntries: { spell: { definitionId: string } }[] } };
assert.ok(state.spells?.spellbookEntries.some(entry => entry.spell.definitionId === targetId));
assert.ok(state.spells?.spellbookEntries.some(entry => entry.spell.definitionId === targetId), 'the entry is kept even while a first-level character cannot prepare a second-level spell');
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(archive))), archive, 'arcane acquisition must replay exactly');

const beforeFailure = JSON.stringify(archive);
archive = apply(archive, {
  type: 'character.acquireArcaneSpell',
  spell: { definitionId: 'adnd1e-core:magic-user:2:invisibility', rulesetId: 'adnd1e-core@1', listId: 'magic-user', level: 2, displayName: 'Invisibility', sourceIds: ['dmg:39:spell-acquisition'] },
  sourceEntityId: 'session-source-failed-scroll', sourceKind: 'scroll', sourceLabel: '卷轴', sourceProvenance: '团桌确认实际取得卷轴。', sourceEvidenceId: 'session:source-2', targetSpellbookId: 'admitted-magic-user:spellbook', transcriptionId: 'session-transcription-2',
  knowability: { intelligence: 9, spellIds: ['adnd1e-core:magic-user:2:invisibility', ...group.slice(1)], attempts: ['adnd1e-core:magic-user:2:invisibility', ...group.slice(1)].map(spellId => ({ spellId, percentile: 100 })) }, outcome: 'failure',
});
const failedState = archive.runtime.transaction.facts.modules.find(module => module.id === 'core-advancement')!.data as { spells?: { spellbookEntries: { spell: { definitionId: string } }[]; sources: { id: string }[] } };
assert.equal(failedState.spells?.spellbookEntries.some(entry => entry.spell.definitionId === 'adnd1e-core:magic-user:2:invisibility'), false);
assert.ok(failedState.spells?.sources.some(source => source.id === 'session-source-failed-scroll'));
assert.notEqual(JSON.stringify(archive), beforeFailure, 'the failed attempt itself is a durable historical event');
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(archive))), archive);
console.log('PASS: campaign arcane acquisition replays source, Chance to Know and transcription without auto-preparation or invented costs.');
