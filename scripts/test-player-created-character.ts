import assert from 'node:assert/strict';
import { newCoreCreation, selectCoreCandidate, parseCoreCreation } from '../src/character/workflows/core-create';
import { parseCoreGenesisArchive } from '../src/character/workflows/core-admission';
import { playerCampaignFromCreatedCharacter } from '../src/character/workflows/core-creation-entry';
import { parseCoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';

const scores = { STR: 16, INT: 12, WIS: 12, DEX: 14, CON: 15, CHA: 10 };
let creation = newCoreCreation({
  id: 'player-created-character-test', name: '玩家角色测试',
  generation: { draftId: 'draft', draftRevision: 1, batchId: 'batch', method: 'DMG:I', scores },
});
creation = selectCoreCandidate(creation, {
  raceId: 'human', subraceId: null, sex: 'male', alignmentId: 'NG', initialScores: scores,
  classIds: ['fighter'], mode: 'single', campaign: { allowedRaceIds: ['human'], bardEnabled: false },
});

const campaign = playerCampaignFromCreatedCharacter(parseCoreCreation(JSON.parse(JSON.stringify(creation))));
assert.equal(campaign.genesis.format, 'adnd1e-core-player-runtime');
assert.equal('admission' in campaign.genesis, false, 'player handoff must not contain a DM admission');
assert.ok(campaign.genesis.unresolved.includes('task:hp'));
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(campaign))), campaign);
assert.equal(parseCoreGenesisArchive(JSON.parse(JSON.stringify(campaign.genesis))).format, 'adnd1e-core-player-runtime');
console.log('PASS: player creation enters a local playable archive without DM admission, while incomplete tasks remain explicit.');
