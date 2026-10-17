import { resolveDisplayRuleSource } from '../rules/source-directory';
export function renderRuleSources(host:HTMLElement,ids:readonly string[]){
  host.replaceChildren();
  for(const id of [...new Set(ids)]){
    const source=resolveDisplayRuleSource(id),line=document.createElement('div');
    if(source){const reference=document.createElement('span');reference.textContent=`${source.book} 原书 p.${source.printedPages.join('、')} ${source.pdfPages.length?`（PDF p.${source.pdfPages.join('、')}）`:''} · ${source.section} `;const link=document.createElement('a');link.href=source.directoryUrl;link.textContent='规则书目录';line.append(reference,link);}
    else line.textContent=id.startsWith('project:')?`工具流程记录：${id}`:`待解析来源：${id}`;
    const identity=document.createElement('small');identity.textContent=` [${id}]`;line.append(identity);host.append(line);
  }
}
