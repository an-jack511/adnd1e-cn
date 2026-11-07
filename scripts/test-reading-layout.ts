import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {bilingualSpellSchool} from '../src/utils/spell-schools';
import {translateRuleHeading,formatRuleHtml} from '../src/utils/rule-text';
import readings from '../src/data/public/monster-reading.json';
import topics from '../src/data/published/topics';
for(const topic of topics)assert.match(topic.title,/[\u3400-\u9fff]/,`Untranslated chapter title: ${topic.book}/${topic.slug}`);
assert.equal(bilingualSpellSchool('变化系'),'变化系 Alteration');
assert.equal(bilingualSpellSchool('防护系 Abjuration；咒法／召唤系 Conjuration/Summoning'),'防护系 Abjuration；咒法／召唤系 Conjuration/Summoning');
assert.equal(bilingualSpellSchool('祈唤系'),'祈唤系 Invocation');
assert.equal(bilingualSpellSchool('塑能系'),'塑能系 Evocation');
assert.equal(bilingualSpellSchool('按所选法术而定'),'按所选法术而定 Varies by spell');
const devil=readings.devil;
assert.ok(devil.collection);
assert.ok(devil.headings.some(heading=>heading.title.includes('Baalzebul')));
assert.ok(devil.headings.some(heading=>heading.title.includes('Pit Fiend')));
assert.equal((devil.html.match(/<table/g)??[]).length,12);
assert.ok(devil.html.includes('10 年'),'Preserve full common rules before individual creatures');
assert.ok(devil.html.includes('18/00'),'Preserve the final creature; never truncate the description');
for(const [id,reading] of Object.entries(readings)){
 assert.ok(!/<p>\s*(?:##|\|[^<]*\|\s*:?-{2})/.test(reading.html),id);
 const anchors=[...reading.html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(anchors.length,new Set(anchors).size,`Duplicate headings: ${id}`);
 for(const heading of reading.headings)assert.ok(anchors.includes(heading.id),id);
}
let count=0;
function audit(path:string){
 for(const entry of readdirSync(path,{withFileTypes:true})){
  const file=join(path,entry.name);
  if(entry.isDirectory()){audit(file);continue;}
  if(!file.endsWith('.md'))continue;
  const markdown=readFileSync(file,'utf8');
  for(const heading of markdown.matchAll(/^#{1,6}\s+(.+)$/gm)){
   const original=heading[1];
   if(/[A-Za-z]/.test(original)&&!/[\u3400-\u9fff]/.test(original)){
    assert.match(translateRuleHeading(original),/[\u3400-\u9fff]/,`${file}: ${original}`);count++;
   }
  }
 }
}
audit('src/published/books');
assert.equal(translateRuleHeading('设置 Setup'),'冒险引入 · Setup');
assert.match(translateRuleHeading('Death’s Door'),/死亡之门/);
assert.ok(translateRuleHeading('第三部分：Nuris Elfward 再度行走').includes('努里斯·精灵卫'));
assert.equal(formatRuleHtml('<h2 id="setup">设置 Setup</h2>'),'<h2 id="setup">冒险引入 · Setup</h2>');
console.log(`PASS: bilingual schools; ${Object.keys(readings).length} complete monster texts with section navigation; ${count} English headings translated with original anchors retained.`);
