import { parseCoreCreation, type CoreCreation } from './core-create';
const key='adnd1e:core-creation-library:v1';
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export function readCoreCreationLibrary(storage:StoragePort):CoreCreation[]{
  const raw=storage.getItem(key);if(raw===null)return [];
  if(raw.length>8*1024*1024)throw new Error('本地创建库超过读取上限，请先备份原始数据。');
  const data=JSON.parse(raw);
  if(data?.format!=='adnd1e-core-creation-library'||data.schemaVersion!==1||!Array.isArray(data.documents)||data.documents.length>100)throw new Error('本地创建库版本或结构不受支持，原件未修改。');
  const documents=data.documents.map(parseCoreCreation) as CoreCreation[];
  if(new Set(documents.map(doc=>doc.id)).size!==documents.length)throw new Error('本地创建库有重复身份，原件未修改。');
  return documents;
}
/** Called under a cross-tab lock; expected is the exact document loaded by this editor. */
export function saveCoreCreationLibrary(storage:StoragePort,document:CoreCreation,expected:CoreCreation|null):void{
  const current=parseCoreCreation(document),documents=readCoreCreationLibrary(storage),previous=documents.find(doc=>doc.id===current.id);
  if(previous&&(!expected||JSON.stringify(previous)!==JSON.stringify(parseCoreCreation(expected))))throw new Error('另一个页面已保存此角色；请先导出当前进度，再重新加载。');
  if(!previous&&expected)throw new Error('本地原记录已变化，请先导出当前进度。');
  if(previous&&JSON.stringify(previous)!==JSON.stringify(current)){
    if(previous.status==='admitted')throw new Error('已准入创建记录不可改写，请使用正式档案更正事件。');
    if(current.revision<=previous.revision)throw new Error('保存的新内容必须具有更高修订号。');
  }
  const next=[...documents.filter(doc=>doc.id!==current.id),current];if(next.length>100)throw new Error('创建库已满，请先导出备份。');
  const raw=JSON.stringify({format:'adnd1e-core-creation-library',schemaVersion:1,documents:next});
  if(raw.length>8*1024*1024)throw new Error('创建库超过保存上限，请导出文件。');
  storage.setItem(key,raw);
}
