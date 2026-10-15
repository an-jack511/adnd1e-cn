import assert from 'node:assert/strict';
import { coreClassCapabilities, coreClassCapabilityPack, coreClassCapabilitySources } from '../src/character/rules/core-class-capabilities';
import { getActiveCapability, projectCapabilitiesForPlayer, reviewCoreClassCapabilities } from '../src/character/engine/core-class-capabilities';

const classes = ['fighter','paladin','ranger','cleric','druid','magic-user','illusionist','thief','assassin','monk'] as const;
assert.deepEqual(Object.keys(coreClassCapabilities).sort(), [...classes].sort());
assert.equal(coreClassCapabilityPack.version, '1.0.0');
assert.equal(coreClassCapabilitySources['phb:20:cleric'].sha256, 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213');
assert.equal(coreClassCapabilitySources['dmg:16:followers'].sha256, '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669');
for (const classId of classes) {
  assert.ok(coreClassCapabilities[classId].length > 0, `${classId} must have capabilities`);
  assert.equal(new Set(coreClassCapabilities[classId].map(item => item.id)).size, coreClassCapabilities[classId].length);
  for (const item of coreClassCapabilities[classId]) {
    assert.equal(item.classId, classId);
    assert.ok(item.sourceIds.length > 0);
    assert.ok(item.minimumLevel >= 1);
  }
}

assert.equal(getActiveCapability('cleric', 7, 'cleric-worship-followers'), null);
assert.equal(getActiveCapability('cleric', 8, 'cleric-worship-followers')?.status, 'needs-dm');
assert.equal(getActiveCapability('fighter', 9, 'fighter-freehold')?.resolution, 'requires-dm');
assert.equal(getActiveCapability('druid', 3, 'druid-extra-languages')?.value?.value, 1);
assert.equal(getActiveCapability('druid', 11, 'druid-extra-languages')?.value?.value, 9);
assert.equal(getActiveCapability('druid', 12, 'druid-upper-level-seats')?.status, 'needs-dm');

assert.equal(getActiveCapability('paladin', 1, 'paladin-lay-on-hands')?.value?.value, 2);
assert.equal(getActiveCapability('paladin', 11, 'paladin-lay-on-hands')?.value?.value, 22);
assert.equal(getActiveCapability('paladin', 5, 'paladin-cure-disease')?.value?.value, 1);
assert.equal(getActiveCapability('paladin', 6, 'paladin-cure-disease')?.value?.value, 2);
assert.equal(getActiveCapability('paladin', 3, 'paladin-turning')?.value?.value, 1);
assert.equal(getActiveCapability('paladin', 8, 'paladin-spell-track'), null);
assert.ok(getActiveCapability('paladin', 9, 'paladin-spell-track'));

assert.equal(getActiveCapability('ranger', 7, 'ranger-druid-spells'), null);
assert.equal(getActiveCapability('ranger', 10, 'ranger-giant-class-damage')?.value?.value, 10);
assert.equal(getActiveCapability('ranger', 10, 'ranger-followers')?.visibility, 'dm-secret');
assert.equal(getActiveCapability('magic-user', 10, 'magic-user-item-creation'), null);
assert.ok(getActiveCapability('magic-user', 11, 'magic-user-item-creation'));
assert.ok(getActiveCapability('magic-user', 12, 'magic-user-stronghold'));
assert.equal(getActiveCapability('illusionist', 9, 'illusionist-item-creation'), null);
assert.ok(getActiveCapability('illusionist', 10, 'illusionist-item-creation'));

assert.equal(getActiveCapability('thief', 4, 'thief-read-languages')?.status, 'verified');
assert.equal(getActiveCapability('thief', 9, 'thief-scroll-use'), null);
assert.ok(getActiveCapability('thief', 10, 'thief-scroll-use'));
assert.equal(getActiveCapability('assassin', 2, 'assassin-thief-functions'), null);
assert.ok(getActiveCapability('assassin', 3, 'assassin-thief-functions'));
assert.equal(getActiveCapability('assassin', 14, 'assassin-guildmaster')?.status, 'needs-dm');

assert.equal(getActiveCapability('monk', 1, 'monk-surprise')?.value?.value, 100 / 3);
assert.equal(getActiveCapability('monk', 2, 'monk-surprise')?.value?.value, 32);
assert.equal(getActiveCapability('monk', 4, 'monk-esp-mask')?.value?.value, 30);
assert.equal(getActiveCapability('monk', 7, 'monk-self-heal')?.value?.dice, '1d4+1');
assert.equal(getActiveCapability('monk', 9, 'monk-charm-resistance')?.value?.value, 50);
assert.equal(getActiveCapability('monk', 13, 'monk-quivering-palm')?.status, 'needs-dm');
assert.equal(getActiveCapability('monk', 1, 'monk-core-combat-tables')?.status, 'unsupported');

const rangerPlayer = projectCapabilitiesForPlayer('ranger', 10);
assert.equal(rangerPlayer.some(item => item.visibility === 'dm-secret'), false);
assert.equal(rangerPlayer.some(item => item.id === 'ranger-followers'), false);
assert.equal(reviewCoreClassCapabilities('monk', 13).unsupported.length, 1);
assert.throws(() => reviewCoreClassCapabilities('fighter', 0), /level/);
assert.throws(() => reviewCoreClassCapabilities('fighter', 1.5), /level/);

console.log('core class capabilities: ok');
