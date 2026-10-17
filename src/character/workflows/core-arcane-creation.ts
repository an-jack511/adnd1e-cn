import { z } from 'zod';
import { canonical, type Json } from '../domain/transactions';
import { evaluateCoreEligibility } from '../engine/core-eligibility';
import { newKnowabilityState, recordKnowabilityAttempt, planMagicUserInitialSpells, planIllusionistInitialSpells } from '../engine/core-spell-acquisition';
import { createCoreSpellLedger, addArcaneSource, recordArcaneTranscription, projectSpellLedgerForPlayer } from '../engine/core-spell-ledger';
import { calculateCoreSpellCapacity } from '../engine/core-spell-capacity';
import { magicUserInitialCategories, illusionistInitialTable } from '../rules/core-spell-acquisition';
import type { CoreSpellDefinitionRef } from '../rules/core-spell-ledger';
import { parseCoreCreation, recordCreationTask, type CoreCreation } from './core-create';

const text = z.string().trim().min(1).max(1000);
const face = (sides: number) => z.number().int().min(1).max(sides);
const rollMethod = z.enum(['physical-or-external', 'browser-crypto']);
const muChoices = z.object({ offensive: text.optional(), defensive: text.optional(), miscellaneous: text.optional() }).strict();
export const coreArcaneCreationInputSchema = z.object({
  initialPlan: z.discriminatedUnion('classId', [
    z.object({ classId: z.literal('magic-user'), input: z.object({
      rolls: z.object({ offensive: face(10), defensive: face(10), miscellaneous: face(10) }).strict(),
      choices: muChoices.optional(), hardCampaignChoice: z.boolean().optional(), extraCategory: z.enum(['defensive', 'miscellaneous']).optional(), extraRoll: face(10).optional(), extraChoice: text.optional(),
    }).strict() }).strict(),
    z.object({ classId: z.literal('illusionist'), input: z.object({ rolls: z.array(face(12)).max(500), choices: z.array(text).max(2).optional() }).strict() }).strict(),
  ]),
  rollMethod,
  chanceToKnow: z.object({ spellIds: z.array(text).min(1).max(100), attempts: z.array(z.object({ spellId: text, percentile: face(100) }).strict()).max(1000), rollMethod }).strict(),
  adoption: z.object({ policy: z.literal('require-successful-checks'), actorId: text.optional(), at: text.optional(), reason: text.optional(), sourceIds: z.array(text).min(1).max(100) }).strict(),
  spellbookId: text,
  acquisitions: z.array(z.object({ spellId: text, sourceEntityId: text, transcriptionId: text, sourceLabel: text, sourceAccessConfirmed: z.literal(true), outcome: z.enum(['success', 'failure']), actualCostGp: z.number().int().nonnegative().optional(), actualDurationMinutes: z.number().int().nonnegative().optional(), rulingId: text.optional() }).strict()).max(5),
}).strict();
export type CoreArcaneCreationInput = z.infer<typeof coreArcaneCreationInputSchema>;

/** UI-only draft facts. They are deliberately not part of the formal ledger:
 * an empty outcome must remain empty instead of being invented as success or
 * failure. Keeping this beside the replayable input makes a checkpoint lossless
 * without allowing a half-filled row to pass admission.
 */
const arcaneAcquisitionDraftSchema = z.object({
  spellId: text,
  sourceLabel: z.string().max(1000),
  sourceAccessConfirmed: z.boolean(),
  outcome: z.enum(['', 'success', 'failure']),
  actualCostGp: z.number().int().nonnegative().optional(),
  actualDurationMinutes: z.number().int().nonnegative().optional(),
  rulingId: text.optional(),
}).strict();
export const coreArcaneCreationUiDraftSchema = z.object({
  acquisitions: z.array(arcaneAcquisitionDraftSchema).max(5),
}).strict();
export type CoreArcaneCreationUiDraft = z.infer<typeof coreArcaneCreationUiDraftSchema>;

const marker = 'adnd1e.core-arcane-creation@1';
const adapterSource = 'project:core-arcane-creation';
type ArcaneClassId = 'magic-user' | 'illusionist';

/** Bounded existing initial-table universe, not a newly certified full PHB list.
 * IDs are spell definitions, not display-name aliases. Knowing a definition here
 * grants no physical source, book entry, or prepared spell.
 */
export function coreArcaneCreationChoices(classId: ArcaneClassId): readonly CoreSpellDefinitionRef[] {
  const slugs = classId === 'magic-user' ? ['read-magic', ...Object.values(magicUserInitialCategories).flat()] : [...illusionistInitialTable];
  return slugs.map(slug => ({ definitionId: `adnd1e-core:${classId}:1:${slug}`, rulesetId: 'adnd1e-core@1', listId: classId, level: 1, displayName: slug, sourceIds: classId === 'magic-user' ? ['dmg:39:initial-magic-user-spells'] : ['dmg:39:initial-illusionist-spells', 'phb:spell-table:illusionist-1'] }));
}

function arcaneClass(document: CoreCreation): ArcaneClassId {
  const candidate = document.candidate;
  if (!candidate || candidate.mode !== 'single' || candidate.classIds.length !== 1 || !['magic-user', 'illusionist'].includes(candidate.classIds[0])) throw new Error('Arcane creation requires a single magic-user or illusionist career.');
  return candidate.classIds[0] as ArcaneClassId;
}

/** Pure reconstruction used by both the writer and the present-day entry guard. */
function build(document: CoreCreation, raw: CoreArcaneCreationInput, uiDraft?: CoreArcaneCreationUiDraft) {
  const input = coreArcaneCreationInputSchema.parse(raw), classId = arcaneClass(document);
  if (input.initialPlan.classId !== classId) throw new Error('Initial plan class does not match the candidate.');
  const plan = input.initialPlan.classId === 'magic-user' ? planMagicUserInitialSpells(input.initialPlan.input) : planIllusionistInitialSpells(input.initialPlan.input);
  const completePlan = !('status' in plan) || plan.status === 'complete';
  const definitions = coreArcaneCreationChoices(classId), byId = new Map(definitions.map(spell => [spell.definitionId, spell]));
  const definitionForSlug = (slug: string) => definitions.find(spell => spell.definitionId === `adnd1e-core:${classId}:1:${slug}`)!;
  const plannedIds = new Set(plan.spells.map(slug => definitionForSlug(slug).definitionId));
  if (input.chanceToKnow.spellIds.some(id => !byId.has(id))) throw new Error('Chance to Know group must use this bounded initial-table catalog.');
  if ([...plannedIds].some(id => !input.chanceToKnow.spellIds.includes(id))) throw new Error('Chance to Know group must cover every initial-plan definition.');
  const scores = evaluateCoreEligibility(document.candidate!).adjustedScores;
  let knowability = newKnowabilityState(scores.INT, input.chanceToKnow.spellIds);
  for (const attempt of input.chanceToKnow.attempts) knowability = recordKnowabilityAttempt(knowability, attempt.spellId, attempt.percentile);
  const capacity = calculateCoreSpellCapacity({ careerId: classId, classId, level: 1, model: 'single', intelligence: scores.INT, wisdom: scores.WIS });
  if (capacity.status !== 'calculated') throw new Error('Initial arcane capacity is not verified for this candidate.');
  let ledger = createCoreSpellLedger({ id: `${document.id}:spells`, characterId: document.id, careerId: classId, tradition: classId });
  const acquiredIds = new Set<string>();
  for (const acquisition of input.acquisitions) {
    if (!plannedIds.has(acquisition.spellId)) throw new Error('Initial acquisition must belong to the actual initial plan; the INT minimum never grants extra books.');
    if (acquiredIds.has(acquisition.spellId)) throw new Error('Record one initial acquisition attempt per distinct planned spell.');
    acquiredIds.add(acquisition.spellId);
    ledger = addArcaneSource(ledger, {
      id: acquisition.sourceEntityId, spell: byId.get(acquisition.spellId)!, kind: 'master-grant', publicKind: 'teacher', publicLabel: acquisition.sourceLabel, consumed: false,
      private: { ownerId: null, locationId: null, provenance: 'Caller explicitly confirmed access to this apprenticeship source.', dmNotes: [] },
    });
    // Passing Ctk does not itself establish copying success. Conversely, a failed
    // check may be recorded with a failure outcome but cannot be called success.
    ledger = recordArcaneTranscription(ledger, { id: acquisition.transcriptionId, sourceEntityId: acquisition.sourceEntityId, targetSpellbookId: input.spellbookId, knowability, outcome: acquisition.outcome, ...(acquisition.actualCostGp === undefined ? {} : { actualCostGp: acquisition.actualCostGp }), ...(acquisition.actualDurationMinutes === undefined ? {} : { actualDurationMinutes: acquisition.actualDurationMinutes }), ...(acquisition.rulingId === undefined ? {} : { rulingId: acquisition.rulingId }) });
  }
  const unresolved: string[] = [];
  if (!completePlan) unresolved.push('initial-plan-incomplete');
  if (knowability.status === 'checking') unresolved.push('chance-to-know-history-incomplete');
  if ([...plannedIds].some(id => !knowability.knownSpellIds.includes(id))) unresolved.push('initial-grant-and-chance-to-know-conflict');
  if (ledger.spellbookEntries.length !== plannedIds.size) unresolved.push('initial-acquisitions-incomplete');
  const projection = projectSpellLedgerForPlayer(ledger);
  const facts = {
    adapter: marker, input, plan, knowability, capacity, unresolved,
    adoptionBoundary: 'Explicit campaign adoption requiring successful recorded Ctk and actual transcription; not a unique RAW reconciliation of PHB10 and DMG39. Other interpretations require a separate adapter, not fabricated passing rolls.',
    rawCertification: false, preparedNone: true,
    ledger: { ...projection, schema: 'adnd1e.spell-ledger-player-portable' as const },
    ...(uiDraft === undefined ? {} : { uiDraft: coreArcaneCreationUiDraftSchema.parse(uiDraft) }),
  };
  const sourceIds = [...new Set([adapterSource, ...(plan.sourceIds ?? ['dmg:39:initial-illusionist-spells']), ...knowability.sourceIds, ...capacity.tracks.flatMap(track => track.sourceIds), ...input.adoption.sourceIds])];
  return { input, facts, sourceIds, dmLedger: ledger };
}

/** Records source/attempt/book facts only. No preparation, dates, rolls, money
 * deductions or inventory grants are invented. Actual costs remain unknown unless
 * explicitly supplied with a ruling; inventory/access review remains separate.
 */
export function recordCoreArcaneCreation(document: CoreCreation, input: CoreArcaneCreationInput, uiDraft?: CoreArcaneCreationUiDraft) {
  const current = parseCoreCreation(document);
  if (current.status === 'admitted') throw new Error('Admitted creation cannot be rewritten.');
  const result = build(current, input, uiDraft), pending = result.facts.unresolved.length > 0;
  return { document: recordCreationTask(current, 'initial-spells', { status: pending ? 'pending' : 'needs-dm', sourceIds: result.sourceIds, note: pending ? '奥术初始计划、Ctk 或实际取得尚未完成／冲突；保留骰史，不补书，需返回对应流程。' : '初始法术来源、Ctk 与转录已记录；采用明确战役解释，待 DM 审核；未准备法术。', facts: result.facts }), dmLedger: result.dmLedger };
}

const encoded = (value: unknown) => canonical(JSON.parse(JSON.stringify(value)) as Json);

/** Present-day entry writer guard only. Deliberately NOT called by historical
 * parsers or low-level admitCoreCreation. Non-arcane careers are unaffected.
 * Legacy plan-only or fixture ledgers remain parseable but cannot pass this new
 * writer guard without explicit new-adapter facts; no automatic migration occurs.
 * A needs-dm task may be inspected before approval; admission's normal task gate
 * still requires the separate explicit DM review to be complete.
 */
export function assertArcaneCreationLedger(document: CoreCreation): void {
  const current = parseCoreCreation(document);
  if (!current.candidate?.classIds.some(id => id === 'magic-user' || id === 'illusionist')) return;
  arcaneClass(current);
  const task = current.tasks.find(task => task.id === 'initial-spells')!;
  if (!['needs-dm', 'complete'].includes(task.status) || task.facts?.adapter !== marker || !task.facts.input) throw new Error('New arcane admission requires the replayable arcane creation adapter; plan-only and unmarked legacy ledgers are not new-entry evidence.');
  const expected = build(current, task.facts.input as CoreArcaneCreationInput);
  if (expected.facts.unresolved.length) throw new Error('Arcane creation acquisition or Chance to Know is unresolved.');
  // approveCreationTask appends dmReview; every acquisition field must still
  // equal reconstruction from the explicit original request and current scores.
  const { dmReview: _review, uiDraft: _uiDraft, ...actualFacts } = task.facts;
  if (encoded(actualFacts) !== encoded(expected.facts)) throw new Error('Arcane creation ledger or recorded facts differ from reconstruction.');
  if (expected.sourceIds.some(id => !task.sourceIds.includes(id))) throw new Error('Arcane creation source evidence is missing.');
}
