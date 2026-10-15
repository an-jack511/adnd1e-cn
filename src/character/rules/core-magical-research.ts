export const coreMagicalResearchSources=Object.freeze({
  'dmg:115:spell-research':Object.freeze({book:'DMG',printedPages:[115],pdfPages:[116],section:'Spell Research: level, cost, length, conditions and materials',verification:'page-image-and-text'}),
  'dmg:116:spell-research-success':Object.freeze({book:'DMG',printedPages:[116],pdfPages:[117],section:'Chance and Determination of Success; Confidentiality; Additional Notes',verification:'page-image-and-text'}),
} as const);
export type CoreMagicalResearchSourceId=keyof typeof coreMagicalResearchSources;
export const coreSpellResearchRule=Object.freeze({
  id:'adnd1e-core-spell-research',version:'1.0.0',
  preparationWeeksPerSpellLevel:1,minimumCheckWeekOffset:1,dailyWorkHours:8,otherBusinessHoursPerDay:{minimum:1,maximum:2},
  baseWeeklyGpPerSpellLevelWithLibrary:200,baseWeeklyGpPerSpellLevelWithoutLibrary:2000,
  variableWeeklyGpPerSpellLevel:{minimum:100,maximum:400},laboratoryMonthlyMaintenancePercent:10,
  interruptionLossWeeksPerDay:1,successBasePercent:10,successPenaltyPercentPerSpellLevel:2,
  boostGpPerSpellLevel:2000,boostPercent:10,maximumBasePercentBeforeAbilityLevelModifiers:50,
  sourceIds:['dmg:115:spell-research','dmg:116:spell-research-success'] as const,
  confidentiality:'new spell belongs to the researching character; DM does not announce it',
  impossibleResearch:'may continue indefinitely and never succeeds; feasibility is DM-private',
  unresolved:Object.freeze({druidProcedure:'The checked text explicitly distinguishes cleric WIS/shrine but does not separately certify druids.',facilityConstruction:'Construction values are campaign facts; only monthly maintenance percentage is stated here.'}),
});
