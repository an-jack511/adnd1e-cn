import type { InitialCoreClassId } from './core-progression';

export const startingResourceSources = Object.freeze({
  'phb:19:class-families': Object.freeze({book:'PHB',printedPages:[18,19] as const,pdfPages:[19,20] as const,section:'Character Classes and Sub-Classes',status:'verified-text-and-page-image' as const}),
  'phb:19:multiclass-hit-points': Object.freeze({book:'PHB',printedPages:[19] as const,pdfPages:[20] as const,section:'Notes Regarding Character Classes Table I — Hit Dice Type',status:'verified-text-and-page-image' as const}),
  'phb:35:starting-money': Object.freeze({book:'PHB',printedPages:[35] as const,pdfPages:[36] as const,section:'Money — Starting Money',status:'verified-text-and-page-image' as const}),
  'dmg:25:starting-money': Object.freeze({book:'DMG',printedPages:[25] as const,pdfPages:[26] as const,section:'Player Character Starting Money',status:'verified-text' as const}),
});
export type StartingMoneyFamily='cleric'|'fighter'|'magic-user'|'thief'|'monk';
export interface StartingMoneyRule {readonly family:StartingMoneyFamily;readonly diceCount:number;readonly dieSides:number;readonly multiplierGp:number;readonly minimumGp:number;readonly maximumGp:number;readonly sourceIds:readonly (keyof typeof startingResourceSources)[]}
export const startingMoneyRules:Readonly<Record<StartingMoneyFamily,StartingMoneyRule>>=Object.freeze({
  cleric:Object.freeze({family:'cleric',diceCount:3,dieSides:6,multiplierGp:10,minimumGp:30,maximumGp:180,sourceIds:['phb:35:starting-money'] as const}),
  fighter:Object.freeze({family:'fighter',diceCount:5,dieSides:4,multiplierGp:10,minimumGp:50,maximumGp:200,sourceIds:['phb:35:starting-money'] as const}),
  'magic-user':Object.freeze({family:'magic-user',diceCount:2,dieSides:4,multiplierGp:10,minimumGp:20,maximumGp:80,sourceIds:['phb:35:starting-money'] as const}),
  thief:Object.freeze({family:'thief',diceCount:2,dieSides:6,multiplierGp:10,minimumGp:20,maximumGp:120,sourceIds:['phb:35:starting-money'] as const}),
  monk:Object.freeze({family:'monk',diceCount:5,dieSides:4,multiplierGp:1,minimumGp:5,maximumGp:20,sourceIds:['phb:35:starting-money'] as const}),
});
/** Explicit 1e class/sub-class families; this prevents modern class assumptions and preserves the monk exception. */
export const startingMoneyFamilyByClass:Readonly<Record<InitialCoreClassId,StartingMoneyFamily>>=Object.freeze({
  cleric:'cleric',druid:'cleric',fighter:'fighter',paladin:'fighter',ranger:'fighter','magic-user':'magic-user',illusionist:'magic-user',thief:'thief',assassin:'thief',monk:'monk',
});
