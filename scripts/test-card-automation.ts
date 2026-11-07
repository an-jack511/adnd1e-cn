import {proficiencyBudget} from '../src/character/ref2/proficiencies';
import {monkCombat} from '../src/character/ref2/monk';
import assert from 'node:assert/strict';
import {blankCard,normalizeCard} from '../src/character/ref2/model';
import {strengthScore,automateSaves,combatProfile,generated,abilityBonus} from '../src/character/ref2/automation';
import {selectWeapons,weaponWithBase,enhancement} from '../src/character/ref2/weapons';
import {items} from '../src/data/public/items';
import {classes} from '../src/data/public/classes';
import options from '../src/data/public/character-options.json';
import {syncEquipped,carriedItems,selectAmmunition} from '../src/character/ref2/inventory';
import {acceptsItem} from '../src/character/ref2/item-roles';
import {references,selectReferences} from '../src/character/ref2/references';
import {computeArmorClass,computeEncumbrance,weightPounds} from '../src/rules-engine/character';

for(const raw of ['18/75','18（75）','１８／７５'])assert.equal(strengthScore(raw),'18/75');
assert.equal(strengthScore('18','00'),'18/00');assert.equal(strengthScore('18/100'),'18/00');
assert.equal(abilityBonus('STR','18/75','命中'),2);assert.equal(abilityBonus('DEX','18','投射'),3);
const card=blankCard();Object.assign(card.fields,{class:'fighter',level:'1'});automateSaves(card.fields);assert.equal(card.fields.save_0,'14');
card.fields.level='9';automateSaves(card.fields);assert.equal(card.fields.save_0,'8');
card.fields.save_modifier_0='2';automateSaves(card.fields);assert.equal(card.fields.save_0,'6');
card.fields.save_0='99';card.fields.level='13';automateSaves(card.fields);assert.equal(card.fields.save_0,'99','personal override survives');
const paladin={class:'paladin',level:'1'};automateSaves(paladin);assert.equal((paladin as any).save_0,'12');
for(const id of ['oa-bushi','oa-samurai','oa-kensai','oa-monk','oa-shukenja','oa-sohei','oa-wu-jen','oa-yakuza'])assert.ok(combatProfile({class:id,level:'3'}),id);
assert.equal(combatProfile({class:'oa-monk',level:'1'})!.attackFamily,'thief');
assert.equal(combatProfile({class:'dragon-045-class-alchemist-npc',level:'3'}),null);
for(const entry of classes)assert.ok(options.classes.some(c=>c.id===entry.id),entry.id);
const magic=items.find(i=>i.nameEn==='Spear +2')!;assert.ok(magic);assert.ok(acceptsItem(magic,'weapons'));
selectWeapons(card,[magic.id],items);const weapon=card.rows.weapons.find(r=>r.values.name===magic.id)!;assert.ok(weapon);assert.ok(weapon.values.sm);assert.equal(enhancement(magic),2);
const sword=items.find(i=>i.id==='long-sword')!;assert.ok(weaponWithBase(magic,items).weaponCombat);
const armor=items.find(i=>i.id==='phb-item-002')!;card.fields.armor_item=armor.id;syncEquipped(card,items);syncEquipped(card,items);assert.equal(card.rows.gear.filter(r=>r.values.itemId===armor.id).length,1);
const load=carriedItems(card,items);assert.equal(load.filter(e=>e.item.id===armor.id).length,1);assert.equal(weightPounds(armor),30);
const ammo=items.find(i=>i.id==='ua-weapon-sling-bullet')!;selectAmmunition(card,[ammo.id],items);const ammunition=card.rows.ammunition.find(r=>r.values.itemId===ammo.id)!;ammunition.values.count='20';ammunition.values.used='5';assert.equal(carriedItems(card,items).find(e=>e.item.id===ammo.id)!.quantity,15);assert.equal(weightPounds(ammo),.2);
const magicArrow=items.find(i=>i.id==='magic-arrow-1-2-24-in-number')!;assert.ok(acceptsItem(magicArrow,'ammunition'));
for(const kind of ['unarmed','proficiencies','valuables'] as const){const ref=references.find(r=>r.kind===kind)!;selectReferences(card,kind,[ref.id]);assert.ok(card.rows[kind].some(r=>r.values.referenceId===ref.id));}
assert.deepEqual(normalizeCard(JSON.parse(JSON.stringify(card))),card);
const chain=items.find(i=>i.id==='magic-chain-mail-1')!,shield=items.find(i=>i.id==='magic-shield-2')!;assert.equal(computeArmorClass(chain,shield,'18').value,-3);
assert.ok(references.filter(r=>r.kind==='proficiencies').length>80);assert.ok(references.filter(r=>r.kind==='valuables').length>30);
console.log('PASS: identity coverage, printed matrices, overrides, exceptional strength, magic weapons/ammunition, sourced references, armor inventory, quantity/weight and JSON round trip.');

assert.deepEqual(monkCombat(17),{ac:-3,move:32,attacks:'4',damage:'8–32'});assert.equal(monkCombat(18),null);
const dwarf={class:'fighter',race:'dwarf',level:'1',CON:'16'};automateSaves(dwarf);assert.equal((dwarf as any).save_2,'12');assert.equal((dwarf as any).save_0,'14');

const profCard=blankCard();Object.assign(profCard.fields,{class:'cleric',level:'4'});proficiencyBudget(profCard);assert.equal(profCard.fields.weapon_slots,'2');profCard.fields.level='5';proficiencyBudget(profCard);assert.equal(profCard.fields.weapon_slots,'3');assert.equal(profCard.fields.nonweapon_slots,'4');
Object.assign(profCard.fields,{class:'magic-user',level:'7'});proficiencyBudget(profCard);assert.equal(profCard.fields.nonweapon_slots,'5');
Object.assign(profCard.fields,{class:'oa-samurai',level:'2'});proficiencyBudget(profCard);assert.equal(profCard.fields.shared_slots,'6');
const costly=references.find(r=>r.kind==='proficiencies'&&r.source==='WSG'&&r.values.slots==='2')!;selectReferences(profCard,'proficiencies',[costly.id]);assert.match(proficiencyBudget(profCard),/共用已用 2/);
profCard.fields.shared_slots='99';profCard.fields.level='3';proficiencyBudget(profCard);assert.equal(profCard.fields.shared_slots,'99');
