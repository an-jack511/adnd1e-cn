import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { parseImportedCharacterCard } from '../src/character/interchange/player-card-import';

const directory = join(process.cwd(), 'public/character/dragonlance');
const firstAppearance = new Set([
  'caramon-human-fighter-6.adnd1e-character.json', 'flint-dwarf-fighter-4.adnd1e-character.json',
  'goldmoon-human-cleric-5.adnd1e-character.json', 'raistlin-human-magic-user-3.adnd1e-character.json',
  'riverwind-human-ranger-5.adnd1e-character.json', 'sturm-human-fighter-6.adnd1e-character.json',
  'tanis-half-elf-fighter-5.adnd1e-character.json', 'tasslehoff-kender-thief-4.adnd1e-character.json',
]);
const files = readdirSync(directory).filter(file => firstAppearance.has(file)).sort();
assert.equal(files.length, 8, '龙枪首次出现人物应有八份来源档案');
for (const file of files) {
  const card = parseImportedCharacterCard(readFileSync(join(directory, file), 'utf8'));
  assert.ok(card.name, `${file}: 缺少姓名`);
  assert.ok(card.level !== null, `${file}: 缺少等级`);
  assert.ok(card.inventory.length > 0, `${file}: 缺少装备`);
  assert.ok(card.sources.length > 0, `${file}: 缺少出处`);
}
const goldmoon = parseImportedCharacterCard(readFileSync(join(directory, 'goldmoon-human-cleric-5.adnd1e-character.json'), 'utf8'));
assert.equal(goldmoon.name, '金月');
assert.equal(goldmoon.inventory.find(item => item.label.includes('蓝晶法杖'))?.costCp, 0, '蓝晶法杖必须作为首次出场携带物免费收入');
assert.equal(goldmoon.originalText.includes('金月'), true, '导出原件必须保留中文姓名');
console.log(`Dragonlance source-card import tests passed (${files.length} cards).`);
