export const performanceValues=Object.freeze({E:1,S:2,F:3,P:4} as const);
export type PerformanceRating=keyof typeof performanceValues;
export const trainingSources=Object.freeze({
  'dmg:86:gaining-levels':{book:'DMG',printedPages:[86] as const,pdfPages:[87] as const,section:'Gaining Experience Levels',status:'verified-page-image' as const},
});
export const nameLevelWeeklyCostGp=Object.freeze({cleric:2000,fighter:1000,'magic-user':4000,thief:2000} as const);
