import assert from 'node:assert/strict';
import {spells} from '../src/data/public/spells';
import {items} from '../src/data/public/items';
import {canonicalItemId} from '../src/utils/merge-ua-equipment';
import {classes} from '../src/data/public/classes';
import {englishSpellSchool} from '../src/utils/spell-schools';
import {formatItemPrice} from '../src/utils/item-price';
import {formatRuleHtml} from '../src/utils/rule-text';
import {normalizeMarkdownTables} from './import/markdown-tables';
import {cardName} from '../src/character/ref2/labels';
import spellIndex from '../src/data/public/spell-index.json';
import ruleText from './rehype-rule-text';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
assert.equal(spellIndex.length,spells.length);
assert.ok(spellIndex.every(spell=>!('details' in spell)&&!('description' in spell)));
for(const item of items)assert.ok(!/[A-Za-z]/.test(cardName(item.nameZh)),item.id);
for(const spell of spells){
 assert.ok(!/[\u3400-\u9fff]/.test(englishSpellSchool(spell.school)),spell.id);
 if(spell.source[0].book==='PHB'||spell.id.startsWith('ua-'))assert.ok(spell.details?.length,`Missing full spell: ${spell.id}`);
 if(/\|\s*:?-{2}/.test(spell.description))assert.ok(spell.details?.some(detail=>detail.html.includes('<table')),`Lost effect table: ${spell.id}`);
 for(const detail of spell.details??[]){
  assert.ok(!/<p>\s*\|/.test(detail.html),`Raw table: ${spell.id}`);
  assert.equal((detail.html.match(/<table\b/g)??[]).length,(detail.html.match(/<\/table>/g)??[]).length,spell.id);
 }
}
assert.equal(englishSpellSchool('防护系 Abjuration；咒法／召唤系 Conjuration/Summoning'),'Abjuration, Conjuration/Summoning');
assert.equal(englishSpellSchool('幻术／魅影系'),'Illusion/Phantasm');
for(const item of items)assert.match(item.price,/^(?:\/|\d[\d,.／/–—−\- ]* (?:gp|sp|cp|ep|pp|ch'ien|tael|yuan|fen)(?:\/[^\n]+)?)$/,`Price: ${item.id} ${item.price}`);
const price=(id:string)=>items.find(item=>item.id===canonicalItemId(id))!.price;
assert.equal(price('ua-weapon-crossbow-hand'),'300 gp');
assert.equal(price('ua-weapon-sword-short'),'8 gp');
assert.equal(price('ua-weapon-whip'),'3 gp');
assert.equal(price('ua-weapon-bow-composite-long'),'100 gp');
assert.equal(price('ua-weapon-jo-stick'),'/');
assert.equal(formatItemPrice('每颗 1,000 gp（参考售价）'),'1,000 gp/颗');
assert.equal(formatItemPrice('— * gp（参考售价）'),'/');
assert.equal(formatItemPrice('2 s.p.'),'2 sp');
for(const entry of classes)for(const detail of entry.details??[]){
 if(!['WSG','DSG'].includes(detail.source.book)||!detail.title.includes('熟练项'))continue;
 assert.ok(detail.html.length<1800,`Whole proficiency chapter attached: ${entry.id}`);
 const cells=[...detail.html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map(match=>match[1]);
 assert.equal(cells.length,1,entry.id);
 assert.ok(!entry.id.startsWith('oa-'),'Do not apply western barbarian rows to OA barbarian');
}
const html=formatRuleHtml('<h2 id="旧页码">原书第 78–79 页</h2><h3 id="race">Korobokuru</h3><p>Hengeyokai、Oni 与 no-daichi。</p><a href="/Korobokuru/">出处</a>');
assert.ok(html.includes('<p id="旧页码" class="source-page-number">出处：原书第 78–79 页</p>'));
assert.ok(html.includes('<h3 id="race">科罗博库鲁</h3>'));
assert.ok(html.includes('变形妖、恶鬼与野太刀。'));
assert.ok(html.includes('href="/Korobokuru/"'));
assert.equal(normalizeMarkdownTables('| A | B |\n\n| --- | --- |\n\n| 1 | 2 |\n'),'| A | B |\n| --- | --- |\n| 1 | 2 |\n');
const twoTables='| A | B |\n| --- | --- |\n| 1 | 2 |\n\n| C | D |\n| --- | --- |\n| 3 | 4 |\n';
assert.equal(normalizeMarkdownTables(twoTables),twoTables,'Separate neighboring tables');
assert.equal(normalizeMarkdownTables(twoTables.replace('| 2 |\n\n','| 2 |\n')),twoTables,'Recover a missing table boundary');
const require=createRequire(import.meta.resolve('astro/package.json'));
const {createMarkdownProcessor}=await import(pathToFileURL(require.resolve('@astrojs/markdown-remark')).href);
const processor=await createMarkdownProcessor({syntaxHighlight:false,rehypePlugins:[ruleText]});
const rendered=(await processor.render('## 第 78 页\n\n### Korobokuru\n\n## 原书第 78–79 页')).code;
assert.ok(rendered.includes('id="第-78-页"'),rendered);
assert.ok(rendered.includes('id="korobokuru"'),rendered);
assert.ok(rendered.includes('id="原书第-7879-页"'),rendered);
console.log(`PASS: ${spells.length} spell schools and full effect tables; ${items.length} prices, UA source prices, isolated proficiencies, translated terms and preserved page anchors.`);
