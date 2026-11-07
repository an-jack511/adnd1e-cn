import assert from 'node:assert/strict';
import {sourceGroup} from '../src/utils/source-group';
import {items} from '../src/data/public/items';
import {spells} from '../src/data/public/spells';
import {monsters} from '../src/data/public/monsters';
import {classes} from '../src/data/public/classes';
import {races} from '../src/data/public/races';
import {readFileSync} from 'node:fs';

assert.equal(sourceGroup('Dragon #117'),'Dragon');
assert.equal(sourceGroup('Dragon #124'),'Dragon');
assert.equal(sourceGroup('Dragon'),'Dragon');
assert.equal(sourceGroup('Dragon Magazine #169'),'Dragon');
assert.equal(sourceGroup('DLA'),'DLA');
assert.equal(sourceGroup('Dragonlance Adventures'),'Dragonlance Adventures');
for(const entries of [items,spells,monsters,classes,races]){
 const citations=entries.flatMap(e=>e.source.map(s=>s.book));
 const groups=new Set(citations.map(sourceGroup));
 assert.ok(![...groups].some(s=>/^Dragon #/.test(s)));
 if(citations.some(s=>/^Dragon #/.test(s)))assert.ok(groups.has('Dragon'));
}
for(const file of ['src/components/LibraryBrowser.astro','src/components/CharacterLibrary.astro','src/pages/spells/index.astro','src/pages/monsters/index.astro']){
 const text=readFileSync(file,'utf8');
 assert.ok(text.includes('sourceGroup('),file);
 assert.ok(text.includes('source.book')||text.includes('s.book'),file);
}
assert.ok(items.filter(e=>e.id.startsWith('dragon-')).every(e=>/^Dragon #\d+$/.test(e.source[0].book)),'Issue numbers stay in stored citations');
console.log('PASS: one Dragon facet across all libraries, issue citations preserved, old issue values normalize, unrelated books unchanged.');
