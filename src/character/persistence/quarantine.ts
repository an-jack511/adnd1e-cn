import { z } from 'zod';
import { openArchives } from './indexeddb';
const metadata=z.object({id:z.string().regex(/^[0-9a-f]{64}$/),name:z.string().min(1).max(500),size:z.number().int().min(0).max(2*1024*1024)}).strict();
export type OriginalMetadata=z.infer<typeof metadata>;
type Original=OriginalMetadata&{bytes:Uint8Array};
function check(value:unknown):Original{
  const parsed=z.object({...metadata.shape,bytes:z.instanceof(Uint8Array)}).strict().parse(value);
  if(parsed.size!==parsed.bytes.byteLength)throw new Error('Stored original size mismatch.');return parsed;
}
export async function prepareOriginal(name:string,bytes:Uint8Array):Promise<Original>{
  const original=bytes.slice();
  if(original.byteLength>2*1024*1024)throw new Error('Original exceeds size limit.');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',original as BufferSource));
  const id=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
  return check({id,name,size:original.byteLength,bytes:original});
}
export async function preserveOriginal(name:string,bytes:Uint8Array):Promise<string>{
  const row=await prepareOriginal(name,bytes);const id=row.id;const db=await openArchives();
  try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('quarantine','readwrite');tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error('Original preservation aborted.'));
    const store=tx.objectStore('quarantine');const get=store.get(id);
    get.onsuccess=()=>{if(get.result===undefined)store.add(row);};
  });return id;}finally{db.close();}
}
export async function listOriginals():Promise<OriginalMetadata[]>{
  const db=await openArchives();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('quarantine','readonly');let rows:OriginalMetadata[]=[];let failure:Error|undefined;
    tx.oncomplete=()=>failure?reject(failure):resolve(rows);tx.onabort=()=>reject(tx.error??new Error('Original list failed.'));
    const request=tx.objectStore('quarantine').openCursor();
    request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;try{const row=check(cursor.value);rows.push({id:row.id,name:row.name,size:row.size});cursor.continue();}catch(e){failure=e as Error;}};
  });}finally{db.close();}
}
export async function loadOriginal(id:string):Promise<Original>{
  const db=await openArchives();
  try{const loaded:Original=await new Promise((resolve,reject)=>{
    const tx=db.transaction('quarantine','readonly');let row:Original|undefined;let failure:Error|undefined;
    tx.oncomplete=()=>failure?reject(failure):row?resolve(row):reject(new Error('Original not found.'));tx.onabort=()=>reject(tx.error??new Error('Original read failed.'));
    const request=tx.objectStore('quarantine').get(id);request.onsuccess=()=>{try{if(request.result!==undefined)row=check(request.result);}catch(e){failure=e as Error;}};
  });const verified=await prepareOriginal(loaded.name,loaded.bytes);if(verified.id!==loaded.id)throw new Error('Stored original checksum mismatch; existing bytes were not overwritten.');return loaded;}finally{db.close();}
}
