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
  return ()=>style;
}
