import assert from 'node:assert/strict';
import { classes } from '../src/data/public/classes';
import { races } from '../src/data/public/races';
import { items } from '../src/data/public/items';
import { checkEligibility, checkEquipment, computeArmorClass, computeEncumbrance, computeMovement } from '../src/rules-engine/character';

const paladin = checkEligibility({ raceId: 'human', classId: 'paladin', alignment: 'LG', abilities: { STR: '12', INT: '9', WIS: '10', CON: '9', CHA: '15' } }, classes, races);
assert.deepEqual(paladin.map((issue) => issue.code), ['ability-WIS', 'ability-CHA']);
assert.equal(checkEligibility({ raceId: 'elf', classId: 'magic-user', alignment: 'CG', abilities: { INT: '15', DEX: '16' } }, classes, races).length, 0);
assert.ok(checkEligibility({ raceId: 'dwarf', classId: 'magic-user', alignment: 'CG', abilities: { INT: '15' } }, classes, races).some((issue) => issue.code === 'race-class'));

const chain = items.find((item) => item.nameZh === '链甲' && item.category === '护甲');
const shield = items.find((item) => item.nameZh === '大盾' && item.category === '护甲');
const sword = items.find((item) => item.id === 'long-sword');
assert.ok(chain && shield && sword);
assert.equal(computeArmorClass(chain, shield, '17').value, 1);
assert.equal(computeArmorClass(chain, shield, '16').value, 2);
assert.equal(checkEquipment('fighter', sword, chain, shield).length, 0);
assert.ok(checkEquipment('magic-user', sword, chain, shield).some((issue) => issue.code === 'weapon'));
const encumbrance = computeEncumbrance([{ item: chain, quantity: 1 }, { item: shield, quantity: 1 }, { item: sword, quantity: 1 }]);
assert.ok(encumbrance.value >= 45);
assert.equal(encumbrance.unknown.length, 0);
assert.equal(computeMovement({ base: 12, weightPounds: 46, strength: '10' }).effective, 9);
assert.equal(computeMovement({ base: 6, weightPounds: 46, strength: '10' }).effective, 6);
assert.equal(computeMovement({ base: 12, weightPounds: 46, strength: '18/00' }).effective, 12);
assert.equal(computeMovement({ base: 12, weightPounds: 20, strength: '10', bulky: true }).effective, 9);
assert.equal(computeMovement({ base: 12, weightPounds: 20, strength: '10', difficultTerrain: true }).effective, 6);
console.log('Character rules engine scenarios passed.');
