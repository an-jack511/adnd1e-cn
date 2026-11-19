import assert from 'node:assert/strict';
import { blankCard } from '../src/character/ref2/model';
import { syncSpellbookGear } from '../src/character/ref2/inventory';
const card=blankCard();
card.fields.spellbook_records=JSON.stringify({books:[{id:'mu01',name:'主书'}],travel:[{instanceId:'road',name:'旅行书'}]});
card.preparedSpells=[{spellId:'one',count:1,expended:0,sourceBookId:'home:mu01'}];
syncSpellbookGear(card);
assert.deepEqual(card.rows.gear.filter(row=>row.values.autoSpellbook==='1').map(row=>row.values.bookWeightPounds),['45']);
card.preparedSpells.push({spellId:'two',count:1,expended:0,sourceBookId:'travel:road'});
syncSpellbookGear(card);
assert.deepEqual(card.rows.gear.filter(row=>row.values.autoSpellbook==='1').map(row=>row.values.bookWeightPounds),['45','6']);
card.preparedSpells=card.preparedSpells.filter(entry=>entry.sourceBookId!=='home:mu01');
syncSpellbookGear(card);
assert.deepEqual(card.rows.gear.filter(row=>row.values.autoSpellbook==='1').map(row=>row.values.bookWeightPounds),['6']);
card.preparedSpells=[];syncSpellbookGear(card);
assert.equal(card.rows.gear.filter(row=>row.values.autoSpellbook==='1').length,0);
console.log('PASS: only books used for prepared spells contribute their UA encumbrance.');

