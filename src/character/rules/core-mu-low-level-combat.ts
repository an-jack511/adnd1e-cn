/** Main-agent page-image verification 2026-10-16, local DMG scan.
 * Printed74/PDF75 I.C column1-5; printed79/PDF80 saving matrix MU1-5.
 * ONLY these columns, not complete combat or modifiers. No linear THAC0 replacement.
 */
export const lowLevelMuCombat = Object.freeze({
  minimumLevel:1,maximumLevel:5,
  attackSource:{book:'DMG',printedPages:[74],pdfPages:[75],verification:'page-image-column-1-5'},
  saveSource:{book:'DMG',printedPages:[79],pdfPages:[80],verification:'page-image-row-1-5-and-headings'},
  armorClasses:Object.freeze([-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10]),
  attackTargets:Object.freeze([26,25,24,23,22,21,20,20,20,20,20,20,19,18,17,16,15,14,13,12,11]),
  saves:Object.freeze([
    {id:'death',label:'麻痹／毒素／死亡魔法',target:14},
    {id:'polymorph',label:'石化／变形',target:13},
    {id:'device',label:'权杖／法杖／魔杖',target:11},
    {id:'breath',label:'吐息武器',target:15},
    {id:'spell',label:'法术',target:12},
  ]),
  caveats:'职业基础值；物品变形、造成石化/变形的吐息、已有指定类别的法术应归入对应类别。自然1总是失败。武器、距离、能力、魔法及情境修正另算。',
});
