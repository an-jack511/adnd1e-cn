import assert from 'node:assert/strict';
import {items} from '../src/data/public/items';
import {baseItems} from '../src/data/public/items-base';
import {uaEquipmentLinks,canonicalItemId} from '../src/utils/merge-ua-equipment';
import {blankCard,normalizeCard} from '../src/character/ref2/model';
import {fillWeapon} from '../src/character/ref2/weapons';
for(const [oldId,targetId] of Object.entries(uaEquipmentLinks)) {
  assert.ok(!items.some(item=>item.id===oldId),`Duplicate remains: ${oldId}`);
  const item=items.find(item=>item.id===targetId)!;
  assert.ok(item,targetId);assert.ok(item.source.some(source=>source.book==='PHB'));assert.ok(item.source.some(source=>source.book==='UA'));
  assert.ok(item.details?.some(detail=>detail.title==='PHB 与 UA 合并资料'));
  const supplement=baseItems.find(item=>item.id===oldId)!;
  assert.ok(supplement,oldId);assert.deepEqual(item.weaponCombat,supplement.weaponCombat,`Lost UA combat: ${oldId}`);
  const row=blankCard().rows.weapons[0];fillWeapon(row,item);
  assert.equal(row.values.name,item.id);
}
assert.equal(items.find(item=>item.id==='short-sword')?.price,'8 gp');
assert.ok(items.find(item=>item.id==='short-sword')?.details?.some(detail=>detail.html.includes('8 gp')),'Retain UA price alongside PHB price');
for(const id of ['ua-weapon-crossbow-hand','ua-weapon-lance-light-horse','ua-weapon-lance-medium-horse','ua-weapon-lance-heavy-horse','ua-weapon-arrow','phb-item-015','phb-item-016','phb-item-017'])assert.ok(items.some(item=>item.id===id),id);
const card=blankCard();card.rows.weapons[0].values={name:'ua-weapon-dagger::missile',weaponPickerId:'ua-weapon-dagger',hit:'+3',notes:'自定义'};card.rows.gear[0].values={itemId:'ua-weapon-spear',quantity:'2'};
const migrated=normalizeCard(JSON.parse(JSON.stringify(card)));
assert.deepEqual(migrated.rows.weapons[0].values,{name:'dagger::missile',weaponPickerId:'dagger',hit:'+3',notes:'自定义'});
assert.equal(migrated.rows.gear[0].values.itemId,canonicalItemId('ua-weapon-spear'));
assert.deepEqual(normalizeCard(JSON.parse(JSON.stringify(migrated))),migrated);
console.log(`PASS: ${Object.keys(uaEquipmentLinks).length} reviewed PHB/UA identities, retained sources and UA attack data, distinct variants and legacy character IDs.`);
