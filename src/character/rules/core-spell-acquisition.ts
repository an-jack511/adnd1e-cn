export const spellAcquisitionSources=Object.freeze({
  'phb:10:intelligence-table-ii':{book:'PHB',printedPages:[10] as const,pdfPages:[11] as const,section:'Intelligence Table II; Chance/Minimum/Maximum',status:'verified-page-image' as const},
  'dmg:39:initial-magic-user-spells':{book:'DMG',printedPages:[39] as const,pdfPages:[40] as const,section:'Acquisition of Magic-User Spells',status:'verified-page-image' as const},
  'dmg:39:initial-illusionist-spells':{book:'DMG',printedPages:[39] as const,pdfPages:[40] as const,section:"Acquisition of Illusionists' Spells",status:'verified-page-image' as const},
  'phb:spell-table:illusionist-1':{book:'PHB',printedPages:[44] as const,pdfPages:[45] as const,section:'Illusionist first-level spell table, entries 1–12',status:'verified-text' as const},
});
export interface IntelligenceSpellRule {readonly minInt:number;readonly maxInt:number|null;readonly chancePercent:number;readonly minimumPerLevel:number;readonly maximumPerLevel:number|null}
export const intelligenceSpellRules:readonly IntelligenceSpellRule[]=Object.freeze([
  {minInt:9,maxInt:9,chancePercent:35,minimumPerLevel:4,maximumPerLevel:6},
  {minInt:10,maxInt:12,chancePercent:45,minimumPerLevel:5,maximumPerLevel:7},
  {minInt:13,maxInt:14,chancePercent:55,minimumPerLevel:6,maximumPerLevel:9},
  {minInt:15,maxInt:16,chancePercent:65,minimumPerLevel:7,maximumPerLevel:11},
  {minInt:17,maxInt:17,chancePercent:75,minimumPerLevel:8,maximumPerLevel:14},
  {minInt:18,maxInt:18,chancePercent:85,minimumPerLevel:9,maximumPerLevel:18},
  {minInt:19,maxInt:null,chancePercent:95,minimumPerLevel:10,maximumPerLevel:null},
]);
export const magicUserInitialCategories=Object.freeze({
  offensive:['burning-hands','charm-person','enlarge','friends','light','magic-missile','push','shocking-grasp','sleep'] as const,
  defensive:['affect-normal-fires','dancing-lights','feather-fall','hold-portal','jump','protection-from-evil','shield','spider-climb','ventriloquism'] as const,
  miscellaneous:['comprehend-languages','detect-magic','erase','find-familiar','identify','mending','message','unseen-servant','write'] as const,
});
export const forbiddenAtStart=Object.freeze(['nystuls-magic-aura','tensers-floating-disc'] as const);
export const illusionistInitialTable=Object.freeze(['audible-glamer','change-self','color-spray','dancing-lights','darkness','detect-illusion','detect-invisibility','gaze-reflection','hypnotism','light','phantasmal-force','wall-of-fog'] as const);
