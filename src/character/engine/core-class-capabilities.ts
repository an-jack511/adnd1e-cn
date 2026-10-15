import { coreClassCapabilities, type CapabilityStatus, type CoreClassCapability, type CoreClassCapabilitySourceId } from '../rules/core-class-capabilities';
import type { InitialCoreClassId } from '../rules/core-progression';

export interface CapabilityValue {
  readonly kind: 'number' | 'dice' | 'percent';
  readonly value?: number;
  readonly dice?: string;
  readonly label: string;
}
export interface CapabilityAtLevel extends CoreClassCapability {
  readonly availability: 'active' | 'locked';
  readonly value: CapabilityValue | null;
}
export interface CoreClassCapabilityReview {
  readonly classId: InitialCoreClassId;
  readonly level: number;
  readonly active: readonly CapabilityAtLevel[];
  readonly locked: readonly CapabilityAtLevel[];
  readonly needsDm: readonly CapabilityAtLevel[];
  readonly unsupported: readonly CapabilityAtLevel[];
  readonly sourceIds: readonly CoreClassCapabilitySourceId[];
}

function requireLevel(level: number): void {
  if (!Number.isSafeInteger(level) || level < 1) throw new Error('level must be a safe integer >= 1.');
}

function valueFor(capability: CoreClassCapability, level: number): CapabilityValue | null {
  switch (capability.engineFormula) {
    case 'paladin-lay-on-hands': return {kind:'number', value:2 * level, label:'每次治疗HP'};
    case 'paladin-cure-disease': return {kind:'number', value:Math.ceil(level / 5), label:'每周次数'};
    case 'paladin-turning-level': return {kind:'number', value:level - 2, label:'等效牧师等级'};
    case 'ranger-giant-damage': return {kind:'number', value:level, label:'近战伤害加值'};
    case 'druid-extra-languages': return {kind:'number', value:level - 2, label:'由该能力获得的语言数'};
    case 'monk-weapon-damage-bonus': return {kind:'number', value:level / 2, label:'允许武器伤害加值'};
    case 'monk-surprise-percent': return {kind:'percent', value:level === 1 ? 100 / 3 : Math.max(0, 36 - 2 * level), label:'受惊概率'};
    case 'monk-esp-percent': return {kind:'percent', value:Math.max(0, 30 - 2 * (level - 4)), label:'ESP成功读取武僧的概率'};
    case 'monk-catalepsy-turns': return {kind:'number', value:2 * level, label:'最长turn数'};
    case 'monk-self-heal': return {kind:'dice', dice:`1d4+${level - 6}`, label:'每日一次治疗HP'};
    case 'monk-charm-affect-percent': return {kind:'percent', value:Math.max(0, 50 - 5 * (level - 9)), label:'列举魅惑效果生效概率'};
    case 'monk-follower-additions': return level === 8
      ? {kind:'dice', dice:'1d4+1', label:'取得8级席位后的初始1级武僧追随者'}
      : {kind:'dice', dice:`1d4+1 + ${(level - 8)}d2`, label:'若逐级均获追随者时的累计生成表达式'};
    default: return null;
  }
}

export function reviewCoreClassCapabilities(classId: InitialCoreClassId, level: number): CoreClassCapabilityReview {
  requireLevel(level);
  const capabilities = coreClassCapabilities[classId];
  const evaluated = capabilities.map((capability): CapabilityAtLevel => Object.freeze({
    ...capability,
    availability: level >= capability.minimumLevel ? 'active' : 'locked',
    value: level >= capability.minimumLevel ? valueFor(capability, level) : null,
  }));
  const active = evaluated.filter(item => item.availability === 'active');
  const status = (wanted: CapabilityStatus) => active.filter(item => item.status === wanted);
  return Object.freeze({
    classId, level, active: Object.freeze(active), locked: Object.freeze(evaluated.filter(item => item.availability === 'locked')),
    needsDm: Object.freeze(status('needs-dm')), unsupported: Object.freeze(status('unsupported')),
    sourceIds: Object.freeze([...new Set(active.flatMap(item => item.sourceIds))]),
  });
}

export function getActiveCapability(classId: InitialCoreClassId, level: number, capabilityId: string): CapabilityAtLevel | null {
  return reviewCoreClassCapabilities(classId, level).active.find(item => item.id === capabilityId) ?? null;
}

/** Never returns DM-secret entries to a player-facing projection. */
export function projectCapabilitiesForPlayer(classId: InitialCoreClassId, level: number): readonly CapabilityAtLevel[] {
  return Object.freeze(reviewCoreClassCapabilities(classId, level).active.filter(item => item.visibility === 'player'));
}
