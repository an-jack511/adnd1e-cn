import {
  coreClassEquipmentRules,
  coreEquipmentSources,
  type ArmorFamily,
  type CoreEquipmentClassId,
  type CoreWeaponFamily,
  type ShieldMaterial,
} from '../rules/core-equipment-legality';

export type CoreEquipmentVerdict = 'class-permitted' | 'needs-dm' | 'prohibited';
export type ItemSpecificRestriction = 'not-applicable' | 'compatible' | 'proscribed' | 'unknown';

export type CoreEquipmentItem =
  | {readonly kind:'armor'; readonly id:string; readonly family:ArmorFamily; readonly magical?:boolean; readonly itemSpecificRestriction?:ItemSpecificRestriction}
  | {readonly kind:'shield'; readonly id:string; readonly material:ShieldMaterial; readonly magical?:boolean; readonly itemSpecificRestriction?:ItemSpecificRestriction}
  | {readonly kind:'weapon'; readonly id:string; readonly family:CoreWeaponFamily | 'unknown'; readonly magical?:boolean; readonly itemSpecificRestriction?:ItemSpecificRestriction; readonly lengthFeet?:number; readonly weightGpEquivalent?:number};

export interface CoreEquipmentLegalityInput {
  readonly classId: CoreEquipmentClassId;
  readonly item: CoreEquipmentItem;
  readonly character?: {readonly heightFeet?:number; readonly bodyWeightPounds?:number};
  readonly context?: {
    readonly environment?: 'dungeon' | 'outdoors' | 'other' | 'unknown';
    readonly massedPikeSupport?: boolean | 'unknown';
    /** A claimed campaign/deity exception is an explicit DM override, never core RAW permission. */
    readonly religiousOrSettingExceptionClaimed?: boolean;
  };
}

export interface CoreEquipmentFinding {
  readonly code: string;
  readonly kind: 'permission' | 'uncertainty' | 'prohibition';
  readonly message: string;
  readonly sourceIds: readonly (keyof typeof coreEquipmentSources)[];
}

export interface CoreEquipmentLegalityResult {
  readonly verdict: CoreEquipmentVerdict;
  readonly rawBaseline: 'permitted' | 'prohibited' | 'unresolved';
  readonly classId: CoreEquipmentClassId;
  readonly itemId: string;
  readonly findings: readonly CoreEquipmentFinding[];
  readonly sourceIds: readonly (keyof typeof coreEquipmentSources)[];
}

function finding(code:string, kind:CoreEquipmentFinding['kind'], message:string, ...sourceIds:(keyof typeof coreEquipmentSources)[]):CoreEquipmentFinding {
  return {code,kind,message,sourceIds};
}
function finitePositive(value:number|undefined, label:string):void {
  if(value !== undefined && (!Number.isFinite(value) || value <= 0)) throw new Error(`${label} must be a positive finite number.`);
}

function basePermission(input:CoreEquipmentLegalityInput): {baseline:'permitted'|'prohibited'|'unresolved'; finding:CoreEquipmentFinding} {
  const rule=coreClassEquipmentRules[input.classId], item=input.item;
  if(item.kind==='armor') {
    if(item.family==='unknown') return {baseline:'unresolved',finding:finding('armor-family-unknown','uncertainty','Armor family is not classified; the class rule cannot be applied without DM/catalog review.',...rule.sourceIds)};
    const permitted=rule.armor==='any'||(rule.armor==='leather-only'&&item.family==='leather');
    return permitted
      ? {baseline:'permitted',finding:finding('armor-class-permitted','permission','This armor family is permitted by the class rule.',...rule.sourceIds)}
      : {baseline:'prohibited',finding:finding('armor-class-prohibited','prohibition',rule.armor==='none'?'This class may not wear armor.':'Only leather armor is permitted for this class.',...rule.sourceIds)};
  }
  if(item.kind==='shield') {
    if(item.material==='unknown') return {baseline:'unresolved',finding:finding('shield-material-unknown','uncertainty','Shield material is not known; material-dependent class legality needs DM/catalog review.',...rule.sourceIds)};
    const permitted=rule.shield==='any'||(rule.shield==='wood-only'&&item.material==='wood');
    return permitted
      ? {baseline:'permitted',finding:finding('shield-class-permitted','permission','This shield is permitted by the class rule.',...rule.sourceIds)}
      : {baseline:'prohibited',finding:finding('shield-class-prohibited','prohibition',rule.shield==='none'?'This class may not use a shield.':'Only a wooden shield is permitted for this class.',...rule.sourceIds)};
  }
  if(item.family==='unknown') return {baseline:'unresolved',finding:finding('weapon-family-unknown','uncertainty','Weapon family is not classified; no permissive alias is inferred.',...rule.sourceIds)};
  const permitted=rule.weapons==='any'||rule.weapons.includes(item.family);
  return permitted
    ? {baseline:'permitted',finding:finding('weapon-class-permitted','permission','This weapon family is permitted by the class row.',...rule.sourceIds)}
    : {baseline:'prohibited',finding:finding('weapon-class-prohibited','prohibition','This weapon family is not among those permitted for the class.',...rule.sourceIds)};
}

export function evaluateCoreEquipmentLegality(input:CoreEquipmentLegalityInput):CoreEquipmentLegalityResult {
  if(!input.item.id.trim()) throw new Error('Equipment id must be non-empty.');
  finitePositive(input.character?.heightFeet,'heightFeet');
  finitePositive(input.character?.bodyWeightPounds,'bodyWeightPounds');
  if(input.item.kind==='weapon') { finitePositive(input.item.lengthFeet,'lengthFeet'); finitePositive(input.item.weightGpEquivalent,'weightGpEquivalent'); }
  const base=basePermission(input), findings:CoreEquipmentFinding[]=[base.finding];
  const sourceIds=new Set<keyof typeof coreEquipmentSources>(base.finding.sourceIds);

  if(base.baseline==='prohibited') {
    if(input.context?.religiousOrSettingExceptionClaimed) {
      findings.push(finding('explicit-dm-override-required','uncertainty','Core RAW remains prohibited. A claimed deity, setting, or house-rule exception must be recorded as an explicit DM override, not silently treated as class permission.',...coreClassEquipmentRules[input.classId].sourceIds));
      return result('needs-dm','prohibited',input,findings,sourceIds);
    }
    return result('prohibited','prohibited',input,findings,sourceIds);
  }
  if(base.baseline==='unresolved') return result('needs-dm','unresolved',input,findings,sourceIds);

  const restriction=input.item.itemSpecificRestriction ?? (input.item.magical?'unknown':'not-applicable');
  if(restriction==='proscribed') {
    findings.push(finding('item-description-proscribes-class','prohibition','The specific item description proscribes this class; the PHB table does not override that description.','phb:19:class-equipment-table'));
  } else if(restriction==='unknown') {
    findings.push(finding('item-description-not-checked','uncertainty','The base type is class-permitted, but the specific magical item description has not been checked for a class proscription.','phb:19:class-equipment-table'));
  }

  if(input.item.kind==='weapon') applyWeaponLimits(input,findings,sourceIds);
  const hasProhibition=findings.some(item=>item.kind==='prohibition');
  const hasUncertainty=findings.some(item=>item.kind==='uncertainty');
  return result(hasProhibition?'prohibited':hasUncertainty?'needs-dm':'class-permitted','permitted',input,findings,sourceIds);
}

function applyWeaponLimits(input:CoreEquipmentLegalityInput, findings:CoreEquipmentFinding[], sourceIds:Set<keyof typeof coreEquipmentSources>):void {
  if(input.item.kind!=='weapon') return;
  const rule=coreClassEquipmentRules[input.classId], item=input.item, height=input.character?.heightFeet, weight=input.character?.bodyWeightPounds;
  if(rule.broadWeaponSizeFootnote) {
    const heightSensitive=item.family==='longbow'||(item.lengthFeet!==undefined&&item.lengthFeet>12)||(item.family==='other'&&item.lengthFeet===undefined);
    if(heightSensitive && height===undefined) findings.push(finding('height-needed','uncertainty','Character height is required to apply the PHB under-5-foot weapon restriction.','phb:19:class-equipment-table'));
    else if(height!==undefined&&height<5&&(item.family==='longbow'||(item.lengthFeet!==undefined&&item.lengthFeet>12))) findings.push(finding('weapon-too-long','prohibition','A character under 5 feet cannot employ a longbow or a weapon over 12 feet long.','phb:19:class-equipment-table'));

    const heavySensitive=item.family==='crossbow-heavy'||item.family==='sword-two-handed'||item.family==='pole-arm'||item.family==='pike';
    if(heavySensitive&&weight===undefined) findings.push(finding('body-weight-needed','uncertainty','Character body weight is required to apply the PHB under-100-pound heavy-weapon restriction.','phb:19:class-equipment-table'));
    else if(weight!==undefined&&weight<100) {
      if(item.family==='crossbow-heavy'||item.family==='sword-two-handed') findings.push(finding('heavy-weapon-too-heavy','prohibition','A character under 100 pounds cannot use a heavy crossbow or two-handed sword.','phb:19:class-equipment-table'));
      else if((item.family==='pole-arm'||item.family==='pike')&&item.weightGpEquivalent===undefined) findings.push(finding('pole-arm-weight-needed','uncertainty','Pole-arm weight is required to determine the 200 gp-equivalent limit for a character under 100 pounds.','phb:19:class-equipment-table'));
      else if((item.family==='pole-arm'||item.family==='pike')&&(item.weightGpEquivalent as number)>200) findings.push(finding('pole-arm-too-heavy','prohibition','A character under 100 pounds cannot use a pole arm over 200 gp weight equivalent.','phb:19:class-equipment-table'));
    }
  }
  if(item.family==='pike') {
    sourceIds.add('dmg:66:pike-context');
    if(input.context?.environment==='dungeon') findings.push(finding('pike-unusable-in-dungeon','prohibition','The DMG states that a pike is not usable in dungeon settings.','dmg:66:pike-context'));
    else if(input.context?.massedPikeSupport===false) findings.push(finding('pike-lacks-support','prohibition','The DMG states that a pike is not usable without masses of other pikes supporting it.','dmg:66:pike-context'));
    else if(input.context?.environment===undefined||input.context.environment==='unknown'||input.context.massedPikeSupport===undefined||input.context.massedPikeSupport==='unknown') findings.push(finding('pike-context-needed','uncertainty','Pike use needs the encounter environment and supporting-formation facts adjudicated.','dmg:66:pike-context'));
  }
}

function result(verdict:CoreEquipmentVerdict, rawBaseline:CoreEquipmentLegalityResult['rawBaseline'], input:CoreEquipmentLegalityInput, findings:CoreEquipmentFinding[], sourceIds:Set<keyof typeof coreEquipmentSources>):CoreEquipmentLegalityResult {
  for(const item of findings) for(const id of item.sourceIds) sourceIds.add(id);
  return {verdict,rawBaseline,classId:input.classId,itemId:input.item.id,findings,sourceIds:[...sourceIds]};
}
