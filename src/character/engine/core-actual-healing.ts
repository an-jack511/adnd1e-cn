import {validateCoreLifeState,type CoreLifeState} from './core-life-state';
/** PHB printed105–106/PDF106–107, HEALING, page images checked 2026-10-17.
 * DMG82 restrictions remain independent. This accounts for an actual table effect;
 * it does NOT validate its spell, potion, source availability or natural-rest rate.
 */
export const actualHealingSource={book:'PHB',printedPages:[105,106],pdfPages:[106,107],sourceId:'phb:105-106:actual-healing-cap',verification:'main-agent-page-images-2026-10-17'} as const;
export function applyActualHealing(input:CoreLifeState,fact:{amount:number;description:string}){
  const state=validateCoreLifeState(structuredClone(input));
  if(!Number.isSafeInteger(fact.amount)||fact.amount<1||!fact.description?.trim())throw new Error('Record a positive actual healing amount and its table description.');
  if(state.mortality!=='alive'||state.hpSettlement!=='settled'||state.currentHp===null||state.currentHp<1)throw new Error('Ordinary positive-HP healing cannot replace zero-HP recovery, revival or unresolved HP settlement.');
  const recovered=Math.min(fact.amount,state.maximumHp-state.currentHp);
  if(recovered===0)throw new Error('No lost HP to recover; no healing event applied.');
  return{state:validateCoreLifeState({...state,currentHp:state.currentHp+recovered}),recovered,unusedAmount:fact.amount-recovered,
    sourceIds:[actualHealingSource.sourceId,'dmg:82:zero-hit-points'],validationScope:'actual-effect-hp-accounting' as const};
}
