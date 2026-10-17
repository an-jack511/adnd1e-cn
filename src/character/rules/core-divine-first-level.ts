import type { CoreSpellDefinitionRef } from './core-spell-ledger';
export const divineFirstLevelSources={
  'phb:40:cleric-first-level-spells':{book:'PHB',printedPages:[40],pdfPages:[41],section:'Spell Tables — Clerics, 1st Level',verification:'page-image-and-text'},
  'phb:41:druid-first-level-spells':{book:'PHB',printedPages:[41],pdfPages:[42],section:'Spell Tables — Druids, 1st Level',verification:'page-image-and-text'},
} as const;
const cleric=[['bless','祝福术'],['command','命令术'],['create-water','造水术'],['cure-light-wounds','治疗轻伤'],['detect-evil','侦测邪恶'],['detect-magic','侦测魔法'],['light','光亮术'],['protection-from-evil','防护邪恶'],['purify-food-and-drink','净化食粮'],['remove-fear','移除恐惧'],['resist-cold','抵抗寒冷'],['sanctuary','圣域术']] as const;
const druid=[['animal-friendship','动物友好术'],['detect-magic','侦测魔法'],['detect-snares-and-pits','侦测陷阱与坑洞'],['entangle','纠缠术'],['faerie-fire','妖火'],['invisibility-to-animals','对动物隐形'],['locate-animals','定位动物'],['pass-without-trace','无迹行踪'],['predict-weather','预测天气'],['purify-water','净水术'],['shillelagh','橡棍术'],['speak-with-animals','动物交谈术']] as const;
export function coreDivineFirstLevelChoices(classId:'cleric'|'druid'):readonly CoreSpellDefinitionRef[]{
  const sourceId=classId==='cleric'?'phb:40:cleric-first-level-spells':'phb:41:druid-first-level-spells';
  return (classId==='cleric'?cleric:druid).map(([id,displayName])=>({definitionId:`adnd1e-core:${classId}:1:${id}`,rulesetId:'adnd1e-core@1',listId:classId,level:1,displayName,sourceIds:[sourceId]}));
}
