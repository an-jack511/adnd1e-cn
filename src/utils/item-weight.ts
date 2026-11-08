import type {Item} from '../schemas';
import {isMagicItem} from './item-classification';

/** Site convention: a magic item's physical weight follows its mundane counterpart.
 * Match the object, not words in an effect/place name (e.g. Shield Lands).
 * Unspecified sword/bow/axe models remain unresolved until a base is selected.
 */
const counterparts:readonly [RegExp,string][] = [
 [/\bbanded mail\b/, 'phb-item-001'], [/\bchain mail\b/, 'phb-item-002'],
 [/\bstudded leather(?: armor)?\b/, 'phb-item-014'], [/\bleather(?: armor)?\b/, 'leather-armor'],
 [/\bpadded(?: armor)?\b/, 'phb-item-006'], [/\bplate mail\b/, 'phb-item-007'],
 [/\bring mail\b/, 'phb-item-008'], [/\bscale mail\b/, 'phb-item-009'], [/\bsplint mail\b/, 'phb-item-013'],
 [/^(?:large shield|shield,? large)$/, 'phb-item-010'],
 [/^(?:small wooden shield|shield,? small,? wooden)$/, 'phb-item-012'],
 [/^(?:small shield|shield,? small)$/, 'phb-item-011'], [/\bshield$/, 'shield'],
 [/\b(?:long sword|sword,? long)$/, 'long-sword'], [/\b(?:short sword|sword,? short)$/, 'short-sword'],
 [/\b(?:bastard sword|sword,? bastard)$/, 'phb-item-060'], [/\b(?:broad sword|broadsword|sword,? broad)$/, 'phb-item-061'],
 [/\b(?:two-handed sword|sword,? two-handed)$/, 'phb-item-064'],
 [/\b(?:battle axe|axe,? battle)$/, 'phb-item-018'], [/\b(?:throwing axe|hand axe|axe,? throwing|axe,? hand)$/, 'phb-item-019'],
 [/\bdagger(?:,.*)?$/, 'dagger'], [/\bscimitar(?:,.*)?$/, 'phb-item-055'], [/\bhammer(?:,.*)?$/, 'phb-item-042'],
 [/\bjavelin(?:,.*)?$/, 'phb-item-043'], [/\bspear(?:,.*)?$/, 'phb-item-058'], [/\btrident(?:,.*)?$/, 'phb-item-065'],
 [/\b(?:footman'?s mace|mace,? footman'?s)$/, 'phb-item-045'],
 [/\b(?:horseman'?s mace|mace,? horseman'?s)$/, 'phb-item-046'], [/\bmace$/, 'mace'],
 [/\b(?:footman'?s flail|flail,? footman'?s)$/, 'phb-item-033'],
 [/\b(?:horseman'?s flail|flail,? horseman'?s)$/, 'phb-item-034'],
 [/\bmorning star$/, 'phb-item-047'], [/\bquarterstaff(?:,.*)?$/, 'ua-weapon-staff-quarter'],
 [/\bknife$/, 'ua-weapon-knife'], [/\bwhip$/, 'ua-weapon-whip'], [/\bdart$/, 'phb-item-030'],
 [/\b(?:long composite bow|composite long bow|bow,? composite,? long)$/, 'phb-item-024'],
 [/\b(?:short composite bow|composite short bow|bow,? composite,? short)$/, 'phb-item-023'],
 [/^(?:long bow|longbow|bow,? long)$/, 'phb-item-025'], [/^(?:short bow|shortbow|bow,? short)$/, 'phb-item-026'],
 [/^(?:heavy crossbow|crossbow,? heavy)$/, 'phb-item-027'], [/^(?:light crossbow|crossbow,? light)$/, 'phb-item-028'],
 [/\barrows?$/, 'phb-item-015'],
 [/^(?:heavy (?:bolt|quarrel)|(?:bolt|quarrel),? heavy)$/, 'ua-weapon-quarrel-or-bolt-heavy'],
 [/^(?:light (?:bolt|quarrel)|(?:bolt|quarrel),? light)$/, 'ua-weapon-quarrel-or-bolt-light'],
 [/^(?:sling bullets?|bullets?,? sling)$/, 'ua-weapon-sling-bullet'],
 [/^(?:sling stones?|stones?,? sling)$/, 'ua-weapon-sling-stone'],
 [/^candle$/, 'phb-item-106'], [/^quiver$/, 'phb-item-119'],
 [/^backpack$/, 'backpack'], [/^lantern$/, 'lantern'], [/^torch$/, 'phb-item-130'],
];
const subject = (name:string) => name.toLowerCase().replace(/[’‘]/g,"'")
 .split(/\s+of\s+|\s*[+−–-]\s*\d|\s*\(/)[0].trim().replace(/,$/,'');
const listed = (weight:string) => /^\d/.test(weight);
const specificModels:Record<string,string>={'magic-axe-2-throwing':'phb-item-019'};

export function withOrdinaryWeight(item:Item,catalog:readonly Item[],explicit=''):Item {
 if(!isMagicItem(item))return item;
 const ordinary=catalog.filter(base=>!isMagicItem(base)&&!base.catalogHidden);
 const chosen=explicit ? ordinary.find(base=>base.id===explicit||base.nameZh===explicit||base.nameEn===explicit) : undefined;
 const baseId=specificModels[item.id]??counterparts.find(([pattern])=>pattern.test(subject(item.nameEn)))?.[1];
 const base=chosen??ordinary.find(base=>base.id===baseId);
 if(!base||!listed(base.weight))return item;
 return {...item,weight:base.weight,weightBaseItemId:base.id};
}

export function inheritMagicWeights(catalog:readonly Item[]):Item[] {
 return catalog.map(item=>withOrdinaryWeight(item,catalog));
}
