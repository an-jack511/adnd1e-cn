import assert from 'node:assert/strict';
import {monsters,bookMonsters} from '../src/data/public/monsters';
import magazine from '../src/data/public/dragon-monsters.json';
import links from '../src/data/public/dragon-monster-versions.json';
import {mergeDragonMonsters} from '../src/utils/merge-dragon-monsters';
import readings from '../src/data/public/monster-reading.json';
import {sourceGroup} from '../src/utils/source-group';
import type {Monster} from '../src/schemas';

const raw=magazine as Monster[];
assert.equal(monsters.length,bookMonsters.length+raw.length-Object.keys(links).length);
for(const [id,link] of Object.entries(links)){
 const primary=monsters.find(monster=>monster.id===link.targetId)!;
 const original=bookMonsters.find(monster=>monster.id===link.targetId)!;
 const version=raw.find(monster=>monster.id===id)!;
 assert.ok(primary&&original&&version,id);
 assert.ok(!monsters.some(monster=>monster.id===id),`No duplicate monster: ${id}`);
 for(const key of Object.keys(original))if(!['source','details','aliases'].includes(key))assert.deepEqual((primary as any)[key],(original as any)[key],`Preserve book mechanics: ${id} ${key}`);
 assert.ok((readings as Record<string,unknown>)[primary.id],`Keep original book reading: ${id}`);
 assert.ok(version.details?.every(detail=>primary.details?.some(merged=>merged.html.endsWith(detail.html)&&merged.html.includes('statblock')&&merged.html.includes(version.hitDice))),`Preserve complete magazine rules and statistics: ${id}`);
 assert.ok(primary.source.some(source=>source.book===version.source[0].book&&source.page===version.source[0].page));
 assert.ok(primary.aliases?.includes(version.nameEn));
}
const before=JSON.stringify([bookMonsters,raw]);
mergeDragonMonsters(bookMonsters,raw,links);
assert.equal(JSON.stringify([bookMonsters,raw]),before,'Inputs remain unchanged');
const otherBook=bookMonsters.find(monster=>monster.source.some(source=>!['MM','MM2'].includes(source.book)))!;
assert.ok(otherBook,'A monster from another expansion is available');
const otherVersion={...raw[0],id:'test-other-expansion-version'};
const otherMerged=mergeDragonMonsters([otherBook],[otherVersion],{[otherVersion.id]:{targetId:otherBook.id}});
assert.equal(otherMerged.length,1,'Other expansions merge into their existing identity');
assert.equal(otherMerged[0].hitDice,otherBook.hitDice);
assert.ok(otherMerged[0].details?.some(detail=>detail.source.book===otherVersion.source[0].book));
assert.throws(()=>mergeDragonMonsters(bookMonsters,raw,{[raw[0].id]:{targetId:'missing'}}),/Missing Dragon monster target/);
const facets=[...new Set(monsters.flatMap(monster=>monster.source.map(source=>sourceGroup(source.book))))];
assert.equal(facets.filter(source=>source==='Dragon').length,1);
assert.ok(!facets.some(source=>/^Dragon #/.test(source)));
console.log(`PASS: ${Object.keys(links).length} Dragon monster versions merged; book text/statistics, magazine rules, search aliases and single Dragon facet retained.`);
