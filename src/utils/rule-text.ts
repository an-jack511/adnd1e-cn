import headingTranslations from '../data/public/rule-heading-translations.json';
/** Explicit glossary for untranslated terms in the OA character rules. */
const glossary:Record<string,string>={Korobokuru:'科罗博库鲁',Hengeyokai:'变形妖',Bakemono:'化物',Oni:'恶鬼','go-daichi':'野太刀','no-daichi':'野太刀',Buso:'布索','Hai Nu':'海努','Hsing-Sing':'兴星','Hu Hsien':'狐仙','Jishin Mushi':'地震甲虫',Ningyo:'人鱼',Wako:'倭寇','Shan Sao':'山魈',Shirokinukatsukami:'食梦兽'};
export function translateRuleText(text:string):string {
 for(const [english,chinese] of Object.entries(glossary)){
  text=text.replace(new RegExp(`(?<![A-Za-z])${english}(?![A-Za-z])`,'gi'),chinese);
  text=text.replaceAll(`${chinese} ${chinese}`,chinese).replaceAll(`${chinese}（${chinese}）`,chinese);
 }
 return text.replace(/(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g,'');
}
export const isPageHeading=(text:string)=>/^(?:原书\s*(?:PDF\s*)?)?第\s*\d+[\d\s–—－\-、至]*页(?:\s*[（(]续[）)])?$/.test(text.trim());
export function translateRuleHeading(value:string):string {
 const label=value.trim();
 if(translateRuleText(label)!==label)return translateRuleText(label);
 const translated=(headingTranslations as Record<string,string>)[label]??(headingTranslations as Record<string,string>)[label.replace(/[‘’]/g,"'")];
 if(translated)return `${translated} · ${label}`;
 if(/^(?:设置\s+)?Setup$/i.test(label))return '冒险引入 · Setup';
 if(label==='原书目录层级')return '本书篇目';
 if(/^[A-Z](?:[–—-][A-Z])?$/.test(label))return `字母索引：${label}`;
 return translateRuleText(value).replace('Nuris Elfward','努里斯·精灵卫').replace('Zhentarim','散塔林会');
}
/** Keep legacy fragment IDs intact, but page boundaries are citations, not sections. */
export function formatRuleHtml(html:string):string {
 html=html.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi,(all,level,attrs,body)=>isPageHeading(body.replace(/<[^>]+>/g,''))?`<p${attrs} class="source-page-number">出处：${body.replace(/[（(]续[）)]/g,'')}</p>`:`<h${level}${attrs}>${translateRuleHeading(body)}</h${level}>`);
 // Transform text nodes only. Attributes, anchors, scripts and English catalogue fields stay intact.
 return html.replace(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>)|([^<]+)/gi,(all,tag,text)=>tag??translateRuleText(text).replaceAll('THACO','THAC0'));
}
