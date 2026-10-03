import imported from './tables-imported.json';
import uaImported from './ua-tables-imported.json';
import { oaTables } from './oa-tables';

export type RandomTable = {
  id: string;
  title: string;
  dice: string;
  category: '地下城' | '随机遭遇' | '战利品';
  sourceHref: string;
  entries: { min: number; max: number; result: string; href?: string }[];
};

export const tables: RandomTable[] = [...(imported as RandomTable[]), ...(uaImported as RandomTable[]), ...oaTables];
