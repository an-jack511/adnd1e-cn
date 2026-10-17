/** Phase A disposable interaction model. Never accepted by production archive parsers. */
import { z } from 'zod';
import { calculateCoreHpAward, checkCoreAdvancement } from '../engine/core-progression';
import { applyCoreXpBatch, planBelowNameTraining } from '../engine/core-training';
import { calculateCoreStartingMoney } from '../engine/core-starting-resources';
import { planMagicUserInitialSpells } from '../engine/core-spell-acquisition';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { coreEquipmentById } from '../rules/core-inventory';
import { abilities } from '../creation/model';

const whole = z.number().int().min(0).max(10000000);
export const prototypeSchema = z.object({
  format:z.literal('adnd1e-design-prototype'), schemaVersion:z.literal('0.1.0'),
  synthetic:z.literal(true), name:z.string().min(1).max(80), level:z.number().int().min(1).max(2),
  scores:z.object({STR:z.number().int().min(3).max(18),INT:z.number().int().min(3).max(18),WIS:z.number().int().min(3).max(18),DEX:z.number().int().min(3).max(18),CON:z.number().int().min(3).max(18),CHA:z.number().int().min(3).max(18)}).strict(),
  hp:whole, maximumHp:z.number().int().min(1).max(100), xp:whole, cp:whole, day:whole,
  spells:z.array(z.string().min(1).max(80)).max(4), prepared:z.string().max(80).nullable(),
  gear:z.array(z.object({id:z.string().max(80),quantity:whole}).strict()).max(10),
  training:z.object({start:whole,end:whole,paidCp:whole,status:z.enum(['running','complete'])}).strict().nullable(),
  events:z.array(z.object({day:whole,title:z.string().max(300),detail:z.string().max(1000)}).strict()).max(300),
}).strict();
export type PrototypeCharacter=z.infer<typeof prototypeSchema>;
export type PrototypeAction =
  | {kind:'damage'|'heal'|'settle';amount:number;gp?:number}
  | {kind:'cast'|'use-item'|'train'|'advance-time'|'research'}
  | {kind:'level';roll:number};
export const starterGear=[{id:'dagger-scabbard',quantity:1},{id:'backpack-leather',quantity:1},{id:'robe',quantity:1},{id:'torch',quantity:6}];
export const gearCost=starterGear.reduce((sum,line)=>sum+coreEquipmentById[line.id].listPriceCp*line.quantity,0);
export function validatePrototype(input:unknown):PrototypeCharacter {
  const parsed=prototypeSchema.safeParse(input);
  if(!parsed.success)throw new Error('文件不是受支持的 0.1.0 虚构演示，或必需数据损坏。真实角色档案请使用现有角色工具打开。');
  const s=parsed.data;
  if(s.hp>s.maximumHp||s.hp<1)throw new Error('此原型只处理正 HP；零 HP 与死亡必须进入正式裁定流程。');
  if(new Set(s.spells).size!==s.spells.length||s.spells.some(id=>!allowedSpells.has(id)))throw new Error('法术不在演示范围内。');
  if(s.prepared&&!s.spells.includes(s.prepared))throw new Error('准备副本必须来自本演示法术书。');
  if(new Set(s.gear.map(i=>i.id)).size!==s.gear.length||s.gear.some(i=>!starterGear.some(g=>g.id===i.id)))throw new Error('不支持的演示物品。');
  if(s.training&&(s.training.end!==s.training.start+7||s.training.paidCp!==300000||s.level!==1))throw new Error('训练演示事实不一致。');
  return s;
}
const initial=planMagicUserInitialSpells({rolls:{offensive:9,defensive:7,miscellaneous:2}});
const allowedSpells=new Set(['read-magic','sleep','shield','detect-magic',...initial.spells]);
export function validatePrototypeIdentity(scores:PrototypeCharacter['scores']){
  const eligibility=evaluateCoreEligibility({raceId:'human',subraceId:null,sex:'male',alignmentId:'TN',initialScores:scores,classIds:['magic-user'],mode:'single',campaign:{allowedRaceIds:['human'],bardEnabled:false}});
  if(eligibility.verdict!=='allowed')throw new Error(eligibility.issues.map(i=>i.message).join('；'));
  return eligibility;
}
export function createPrototype(name='伊莱恩',scores:PrototypeCharacter['scores']={STR:10,INT:16,WIS:11,DEX:12,CON:14,CHA:10},hpRoll=4,moneyFaces=[3,3]):PrototypeCharacter {
  validatePrototypeIdentity(scores);
  const hp=calculateCoreHpAward({classId:'magic-user',targetLevel:1,constitution:scores.CON,rolls:[hpRoll]}).actualAward;
  const money=calculateCoreStartingMoney({classIds:['magic-user'],faces:moneyFaces});
  if(money.status!=='calculated')throw new Error(money.reason);
  if(money.gp*200<gearCost)throw new Error('初始金钱不足采购。');
  return validatePrototype({format:'adnd1e-design-prototype',schemaVersion:'0.1.0',synthetic:true,name,level:1,scores,hp,maximumHp:hp,xp:0,cp:money.gp*200-gearCost,day:1,spells:[...initial.spells],prepared:'sleep',gear:structuredClone(starterGear),training:null,events:[{day:1,title:'建立演示人物',detail:'真实计算 HP、金钱及初始授予；今日 Sleep 副本为演示前提，不代表已完成正式准入、学习与休息检查。'}]});
}
export function advancement(s:PrototypeCharacter){return checkCoreAdvancement({classId:'magic-user',currentLevel:s.level,xp:s.xp,levelCap:'unlimited'});}
export function previewAction(value:PrototypeCharacter,action:PrototypeAction):{next:PrototypeCharacter;title:string;detail:string} {
  const s=validatePrototype(structuredClone(value));let title='',detail='';
  if(s.events.length>=300)throw new Error('演示记录已满，请先导出；未更改原状态。');
  const number=(v:number)=>{if(!Number.isSafeInteger(v)||v<1||v>1000000)throw new Error('请输入有效的正整数。');return v;};
  if(action.kind==='damage'){
    const amount=number(action.amount);if(s.hp-amount<=0)throw new Error('将进入零 HP：本原型不模拟昏迷、失血及休养，请使用正式生命流程。');
    title='记录伤害';detail=`HP ${s.hp} → ${s.hp-amount}；伤害量由团桌提供。`;s.hp-=amount;
  }else if(action.kind==='heal'){
    const amount=number(action.amount);const after=Math.min(s.maximumHp,s.hp+amount);if(after===s.hp)throw new Error('当前 HP 已满；没有可应用的恢复。');
    title='记录实际治疗';detail=`HP ${s.hp} → ${after}；不判定法术来源、施法消耗或自然恢复。`;s.hp=after;
  }else if(action.kind==='cast'){
    if(!s.prepared)throw new Error('没有可用准备副本；休息与重新准备未接通。');
    title='消耗准备副本';detail=`${s.prepared} ×1；演示假定团桌已确认能够施放，不自动结算法术效果或材料。`;s.prepared=null;
  }else if(action.kind==='use-item'){
    const item=s.gear.find(i=>i.id==='torch');if(!item?.quantity)throw new Error('没有可用火把。');
    title='使用火把';detail=`火把 ${item.quantity} → ${item.quantity-1}；照明时长由团桌管理。`;item.quantity--;
  }else if(action.kind==='settle'){
    const amount=number(action.amount),gp=number(action.gp??0);const row=advancement(s).row;if(!row)throw new Error('未取得下一级门槛。');
    const plan=applyCoreXpBatch({currentXp:s.xp,nextLevelThreshold:row.xpMin,batchXp:amount});if(plan.status!=='awarded')throw new Error('候升期间停止继续增加 XP；请先完成当前成长流程。');
    title='记录 DM 已确认的冒险结算';detail=`XP +${amount}，战利品 +${gp} gp；不由金钱自动换算经验，也不自动授级。`;s.xp=plan.newXp;s.cp+=gp*200;
  }else if(action.kind==='train'){
    if(s.level!==1||advancement(s).status!=='eligible')throw new Error('仅演示人类魔法师 1→2；须先达到 2501 XP。');
    if(s.training)throw new Error('已有课程，请在战役记录中处理。');
    const plan=planBelowNameTraining({currentLevel:1,ratings:['E'],route:'tutor'}),cost=plan.totalCostGpNumerator/plan.totalCostGpDenominator*200;
    if(s.cp<cost)throw new Error('余额不足 1500 gp；不能凭空获得训练资金。');
    title='付款并登记训练';detail='演示前提：DM 评价 E，同职业导师已确认，本战役一周七天，课程连续且无冲突。1500 gp；第 '+s.day+' 日 → 第 '+(s.day+7)+' 日。';
    s.cp-=cost;s.training={start:s.day,end:s.day+7,paidCp:cost,status:'running'};
  }else if(action.kind==='advance-time'){
    if(!s.training||s.training.status!=='running')throw new Error('没有进行中的训练。');
    title='登记实际训练结束';detail='此演示假定七天连续课程已实际发生；正式系统必须调用日期、地点及活动后果守卫。尚未授级。';s.day=s.training.end;s.training.status='complete';
  }else if(action.kind==='level'){
    if(!s.training||s.training.status!=='complete'||s.level!==1)throw new Error('请先完成训练事实。');
    const award=calculateCoreHpAward({classId:'magic-user',targetLevel:2,constitution:s.scores.CON,rolls:[action.roll]});
    title='应用模拟成长';detail=`等级 1 → 2；最大 HP +${award.actualAward}；当前 HP 保留 ${s.hp}，不自动治疗；法术容量变化不生成书内法术或准备副本。正式授级仍需完整档案审核。`;s.level=2;s.maximumHp+=award.actualAward;s.training=null;
  }else{
    title='提出研究计划';detail='已登记待 DM 讨论的研究意向；未扣费、未启动计时、未掷秘密检查、未获得法术。';
  }
  s.events.push({day:s.day,title,detail});return{next:validatePrototype(s),title,detail};
}
export const spellNames:Record<string,string>={'read-magic':'阅读魔法','sleep':'睡眠术','shield':'护盾术','detect-magic':'侦测魔法'};
export const abilityNames=Object.fromEntries(abilities.map((a,i)=>[a,['力量','智力','感知','敏捷','体质','魅力'][i]]));
