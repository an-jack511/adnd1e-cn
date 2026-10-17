import assert from 'node:assert/strict';
import { admittedFighter } from './fixtures/admitted-fighter';
import { commitCoreCampaignAction, parseCoreCampaignArchive, type CoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';
import { campaignSheet } from '../src/character/application/campaign-sheet';

const commit = (archive: CoreCampaignArchive, id: string, projection: unknown): CoreCampaignArchive => commitCoreCampaignAction(archive, {
  id, actorId: 'local-table-player', at: `campaign:${id}`, expectedRevision: archive.runtime.transaction.revision,
  intent: { type: 'import-public-relationships', projection: projection as never },
});

let archive = admittedFighter();
const characterId = archive.runtime.transaction.characterId;
const projection = {
  format: 'adnd1e-relationship-player-projection', schemaVersion: '1.0.0', characterId,
  exportedAt: 'campaign:Y1-M1-D4', revision: 3,
  relationships: [{
    schema: 'adnd1e.relationship-player-projection', schemaVersion: 1,
    relationshipId: 'henchman-1', kind: 'henchman', displayName: '艾琳', status: 'active',
    contract: { startedOn: 'Y1-M1-D1', endsOn: null, payGpPerPeriod: null, payPeriod: 'adventure-share', treasureShare: 'half share', duties: ['随队冒险'], quartersProvided: true, foodAndClothingProvided: true, employerProvidedEquipment: ['短剑'] },
    observedHistory: [{ at: 'Y1-M1-D3', summary: '加入队伍并领取装备。' }], disclosure: 'public-facts-only',
  }],
  payments: [{ id: 'payment-1', relationshipId: 'henchman-1', at: 'Y1-M1-D1', amountGp: 100, purpose: 'initial', contractActionId: 'contract-1', periodLabel: null }],
};

archive = commit(archive, 'relationships-1', projection);
const sheet = campaignSheet(archive);
assert.equal(sheet.relationships?.revision, 3);
assert.equal(sheet.relationships?.relationships[0].displayName, '艾琳');
assert.equal(sheet.relationships?.payments[0].amountGp, 100);
const serialized = JSON.stringify(archive);
for (const secret of ['loyalty', 'morale', 'trueAlignment', 'dmNotes', 'privateRoll']) assert.equal(serialized.includes(secret), false);
assert.deepEqual(parseCoreCampaignArchive(JSON.parse(JSON.stringify(archive))), archive, 'public relationship import must replay canonically');

const withSecret = structuredClone(projection) as any;
withSecret.relationships[0].secret = { loyalty: 50, trueAlignment: 'LE' };
assert.throws(() => commit(archive, 'relationships-secret', withSecret), /unsupported|missing|public relationship/i);
assert.deepEqual(campaignSheet(archive).relationships?.relationships.length, 1, 'rejected import must not mutate the archive');

const older = structuredClone(projection) as any;
older.revision = 2;
assert.throws(() => commit(archive, 'relationships-older', older), /revision/i);
const conflictingSameRevision = structuredClone(projection) as any;
conflictingSameRevision.relationships[0].displayName = '另一份同版本事实';
assert.throws(() => commit(archive, 'relationships-same-revision', conflictingSameRevision), /occupied|revision/i);

console.log('PASS: public relationship projection import, strict private-field rejection, replay, character binding and monotonic revision guard.');
