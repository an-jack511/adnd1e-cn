import { applyCoreRelationshipAction, createCoreRelationshipOperations,
  projectCoreRelationshipOperationsForPlayer, type CoreRelationshipAction,
  type CoreRelationshipOperationsState } from '../src/character/workflows/core-relationship-operations';
import { calculatePrivateLoyalty, resolvePrivateMorale } from '../src/character/engine/core-relationships';

function assert(value: unknown, message = 'Assertion failed'): asserts value {
  if (!value) throw new Error(message);
}
function rejects(run: () => unknown) {
  let failed = false;
  try { run(); } catch { failed = true; }
  assert(failed, 'Expected rejection');
}
const contract = { startedOn: 'CY 576, planting', endsOn: null, payGpPerPeriod: null,
  payPeriod: 'special' as const, treasureShare: null, duties: ['guard'], quartersProvided: true,
  foodAndClothingProvided: true, employerProvidedEquipment: ['spear'] };
let serial = 0;
const meta = () => ({ actionId: `a-${++serial}`, at: 'CY 576, planting', authority: 'dm-ruling' as const,
  reason: 'SECRET-DM-REASON' });
const register = (id: string, kind: 'henchman' | 'standard-hireling' | 'expert-hireling' | 'mercenary' | 'follower',
  status: 'active' | 'prospective' = 'active'): CoreRelationshipAction => ({ ...meta(), type: 'register',
    relationshipId: id, displayName: id, kind, status, contract });
const context = { effectiveCharisma: 3 };
let state = createCoreRelationshipOperations('pc-1');
function apply(action: CoreRelationshipAction) {
  const previous = JSON.stringify(state);
  const result = applyCoreRelationshipAction(state, action, context);
  assert(JSON.stringify(state) === previous, 'Input mutated');
  assert(result.status === 'applied');
  state = result.state;
}
const first = register('h1', 'henchman');
apply(first);
rejects(() => applyCoreRelationshipAction(state, first, context));
rejects(() => apply(register('h1', 'mercenary')));
rejects(() => apply(register('h2', 'henchman')));
apply(register('candidate', 'henchman', 'prospective'));
rejects(() => apply({ ...meta(), type: 'change-status', relationshipId: 'candidate', status: 'active' }));
for (const kind of ['standard-hireling', 'expert-hireling', 'mercenary'] as const) {
  // Hirelings never even evaluate CHA: an unsupported CHA must not block their registration.
  const result = applyCoreRelationshipAction(state, register(kind, kind), { effectiveCharisma: NaN });
  assert(result.status === 'applied');
  state = result.state;
}
const follower = applyCoreRelationshipAction(state, register('follower', 'follower'), context);
assert(follower.status === 'needs-dm' && follower.state === state && follower.sourceStatus === 'unknown');
apply({ ...meta(), type: 'change-status', relationshipId: 'h1', status: 'missing' });
rejects(() => apply(register('h2', 'henchman')));
apply({ ...meta(), type: 'change-status', relationshipId: 'h1', status: 'active' });
apply({ ...meta(), type: 'change-status', relationshipId: 'h1', status: 'departed' });
rejects(() => apply({ ...meta(), type: 'change-status', relationshipId: 'h1', status: 'active' }));
apply(register('h2', 'henchman'));
// A CHA drop does not block unrelated settlement or release, even when already over capacity.
const oldContract = state.contracts.find(version => version.relationshipId === 'h2')!;
apply({ ...meta(), type: 'replace-contract', relationshipId: 'h2', contract: { ...contract, payGpPerPeriod: 7 } });
assert(oldContract.contract.payGpPerPeriod === null);
assert(state.contracts.filter(version => version.relationshipId === 'h2').length === 2);
const payment: CoreRelationshipAction = { ...meta(), type: 'record-payment', relationshipId: 'h2',
  amountGp: 7, purpose: 'wage', contractActionId: oldContract.actionId, periodLabel: 'first agreed period',
  externalReceiptId: 'SECRET-RECEIPT' };
apply(payment);
rejects(() => apply({ ...payment, ...meta() }));
rejects(() => apply({ ...payment, ...meta(), externalReceiptId: null, amountGp: -1 }));
rejects(() => apply({ ...payment, ...meta(), externalReceiptId: null, amountGp: Infinity }));
rejects(() => apply({ ...payment, ...meta(), externalReceiptId: null, contractActionId: first.actionId }));
rejects(() => apply({ ...meta(), type: 'change-status', relationshipId: 'unknown', status: 'dead' }));
rejects(() => apply({ ...meta(), type: 'replace-contract', relationshipId: 'h1', contract }));
// Simulate an untrusted JSON payload crossing the typed adapter boundary.
const malformed: unknown = { ...register('bad', 'mercenary'), surprise: 'secret' };
rejects(() => apply(malformed as CoreRelationshipAction));
apply({ ...meta(), type: 'change-status', relationshipId: 'h2', status: 'dead' });
apply({ ...payment, ...meta(), externalReceiptId: null }); // historical settlement allowed
rejects(() => apply({ ...meta(), type: 'change-status', relationshipId: 'h2', status: 'active' }));

// Exercise actual engine secret data as well as unknown nested fields and input/output aliasing.
const privateState: CoreRelationshipOperationsState = structuredClone(state);
const secret = privateState.records[0].secret as unknown as Record<string, unknown>;
secret.npcCharacterId = 'SECRET-NPC';
secret.trueAlignment = 'SECRET-ALIGNMENT';
secret.dmNotes = ['SECRET-NOTES'];
secret.loyalty = calculatePrivateLoyalty({ charismaScore: 9, selections: [] });
secret.moraleHistory = [resolvePrivateMorale({ loyaltyScore: 50, roll: 99, triggerId: 'obviously-superior-force' })];
secret.futureSecret = { value: 'SECRET-FUTURE' };
const projection = projectCoreRelationshipOperationsForPlayer(privateState);
const encoded = JSON.stringify(projection);
for (const token of ['SECRET-', 'secret', 'loyalty', 'privateRoll', 'morale', 'authority', 'reason', 'externalReceiptId', 'actions']) {
  assert(!encoded.includes(token), `Projection leaked ${token}`);
}
assert(projection.payments.length === 2 && projection.relationships.length === state.records.length);
assert(projection.relationships[0].contract !== privateState.records[0].contract);
assert(Object.keys(projection.payments[0]).sort().join(',') ===
  'amountGp,at,contractActionId,id,periodLabel,purpose,relationshipId');
const before = JSON.stringify(state);
contract.duties.push('changed by caller');
assert(JSON.stringify(state) === before, 'Action retained caller-owned contract reference');
console.log('PASS: bounded relationship operations, henchman-only capacity, followers unknown, contract/payment audit, pure reduction and secret-free projection.');
