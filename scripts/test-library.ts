import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {items} from '../src/data/public/items';
import {baseItems} from '../src/data/public/items-base';
import {canonicalItemId} from '../src/utils/merge-ua-equipment';
import {classes} from '../src/data/public/classes';
import {races} from '../src/data/public/races';
import {blankCard,normalizeCard,selectInventory} from '../src/character/ref2/model';
import {priceInGold} from '../src/utils/item-price';
import {isMagicItem} from '../src/utils/item-classification';
import topics from '../src/data/published/books.json';
const byId=(id:string)=>{const item=items.find(item=>item.id===id);assert.ok(item,id);return item;};
for(const old of baseItems)assert.ok(items.some(item=>item.id===canonicalItemId(old.id)),`Keep saved-card IDs and URLs: ${old.id}`);
for(const item of items){
 assert.ok(item.nameZh&&item.nameEn&&item.description,item.id);
 if(isMagicItem(item)){assert.equal(item.category,'魔法物品',item.id);assert.ok(item.details?.length,`Rules missing: ${item.id}`);assert.ok(!/DMG 表列 XP/.test(item.description),`Table-only description: ${item.id}`);}
}
for(const entry of [...classes,...races])assert.ok(entry.details?.length,`Complete source rules: ${entry.id}`);
assert.ok(classes.find(c=>c.id==='cleric')?.source.some(s=>s.book==='GHA'));
assert.ok(classes.find(c=>c.id==='ranger')?.source.some(s=>s.book==='UA'));
assert.ok(races.find(r=>r.id==='elf')?.source.some(s=>s.book==='UA'));
assert.ok(races.find(r=>r.id==='hengeyokai')?.details?.some(d=>d.html.includes('动物形态')&&d.html.includes('<table')));
assert.ok(races.find(r=>r.id==='dla-kender')?.details?.some(d=>d.html.includes('坎德')));
assert.equal(byId('dla-dragonlance').category,'魔法物品');
assert.equal(byId('magic-ring-mail-1').subCategory,'护甲与盾牌');
assert.equal(items.find(i=>i.nameEn==='Staff of Curing')?.subCategory,'法杖');
assert.equal(items.find(i=>i.nameEn==='Wand of Fire')?.subCategory,'魔杖');
assert.ok(!byId('magic-extra-healing').catalogHidden);
assert.ok(byId('healing-potion').description.includes('4')||byId('healing-potion').details?.some(d=>d.html.includes('4')));
assert.ok(!byId('phb-item-089').description.includes('平底船'));
assert.ok(byId('phb-item-128').description.includes('开锁'));
assert.ok(byId('oa-katana').description.includes('只有武士'));
const bag=items.find(i=>i.nameEn==='Bag of Holding');assert.ok(bag?.details?.some(d=>d.html.includes('<table')));
assert.ok(items.find(i=>i.nameEn==='Plate Mail of Etherealness')?.details?.some(d=>d.html.includes('20')&&d.html.includes('5')));
const routes=new Set(topics.map(t=>`/books/${t.book}/${t.slug}/`));
for(const entry of [...items,...classes,...races])for(const detail of entry.details??[]){
 assert.ok(/^\/books\/[a-z0-9-]+\/$/.test(detail.href)||routes.has(detail.href),`Source route: ${entry.id} ${detail.href}`);
 assert.equal((detail.html.match(/<table\b/gi)??[]).length,(detail.html.match(/<\/table>/gi)??[]).length,`Truncated table: ${entry.id} ${detail.title}`);
}
const light=JSON.parse(readFileSync('src/data/public/item-index.json','utf8'));
assert.equal(light.length,items.length);assert.ok(light.every((item:any)=>!('details' in item)),'Full book HTML stays out of the character bundle');
assert.equal(priceInGold('100 c.p.'),.5);assert.equal(priceInGold('20 s.p.'),1);assert.equal(priceInGold("2 ch'ien"),10);assert.equal(priceInGold('4 tael'),2);assert.equal(priceInGold('40 yuan'),1);assert.equal(priceInGold('200 fen'),1);assert.equal(priceInGold('未列售价'),Infinity);
const card=blankCard();card.fields.magic_items='旧版手填魔法物品';
card.rows.gear[0].values={item:'自制绳梯',quantity:'0',note:'保留自定义附注'};
card.rows.gear[1].values={itemId:'future-item',item:'未来物品',quantity:'2'};
selectInventory(card,['long-sword','backpack'],'gear',items);
assert.ok(!card.rows.gear.some(row=>row.values.itemId==='long-sword'),'Weapons stay out of the gear picker');
const sword=card.rows.gear.find(row=>row.values.itemId==='backpack')!;sword.values.quantity='3';sword.values.location='马鞍袋';sword.values.note='原有附注';
selectInventory(card,['backpack','dla-dragonlance'],'gear',items);
assert.equal(card.rows.gear.filter(row=>row.values.itemId==='backpack').length,1);assert.equal(sword.values.quantity,'3');assert.equal(sword.values.location,'马鞍袋');assert.equal(sword.values.note,'原有附注');
assert.ok(!card.rows.gear.some(row=>row.values.itemId==='long-sword'));assert.ok(!card.rows.gear.some(row=>row.values.itemId==='dla-dragonlance'));
selectInventory(card,['dla-dragonlance'],'magic',items);selectInventory(card,[],'gear',items);
assert.ok(card.rows.gear.some(row=>row.values.itemId==='dla-dragonlance'));assert.ok(card.rows.gear.some(row=>row.values.item==='自制绳梯'&&row.values.quantity==='0'));assert.ok(card.rows.gear.some(row=>row.values.itemId==='future-item'));assert.equal(card.fields.magic_items,'旧版手填魔法物品');
assert.deepEqual(normalizeCard(JSON.parse(JSON.stringify(card))),card);
console.log(`PASS: ${items.length} item records, sourced class/race rules, table boundaries, magic taxonomy, OA prices, stable IDs and non-destructive inventory selection.`);

for(const entry of [...classes,...races])for(const detail of entry.details??[]){
 assert.ok(!/<p>\s*\|[^<]+\|/s.test(detail.html),`Unparsed table: ${entry.id}`);
 assert.ok(!/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*<h[1-6]\b/.test(detail.html),`Heading inside a sentence: ${entry.id}`);
}
const dwarf=races.find(entry=>entry.id==='dwarf')!;
const dwarfCap=dwarf.details!.find(detail=>detail.title==='UA · 职业等级与属性上限表')!.html;
assert.ok(dwarfCap.includes('矮人'));assert.ok(!dwarfCap.includes('表 II.D'));assert.ok(!dwarfCap.includes('表 II.E'));
for(const entry of classes.filter(entry=>entry.id.startsWith('oa-')))assert.ok(!entry.details?.find(detail=>detail.title.startsWith('OA · 职业选择'))?.html.includes('竹灵族'));
console.log('PASS: isolated race/class extracts, parsed tables and inline titles.');

const {spells}=await import('../src/data/public/spells');
const {monsters}=await import('../src/data/public/monsters');
const regionalSpellCount=(book:string)=>spells.filter(entry=>entry.source.some(source=>source.book===book)).length;
assert.equal(regionalSpellCount('GHA'),118);assert.equal(regionalSpellCount('FR'),43);
for(const entries of [spells,monsters,items])assert.equal(new Set(entries.map(entry=>entry.id)).size,entries.length,'Unique library IDs');
for(const entry of [...spells,...monsters].filter(entry=>entry.source.some(source=>['GHA','DLA','FR'].includes(source.book)))){
 assert.ok(entry.details?.length,`Complete regional rules: ${entry.id}`);
 for(const detail of entry.details??[])assert.ok(routes.has(detail.href),`Regional source: ${detail.href}`);
}
assert.ok(spells.find(entry=>entry.id==='gha-bigby-sensing-fingers')?.nameZh.startsWith('毕格比'));
assert.equal(spells.find(entry=>entry.nameEn==='Reveal')?.school,'预言');
assert.ok(monsters.some(entry=>entry.id==='dla-dreamshadows'));
assert.equal(items.filter(entry=>entry.source.some(source=>source.book==='FR')&&entry.category==='魔法物品').length,19);
assert.equal(items.filter(entry=>entry.id.startsWith('fr-poison-')).length,9);
const {printScale}=await import('../src/character/ref2/printing');
assert.equal(printScale(900),1);assert.ok(printScale(1200)<1);assert.equal(printScale(3000),1,'Long filled cards continue rather than shrinking illegibly');
console.log('PASS: complete regional spell imports, stable IDs, source routes, magic book/poison isolation and readable print scaling.');
