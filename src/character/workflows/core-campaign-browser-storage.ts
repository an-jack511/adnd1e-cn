import { coreCampaignStorageKey, loadCoreCampaign, saveCoreCampaign, recoverCoreCampaignHistory, type CampaignSlot, type CampaignLoad, type CampaignSave, type CoreCampaignStoragePort } from './core-campaign-storage';
import type { CoreCampaignArchive } from './core-campaign-runtime';
const databaseName='adnd1e-campaign-runtime-v1',storeName='archives';
function openDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('浏览器数据库不可用，请导出文件保存。'));return;}
    const request=indexedDB.open(databaseName,1);let blocked=false;
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName);};
    request.onerror=()=>reject(request.error??new Error('无法打开运营档案库。'));
    request.onblocked=()=>{blocked=true;reject(new Error('其他页面阻止数据库升级，请先导出进度。'));};
    request.onsuccess=()=>{const db=request.result;if(blocked){db.close();return;}db.onversionchange=()=>db.close();resolve(db);};
  });
}
async function readRaw(key:string):Promise<string|null>{
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(storeName,'readonly'),request=tx.objectStore(storeName).get(key);let value:string|null=null;
    request.onsuccess=()=>{if(request.result!==undefined&&typeof request.result!=='string'){tx.abort();return;}value=request.result??null;};
    tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error??new Error('运营存储记录无法读取；原件未修改。'));
  });}finally{db.close();}
}
function memoryPort(raw:string|null):CoreCampaignStoragePort&{replacement:string|null}{
  const port={replacement:null as string|null,getItem:()=>raw,compareAndSet:(_key:string,expected:string|null,replacement:string)=>{if(raw!==expected)return false;port.replacement=replacement;return true;}};return port;
}
async function compareAndWrite(key:string,expected:string|null,replacement:string):Promise<boolean>{
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(storeName,'readwrite'),store=tx.objectStore(storeName),request=store.get(key);let matched=false;
    request.onsuccess=()=>{const value=request.result===undefined?null:request.result;if(value===expected){matched=true;store.put(replacement,key);}};
    tx.oncomplete=()=>resolve(matched);tx.onerror=tx.onabort=()=>reject(tx.error??new Error('数据库事务未提交，原档案保持不变。'));
  });}finally{db.close();}
}
export async function loadBrowserCampaign(slot:CampaignSlot):Promise<CampaignLoad>{return loadCoreCampaign(memoryPort(await readRaw(coreCampaignStorageKey(slot))),slot);}
export async function saveBrowserCampaign(slot:CampaignSlot,archive:CoreCampaignArchive,expectedToken:string|null):Promise<CampaignSave>{
  try{
    const key=coreCampaignStorageKey(slot),port=memoryPort(await readRaw(key));
    const planned=saveCoreCampaign(port,slot,archive,expectedToken);
    if(planned.status!=='saved')return planned;
    if(!port.replacement)throw new Error('未生成保存事务。');
    if(await compareAndWrite(key,expectedToken,port.replacement))return planned;
    return {status:'conflict',current:await loadBrowserCampaign(slot),reason:'另一页面已保存新版本；当前未保存进度仍保留。'};
  }catch(error){return {status:'failed',reason:(error as Error).message};}
}
export async function listBrowserCampaignSlots():Promise<CampaignSlot[]>{
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(storeName,'readonly'),request=tx.objectStore(storeName).getAllKeys();let slots:CampaignSlot[]=[];
    request.onsuccess=()=>{slots=request.result.flatMap(key=>{if(typeof key!=='string'||!key.startsWith('adnd1e:campaign:'))return [];try{const tuple=JSON.parse(key.slice('adnd1e:campaign:'.length));if(!Array.isArray(tuple)||tuple.length!==2||tuple.some(item=>typeof item!=='string'||!item.trim()))return [];const slot={characterId:tuple[0],branchId:tuple[1]};return coreCampaignStorageKey(slot)===key?[slot]:[];}catch{return [];}});};
    tx.oncomplete=()=>resolve(slots);tx.onerror=tx.onabort=()=>reject(tx.error??new Error('无法列出档案。'));
  });}finally{db.close();}
}
export async function recoverBrowserCampaignSnapshot(slot:CampaignSlot,expectedToken:string,generation:number){
  return recoverCoreCampaignHistory(memoryPort(await readRaw(coreCampaignStorageKey(slot))),slot,expectedToken,generation);
}
