import assert from 'node:assert/strict';
import {spells} from '../src/data/public/spells';
import raw from '../src/data/public/dragon-spells.json';
import ua from '../src/data/public/ua-spells-imported.json';
import links from '../src/data/public/dragon-spell-versions.json';
import {mergeDragonSpells} from '../src/utils/merge-dragon-spells';
import type {Spell} from '../src/schemas';
import {spellRuleHeader} from '../src/utils/spell-layout';
const parameters=['nameZh','nameEn','level','classes','school','components','castingTime','range','duration','areaOfEffect','savingThrow','reversible','materialComponent','description'] as const;
for(const [id,link] of Object.entries(links)){
 assert.ok(!spells.some(spell=>spell.id===id),`${id} must not be a second catalog entry`);
 const primary=spells.find(spell=>spell.id===link.targetId)! as Spell;
 const original=ua.find(spell=>spell.id===link.targetId)! as Spell;
 const version=raw.find(spell=>spell.id===id)!;
 assert.ok(primary&&original&&version,id);
 for(const key of parameters)assert.deepEqual(primary[key],original[key],`Keep book rules: ${id} ${key}`);
 assert.ok(primary.source.some(source=>source.book===version.source[0].book&&source.page===version.source[0].page),id);
 assert.ok(primary.details?.some(detail=>detail.source.book===version.source[0].book&&detail.html.includes(version.castingTime)),id);
 assert.ok(version.details?.every(detail=>primary.details?.some(merged=>merged.html.endsWith(detail.html))),`Keep every magazine version: ${id}`);
 assert.equal(new Set(primary.source.map(source=>JSON.stringify(source))).size,primary.source.length,`No duplicate citations: ${id}`);
 assert.ok(original.details?.every(detail=>primary.details?.some(merged=>merged.html===detail.html)),id);
 assert.ok(primary.details?.some(detail=>detail.source.book===version.source[0].book&&detail.html.includes(spellRuleHeader(version as Spell))),`PHB header for merged version: ${id}`);
}
for(const version of raw){
 const header=spellRuleHeader(version as Spell);
 const labels=['等级 Level','距离 Range','持续时间 Duration','影响范围 Area of Effect','成分 Components','施法时间 Casting Time','豁免检定 Saving Throw'];
 assert.ok(header.includes('class="spell-meta"')&&!header.includes('<dl>'),version.id);
 for(let i=1;i<labels.length;i++)assert.ok(header.indexOf(labels[i-1])<header.indexOf(labels[i]),version.id);
 assert.ok(header.includes(version.nameEn.replaceAll('&','&amp;').replaceAll("'",'&#39;')),version.id);
 if(version.reversible)assert.ok(header.includes('可逆 Reversible'),version.id);
}
assert.equal(spells.find(spell=>spell.id==='ua-cleric-2-dust-devil')!.level,2);
assert.ok(spells.find(spell=>spell.id==='ua-cleric-2-dust-devil')!.details!.some(detail=>detail.html.includes('三环')));
assert.ok(spells.some(spell=>spell.id==='dragon-124-spell-odeen-s-magic-cloud'));
const original=structuredClone(ua[0]) as Spell;
const version=structuredClone(raw[0]) as Spell;
version.classes=original.classes;
const before=JSON.stringify([original,version]);
const merged=mergeDragonSpells([original],[version],{[version.id]:{targetId:original.id}});
assert.equal(JSON.stringify([original,version]),before,'Merging must not mutate imported data');
assert.equal(merged.length,1);
assert.throws(()=>mergeDragonSpells([original],[version],{[version.id]:{targetId:'missing'}}),/Missing Dragon spell target/);
console.log(`PASS: ${Object.keys(links).length} Dragon versions share existing spell entries; book rules and issue citations retained.`);
