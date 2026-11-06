// Render regional translations with the same Markdown processor used by the site.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.resolve('astro/package.json'));
const {createMarkdownProcessor}=await import(pathToFileURL(require.resolve('@astrojs/markdown-remark')).href);
const processor=await createMarkdownProcessor({syntaxHighlight:false});
const result=[];
for(const book of ['gha','dla','fr'])for(const file of readdirSync(`src/published/books/${book}`).filter(file=>file.endsWith('.md')).sort()){
 const raw=readFileSync(`src/published/books/${book}/${file}`,'utf8');
 const html=(await processor.render(raw)).code.replace(/<h[1-6]\b[^>]*>第\s*\d+\s*页[^<]*<\/h[1-6]>/g,'');
 result.push({book,slug:file.slice(0,-3),html});
}
writeFileSync('.git/regional-sources.json',JSON.stringify(result));
console.log(`Rendered ${result.length} regional source chapters.`);
