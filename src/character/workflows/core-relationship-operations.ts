import { z } from 'zod';
import { checkHenchmanCapacity, projectRelationshipForPlayer,
  type PrivateRelationshipRecord, type PublicRelationshipContract } from '../engine/core-relationships';
import { coreRelationshipsPack } from '../rules/core-relationships';

const text = z.string().trim().min(1);
// Campaign date labels are opaque: no Earth calendar or elapsed-time inference.
const contractSchema = z.object({
  startedOn: text, endsOn: text.nullable(), payGpPerPeriod: z.number().finite().nonnegative().nullable(),
  payPeriod: z.enum(['day', 'week', 'month', 'year', 'adventure-share', 'special']),
  treasureShare: text.nullable(), duties: z.array(text), quartersProvided: z.boolean(),
  foodAndClothingProvided: z.boolean(), employerProvidedEquipment: z.array(text),
}).strict();
const statusSchema = z.enum(['prospective', 'active', 'missing', 'dismissed', 'dead', 'departed']);
const metadata = { actionId: text, at: text, authority: z.literal('dm-ruling'), reason: text };
const actionSchema = z.discriminatedUnion('type', [
  z.object({ ...metadata, type: z.literal('register'), relationshipId: text, displayName: text,
    kind: z.enum(['henchman', 'standard-hireling', 'expert-hireling', 'mercenary', 'follower']),
    status: z.enum(['prospective', 'active']), contract: contractSchema }).strict(),
  z.object({ ...metadata, type: z.literal('change-status'), relationshipId: text, status: statusSchema }).strict(),
  z.object({ ...metadata, type: z.literal('replace-contract'), relationshipId: text, contract: contractSchema }).strict(),
  z.object({ ...metadata, type: z.literal('record-payment'), relationshipId: text,
    amountGp: z.number().finite().positive(), purpose: z.enum(['initial', 'wage', 'bonus', 'share', 'other']),
    contractActionId: text, periodLabel: text.nullable(), externalReceiptId: text.nullable() }).strict(),
]);

/** These commands are DM-authoritative; never accept them directly from player input. */
export type CoreRelationshipAction = z.infer<typeof actionSchema>;
export interface RelationshipPayment {
  readonly id: string;
  readonly relationshipId: string;
  readonly at: string;
  readonly amountGp: number;
  readonly purpose: 'initial' | 'wage' | 'bonus' | 'share' | 'other';
  readonly contractActionId: string;
  readonly periodLabel: string | null;
  readonly externalReceiptId: string | null;
}
export interface RelationshipContractVersion {
  readonly actionId: string;
  readonly relationshipId: string;
  readonly at: string;
  readonly contract: PublicRelationshipContract;
}
export interface CoreRelationshipOperationsState {
  readonly schema: 'adnd1e.relationship-operations';
  readonly schemaVersion: 1;
  readonly employerId: string;
  readonly records: readonly PrivateRelationshipRecord[];
  readonly contracts: readonly RelationshipContractVersion[];
  readonly payments: readonly RelationshipPayment[];
  /** DM-private audit, including reasons; never export directly. */
  readonly actions: readonly CoreRelationshipAction[];
}
export function createCoreRelationshipOperations(employerId: string): CoreRelationshipOperationsState {
  return { schema: 'adnd1e.relationship-operations', schemaVersion: 1,
    employerId: text.parse(employerId), records: [], contracts: [], payments: [], actions: [] };
}
const occupiesSlot = (record: PrivateRelationshipRecord) => record.kind === 'henchman'
  && (record.status === 'active' || record.status === 'missing');
// Application policy, not a transcribed AD&D transition table. Resurrection/rejoining needs a future explicit workflow.
const transitions: Record<PrivateRelationshipRecord['status'], readonly PrivateRelationshipRecord['status'][]> = {
  prospective: ['active', 'dismissed', 'departed', 'dead'],
  active: ['missing', 'dismissed', 'departed', 'dead'],
  missing: ['active', 'dismissed', 'departed', 'dead'], dismissed: [], departed: [], dead: [],
};
export type CoreRelationshipOperationResult =
  | { readonly status: 'applied'; readonly state: CoreRelationshipOperationsState }
  | { readonly status: 'needs-dm'; readonly state: CoreRelationshipOperationsState;
      readonly reason: string; readonly sourceStatus: 'unknown' };

/** Pure reduction. The adapter must supply complete employer state and the effective PHB13 CHA.
 * No wallet debit, clock, random roll, recruitment success, or automatic loyalty change occurs here.
 * Invalid/replayed commands throw before a replacement state is returned.
 */
export function applyCoreRelationshipAction(state: CoreRelationshipOperationsState,
  input: CoreRelationshipAction, context: { readonly effectiveCharisma: number }): CoreRelationshipOperationResult {
  const action = actionSchema.parse(input);
  if (state.actions.some(entry => entry.actionId === action.actionId)) throw new Error('Duplicate action ID.');
  if (action.type === 'register' && action.kind === 'follower') return {
    status: 'needs-dm', state, sourceStatus: coreRelationshipsPack.unresolved.classFollowers.status,
    reason: coreRelationshipsPack.unresolved.classFollowers.reason,
  };
  const next = structuredClone(state);
  let records = [...next.records];
  const contracts = [...next.contracts];
  const payments = [...next.payments];
  const index = records.findIndex(record => record.id === action.relationshipId);
  if (action.type === 'register') {
    if (index !== -1) throw new Error('Relationship ID already registered.');
    // The follower branch returned above; keep narrowing explicit for the engine record type.
    if (action.kind === 'follower') throw new Error('Follower requires DM review.');
    records.push({ id: action.relationshipId, kind: action.kind, displayName: action.displayName,
      status: action.status, contract: action.contract, observedHistory: [],
      secret: { npcCharacterId: null, trueAlignment: null, trueReligion: null, personalityNotes: null,
        loyalty: null, moraleHistory: [], dmNotes: [] } });
    contracts.push({ actionId: action.actionId, relationshipId: action.relationshipId, at: action.at,
      contract: structuredClone(action.contract) });
  } else {
    const record = records[index];
    if (!record) throw new Error('Unknown relationship ID.');
    if (action.type === 'change-status') {
      if (!transitions[record.status].includes(action.status)) throw new Error('Unsupported status transition.');
      records[index] = { ...record, status: action.status };
    } else if (action.type === 'replace-contract') {
      if (record.status !== 'prospective' && record.status !== 'active' && record.status !== 'missing') {
        throw new Error('Closed relationship cannot renegotiate a contract.');
      }
      records[index] = { ...record, contract: action.contract };
      contracts.push({ actionId: action.actionId, relationshipId: record.id, at: action.at,
        contract: structuredClone(action.contract) });
    } else {
      if (!contracts.some(version => version.relationshipId === record.id && version.actionId === action.contractActionId)) {
        throw new Error('Payment must reference a contract version of this relationship.');
      }
      if (action.externalReceiptId !== null && payments.some(payment => payment.externalReceiptId === action.externalReceiptId)) {
        throw new Error('External receipt already recorded.');
      }
      // Historical settlement is permitted after departure/death; no invented debt or payroll schedule.
      payments.push({ id: action.actionId, relationshipId: record.id, at: action.at, amountGp: action.amountGp,
        purpose: action.purpose, contractActionId: action.contractActionId,
        periodLabel: action.periodLabel, externalReceiptId: action.externalReceiptId });
    }
  }
  const oldCount = state.records.filter(occupiesSlot).length;
  const newCount = records.filter(occupiesSlot).length;
  if (newCount > oldCount && checkHenchmanCapacity(context.effectiveCharisma, oldCount).remaining < newCount - oldCount) {
    throw new Error('Henchman capacity exceeded (PHB13).');
  }
  return { status: 'applied', state: { ...next, records, contracts, payments, actions: [...next.actions, action] } };
}

/** Only explicitly public contract facts and recorded payments; excludes action reasons and receipt IDs.
 * Public text must already have been approved for disclosure by the DM/adapter.
 */
export function projectCoreRelationshipOperationsForPlayer(state: CoreRelationshipOperationsState) {
  return {
    schema: 'adnd1e.relationship-operations-player-projection' as const, schemaVersion: 1 as const,
    employerId: state.employerId, disclosure: 'public-facts-only' as const,
    relationships: state.records.map(projectRelationshipForPlayer),
    payments: state.payments.map(payment => ({ id: payment.id, relationshipId: payment.relationshipId,
      at: payment.at, amountGp: payment.amountGp, purpose: payment.purpose,
      contractActionId: payment.contractActionId, periodLabel: payment.periodLabel })),
  };
}
