export type RulePackStatus = 'verified' | 'partial' | 'pending';
export type RulePack = {
  readonly id:string; readonly version:string; readonly label:string; readonly status:RulePackStatus;
  readonly dependsOn:readonly string[]; readonly conflictsWith:readonly string[];
  readonly verifiedScopes:readonly string[]; readonly unresolvedScopes:readonly string[];
};
export const characterRulePacks:readonly RulePack[]=[
  {id:'adnd1e-core-character',version:'0.7.0',label:'PHB/DMG 核心角色规则',status:'partial',dependsOn:[],conflictsWith:[],
    verifiedScopes:['abilities.dmg-methods','eligibility.core','progression.core','starting-resources','weapon-proficiency.slots','spell-acquisition.arcane','training','inventory.price-ledger','relationships.core','calendar.recovery'],
    unresolvedScopes:['combat-matrices','saving-throws','complete-class-abilities','all-equipment-legality','divine-spell-grants','strongholds-followers']},
  {id:'adnd1e-ua-character',version:'0.1.0',label:'Unearthed Arcana 角色扩展',status:'pending',dependsOn:['adnd1e-core-character'],conflictsWith:[],verifiedScopes:[],unresolvedScopes:['all-character-rules']},
  {id:'adnd1e-oa-character',version:'0.1.0',label:'Oriental Adventures 角色扩展',status:'pending',dependsOn:['adnd1e-core-character'],conflictsWith:[],verifiedScopes:[],unresolvedScopes:['all-character-rules']},
  {id:'adnd1e-dsg-character',version:'0.1.0',label:'Dungeoneer’s Survival Guide 扩展',status:'pending',dependsOn:['adnd1e-core-character'],conflictsWith:[],verifiedScopes:[],unresolvedScopes:['all-character-rules']},
  {id:'adnd1e-wsg-character',version:'0.1.0',label:'Wilderness Survival Guide 扩展',status:'pending',dependsOn:['adnd1e-core-character'],conflictsWith:[],verifiedScopes:[],unresolvedScopes:['all-character-rules']},
] as const;

export type ProfilePack={readonly id:string;readonly version:string};
export type ProfileOption={readonly id:string;readonly value:string|boolean|number;readonly sourceIds:readonly string[]};
export type HouseRule={readonly id:string;readonly label:string;readonly description:string;readonly replacesRuleIds:readonly string[];readonly actorId:string;readonly reason:string};
export interface CampaignRuleProfile {readonly format:'adnd1e-campaign-profile';readonly schemaVersion:'1.0.0';readonly id:string;readonly revision:number;readonly name:string;readonly dmActorId:string;readonly packs:readonly ProfilePack[];readonly options:readonly ProfileOption[];readonly houseRules:readonly HouseRule[]}
export const findRulePack=(id:string)=>characterRulePacks.find(pack=>pack.id===id);
