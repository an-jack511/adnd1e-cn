/**
 * PHB printed 26–28: thief functions, including the printed racial row;
 * PHB printed 11: Dexterity Table II. Values are explicit table cells.
 * This module exposes the character's target percentages, never a hidden roll.
 */
export const coreThiefFunctionSourceIds = Object.freeze(['phb:26-27:thief-functions', 'phb:11:dex-thief-adjustment'] as const);

export type CoreThiefFunctionId =
  | 'pick-pockets' | 'open-locks' | 'find-remove-traps' | 'move-silently'
  | 'hide-in-shadows' | 'hear-noise' | 'climb-walls' | 'read-languages';

export const coreThiefFunctionLabels:Readonly<Record<CoreThiefFunctionId,string>>=Object.freeze({
  'pick-pockets':'扒窃',
  'open-locks':'开锁',
  'find-remove-traps':'发现／拆除陷阱',
  'move-silently':'无声移动',
  'hide-in-shadows':'藏于阴影',
  'hear-noise':'聆听声响',
  'climb-walls':'攀爬墙壁',
  'read-languages':'阅读语言',
});

type ThiefFunctionRow=Readonly<Record<CoreThiefFunctionId,number|null>> & {level:number};
const row=(level:number,values:Omit<ThiefFunctionRow,'level'>):ThiefFunctionRow=>Object.freeze({level,...values});

/** PHB Thieves Table, including the level-17 row; no interpolation. */
export const coreThiefFunctionRows:readonly ThiefFunctionRow[]=Object.freeze([
  row(1, { 'pick-pockets':30,'open-locks':25,'find-remove-traps':20,'move-silently':15,'hide-in-shadows':10,'hear-noise':10,'climb-walls':85,'read-languages':null }),
  row(2, { 'pick-pockets':35,'open-locks':29,'find-remove-traps':25,'move-silently':21,'hide-in-shadows':15,'hear-noise':10,'climb-walls':86,'read-languages':null }),
  row(3, { 'pick-pockets':40,'open-locks':33,'find-remove-traps':30,'move-silently':27,'hide-in-shadows':20,'hear-noise':15,'climb-walls':87,'read-languages':null }),
  row(4, { 'pick-pockets':45,'open-locks':37,'find-remove-traps':35,'move-silently':33,'hide-in-shadows':25,'hear-noise':15,'climb-walls':88,'read-languages':20 }),
  row(5, { 'pick-pockets':50,'open-locks':42,'find-remove-traps':40,'move-silently':40,'hide-in-shadows':31,'hear-noise':20,'climb-walls':90,'read-languages':25 }),
  row(6, { 'pick-pockets':55,'open-locks':47,'find-remove-traps':45,'move-silently':47,'hide-in-shadows':37,'hear-noise':20,'climb-walls':92,'read-languages':30 }),
  row(7, { 'pick-pockets':60,'open-locks':52,'find-remove-traps':50,'move-silently':55,'hide-in-shadows':43,'hear-noise':25,'climb-walls':94,'read-languages':35 }),
  row(8, { 'pick-pockets':65,'open-locks':57,'find-remove-traps':55,'move-silently':62,'hide-in-shadows':49,'hear-noise':25,'climb-walls':96,'read-languages':40 }),
  row(9, { 'pick-pockets':70,'open-locks':62,'find-remove-traps':60,'move-silently':70,'hide-in-shadows':56,'hear-noise':30,'climb-walls':98,'read-languages':45 }),
  row(10,{ 'pick-pockets':80,'open-locks':67,'find-remove-traps':65,'move-silently':78,'hide-in-shadows':63,'hear-noise':30,'climb-walls':99,'read-languages':50 }),
  row(11,{ 'pick-pockets':90,'open-locks':72,'find-remove-traps':70,'move-silently':86,'hide-in-shadows':70,'hear-noise':35,'climb-walls':99.1,'read-languages':55 }),
  row(12,{ 'pick-pockets':100,'open-locks':77,'find-remove-traps':75,'move-silently':94,'hide-in-shadows':77,'hear-noise':35,'climb-walls':99.2,'read-languages':60 }),
  row(13,{ 'pick-pockets':105,'open-locks':82,'find-remove-traps':80,'move-silently':99,'hide-in-shadows':85,'hear-noise':40,'climb-walls':99.3,'read-languages':65 }),
  row(14,{ 'pick-pockets':110,'open-locks':87,'find-remove-traps':85,'move-silently':99,'hide-in-shadows':93,'hear-noise':40,'climb-walls':99.4,'read-languages':70 }),
  row(15,{ 'pick-pockets':115,'open-locks':92,'find-remove-traps':90,'move-silently':99,'hide-in-shadows':99,'hear-noise':50,'climb-walls':99.5,'read-languages':75 }),
  row(16,{ 'pick-pockets':125,'open-locks':97,'find-remove-traps':95,'move-silently':99,'hide-in-shadows':99,'hear-noise':50,'climb-walls':99.6,'read-languages':80 }),
  row(17,{ 'pick-pockets':125,'open-locks':99,'find-remove-traps':99,'move-silently':99,'hide-in-shadows':99,'hear-noise':55,'climb-walls':99.7,'read-languages':80 }),
]);

/** PHB Dexterity Table II: only five primary functions receive DEX adjustment. */
export const coreThiefDexterityAdjustments:Readonly<Record<number,Readonly<Partial<Record<CoreThiefFunctionId,number>>>>>=Object.freeze({
  9:{'pick-pockets':-15,'open-locks':-10,'find-remove-traps':-10,'move-silently':-20,'hide-in-shadows':-10},
  10:{'pick-pockets':-10,'open-locks':-5,'find-remove-traps':-10,'move-silently':-15,'hide-in-shadows':-5},
  11:{'pick-pockets':-5,'open-locks':0,'find-remove-traps':-5,'move-silently':-10,'hide-in-shadows':0},
  12:{'pick-pockets':0,'open-locks':0,'find-remove-traps':0,'move-silently':-5,'hide-in-shadows':0},
  13:{'pick-pockets':0,'open-locks':0,'find-remove-traps':0,'move-silently':0,'hide-in-shadows':0},
  14:{'pick-pockets':0,'open-locks':0,'find-remove-traps':0,'move-silently':0,'hide-in-shadows':0},
  15:{'pick-pockets':0,'open-locks':0,'find-remove-traps':0,'move-silently':0,'hide-in-shadows':0},
  16:{'pick-pockets':0,'open-locks':5,'find-remove-traps':0,'move-silently':0,'hide-in-shadows':0},
  17:{'pick-pockets':5,'open-locks':10,'find-remove-traps':0,'move-silently':5,'hide-in-shadows':5},
  18:{'pick-pockets':10,'open-locks':15,'find-remove-traps':5,'move-silently':10,'hide-in-shadows':10},
});

export type CoreThiefRaceId='human'|'dwarf'|'elf'|'gnome'|'half-elf'|'halfling'|'half-orc';
export const coreThiefRacialAdjustments:Readonly<Record<CoreThiefRaceId,Readonly<Partial<Record<CoreThiefFunctionId,number>>>>>=Object.freeze({
  human:{},
  dwarf:{'open-locks':10,'find-remove-traps':15,'climb-walls':-10,'read-languages':-5},
  elf:{'pick-pockets':5,'open-locks':-5,'move-silently':5,'hide-in-shadows':10,'hear-noise':5},
  gnome:{'open-locks':5,'find-remove-traps':10,'move-silently':5,'hide-in-shadows':5,'hear-noise':10,'climb-walls':-15},
  'half-elf':{'pick-pockets':10,'hide-in-shadows':5},
  halfling:{'pick-pockets':5,'open-locks':5,'find-remove-traps':5,'move-silently':10,'hide-in-shadows':15,'hear-noise':5,'climb-walls':-15,'read-languages':-5},
  'half-orc':{'pick-pockets':-5,'open-locks':5,'find-remove-traps':5,'climb-walls':5,'read-languages':-10},
});
