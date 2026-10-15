import { z } from 'zod';
import { draftSchema, type Draft } from './model';
import { parseDraft } from './engine';

export const storageKey = 'adnd1e-creation-library-v1';
type StoragePort = Pick<Storage,'getItem'|'setItem'>;
const librarySchema=z.object({version:z.literal(1),drafts:z.array(draftSchema).max(200)}).strict();
export function readLibrary(storage: StoragePort): Draft[] {
  const raw=storage.getItem(storageKey);
  if (raw === null) return [];
  try {
    const list=librarySchema.parse(JSON.parse(raw)).drafts.map(parseDraft);
    if (new Set(list.map(x=>x.id)).size!==list.length) throw new Error('duplicate');
    return list;
  } catch { throw new Error('浏览器草稿库无法完整读取；原内容未覆盖。可以先导出当前草稿，再恢复库备份。'); }
}
export function saveDraft(storage: StoragePort, draft: Draft, expectedStoredRevision: number | null): void {
  parseDraft(draft);
  const list=readLibrary(storage); const existing=list.find(x=>x.id===draft.id);
  if ((existing?.revision ?? null) !== expectedStoredRevision) throw new Error('此草稿已在另一页面改变。请导出当前版本，再加载浏览器版本比较。');
  if(existing&&draft.revision<existing.revision)throw new Error('拒绝将草稿回退到旧修订。请另存文件或导入为新副本。');
  const next=list.filter(x=>x.id!==draft.id);next.push(draft);
  if(next.length>200)throw new Error('浏览器草稿库已满（200 张）。当前草稿未丢失，请导出文件备份。');
  librarySchema.parse({version:1,drafts:next});
  try { storage.setItem(storageKey,JSON.stringify({version:1,drafts:next})); }
  catch { throw new Error('未能保存到此浏览器。当前草稿仍在页面中，请导出文件备份。'); }
}
/** All browser writers must use this cross-tab exclusive lock. Fail closed without it. */
export async function saveDraftLocked(storage: StoragePort, draft: Draft, expectedStoredRevision: number|null, locks: Pick<LockManager,'request'>|undefined): Promise<void> {
  if(!locks)throw new Error('此浏览器不支持安全的跨页面保存锁；请导出文件备份。没有写入草稿库。');
  await locks.request(storageKey,{mode:'exclusive'},()=>saveDraft(storage,draft,expectedStoredRevision));
}
export function importText(text: string, id: string = crypto.randomUUID()): Draft {
  if (new TextEncoder().encode(text).byteLength > 1024*1024) throw new Error('草稿文件超过 1 MB 限制。');
  let value: unknown;
  try { value=JSON.parse(text); } catch { throw new Error('文件不是有效的 JSON。'); }
  const imported=parseDraft(value);
  // Importing an external version creates a new branch rather than overwriting a local character.
  imported.id=id; imported.revision++;
  imported.audit.push({at:new Date().toISOString(),action:'copied',batchId:imported.activeBatch?.id??null});
  return parseDraft(imported);
}
export function exportText(draft: Draft): string { return JSON.stringify(parseDraft(draft),null,2); }
