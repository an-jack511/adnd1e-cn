export const performanceValues=Object.freeze({E:1,S:2,F:3,P:4} as const);
export type PerformanceRating=keyof typeof performanceValues;
export const trainingSources=Object.freeze({
  'dmg:86:gaining-levels':{book:'DMG',printedPages:[86] as const,pdfPages:[87] as const,section:'Gaining Experience Levels',status:'verified-page-image' as const},
});
export const nameLevelWeeklyCostGp=Object.freeze({cleric:2000,fighter:1000,'magic-user':4000,thief:2000} as const);
/** DMG86 names the title; the cited PHB table supplies its attained level.
 * These are not maximum levels, stronghold gates or first fixed-HP levels.
 */
export const coreTrainingNameLevels=Object.freeze({
  cleric:{level:9,title:'High Priest',sourceId:'phb:20:cleric'},
  druid:{level:12,title:'Druid',sourceId:'phb:21:druid'},
  fighter:{level:9,title:'Lord',sourceId:'phb:22:fighter'},
  paladin:{level:9,title:'Paladin',sourceId:'phb:24:paladin'},
  ranger:{level:10,title:'Ranger Lord',sourceId:'phb:24-25:ranger'},
  'magic-user':{level:11,title:'Wizard',sourceId:'phb:25-26:magic-user'},
  illusionist:{level:10,title:'Illusionist',sourceId:'phb:26:illusionist'},
  thief:{level:10,title:'Master Thief',sourceId:'phb:27:thief'},
  assassin:{level:9,title:'Assassin',sourceId:'phb:30:assassin'},
  monk:{level:7,title:'Superior Master',sourceId:'phb:30-32:monk'},
} as const);
