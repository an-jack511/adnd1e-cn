import type { InitialCoreClassId } from './core-progression';
export interface CoreWeaponProficiencyRule {readonly initialSlots:number;readonly nonProficiencyPenalty:number;readonly levelsPerAddedSlot:number;readonly sourceIds:readonly ['phb:37:weapon-proficiency']}
export const coreWeaponProficiencyRules:Readonly<Record<InitialCoreClassId,CoreWeaponProficiencyRule>>=Object.freeze({
  cleric:{initialSlots:2,nonProficiencyPenalty:-3,levelsPerAddedSlot:4,sourceIds:['phb:37:weapon-proficiency']},
  druid:{initialSlots:2,nonProficiencyPenalty:-4,levelsPerAddedSlot:5,sourceIds:['phb:37:weapon-proficiency']},
  fighter:{initialSlots:4,nonProficiencyPenalty:-2,levelsPerAddedSlot:3,sourceIds:['phb:37:weapon-proficiency']},
  paladin:{initialSlots:3,nonProficiencyPenalty:-2,levelsPerAddedSlot:3,sourceIds:['phb:37:weapon-proficiency']},
  ranger:{initialSlots:3,nonProficiencyPenalty:-2,levelsPerAddedSlot:3,sourceIds:['phb:37:weapon-proficiency']},
  'magic-user':{initialSlots:1,nonProficiencyPenalty:-5,levelsPerAddedSlot:6,sourceIds:['phb:37:weapon-proficiency']},
  illusionist:{initialSlots:1,nonProficiencyPenalty:-5,levelsPerAddedSlot:6,sourceIds:['phb:37:weapon-proficiency']},
  thief:{initialSlots:2,nonProficiencyPenalty:-3,levelsPerAddedSlot:4,sourceIds:['phb:37:weapon-proficiency']},
  assassin:{initialSlots:3,nonProficiencyPenalty:-2,levelsPerAddedSlot:4,sourceIds:['phb:37:weapon-proficiency']},
  monk:{initialSlots:1,nonProficiencyPenalty:-3,levelsPerAddedSlot:2,sourceIds:['phb:37:weapon-proficiency']},
});
export const coreWeaponProficiencySource=Object.freeze({book:'PHB',printedPages:[37] as const,pdfPages:[38] as const,section:'Weapon Proficiency Table and Notes',status:'verified-text-and-page-image' as const});
