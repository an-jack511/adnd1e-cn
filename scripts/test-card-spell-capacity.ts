import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardSpellCapacity,updateCardSpellSlots} from '../src/character/ref2/spell-capacity';
import {blankCard,normalizeCard} from '../src/character/ref2/model';
import {groupBookCatalog} from '../src/utils/book-catalog';
import oa from '../src/character/rules/oa-spell-capacity.json';
const capacity=(classId:string,level:number,abilities:Record<string,string>={})=>cardSpellCapacity({class:classId,level:String(level),...abilities});
assert.deepEqual(capacity('magic-user',5).daily?.slice(1,5),[4,2,1,0]);
assert.equal(capacity('cleric',1,{WIS:'18'}).daily?.[1],3);
assert.equal(capacity('cleric',1,{WIS:'18'}).daily?.[2],0,'Wisdom cannot unlock unearned levels');
assert.equal(capacity('cleric',16,{WIS:'16'}).daily?.[6],0);
assert.equal(capacity('cleric',16,{WIS:'18'}).daily?.[7],1);
assert.equal(capacity('magic-user',18,{INT:'13'}).daily?.[7],0);
assert.equal(capacity('paladin',8,{WIS:'18'}).daily?.[1],0);
assert.equal(capacity('paladin',9,{WIS:'18'}).daily?.[1],1,'Paladins do not inherit cleric bonus spells');
assert.equal(capacity('ranger',9,{INT:'14',WIS:'18'}).tracks.length,2);
assert.deepEqual(capacity('ranger',9,{INT:'14',WIS:'18'}).tracks.map(track=>track.daily[0]),[1,1]);
assert.equal(capacity('bard',1,{INT:'12',WIS:'18'}).daily?.[1],1);
assert.ok(capacity('fighter',20).daily?.every(n=>n===0));
assert.equal(capacity('druid',15).daily,null,'Unsupported advancement requires explicit manual choice');
assert.equal(capacity('oa-shukenja',1,{WIS:'14'}).daily?.[1],3);
assert.deepEqual(capacity('oa-sohei',6,{WIS:'12'}).daily?.slice(1,5),[1,0,0,0]);
assert.deepEqual(capacity('oa-sohei',7,{WIS:'16'}).daily?.slice(1,5),[3,3,0,0]);
assert.equal(capacity('oa-wu-jen',21).daily?.[9],1);
assert.equal(capacity('unknown',1).daily,null);
const card=blankCard();card.fields={class:'cleric',level:'1',WIS:'18',manual_spell_slots:false};card.preparedSpells=[{spellId:'bless',count:2,expended:1}];
updateCardSpellSlots(card.fields);assert.equal(card.fields.spell_slots_1,'3');
card.fields.level='3';updateCardSpellSlots(card.fields);assert.equal(card.fields.spell_slots_2,'3');
card.fields.manual_spell_slots=true;card.fields.spell_slots_1='7';card.fields.level='5';updateCardSpellSlots(card.fields);assert.equal(card.fields.spell_slots_1,'7');
assert.deepEqual(normalizeCard(JSON.parse(JSON.stringify(card))),card);
card.fields.manual_spell_slots=false;updateCardSpellSlots(card.fields);assert.equal(card.fields.spell_slots_1,'5');
assert.deepEqual(card.preparedSpells,[{spellId:'bless',count:2,expended:1}]);
assert.equal(normalizeCard({name:'旧人物',spell_slots_1:'8'}).fields.manual_spell_slots,true);
const source=readFileSync('src/published/books/oa/oa-oriental-classes.md','utf8');
for(const rule of Object.values(oa)) {
 const section=source.split(`### 表 ${rule.source.table}：`)[1].split('\n##')[0];
 for(const row of rule.rows) {
  const original=section.split('\n').find(line=>line.startsWith(`|${row.level}|`) || row.level<=5 && line.startsWith('|1–5|'))!;
  assert.ok(original,`OA ${rule.source.table} level ${row.level}`);
  assert.deepEqual(original.split('|').slice(2,-1).map(cell=>/^\d+$/.test(cell)?Number(cell):0),row.daily);
 }
}
const grouped=groupBookCatalog([{id:'dragon-100'},{id:'phb'},{id:'dragon-23'},{id:'dmg'}]);
assert.deepEqual(grouped.books.map(book=>book.id),['phb','dmg']);
assert.deepEqual(grouped.dragon.map(book=>book.id),['dragon-23','dragon-100']);
assert.deepEqual(groupBookCatalog([{id:'phb'}]).dragon,[]);
console.log('PASS: PHB/OA daily capacity, ability bonuses and gates, separate ranger lists, manual overrides, saved cards, OA source rows and grouped Dragon issues.');
