import { canonical, type Json } from '../domain/transactions';
import { parseCoreCampaignArchive, type CoreCampaignArchive } from './core-campaign-runtime';

/** Implementations MUST atomically compare the entire old string and replace it.
 * A false result or exception MUST leave the old value untouched. Plain
 * localStorage getItem/setItem does not implement this concurrency contract. */
export interface CoreCampaignStoragePort {
  getItem(key: string): string | null;
  compareAndSet(key: string, expected: string | null, replacement: string): boolean;
}
export interface CampaignSlot { characterId: string; branchId: string }
export const CORE_CAMPAIGN_HISTORY_LIMIT = 5;
interface Snapshot { generation: number; archive: CoreCampaignArchive }
interface Envelope {
  format: 'adnd1e-core-campaign-storage'; schemaVersion: 1;
  generation: number; head: CoreCampaignArchive; history: Snapshot[];
}
export type CampaignLoad =
  | { status: 'missing'; token: null }
  | { status: 'ready'; token: string; generation: number; archive: CoreCampaignArchive; history: Snapshot[] }
  | { status: 'preserved'; token: string; raw: string; reason: string };
export type CampaignSave =
  | { status: 'saved'; token: string; generation: number }
  | { status: 'conflict'; current: CampaignLoad; reason: string }
  | { status: 'failed'; reason: string };

function nonempty(value: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing storage identity.');
}
export function coreCampaignStorageKey(slot: CampaignSlot): string {
  nonempty(slot.characterId); nonempty(slot.branchId);
  return `adnd1e:campaign:${JSON.stringify([slot.characterId, slot.branchId])}`;
}
function same(a: unknown, b: unknown): boolean {
  return canonical(a as Json) === canonical(b as Json);
}
function identity(archive: CoreCampaignArchive, slot: CampaignSlot) {
  const tx = archive.runtime.transaction;
  if (tx.characterId !== slot.characterId || tx.branchId !== slot.branchId) throw new Error('Archive identity differs from storage slot.');
}
function generation(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid storage generation.');
}
function extendsArchive(next: CoreCampaignArchive, previous: CoreCampaignArchive) {
  return same(next.genesis, previous.genesis)
    && next.actions.length > previous.actions.length
    && same(next.actions.slice(0, previous.actions.length), previous.actions)
    && next.runtime.transaction.revision > previous.runtime.transaction.revision;
}
function decode(raw: string, slot: CampaignSlot): CampaignLoad {
  try {
    const env = JSON.parse(raw) as Envelope;
    if (!env || env.format !== 'adnd1e-core-campaign-storage' || env.schemaVersion !== 1) throw new Error('Unsupported storage schema; preserve original bytes.');
    if (!same(Object.keys(env).sort(), ['format', 'generation', 'head', 'history', 'schemaVersion'])) throw new Error('Unknown storage fields; preserve original bytes.');
    generation(env.generation);
    const archive = parseCoreCampaignArchive(env.head); identity(archive, slot);
    if (!Array.isArray(env.history) || env.history.length > CORE_CAMPAIGN_HISTORY_LIMIT) throw new Error('Invalid history.');
    let prior = env.generation;
    let newer = archive;
    const history = env.history.map(item => {
      if (!item || !same(Object.keys(item).sort(), ['archive', 'generation'])) throw new Error('Unknown snapshot fields.');
      generation(item.generation);
      if (item.generation !== prior - 1) throw new Error('History generation gap.');
      const old = parseCoreCampaignArchive(item.archive); identity(old, slot);
      if (!extendsArchive(newer, old)) throw new Error('History is not an append-only lineage.');
      prior = item.generation; newer = old;
      return { generation: item.generation, archive: old };
    });
    if (history.length !== Math.min(env.generation - 1, CORE_CAMPAIGN_HISTORY_LIMIT)) throw new Error('Missing history.');
    return { status: 'ready', token: raw, generation: env.generation, archive, history };
  } catch (error) {
    return { status: 'preserved', token: raw, raw, reason: String(error) };
  }
}
/** Read errors propagate: an inaccessible store is never treated as an empty one. */
export function loadCoreCampaign(port: CoreCampaignStoragePort, slot: CampaignSlot): CampaignLoad {
  const raw = port.getItem(coreCampaignStorageKey(slot));
  return raw === null ? { status: 'missing', token: null } : decode(raw, slot);
}
/** expectedToken is the exact token from load; null means create-only. */
export function saveCoreCampaign(port: CoreCampaignStoragePort, slot: CampaignSlot, value: unknown, expectedToken: string | null): CampaignSave {
  try {
    const key = coreCampaignStorageKey(slot);
    const archive = parseCoreCampaignArchive(value); identity(archive, slot);
    const current = loadCoreCampaign(port, slot);
    const conflict = (reason: string): CampaignSave => ({ status: 'conflict', current, reason });
    if (current.token !== expectedToken) return conflict('Storage changed since load.');
    if (current.status === 'preserved') return conflict('Unrecognized or damaged data must be exported before any explicit migration.');
    if (current.status === 'ready' && !extendsArchive(archive, current.archive)) return conflict('Only a strict extension of the saved action history may replace it; fork or retain conflict.');
    const nextGeneration = current.status === 'ready' ? current.generation + 1 : 1;
    generation(nextGeneration);
    const env: Envelope = {
      format: 'adnd1e-core-campaign-storage', schemaVersion: 1, generation: nextGeneration, head: archive,
      history: current.status === 'ready'
        ? [{ generation: current.generation, archive: current.archive }, ...current.history].slice(0, CORE_CAMPAIGN_HISTORY_LIMIT) : [],
    };
    const token = JSON.stringify(env);
    if (!port.compareAndSet(key, expectedToken, token)) return { status: 'conflict', current: loadCoreCampaign(port, slot), reason: 'Concurrent atomic write rejected.' };
    return { status: 'saved', token, generation: nextGeneration };
  } catch (error) {
    return { status: 'failed', reason: String(error) };
  }
}

/** Explicit recovery produces a conflict artifact, never a write or rollback.
 * Caller may export it, or rebranch through the runtime admission/replay APIs. */
export function recoverCoreCampaignHistory(port: CoreCampaignStoragePort, slot: CampaignSlot, expectedToken: string, snapshotGeneration: number): {
  status: 'recovery-conflict'; currentToken: string; current: CoreCampaignArchive;
  recovered: CoreCampaignArchive; recoveredGeneration: number;
} {
  const current = loadCoreCampaign(port, slot);
  if (current.status !== 'ready' || current.token !== expectedToken) throw new Error('Recovery baseline changed or is not readable.');
  const snapshot = current.history.find(item => item.generation === snapshotGeneration);
  if (!snapshot) throw new Error('Requested historical snapshot is unavailable.');
  return { status: 'recovery-conflict', currentToken: current.token, current: current.archive, recovered: snapshot.archive, recoveredGeneration: snapshot.generation };
}
