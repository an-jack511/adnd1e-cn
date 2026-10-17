import { reviewCoreClassCapabilities } from '../engine/core-class-capabilities';
import type { InitialCoreClassId } from '../rules/core-progression';

const classLabels: Readonly<Record<InitialCoreClassId,string>> = Object.freeze({
  cleric:'牧师',druid:'德鲁伊',fighter:'战士',paladin:'圣武士',ranger:'游侠','magic-user':'魔法师',
  illusionist:'幻术师',thief:'盗贼',assassin:'刺客',monk:'武僧',
});
const statusLabel = { verified:'已核', 'needs-dm':'待战役确认', unsupported:'尚未支持' } as const;
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;

export function startClassCapabilityBrowser(){
  const classSelect=get<HTMLSelectElement>('cap-class'),levelInput=get<HTMLInputElement>('cap-level');
  classSelect.replaceChildren(...Object.entries(classLabels).map(([id,label])=>new Option(`${label} / ${id}`,id)));
  const render=()=>{
    const classId=classSelect.value as InitialCoreClassId,level=Number(levelInput.value);
    try{
      const review=reviewCoreClassCapabilities(classId,level),active=get('cap-active'),locked=get('cap-locked');
      active.replaceChildren(...review.active.map(item=>{
        const article=document.createElement('article'); article.className=`capability capability-${item.status}`;
        const heading=document.createElement('h3'); heading.textContent=`${item.label} · ${statusLabel[item.status]}`;
        const rule=document.createElement('p'); rule.textContent=item.rule;
        const meta=document.createElement('p'); meta.className='small';
        const value=item.value ? `；当前数值：${item.value.dice??item.value.value}（${item.value.label}）` : '';
        meta.textContent=`${item.minimumLevel}级起；处理：${item.resolution}${value}；依据：${item.sourceIds.join('、')}`;
        article.append(heading,rule,meta); return article;
      }));
      locked.replaceChildren(...review.locked.map(item=>{const li=document.createElement('li');li.textContent=`${item.minimumLevel}级：${item.label}`;return li;}));
      get('cap-summary').textContent=`${classLabels[classId]} ${level}级：已显示 ${review.active.length} 项；其中 ${review.needsDm.length} 项待战役确认，${review.unsupported.length} 项尚未支持。`;
    }catch(error){get('cap-summary').textContent=(error as Error).message;get('cap-active').replaceChildren();get('cap-locked').replaceChildren();}
  };
  classSelect.addEventListener('change',render); levelInput.addEventListener('input',render); render();
}
