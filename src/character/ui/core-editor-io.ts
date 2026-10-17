/** Serialize asynchronous editor replacement/storage operations, not game actions.
 * A save may finish while newer game actions remain in memory; callers must
 * acknowledge the captured snapshot, never the then-current editor document.
 */
export function createCoreEditorIo(onChange:()=>void=()=>{}) {
  let active:string|null=null;
  return {
    get busy(){return active!==null;},
    async run<T>(operation:string,task:()=>Promise<T>):Promise<T>{
      if(active!==null)throw new Error(`正在${active}，请等待完成；当前档案未被替换。`);
      active=operation;
      try{onChange();return await task();}
      finally{active=null;onChange();}
    },
  };
}
