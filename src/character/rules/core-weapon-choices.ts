import type { CoreWeaponFamily } from './core-equipment-legality';
/** Specific proficiency identities; purchasing a bundled scabbard grants no proficiency. */
export const coreWeaponChoices:readonly {id:string;label:string;family:CoreWeaponFamily}[] = [
  {id:'dagger',label:'匕首',family:'dagger'},
  {id:'dart',label:'飞镖',family:'dart'},
  {id:'staff',label:'长棍',family:'staff'},
  {id:'club',label:'木棒',family:'club'},
  {id:'sling',label:'投石索',family:'sling'},
  {id:'spear',label:'矛',family:'spear'},
  {id:'scimitar',label:'弯刀',family:'scimitar'},
  {id:'sword-long',label:'长剑',family:'sword-long'},
  {id:'sword-short',label:'短剑',family:'sword-short'},
  {id:'sword-broad',label:'阔剑',family:'sword-broad'},
  {id:'sword-bastard',label:'混种剑',family:'sword-bastard'},
  {id:'sword-two-handed',label:'双手剑',family:'sword-two-handed'},
  {id:'crossbow-heavy',label:'重弩',family:'crossbow-heavy'},
  {id:'crossbow-light',label:'轻弩',family:'crossbow'},
  {id:'bow-long',label:'长弓',family:'longbow'},
  {id:'axe-hand',label:'手斧',family:'hand-axe'},
  {id:'hammer',label:'战锤',family:'hammer'},
  {id:'javelin',label:'标枪',family:'javelin'},
];
