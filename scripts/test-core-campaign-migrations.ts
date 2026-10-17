import assert from 'node:assert/strict';
import { admittedCoreCharacter } from './fixtures/admitted-core-character';
import { migrateCoreCampaignImport } from '../src/character/interchange/core-campaign-migrations';
import { newCoreCampaignArchive } from '../src/character/workflows/core-campaign-runtime';

const campaignFixture = admittedCoreCharacter('fighter');
const admission = campaignFixture.genesis;
const migrated = migrateCoreCampaignImport(admission);
assert.equal(migrated.migrated, true);
assert.equal(migrated.from.format, 'adnd1e-core-admission-runtime');
assert.equal(migrated.to.format, 'adnd1e-core-campaign-runtime');
assert.equal(migrated.archive.actions.length, 0);
assert.equal(migrated.archive.runtime.transaction.revision, admission.runtime.transaction.revision);
assert.ok(migrated.warnings.some(message => message.includes('没有生成新的经验')));

const campaign = campaignFixture;
const unchanged = migrateCoreCampaignImport(campaign);
assert.equal(unchanged.migrated, false);
assert.deepEqual(unchanged.archive, campaign);
assert.deepEqual(unchanged.warnings, []);

for (const value of [
  { format: 'adnd1e-core-campaign-runtime', schemaVersion: 2 },
  { format: 'adnd1e-core-admission-runtime', schemaVersion: 2 },
  { format: 'adnd1e-core-campaign-runtime', schemaVersion: 1, privateNotes: 'must not be guessed' },
  { format: 'future-character-runtime', schemaVersion: 1 },
]) {
  assert.throws(() => migrateCoreCampaignImport(value), /(?:不支持的角色档案版本|原文件未覆盖)/);
}

const originalAdmission = JSON.stringify(admission);
const second = migrateCoreCampaignImport(JSON.parse(originalAdmission));
assert.deepEqual(second.archive, migrated.archive, 'migration is deterministic');
assert.equal(JSON.stringify(admission), originalAdmission, 'migration does not mutate the source archive');

console.log('PASS: explicit admission-to-campaign migration, no-op current import, deterministic output and unknown-version refusal.');
