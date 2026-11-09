import assert from 'node:assert/strict';
import names from '../../src/data/terminology/names.json';
import {spells} from '../../src/data/public/spells';
import {items} from '../../src/data/public/items';
import {monsters} from '../../src/data/public/monsters';
import {classes} from '../../src/data/public/classes';
import {races} from '../../src/data/public/races';
import {currentItemLabel,findNamedEntry,nameAliases,sourceSectionLabel} from '../../src/utils/terminology';

const normalize=(s:string)=>s.normalize('NFKC').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').trim().replace(/\s+/g,' ').toLowerCase();
const known=new Map(names.map(e=>[`${e.category}:${normalize(e.en)}`,e]));
let count=0,verified=0;
for(const [category,entries] of [['spell',spells],['item',items],['monster',monsters],['class',classes],['race',races]] as const){
  for(const entry of entries){
    const row=known.get(`${category}:${normalize(entry.nameEn)}`);
    assert.ok(row,`Inventory missing ${category} ${entry.id}; run terminology:apply`);
    assert.ok(row.ids.includes(entry.id),`Stable ID missing from table: ${entry.id}`);
    if(row.status.startsWith('verified')||row.status.startsWith('adapted')){
      assert.equal(entry.nameZh,row.zh,`Name regressed after import: ${category} ${entry.id}`);verified++;
    }
    count++;
  }
}
const bag=items.find(e=>e.nameEn==='Bag of Holding')!;
const ranger=classes.find(e=>e.id==='ranger')!;
assert.equal(ranger.nameZh,'巡林客','Final user choice follows the 3R naming priority');
assert.ok(!ranger.description.includes('（3 版通译为巡林客）'));
assert.ok(!ranger.description.includes('注：在一些规则中，也译为游侠。'));
assert.ok(!ranger.details?.[0].html.includes('注：在一些规则中，也译为游侠。'));
assert.ok(nameAliases('class','Ranger').includes('游侠'));
assert.ok(nameAliases('item',bag.nameEn).includes('收纳袋'));
assert.equal(findNamedEntry(items,'item','收纳袋')?.id,bag.id);
assert.equal(currentItemLabel(bag,'收纳袋'),bag.nameZh);
assert.equal(currentItemLabel(bag,'妈妈缝的红布袋'),'妈妈缝的红布袋');
assert.equal(findNamedEntry(items,'item','尚不存在的自制物品'),undefined);
assert.ok(spells.some(e=>e.id==='gha-bigby-sensing-fingers'&&e.nameEn==="Bigby's Feeling Fingers"));
assert.ok(spells.some(e=>e.id==='gha-tenser-weaponmaster'&&e.nameEn==="Tenser's Master of Arms"));
const message=spells.find(e=>e.nameEn==='Message')!,sending=spells.find(e=>e.nameEn==='Sending')!;
assert.notEqual(message.nameZh,sending.nameZh,'Different English spells must remain distinct');
assert.equal(sourceSectionLabel('德拉维吉的负重兽术 Drawmij’s Beast of Burden（变化系）'),'卓姆吉的负重兽术 Drawmij’s Beast of Burden（变化系）');
assert.equal(sourceSectionLabel('原始手稿章节（没有英文对照）'),'原始手稿章节（没有英文对照）');
console.log(`PASS: ${count} live records inventoried; ${verified} sourced/partially sourced names; legacy aliases, custom labels and stable regional IDs preserved.`);
