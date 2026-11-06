import assert from 'node:assert/strict';
import { monsterSize, monsterSizeOptions } from '../src/utils/monster-size';
import { readFileSync } from 'node:fs';
import { bilingualName } from './import/bilingual-name';
import { spellSchools } from '../src/utils/spell-schools';
import { matchesChoices } from '../src/utils/filter-choices';
import { items } from '../src/data/public/items';
import { monsters } from '../src/data/public/monsters';
import { spells } from '../src/data/public/spells';
import ffChapters from '../src/data/public/ff-monster-chapters.json';
import mm2Chapters from '../src/data/public/mm2-monster-chapters.json';
import published from '../src/data/published/books.json';

for (const [input, nameZh, nameEn] of [
  ['创造食粮与饮水 Create Food & Water', '创造食粮与饮水', 'Create Food & Water'],
  ['净化食粮 Purify Food &amp; Drink', '净化食粮', 'Purify Food & Drink'],
  ["控制温度（10尺半径）Control Temperature, 10' Radius", '控制温度（10尺半径）', "Control Temperature, 10' Radius"],
  ['高等舍杜 · Shedu, Greater', '高等舍杜', 'Shedu, Greater'],
  ['奥格雷莫赫 · Ogrémoch', '奥格雷莫赫', 'Ogrémoch'],
]) assert.deepEqual(bilingualName(input), {nameZh, nameEn});
for (const [id, english] of [['water','Create Food & Water'],['drink','Purify Food & Drink'],['pits','Detect Snares & Pits']]) {
  const spell=spells.find(entry=>entry.id===id)!;
  assert.ok(spell, `Preserve spell URL: ${id}`);
  assert.equal(spell.nameEn,english);
  assert.ok(!/[A-Za-z&]/.test(spell.nameZh));
}
assert.deepEqual(spellSchools('防护／塑能 Abjuration/Evocation'),['防护','祈唤／塑能']);
assert.ok(matchesChoices(['PHB','UA'], ['UA']));
assert.ok(matchesChoices([], ['OA']));
assert.ok(!matchesChoices(['PHB','UA'], ['OA']));
const missingEnglish=items.filter(item=>!item.nameEn.trim());
const missingChinese=monsters.filter(monster=>!/[\u3400-\u9fff]/.test(monster.nameZh));
console.log(JSON.stringify({items:items.length,missingEnglish:missingEnglish.map(item=>({id:item.id,name:item.nameZh})),monsters:monsters.length,missingChinese:missingChinese.map(monster=>({id:monster.id,name:monster.nameZh}))},null,2));
assert.equal(missingEnglish.length,0,'Every equipment entry needs an English name');
assert.equal(missingChinese.length,0,'Every monster entry needs a Chinese name');
for (const [id,chapter] of Object.entries({...ffChapters,...mm2Chapters})) {
  assert.ok(monsters.some(monster=>monster.id===id));
  assert.ok(published.some(topic=>`${topic.book}/${topic.slug}`===chapter),`${id} has no translated chapter`);
}
for (const book of ['ff','mm2']) {
  const entries=JSON.parse(readFileSync(`src/data/public/${book}-monsters-imported.json`,'utf8'));
  for (const entry of entries) {
    assert.ok(entry.description.trim(),`${entry.id} is missing its translated description`);
    assert.notEqual(entry.hitDice,'未记载');
  }
}
console.log('PASS: bilingual punctuation, stable spell URLs, multi-select semantics, equipment English, monster Chinese and chapter links.');

assert.equal(monsterSizeOptions.length,4);
for (const [raw, expected] of [
 ['L（高 10 英尺）','L'],['S–L','variable'],['M（部分为 L）','variable'],
 ['75% M、25% L','variable'],['可变——通常为 L','variable'],
 ['中型，身高 6–7 英尺','M'],['巨型（25 英尺长）','L'],['微型（8 英寸长）','S'],
 ['微型（肩高 10 英寸）或中型（肩高 3 英尺）','variable'],['8 尺高','L'],
 ['与原生物相同','variable'],['不适用','variable'],
]) assert.equal(monsterSize(raw),expected,raw);
assert.equal(monsters.find(monster=>monster.id==='mimic')!.size,'L');
for (const monster of monsters) assert.ok(monsterSizeOptions.some(option=>option.value===monsterSize(monster.size)));
