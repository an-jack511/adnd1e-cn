import {z} from 'zod';
import type {InitialCoreClassId} from '../rules/core-progression';
import {evaluateCoreEquipmentLegality} from './core-equipment-legality';
import {validateCoreInventoryLedger,type CoreInventoryLedger} from './core-inventory';
import {coreClassEquipmentRules} from '../rules/core-equipment-legality';

/** Raw table-confirmed equipment facts, not a cached AC or an instant donning action. */
export const defenseSelectionSchema=z.object({armorItemId:z.string().min(1).nullable(),shieldItemId:z.string().min(1).nullable(),ordinaryEquipmentConfirmed:z.literal(true),note:z.string().trim().min(1).max(500)}).strict();
export type DefenseSelection=z.infer<typeof defenseSelectionSchema>;
export const ordinaryArmorAc:Readonly<Record<string,number>>=Object.freeze({'armor-banded':4,'armor-chain':5,'armor-leather':8,'armor-padded':8,'armor-plate':3,'armor-ring':7,'armor-scale':6,'armor-splinted':4,'armor-studded':7});
const shields=['shield-large','shield-small','shield-small-wooden'];
// PHB printed11/PDF12, visually checked 2026-10-17; no extrapolation outside table.
const dexDefense=[4,3,2,1,0,0,0,0,0,0,0,0,-1,-2,-3,-4];
// PHB printed31/PDF32: preserve the repeated 7,3,-1, not a per-level formula.
const monkAc=[10,9,8,7,7,6,5,4,3,3,2,1,0,-1,-1,-2,-3];
export interface CoreDefenseView {status:'calculated'|'needs-dm';ac:number|null;withoutShield:number|null;dexAdjustment:number|null;armorLabel:string;shieldLabel:string;reason:string;sourceIds:string[]}
export function coreDefense(input:{classId:InitialCoreClassId;level:number;dexterity:number;inventory:CoreInventoryLedger|null;selection:DefenseSelection|null}):CoreDefenseView{
  const sourceIds=['phb:11:dex-defense','phb:36:ordinary-defense'];
  const view:CoreDefenseView={status:'needs-dm',ac:null,withoutShield:null,dexAdjustment:null,armorLabel:'尚未确认穿戴',shieldLabel:'尚未确认',reason:'请确认实际穿戴；背包库存不代表已穿戴。',sourceIds};
  if(!input.selection)return view;
  const selection=defenseSelectionSchema.parse(input.selection);
  if(input.inventory)validateCoreInventoryLedger(input.inventory);
  const item=(id:string|null,kind:'armor'|'shield')=>{
    if(id===null)return null;
    const found=input.inventory?.items.find(i=>i.id===id);
    if(!found||found.quantity<1)throw new Error('原穿戴物品已不存在或数量不足，请重新确认。');
    if(!found.definitionId||(kind==='armor'?!Object.hasOwn(ordinaryArmorAc,found.definitionId):!shields.includes(found.definitionId))||found.weight.kind==='magic-armor-negated')throw new Error('此物品不是已核普通护甲／盾牌，请由DM处理魔法或特殊装备。');
    let location=input.inventory!.locations.find(l=>l.id===found.locationId);
    if(!location||!['character','worn'].includes(location.kind))throw new Error('物品已放入容器或离开穿戴位置；先记录实际取出／搬运并重新确认，不能自动从背包穿戴。');
    while(location){
      if(!['character','worn'].includes(location.kind))throw new Error('穿戴位置的上级不是人物位置；不能从仓库、同伴或容器推断仍在穿戴。');
      location=location.parentLocationId?input.inventory!.locations.find(l=>l.id===location!.parentLocationId):undefined;
    }
    const legality=evaluateCoreEquipmentLegality({classId:input.classId,item:kind==='armor'?{kind,id:found.id,family:found.definitionId==='armor-leather'?'leather':'other',magical:false}:{kind,id:found.id,material:found.definitionId==='shield-small-wooden'?'wood':'unknown',magical:false}});
    // Unknown material does not matter for classes allowing any shield; do not infer metal.
    const unrestrictedShield=kind==='shield'&&coreClassEquipmentRules[input.classId]?.shield==='any';
    if(legality.verdict!=='class-permitted'&&!unrestrictedShield)throw new Error('该职业不能直接采用此护甲或盾牌；例外须另行裁定。');
    return found;
  };
  try{
    const armor=item(selection.armorItemId,'armor'),shield=item(selection.shieldItemId,'shield');
    view.armorLabel=armor?.label??'无护甲';view.shieldLabel=shield?.label??'无盾牌';
    if(!Number.isSafeInteger(input.level)||input.level<1)throw new Error('实际职业等级待核。');
    let base=armor?ordinaryArmorAc[armor.definitionId!]:10,adjustment:number;
    if(input.classId==='monk'){
      sourceIds.push('phb:30-31:monk-defense');
      if(input.level>17)throw new Error('武僧AC超出原书已核等级，不能外推。');
      base=monkAc[input.level-1];adjustment=0;
    }else{
      if(!Number.isSafeInteger(input.dexterity)||input.dexterity<3||input.dexterity>18)throw new Error('DEX超出已核PHB表范围，不能外推。');
      adjustment=dexDefense[input.dexterity-3];
    }
    return {...view,status:'calculated',ac:base+adjustment-(shield?1:0),withoutShield:base+adjustment,dexAdjustment:adjustment,reason:'通常可闪避且盾牌适用时的参考AC；不含魔法、临时效果或武器对护甲修正。盾牌仍受方向、尺寸与每轮攻击次数限制。'};
  }catch(error){return {...view,reason:(error as Error).message};}
}
