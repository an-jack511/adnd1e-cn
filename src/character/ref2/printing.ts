/** A4 at 96 dpi. Reserve a millimetre for browser rounding at each page edge. */
export const printScale = (height:number, available=280*96/25.4) => {
  const scale=Math.min(1,available/Math.max(1,height));
  return scale>=.72?scale:1;
};
export function installCardPrinting(form:HTMLFormElement,collect:()=>void){
  let output:HTMLElement|undefined,previewStyle:HTMLStyleElement|undefined,preview=false;
  function clear(){output?.remove();output=undefined;previewStyle?.remove();previewStyle=undefined;preview=false;}
  function prepare(){
    collect();output?.remove();previewStyle?.remove();
    output=document.createElement('div');output.id='ref2-print-output';output.className='ref2-workspace';
    output.dataset.monochrome=String(document.querySelector<HTMLInputElement>('#print-monochrome')!.checked);
    const compact=document.querySelector<HTMLInputElement>('#print-compact')!.checked;
    for(const source of form.querySelectorAll<HTMLElement>('[data-card-panel]')){
      if(compact&&source.dataset.cardPanel==='spells'&&!source.querySelector('.prepared-spell')&&!source.querySelector<HTMLTextAreaElement>('[name=spellbook_notes]')?.value.trim())continue;
      const panel=source.cloneNode(true) as HTMLElement;panel.hidden=false;
      const originals=[...source.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')];
      panel.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea').forEach((control,index)=>{
        const original=originals[index];control.value=original.value;
        if(control instanceof HTMLInputElement&&original instanceof HTMLInputElement)control.checked=original.checked;
        if(control instanceof HTMLSelectElement){const text=original instanceof HTMLSelectElement?original.selectedOptions[0]?.textContent:'';control.replaceChildren(new Option(text||'—',original.value,true,true));}
        if(control instanceof HTMLTextAreaElement){control.textContent=original.value;if(compact&&!control.value.trim())control.closest('.ref2-field')?.classList.add('print-empty-field');}
        control.removeAttribute('id');control.removeAttribute('name');
      });
      if(compact)for(const section of panel.querySelectorAll('[data-repeater]')){
        const rows=[...section.querySelectorAll<HTMLElement>('[data-card-row]')];
        const filled=rows.filter(row=>[...row.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select')].some(input=>input.value.trim()));
        const lanes=Number(section.querySelector<HTMLElement>('[data-lanes]')?.dataset.lanes||1);
        let blanks=Math.max(0,lanes-filled.length);
        for(const row of rows)if(!filled.includes(row)&&blanks--<=0)row.remove();
      }
      if(source.dataset.cardPanel==='spells'&&!compact){
        panel.querySelector('#prepared-empty')?.remove();
        const grid=document.createElement('table');grid.className='ref2-table print-blank-spells';
        const header=grid.createTHead().insertRow();
        for(const label of ['环级','法术名称／效果速记','准备／施放']){const cell=document.createElement('th');cell.textContent=label;header.append(cell);}
        const body=grid.createTBody();
        for(let i=0;i<18;i++){const row=body.insertRow();row.insertCell().textContent='';row.insertCell().textContent='';row.insertCell().textContent='□ □ □ □ □ □';}
        panel.querySelector('#prepared-spells')?.after(grid);
      }
      panel.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      const sheet=document.createElement('div');sheet.className='ref2-print-sheet';sheet.dataset.side=source.dataset.cardPanel;sheet.append(panel);output.append(sheet);
    }
    document.body.append(output);
    // Measure the same print rules at the physical paper width without changing live records.
    const rules:string[]=[];
    function visit(list:CSSRuleList,inPrint=false){for(const rule of list){
      if(rule instanceof CSSMediaRule){const print=rule.conditionText.split(',').some(value=>value.trim()==='print');if(print||inPrint)visit(rule.cssRules,true);}
      else if(inPrint)rules.push(rule.cssText);
    }}
    for(const sheet of document.styleSheets)try{visit(sheet.cssRules);}catch{/* Ignore inaccessible third-party sheets. */}
    const measurement=document.createElement('style');measurement.textContent=rules.join('\n');document.head.append(measurement);
    output.classList.add('print-measuring');
    try{
      for(const sheet of output.querySelectorAll<HTMLElement>('.ref2-print-sheet')){
        const panel=sheet.firstElementChild as HTMLElement;
        // Wrap prose only. Native score boxes retain their input selectors, dimensions and borders.
        const controls=[...panel.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')];
        const properties=['font-family','font-size','font-weight','font-style','color','text-align','padding','border','border-radius','flex','align-self','vertical-align','letter-spacing','width','min-height'];
        const styles=controls.map(control=>{const style=getComputedStyle(control);return Object.fromEntries(properties.map(key=>[key,style.getPropertyValue(key)]));});
        controls.forEach((control,index)=>{
          if(control instanceof HTMLInputElement&&['checkbox','radio','hidden','number'].includes(control.type))return;
          // Replacing these inputs with spans loses the original geometric CSS (Honor, circles,
          // attribute boxes, shield and movement). Empty controls also preserve writable space.
          if(!control.value.trim()||control.matches('.honor-ovals input,.save-circle,.ability-row>input,.strength-score input,.armor-shield input,.movement-summary input,.spell-slots input'))return;
          const text=document.createElement('span'),style=styles[index];
          text.className=control.className+' print-value';
          text.textContent=control instanceof HTMLSelectElement?control.selectedOptions[0]?.textContent??'':control.value;
          for(const property of properties)text.style.setProperty(property,style[property]);
          text.style.display='inline-block';
          if(control instanceof HTMLTextAreaElement&&!control.value.trim()&&!compact)text.style.minHeight=getComputedStyle(control).height;
          if(!text.textContent)text.textContent='\u00a0';
          control.replaceWith(text);
        });
        const height=panel.getBoundingClientRect().height,scale=printScale(height);
        sheet.style.setProperty('--print-scale',String(scale));sheet.dataset.continued=String(scale===1&&height>280*96/25.4);
        sheet.dataset.contentHeight=String(Math.round(height));
      }
    }finally{if(preview)previewStyle=measurement;else measurement.remove();output.classList.remove('print-measuring');}
    if(preview){const close=document.createElement('button');close.type='button';close.className='screen-tools print-preview-close';close.textContent='关闭打印预览';close.addEventListener('click',clear);output.append(close);}
  }
  window.addEventListener('beforeprint',prepare);
  window.addEventListener('afterprint',clear);
  document.querySelector('#preview-character')!.addEventListener('click',async()=>{await document.fonts.ready;preview=true;prepare();});
  document.querySelector('#print-character')!.addEventListener('click',async()=>{await document.fonts.ready;window.print();});
}
