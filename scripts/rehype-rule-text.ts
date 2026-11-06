import {isPageHeading,translateRuleText} from '../src/utils/rule-text';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const projectRequire=createRequire(new URL('../package.json',import.meta.url));
const astroRequire=createRequire(projectRequire.resolve('astro/package.json'));
const markdownRequire=createRequire(astroRequire.resolve('@astrojs/markdown-remark'));
const {default:GithubSlugger}=await import(/* @vite-ignore */ pathToFileURL(markdownRequire.resolve('github-slugger')).href);
type Node={type:string;tagName?:string;value?:string;properties?:Record<string,unknown>;children?:Node[]};
const text=(node:Node):string=>node.value??node.children?.map(text).join('')??'';
export default function ruleText(){
 return (tree:Node)=>{
  const slugger=new GithubSlugger();
  function visit(node:Node){
   if(node.tagName==='script'||node.tagName==='style'||node.tagName==='code'||node.tagName==='pre')return;
   if(node.tagName&&/^h[1-6]$/.test(node.tagName)){
    // Set original anchors before translating labels or converting page boundaries.
    const original=text(node),id=slugger.slug(original);
    node.properties={...node.properties,id:node.properties?.id??id};
    if(isPageHeading(original)){node.tagName='p';node.properties.className=['source-page-number'];node.children?.unshift({type:'text',value:'出处：'});}
   }
   if(node.type==='text'&&node.value)node.value=translateRuleText(node.value);
   node.children?.forEach(visit);
  }
  visit(tree);
 };
}
