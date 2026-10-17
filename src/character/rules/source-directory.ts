import { coreEligibilityPack } from './core-eligibility';
import { coreProgressionPack } from './core-progression';
import { startingResourceSources } from './core-starting-resources';
import { coreLanguageSources } from './core-languages';
import { coreEquipmentSources } from './core-equipment-legality';
import { coreInventorySources } from './core-inventory';
import { spellAcquisitionSources } from './core-spell-acquisition';
import { coreSpellCapacitySources } from './core-spell-capacity';
import { corePsionicsSources } from './core-psionics';
import { trainingSources } from './core-training';
import { coreTimeRestSources } from './core-time-rest';
import { coreWeaponProficiencySource } from './core-weapon-proficiency';
import { divineFirstLevelSources } from './core-divine-first-level';
import { coreLifeStateSources } from './core-life-state';
import {coreSpellLedgerSources} from './core-spell-ledger';

export interface DisplayRuleSource{id:string;book:string;printedPages:readonly number[];pdfPages:readonly number[];section:string;directoryUrl:string}
type SourceShape={book:string;printedPages?:readonly number[];printedPage?:number;pdfPages?:readonly number[];pdfPage?:number;section:string};
const entries:Record<string,SourceShape>={...Object.fromEntries(coreEligibilityPack.sources.map(source=>[source.id,source])),...coreProgressionPack.citations,...startingResourceSources,...coreLanguageSources,...coreEquipmentSources,...coreInventorySources,...spellAcquisitionSources,...coreSpellCapacitySources,...corePsionicsSources,...trainingSources,...coreTimeRestSources,...divineFirstLevelSources,'phb:37:weapon-proficiency':coreWeaponProficiencySource};
Object.assign(entries,{
  ...coreSpellLedgerSources,
  'dmg:74:core-pc-attack-matrices':{book:'DMG',printedPages:[74],pdfPages:[75],section:'Attack Matrices I.A–I.D.1'},
  'dmg:79:core-pc-saving-matrices':{book:'DMG',printedPages:[79],pdfPages:[80],section:'Saving Throw Matrix for Characters and Human Types'},
  'phb:11:dex-defense':{book:'PHB',printedPages:[11],pdfPages:[12],section:'Dexterity Table I and defensive adjustment notes'},
  'phb:36:ordinary-defense':{book:'PHB',printedPages:[36],pdfPages:[37],section:'Armor; Armor Class Table; shield limits'},
  'phb:30-31:monk-defense':{book:'PHB',printedPages:[30,31],pdfPages:[31,32],section:'The Monk; Monks Table II'},
});
export function resolveDisplayRuleSource(id:string):DisplayRuleSource|null{
  const source:SourceShape|null=Object.hasOwn(entries,id)?entries[id]:Object.hasOwn(coreLifeStateSources,id)?coreLifeStateSources[id as keyof typeof coreLifeStateSources]:null;if(!source)return null;
  const book=source.book;
  return {id,book,printedPages:source.printedPages??(source.printedPage===undefined?[]:[source.printedPage]),pdfPages:source.pdfPages??(source.pdfPage===undefined?[]:[source.pdfPage]),section:source.section,directoryUrl:`/books/${book.toLowerCase()}/`};
}
