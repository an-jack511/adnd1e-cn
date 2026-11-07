import assert from 'node:assert/strict';
import {classes,bookClasses} from '../src/data/public/classes';
import {races,bookRaces} from '../src/data/public/races';
import dragonClasses from '../src/data/public/dragon-classes.json';
import dragonRaces from '../src/data/public/dragon-races.json';
import classLinks from '../src/data/public/dragon-class-versions.json';
import raceLinks from '../src/data/public/dragon-race-versions.json';
import {mergeDragonIdentities} from '../src/utils/merge-dragon-identities';
import type {ClassEntry,RaceEntry} from '../src/schemas';

function check<T extends ClassEntry|RaceEntry>(entries:T[],base:T[],raw:T[],links:Record<string,{targetId:string;note:string}>){
 assert.equal(entries.length,base.length+raw.length-Object.keys(links).length);
 for(const [id,link] of Object.entries(links)){
  const primary=entries.find(entry=>entry.id===link.targetId)!;
  const original=[...base,...raw].find(entry=>entry.id===link.targetId)!;
  const version=raw.find(entry=>entry.id===id)!;
  assert.ok(primary&&original&&version,id);
  assert.ok(!entries.some(entry=>entry.id===id),`No duplicate identity: ${id}`);
  for(const key of Object.keys(original))if(!['nameZh','nameEn','source','details','aliases'].includes(key))assert.deepEqual((primary as any)[key],(original as any)[key],`Preserve base mechanics: ${id} ${key}`);
  assert.ok(original.details?.every(detail=>primary.details?.some(merged=>merged.html===detail.html)),id);
  assert.ok(version.details?.every(detail=>primary.details?.some(merged=>merged.html.endsWith(detail.html)&&merged.html.includes(link.note))),id);
  assert.ok(primary.source.some(source=>source.book===version.source[0].book&&source.page===version.source[0].page),id);
  assert.ok(primary.aliases?.includes(version.nameEn),id);
 }
 const before=JSON.stringify([base,raw]);
 mergeDragonIdentities(base,raw,links);
 assert.equal(JSON.stringify([base,raw]),before,'Merging leaves inputs untouched');
 assert.throws(()=>mergeDragonIdentities(base,raw,{[raw[0].id]:{targetId:'missing',note:''}}),/Missing Dragon identity target/);
}
check(classes,bookClasses,dragonClasses as ClassEntry[],classLinks);
check(races,bookRaces,dragonRaces as RaceEntry[],raceLinks);
assert.ok(classes.find(entry=>entry.id==='barbarian')&&!classes.find(entry=>entry.id==='barbarian')?.referenceOnly);
assert.ok(!classes.find(entry=>entry.id==='oa-barbarian')?.source.some(source=>/^Dragon #/.test(source.book)));
assert.ok(classes.some(entry=>entry.id==='dragon-068-class-cloistered-cleric'&&entry.referenceOnly),'Distinct NPC career stays separate');
assert.ok(classes.some(entry=>entry.id==='dragon-045-class-archer'&&entry.referenceOnly));
assert.ok(races.find(entry=>entry.nameEn==='Half-Ogre')?.referenceOnly);
for(const entry of [...dragonClasses,...dragonRaces])for(const detail of entry.details??[])assert.ok(!detail.html.includes('中文规则摘要')&&!detail.html.includes('<p>原作：'),entry.id);
console.log('PASS: six class versions and one race version merged; book mechanics, NPC restrictions, source text and aliases preserved.');
