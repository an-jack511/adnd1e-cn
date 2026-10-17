import type { PlayerRelationshipProjection, PublicRelationshipContract } from './core-relationships';
import type { RelationshipKind } from '../rules/core-relationships';

/**
 * Public relationship data exchanged with a future DM Studio.
 *
 * This is deliberately a separate envelope from the private relationship
 * operations state.  The allow-list validator below rejects private loyalty,
 * morale, alignment, religion and DM-note fields instead of copying an
 * unknown object and attempting to delete secrets afterwards.
 */
export const publicRelationshipProjectionSource = 'project:dm-studio-public-relationship-projection';

export interface PublicRelationshipPayment {
  readonly id: string;
  readonly relationshipId: string;
  readonly at: string;
  readonly amountGp: number;
  readonly purpose: 'initial' | 'wage' | 'bonus' | 'share' | 'other';
  readonly contractActionId: string;
  readonly periodLabel: string | null;
}

export interface PublicRelationshipProjectionFile {
  readonly format: 'adnd1e-relationship-player-projection';
  readonly schemaVersion: '1.0.0';
  readonly characterId: string;
  readonly exportedAt: string;
  readonly revision: number;
  readonly relationships: readonly PlayerRelationshipProjection[];
  readonly payments: readonly PublicRelationshipPayment[];
}

const relationshipKinds = new Set<RelationshipKind>(['henchman', 'standard-hireling', 'expert-hireling', 'mercenary']);
const statuses = new Set(['prospective', 'active', 'missing', 'dismissed', 'dead', 'departed']);
const payPeriods = new Set(['day', 'week', 'month', 'year', 'adventure-share', 'special']);
const paymentPurposes = new Set(['initial', 'wage', 'bonus', 'share', 'other']);

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[], label: string) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} contains unsupported or missing fields.`);
  }
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be non-empty text.`);
  return value;
};
const nullableText = (value: unknown, label: string): string | null => {
  if (value === null) return null;
  return text(value, label);
};
const nonnegativeNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be non-negative.`);
  return value;
};
const nonnegativeInteger = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative integer.`);
  return value as number;
};

function parseContract(value: unknown): PublicRelationshipContract {
  if (!isObject(value)) throw new Error('Relationship contract must be an object.');
  exactKeys(value, ['startedOn', 'endsOn', 'payGpPerPeriod', 'payPeriod', 'treasureShare', 'duties', 'quartersProvided', 'foodAndClothingProvided', 'employerProvidedEquipment'], 'Relationship contract');
  if (!Array.isArray(value.duties) || value.duties.some(item => typeof item !== 'string' || !item.trim())) throw new Error('Contract duties must be non-empty text.');
  if (!Array.isArray(value.employerProvidedEquipment) || value.employerProvidedEquipment.some(item => typeof item !== 'string' || !item.trim())) throw new Error('Contract equipment must be non-empty text.');
  if (value.payGpPerPeriod !== null) nonnegativeNumber(value.payGpPerPeriod, 'Contract pay');
  if (!payPeriods.has(String(value.payPeriod))) throw new Error('Unknown contract pay period.');
  if (typeof value.quartersProvided !== 'boolean' || typeof value.foodAndClothingProvided !== 'boolean') throw new Error('Contract provisions must be boolean facts.');
  return {
    startedOn: text(value.startedOn, 'Contract start'),
    endsOn: nullableText(value.endsOn, 'Contract end'),
    payGpPerPeriod: value.payGpPerPeriod === null ? null : value.payGpPerPeriod as number,
    payPeriod: value.payPeriod as PublicRelationshipContract['payPeriod'],
    treasureShare: nullableText(value.treasureShare, 'Contract treasure share'),
    duties: [...value.duties as string[]],
    quartersProvided: value.quartersProvided,
    foodAndClothingProvided: value.foodAndClothingProvided,
    employerProvidedEquipment: [...value.employerProvidedEquipment as string[]],
  };
}

function parseRelationship(value: unknown): PlayerRelationshipProjection {
  if (!isObject(value)) throw new Error('Public relationship must be an object.');
  exactKeys(value, ['schema', 'schemaVersion', 'relationshipId', 'kind', 'displayName', 'status', 'contract', 'observedHistory', 'disclosure'], 'Public relationship');
  if (value.schema !== 'adnd1e.relationship-player-projection' || value.schemaVersion !== 1 || value.disclosure !== 'public-facts-only') throw new Error('Unsupported public relationship schema.');
  const kind = value.kind as RelationshipKind;
  if (!relationshipKinds.has(kind)) throw new Error('Unknown relationship kind.');
  if (!statuses.has(String(value.status))) throw new Error('Unknown relationship status.');
  if (!Array.isArray(value.observedHistory)) throw new Error('Public relationship history must be an array.');
  const observedHistory = value.observedHistory.map((entry, index) => {
    if (!isObject(entry)) throw new Error(`Public relationship history ${index} is invalid.`);
    exactKeys(entry, ['at', 'summary'], `Public relationship history ${index}`);
    return { at: text(entry.at, `Public relationship history ${index} time`), summary: text(entry.summary, `Public relationship history ${index} summary`) };
  });
  return {
    schema: 'adnd1e.relationship-player-projection', schemaVersion: 1,
    relationshipId: text(value.relationshipId, 'Relationship ID'), displayName: text(value.displayName, 'Relationship name'),
    kind, status: value.status as PlayerRelationshipProjection['status'], contract: parseContract(value.contract),
    observedHistory, disclosure: 'public-facts-only',
  };
}

function parsePayment(value: unknown, index: number): PublicRelationshipPayment {
  if (!isObject(value)) throw new Error(`Public payment ${index} is invalid.`);
  exactKeys(value, ['id', 'relationshipId', 'at', 'amountGp', 'purpose', 'contractActionId', 'periodLabel'], `Public payment ${index}`);
  if (!paymentPurposes.has(String(value.purpose))) throw new Error(`Public payment ${index} has an unknown purpose.`);
  return {
    id: text(value.id, `Public payment ${index} ID`), relationshipId: text(value.relationshipId, `Public payment ${index} relationship`),
    at: text(value.at, `Public payment ${index} time`), amountGp: nonnegativeNumber(value.amountGp, `Public payment ${index} amount`),
    purpose: value.purpose as PublicRelationshipPayment['purpose'], contractActionId: text(value.contractActionId, `Public payment ${index} contract`),
    periodLabel: nullableText(value.periodLabel, `Public payment ${index} period`),
  };
}

/** Parse and allow-list a future DM Studio public export. No private field is retained. */
export function parsePublicRelationshipProjection(value: unknown, expectedCharacterId?: string): PublicRelationshipProjectionFile {
  if (!isObject(value)) throw new Error('Public relationship projection must be an object.');
  exactKeys(value, ['format', 'schemaVersion', 'characterId', 'exportedAt', 'revision', 'relationships', 'payments'], 'Public relationship projection');
  if (value.format !== 'adnd1e-relationship-player-projection' || value.schemaVersion !== '1.0.0') throw new Error('Unsupported public relationship projection version.');
  const characterId = text(value.characterId, 'Projection character ID');
  if (expectedCharacterId !== undefined && characterId !== expectedCharacterId) throw new Error('Projection belongs to a different character.');
  const relationships = Array.isArray(value.relationships) ? value.relationships.map(parseRelationship) : (() => { throw new Error('Projection relationships must be an array.'); })();
  const payments = Array.isArray(value.payments) ? value.payments.map(parsePayment) : (() => { throw new Error('Projection payments must be an array.'); })();
  const relationshipIds = new Set(relationships.map(item => item.relationshipId));
  if (relationshipIds.size !== relationships.length) throw new Error('Projection contains duplicate relationship IDs.');
  const paymentIds = new Set(payments.map(item => item.id));
  if (paymentIds.size !== payments.length) throw new Error('Projection contains duplicate payment IDs.');
  if (payments.some(item => !relationshipIds.has(item.relationshipId))) throw new Error('Projection payment references an unknown relationship.');
  return {
    format: 'adnd1e-relationship-player-projection', schemaVersion: '1.0.0', characterId,
    exportedAt: text(value.exportedAt, 'Projection export time'), revision: nonnegativeInteger(value.revision, 'Projection revision'),
    relationships, payments,
  };
}

export function publicRelationshipProjectionToModule(projection: PublicRelationshipProjectionFile) {
  return {
    id: 'relationships', kind: 'adnd1e-public-relationship-projection', schemaVersion: '1.0.0' as const,
    visibility: 'player' as const, sourceIds: [publicRelationshipProjectionSource], data: structuredClone(projection),
  };
}
