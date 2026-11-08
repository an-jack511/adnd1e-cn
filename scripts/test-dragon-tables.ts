import assert from 'node:assert/strict';
import dragon from '../src/data/public/dragon-tables.json';
import {tables} from '../src/data/public/tables';
import {books} from '../src/data/public/books';

assert.equal(dragon.filter(table=>/^dragon-137-(?:ice-age-|hunt-)/.test(table.id)).length,24,'Six Ice Age tables, seventeen hunting tables and one timing table');
for(const table of dragon){
 const sides=Number(table.dice.match(/^d(\d+)$/)?.[1]);
 assert.ok(sides>0,table.id);
 for(let roll=1;roll<=sides;roll++)assert.equal(table.entries.filter(entry=>entry.min<=roll&&entry.max>=roll).length,1,`${table.id}: roll ${roll} resolves exactly once`);
 assert.equal(tables.filter(entry=>entry.id===table.id).length,1,table.id);
 const book=books.find(book=>book.id===table.sourceHref.split('/')[2]);
 assert.equal(book?.short,'Dragon #137','Dragon tables retain their issue in the source label');
}
const forest=dragon.find(table=>table.id==='dragon-137-hunt-temperate-forest')!;
assert.equal(forest.entries.find(entry=>entry.min===1)?.result,'黑熊 1–2［冬］','Temperate forest bears have the winter footnote only');
const arctic=dragon.find(table=>table.id==='dragon-137-hunt-arctic-forest')!;
assert.equal(arctic.entries.find(entry=>entry.min===1)?.result,'黑熊 1–2［伤／冬］','Arctic bears retain both different footnotes');
const timing=dragon.find(table=>table.id==='dragon-137-hunt-timing')!;
assert.equal(timing.dice,'d6');
assert.equal(timing.entries.find(entry=>entry.min===3)?.result,'与猎物同时遭遇');
console.log('PASS: Dragon tables resolve every roll once, retain different footnotes and use issue-specific source labels.');
