import assert from 'node:assert/strict';
import {items} from '../src/data/public/items';
import {itemIndex} from '../src/data/public/item-index';
import {withOrdinaryWeight,inheritMagicWeights} from '../src/utils/item-weight';
import {weightPounds,computeEncumbrance} from '../src/rules-engine/character';
import {blankCard,blankRow} from '../src/character/ref2/model';
import {carriedItems,syncEquipped,selectAmmunition} from '../src/character/ref2/inventory';
import {weaponWithBase} from '../src/character/ref2/weapons';
const get=(id:string)=>{const item=items.find(item=>item.id===id);assert.ok(item,id);return item;};

for(const [magic,base] of [
 ['magic-plate-mail-1','phb-item-007'],['magic-chain-mail-3','phb-item-002'],
 ['magic-shield-1','shield'],['magic-shield-large-1-4-vs-missiles','phb-item-010'],
 ['magic-spear-1','phb-item-058'],['magic-dagger-of-venom','dagger'],
 ['magic-arrow-1-2-24-in-number','phb-item-015'],['magic-mace-1','mace'],
 ['magic-spear-cursed-backbiter','phb-item-058'],['ua-magic-quarterstaff-magic','ua-weapon-staff-quarter'],
 ['magic-axe-2-throwing','phb-item-019'],
]){
 assert.equal(get(magic).weight,get(base).weight,magic);
 assert.equal(get(magic).weightBaseItemId,base,magic);
 // Runtime index normalization works even before the next index rebuild.
 assert.equal(itemIndex.find(item=>item.id===magic)?.weight,get(base).weight,magic);
}
assert.deepEqual(inheritMagicWeights(items),items,'Inheritance is idempotent');
assert.equal(withOrdinaryWeight(get('magic-sword-1'),items).weightBaseItemId,undefined,'Generic sword requires a model');
assert.equal(weaponWithBase(get('magic-sword-1'),items,'long-sword').weight,get('long-sword').weight);
const specified={...get('magic-sword-1'),weaponCombat:get('long-sword').weaponCombat};
assert.equal(weaponWithBase(specified,items,'short-sword').weight,get('short-sword').weight,'Existing combat data must not skip explicit weight');
for(const nameEn of ['Warlord Blade of Shield Lands','Brooch of Shielding','Wand of Hammerblows']){
 const item={...get('magic-sword-1'),nameEn,weight:'未列'};
 assert.equal(withOrdinaryWeight(item,items).weight,'未列',nameEn);
}
assert.equal(withOrdinaryWeight({...get('magic-sword-1'),nameEn:'Heavy Bolt +1'},items).weight,get('ua-weapon-quarrel-or-bolt-heavy').weight,'Use single bolt, not twenty-piece bundle');
assert.equal(withOrdinaryWeight({...get('magic-sword-1'),nameEn:'Sling Bullet +1'},items).weight,get('ua-weapon-sling-bullet').weight);
assert.equal(withOrdinaryWeight({...get('magic-sword-1'),nameEn:'Candle of Testing'},items).weight,get('phb-item-106').weight,'Other physical items also inherit');
assert.equal(weightPounds({...get('dagger'),weight:'50 gp'}),5,'Plain UA gp weights are usable');
assert.equal(weightPounds(get('magic-spear-1')),undefined,'Do not silently pick an endpoint of a printed range');

const card=blankCard();
card.fields.armor_item='magic-plate-mail-1';card.fields.shield_item='magic-shield-1';
syncEquipped(card,items);
const weapon=card.rows.weapons[0];weapon.values={name:'magic-sword-1',base_weapon:'long-sword'};
const gear=blankRow();gear.values={itemId:'magic-sword-1',quantity:'1'};card.rows.gear.push(gear);
selectAmmunition(card,['magic-arrow-1-2-24-in-number'],items);
card.rows.ammunition.find(row=>row.values.itemId==='magic-arrow-1-2-24-in-number')!.values={itemId:'magic-arrow-1-2-24-in-number',count:'20',used:'3'};
const carried=carriedItems(card,items),burden=computeEncumbrance(carried);
assert.equal(carried.filter(entry=>entry.item.id==='magic-sword-1').length,1,'Do not double-count combat and gear');
assert.deepEqual(burden.unknown,[]);
assert.ok(Math.abs(burden.value-(45+5+6+17*.2))<1e-9,'Armor, shield, selected sword model and remaining single arrows contribute weight');
console.log(`PASS: ordinary/magic weight parity, item index, explicit models, ammo quantities, equipment deduplication, gp parsing and guarded matching; ${items.filter(item=>item.weightBaseItemId).length} entries inherit weights.`);
