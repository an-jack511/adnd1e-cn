const key='adnd1e-character-paper-style';
const normalize=(value:string|null)=>value==='permanent'?'permanent':'ref2';

export function installCardStyle(){
  const workspace=document.querySelector<HTMLElement>('.ref2-workspace');
  const picker=document.querySelector<HTMLSelectElement>('#exact-print-style');
  let style=normalize(picker?.value??null);
  function apply(value:string|null){
    style=normalize(value);
    if(workspace)workspace.dataset.paperStyle=style;
    if(picker)picker.value=style;
  }
  function restore(){
    try{apply(localStorage.getItem(key));}catch{apply(style);}
  }
  restore();
  picker?.addEventListener('change',()=>{
    apply(picker.value);
    try{localStorage.setItem(key,style);}catch{}
  });
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null)restore();});
  window.addEventListener('pageshow',restore);
  installEntryFont();
  return ()=>style;
}

function installEntryFont(){
  const key='adnd1e-character-entry-font';
  const picker=document.querySelector<HTMLSelectElement>('#entry-font');
  const custom=document.querySelector<HTMLInputElement>('#entry-font-custom');
  if(!picker||!custom)return;
  function apply(){
    custom.hidden=picker!.value!=='custom';
    const name=custom!.value.trim().replace(/[^\p{L}\p{N} ._()-]/gu,'');
    const family=picker!.value==='song'?'Ref2Song':picker!.value==='custom'&&name?'"'+name+'", Ref2Entry':'Ref2Entry';
    document.documentElement.style.setProperty('--entry-font',family);
  }
  function restore(){
    try{
      const stored=JSON.parse(localStorage.getItem(key)||'{}');
      picker!.value=['song','custom'].includes(stored.mode)?stored.mode:'hand';
      custom!.value=typeof stored.name==='string'?stored.name:'';
    }catch{}
    apply();
  }
  function save(){
    apply();
    try{localStorage.setItem(key,JSON.stringify({mode:picker!.value,name:custom!.value}));}catch{}
  }
  restore();
  picker.addEventListener('change',save);
  custom.addEventListener('input',save);
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null)restore();});
  window.addEventListener('pageshow',restore);
}
