import {
  alignmentLanguageIds,
  assassinSpecialLanguageChoices,
  coreRacialLanguageRules,
  druidLevelLanguageChoices,
  intelligenceAdditionalLanguageCapacity,
  type CoreAlignmentId,
  type CoreLanguageCareerId,
  type CoreLanguageSourceId,
  type CoreRaceId,
} from '../rules/core-languages';

export interface LanguageCareerInput {
  readonly classId: CoreLanguageCareerId;
  readonly level: number;
}

export interface LanguageSelectionInput {
  readonly entitlementId: string;
  readonly languageId: string;
  readonly dmApproved: boolean;
  readonly acquisition: 'pre-existing-at-creation' | 'class-level-grant' | 'studied';
}

export interface CoreLanguagePlanInput {
  readonly raceId: CoreRaceId;
  readonly alignmentId: CoreAlignmentId;
  readonly intelligence: number;
  readonly careers: readonly LanguageCareerInput[];
  readonly selections?: readonly LanguageSelectionInput[];
}

export interface AutomaticLanguageGrant {
  readonly languageId: string;
  readonly kind: 'common' | 'alignment' | 'racial' | 'class-special';
  readonly acquiredAt: 'creation' | 'class-entry';
  readonly sourceIds: readonly CoreLanguageSourceId[];
}

export interface LanguageChoiceEntitlement {
  readonly entitlementId: string;
  readonly kind: 'intelligence-extra' | 'druid-level' | 'assassin-level';
  readonly count: number;
  readonly allowedLanguageIds: readonly string[] | null;
  readonly requiresDmApproval: boolean;
  readonly requiresInstructorAndStudyWhenNotPreExisting: boolean;
  readonly sourceIds: readonly CoreLanguageSourceId[];
}

export interface PlannedLanguageSelection extends LanguageSelectionInput {
  readonly status: 'accepted' | 'needs-dm' | 'invalid';
  readonly reason: string | null;
}

export interface CoreLanguagePlan {
  readonly schema: 'adnd1e.core-language-plan';
  readonly schemaVersion: 1;
  readonly automaticLanguages: readonly AutomaticLanguageGrant[];
  readonly automaticCommunications: readonly string[];
  readonly entitlements: readonly LanguageChoiceEntitlement[];
  readonly selections: readonly PlannedLanguageSelection[];
  readonly openSlots: Readonly<Record<string, number>>;
  readonly ordinaryStudyMonths: number;
  readonly dmDecisions: readonly string[];
  readonly sourceIds: readonly CoreLanguageSourceId[];
}

function assertIntegerInRange(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`);
}

export function ordinaryLanguageStudyMonths(intelligence: number): number {
  assertIntegerInRange(intelligence, 3, 18, 'intelligence');
  return intelligence <= 12 ? 12 : 24 - intelligence;
}

export function extraLanguageCapacity(raceId: CoreRaceId, intelligence: number): number {
  assertIntegerInRange(intelligence, 3, 18, 'intelligence');
  const method = coreRacialLanguageRules[raceId].extraLanguageCapacity;
  if (method === 'above-15') return Math.max(0, intelligence - 15);
  if (method === 'above-16') return Math.max(0, intelligence - 16);
  const general = intelligenceAdditionalLanguageCapacity[intelligence];
  return method === 'intelligence-table-capped-2' ? Math.min(2, general) : general;
}

function uniqueCareers(careers: readonly LanguageCareerInput[]): ReadonlyMap<CoreLanguageCareerId, number> {
  const result = new Map<CoreLanguageCareerId, number>();
  for (const career of careers) {
    assertIntegerInRange(career.level, 1, 99, `${career.classId} level`);
    if (result.has(career.classId)) throw new Error(`Duplicate career entry: ${career.classId}.`);
    result.set(career.classId, career.level);
  }
  return result;
}

export function planCoreLanguages(input: CoreLanguagePlanInput): CoreLanguagePlan {
  assertIntegerInRange(input.intelligence, 3, 18, 'intelligence');
  const careers = uniqueCareers(input.careers);
  const race = coreRacialLanguageRules[input.raceId];
  const automatic: AutomaticLanguageGrant[] = race.automaticLanguageIds.map(languageId => ({
    languageId, kind: languageId === 'common' ? 'common' : 'racial', acquiredAt: 'creation',
    sourceIds: ['phb:15-17:racial-languages'],
  }));
  automatic.push({ languageId: alignmentLanguageIds[input.alignmentId], kind: 'alignment', acquiredAt: 'creation',
    sourceIds: ['phb:34-35:character-languages', 'dmg:24:language-scope'] });
  if (careers.has('druid')) automatic.push({ languageId: 'druidic', kind: 'class-special', acquiredAt: 'class-entry',
    sourceIds: ['phb:21:druid-languages', 'phb:34-35:character-languages', 'dmg:24:language-scope'] });
  if (careers.has('thief')) automatic.push({ languageId: 'thieves-cant', kind: 'class-special', acquiredAt: 'class-entry',
    sourceIds: ['phb:27:thieves-cant', 'phb:34-35:character-languages', 'dmg:24:language-scope'] });

  const entitlements: LanguageChoiceEntitlement[] = [];
  const intelligenceCount = extraLanguageCapacity(input.raceId, input.intelligence);
  if (intelligenceCount > 0) entitlements.push({
    entitlementId: 'intelligence-extra', kind: 'intelligence-extra', count: intelligenceCount,
    allowedLanguageIds: null, requiresDmApproval: true, requiresInstructorAndStudyWhenNotPreExisting: true,
    sourceIds: ['phb:10:intelligence-languages', 'phb:15-17:racial-languages', 'phb:34-35:character-languages', 'dmg:37:campaign-time'],
  });
  const druidLevel = careers.get('druid');
  if (druidLevel !== undefined && druidLevel >= 3) entitlements.push({
    entitlementId: 'druid-level', kind: 'druid-level', count: druidLevel - 2,
    allowedLanguageIds: druidLevelLanguageChoices, requiresDmApproval: false,
    requiresInstructorAndStudyWhenNotPreExisting: false, sourceIds: ['phb:21:druid-languages'],
  });
  const assassinLevel = careers.get('assassin');
  const assassinCount = assassinLevel === undefined ? 0 : Math.min(Math.max(0, assassinLevel - 8), Math.max(0, input.intelligence - 14), 4);
  if (assassinCount > 0) entitlements.push({
    entitlementId: 'assassin-level', kind: 'assassin-level', count: assassinCount,
    allowedLanguageIds: assassinSpecialLanguageChoices, requiresDmApproval: false,
    requiresInstructorAndStudyWhenNotPreExisting: false, sourceIds: ['phb:29:assassin-alignment-tongues'],
  });

  const automaticIds = new Set(automatic.map(grant => grant.languageId));
  const acceptedIds = new Set<string>();
  const selectedCounts = new Map<string, number>();
  const selections = (input.selections ?? []).map((selection): PlannedLanguageSelection => {
    const entitlement = entitlements.find(candidate => candidate.entitlementId === selection.entitlementId);
    let status: PlannedLanguageSelection['status'] = 'accepted';
    let reason: string | null = null;
    if (!selection.languageId.trim()) { status = 'invalid'; reason = 'languageId is required.'; }
    else if (!entitlement) { status = 'invalid'; reason = 'No matching language entitlement exists.'; }
    else if ((selectedCounts.get(selection.entitlementId) ?? 0) >= entitlement.count) { status = 'invalid'; reason = 'This entitlement has no unfilled slots.'; }
    else if (automaticIds.has(selection.languageId) || acceptedIds.has(selection.languageId)) { status = 'invalid'; reason = 'The character already knows this language; a slot cannot be spent twice.'; }
    else if (entitlement.allowedLanguageIds && !entitlement.allowedLanguageIds.includes(selection.languageId)) { status = 'invalid'; reason = 'This language is outside the printed choices for the entitlement.'; }
    else if (selection.acquisition === 'class-level-grant' && entitlement.kind === 'intelligence-extra') { status = 'invalid'; reason = 'An Intelligence-derived slot is not a class-level grant.'; }
    else if (selection.acquisition === 'studied' && entitlement.requiresInstructorAndStudyWhenNotPreExisting && !selection.dmApproved) { status = 'needs-dm'; reason = 'The DM must confirm campaign availability, instructor and completed campaign time.'; }
    else if (entitlement.requiresDmApproval && !selection.dmApproved) { status = 'needs-dm'; reason = 'The DM must approve that this language is knowable in the campaign and how it was acquired.'; }
    if (entitlement && status !== 'invalid') selectedCounts.set(selection.entitlementId, (selectedCounts.get(selection.entitlementId) ?? 0) + 1);
    if (status === 'accepted') acceptedIds.add(selection.languageId);
    return Object.freeze({ ...selection, status, reason });
  });
  const openSlots = Object.freeze(Object.fromEntries(entitlements.map(entitlement => [
    entitlement.entitlementId, Math.max(0, entitlement.count - (selectedCounts.get(entitlement.entitlementId) ?? 0)),
  ])));
  const sourceIds = Object.freeze(Array.from(new Set<CoreLanguageSourceId>([
    'phb:15-17:racial-languages', 'phb:34-35:character-languages', 'dmg:24:language-scope',
    ...automatic.flatMap(grant => grant.sourceIds), ...entitlements.flatMap(entitlement => entitlement.sourceIds),
  ])));
  return Object.freeze({ schema: 'adnd1e.core-language-plan', schemaVersion: 1, automaticLanguages: Object.freeze(automatic),
    automaticCommunications: Object.freeze([...race.automaticCommunicationIds]), entitlements: Object.freeze(entitlements),
    selections: Object.freeze(selections), openSlots, ordinaryStudyMonths: ordinaryLanguageStudyMonths(input.intelligence),
    dmDecisions: Object.freeze([
      'Identify the campaign’s actual common tongue/dialect.',
      'Approve which ordinary languages are knowable and whether a first-level choice is pre-existing or must be studied.',
      'For study, confirm an instructor, close proximity, elapsed campaign time, and that no second language was studied concurrently.',
      'Do not expose alignment, Druidic or Thieves’ Cant as unrestricted ordinary-language choices.',
    ]), sourceIds });
}
