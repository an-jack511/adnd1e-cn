/** AD&D 1e core class equipment permissions. No UA/OA or later-edition rules. */
export type CoreEquipmentClassId =
  | 'fighter' | 'paladin' | 'ranger' | 'cleric' | 'druid'
  | 'magic-user' | 'illusionist' | 'thief' | 'assassin' | 'monk';

export type CoreWeaponFamily =
  | 'bo-stick' | 'club' | 'crossbow' | 'crossbow-heavy' | 'dagger' | 'dart'
  | 'flail' | 'hammer' | 'hand-axe' | 'javelin' | 'jo-stick' | 'longbow'
  | 'mace' | 'pike' | 'pole-arm' | 'scimitar' | 'sling' | 'spear' | 'staff'
  | 'sword-bastard' | 'sword-broad' | 'sword-long' | 'sword-short'
  | 'sword-two-handed' | 'other';

export type ArmorFamily = 'leather' | 'other' | 'unknown';
export type ShieldMaterial = 'wood' | 'metal' | 'other' | 'unknown';

export interface EquipmentSource {
  readonly book: 'PHB' | 'DMG';
  readonly printedPages: readonly number[];
  readonly pdfPages: readonly number[];
  readonly section: string;
  readonly sourceFile: string;
  readonly sha256: string;
  readonly verification: 'verified-text-and-page-image';
}

const PHB_FILE = "__RESOURCES/CORE 3/tsr02100 - AD&D Player's Handbook.pdf";
const DMG_FILE = "__RESOURCES/CORE 3/tsr02011 - Advanced Dungeons & Dragons (Ad&D) 1St Ed - Dungeon Master'S Guide.pdf";
const PHB_SHA256 = 'E3DBA4EE08AF2AE88A6596422BAEC5F8138EE40AEB7D5946F64438396D3B3213';
const DMG_SHA256 = '7052949697A009497E5A828D5CF67998DF034E30569584110781BE46C6DE8669';

function phb(printedPages: readonly number[], pdfPages: readonly number[], section: string): EquipmentSource {
  return Object.freeze({book:'PHB', printedPages, pdfPages, section, sourceFile:PHB_FILE, sha256:PHB_SHA256, verification:'verified-text-and-page-image'});
}

export const coreEquipmentSources = Object.freeze({
  'phb:19:class-equipment-table': phb([19], [20], 'Character Classes Table II: Armor and Weapons Permitted, including all four footnotes'),
  'phb:20:cleric-equipment': phb([20], [21], 'The Cleric: edged/pointed blood-shedding weapons forbidden; magic armor, shields, and non-edged/non-pointed magic weapons'),
  'phb:21:druid-equipment': phb([21], [22], 'The Druid: leather armor and wooden shields only; metallic armor spoils magical powers'),
  'phb:22:fighter-equipment': phb([22], [23], 'The Fighter: any armor or weapon; all forms of magic armor, shields, and weapons'),
  'phb:25:magic-user-equipment': phb([25], [26], 'The Magic-User: no armor and few weapons'),
  'phb:27:thief-equipment': phb([27], [28], 'The Thief: light (leather) armor and the listed weapons'),
  'phb:30-32:monk-equipment': phb([30, 32], [31, 33], 'The Monk and strictures: no armor or shield; unlisted weapons cannot be used'),
  'phb:32:multiclass-equipment': phb([32], [33], 'The Multi-Classed Character: thief-function armor restriction and cleric/fighter edged-weapon exception'),
  'dmg:66:pike-context': Object.freeze({book:'DMG', printedPages:[66], pdfPages:[67], section:'Weapon Speed Factor: pike unusable in dungeons or without supporting masses of pikes', sourceFile:DMG_FILE, sha256:DMG_SHA256, verification:'verified-text-and-page-image'}),
} satisfies Record<string, EquipmentSource>);

export interface CoreClassEquipmentRule {
  readonly classId: CoreEquipmentClassId;
  readonly armor: 'any' | 'none' | 'leather-only';
  readonly shield: 'any' | 'none' | 'wood-only';
  readonly weapons: 'any' | readonly CoreWeaponFamily[];
  /** PHB 19 size/weight footnote is printed on this row's "any weapon" entry. */
  readonly broadWeaponSizeFootnote: boolean;
  readonly sourceIds: readonly (keyof typeof coreEquipmentSources)[];
}

const clericWeapons = ['club','flail','hammer','mace','staff'] as const;
const druidWeapons = ['club','dagger','dart','hammer','scimitar','sling','spear','staff'] as const;
const arcaneWeapons = ['dagger','dart','staff'] as const;
const thiefWeapons = ['club','dagger','dart','sling','sword-short','sword-broad','sword-long'] as const;
const monkWeapons = ['bo-stick','club','crossbow','crossbow-heavy','dagger','hand-axe','javelin','jo-stick','pike','pole-arm','spear','staff'] as const;

export const coreClassEquipmentRules: Readonly<Record<CoreEquipmentClassId, CoreClassEquipmentRule>> = Object.freeze({
  fighter:{classId:'fighter',armor:'any',shield:'any',weapons:'any',broadWeaponSizeFootnote:true,sourceIds:['phb:19:class-equipment-table','phb:22:fighter-equipment']},
  paladin:{classId:'paladin',armor:'any',shield:'any',weapons:'any',broadWeaponSizeFootnote:true,sourceIds:['phb:19:class-equipment-table']},
  ranger:{classId:'ranger',armor:'any',shield:'any',weapons:'any',broadWeaponSizeFootnote:true,sourceIds:['phb:19:class-equipment-table']},
  cleric:{classId:'cleric',armor:'any',shield:'any',weapons:clericWeapons,broadWeaponSizeFootnote:false,sourceIds:['phb:19:class-equipment-table','phb:20:cleric-equipment']},
  druid:{classId:'druid',armor:'leather-only',shield:'wood-only',weapons:druidWeapons,broadWeaponSizeFootnote:false,sourceIds:['phb:19:class-equipment-table','phb:21:druid-equipment']},
  'magic-user':{classId:'magic-user',armor:'none',shield:'none',weapons:arcaneWeapons,broadWeaponSizeFootnote:false,sourceIds:['phb:19:class-equipment-table','phb:25:magic-user-equipment']},
  illusionist:{classId:'illusionist',armor:'none',shield:'none',weapons:arcaneWeapons,broadWeaponSizeFootnote:false,sourceIds:['phb:19:class-equipment-table']},
  thief:{classId:'thief',armor:'leather-only',shield:'none',weapons:thiefWeapons,broadWeaponSizeFootnote:false,sourceIds:['phb:19:class-equipment-table','phb:27:thief-equipment']},
  assassin:{classId:'assassin',armor:'leather-only',shield:'any',weapons:'any',broadWeaponSizeFootnote:false,sourceIds:['phb:19:class-equipment-table']},
  monk:{classId:'monk',armor:'none',shield:'none',weapons:monkWeapons,broadWeaponSizeFootnote:false,sourceIds:['phb:19:class-equipment-table','phb:30-32:monk-equipment']},
});

export const coreEquipmentEvidence = Object.freeze({
  thiefSwordFamilies: thiefWeapons.filter(id => id.startsWith('sword-')),
  sizeLimits: Object.freeze({minimumLongbowHeightFeet:5, maximumWeaponLengthBelowFiveFeet:12, minimumHeavyWeaponBodyWeightPounds:100, maximumPoleArmWeightGpBelowOneHundredPounds:200}),
  scope: 'single-class core PHB permissions; multi-class and dual-class combination logic is deliberately not inferred' as const,
});
