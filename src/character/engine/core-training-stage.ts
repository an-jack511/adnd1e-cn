import {coreTrainingNameLevels} from '../rules/core-training';
import type {InitialCoreClassId} from '../rules/core-progression';
const printedCostFamilies={cleric:'cleric',fighter:'fighter','magic-user':'magic-user',thief:'thief'} as const;
export function resolveCoreTrainingStage(classId:InitialCoreClassId,currentLevel:number){
  if(!Object.hasOwn(coreTrainingNameLevels,classId))throw new Error('Unknown core training career; Bard and expansions need their own procedure.');
  if(!Number.isSafeInteger(currentLevel)||currentLevel<1)throw new Error('Current level must be a positive integer.');
  const row=coreTrainingNameLevels[classId];
  return {stage:currentLevel<row.level?'below-name' as const:'name-level' as const,
    attainedNameLevel:row.level,title:row.title,
    printedCostFamily:Object.hasOwn(printedCostFamilies,classId)?printedCostFamilies[classId as keyof typeof printedCostFamilies]:null,
    sourceIds:['dmg:86:gaining-levels',row.sourceId]};
}
