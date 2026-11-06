"""Assemble original-book chapters; preserve every legacy page and citation URL."""
import json,re,html,sys
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[2]
ARCHIVE=ROOT/'public/archive'
class Outline(HTMLParser):
    def __init__(self):
        super().__init__();self.roots=[];self.lists=[];self.items=[];self.anchor=None
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='ul':
            target=self.items[-1]['children'] if self.items else self.roots
            self.lists.append(target)
        elif tag=='li' and self.lists:
            item={'title':'','href':'','children':[]};self.lists[-1].append(item);self.items.append(item)
        elif tag=='a' and self.items:
            self.anchor=self.items[-1];self.anchor['href']=attrs.get('href','')
    def handle_endtag(self,tag):
        if tag=='ul' and self.lists:self.lists.pop()
        elif tag=='li' and self.items:self.items.pop()
        elif tag=='a':self.anchor=None
    def handle_data(self,data):
        if self.anchor is not None:self.anchor['title']+=data

def outline(markup):
    parser=Outline();parser.feed(markup);return parser.roots

def body(raw):return re.search(r'<article\b[^>]*>(.*?)</article>',raw,re.S|re.I)[1]
def children(raw):
    match=re.search(r'<div\b[^>]*class="section-contents"[^>]*>(.*?)</div>',raw,re.S|re.I)
    return outline(match[1]) if match else []
def strip_navigation(raw):
    raw=re.sub(r'<p\b[^>]*class="(?:breadcrumbs|reading-order)"[^>]*>.*?</p>','',raw,flags=re.S|re.I)
    return re.sub(r'<div\b[^>]*class="section-contents"[^>]*>.*?</div>','',raw,flags=re.S|re.I)

cache=ROOT/'src/data/public/book-outlines.json'
if cache.exists() and '--refresh-outlines' not in sys.argv:outlines=json.loads(cache.read_text(encoding='utf8'))
else:
    outlines={}
    for index in sorted(ARCHIVE.glob('*/index.html')):
        raw=index.read_text(encoding='utf8')
        if '<article>' not in raw:continue
        nodes=outline(body(raw));nodes=[n for n in nodes if n['href'].startswith('read-')]
        if nodes:outlines[index.parent.name]=nodes
    cache.write_text(json.dumps(outlines,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
manifest={};mapping={}
for book,nodes in outlines.items():
    folder=ARCHIVE/book;groups=[]
    for node in nodes:
        # A part with subchapters occupies level 2; its chapters occupy level 3.
        entries=node['children'] or [node]
        group={'title':node['title'] if node['children'] else '章节','chapters':[]}
        for entry in entries:
            filename=entry['href'].split('#')[0]
            if not (folder/filename).is_file():continue
            destination='chapter-'+filename.removeprefix('read-')
            seen=set();sections=[]
            def visit(name,depth=0):
                name=name.split('#')[0]
                if name in seen or not re.fullmatch(r'read-[\w-]+\.html',name) or not (folder/name).is_file():return
                seen.add(name);raw=(folder/name).read_text(encoding='utf8');article=body(raw)
                descendants=children(article);prefix=Path(name).stem
                content=strip_navigation(article)
                # Namespace IDs in combined chapters; originals remain available verbatim.
                content=re.sub(r'\bid="([^"]+)"',lambda m:f'id="{prefix}-{m[1]}"',content)
                content=re.sub(r'href="#([^"]+)"',lambda m:f'href="#{prefix}-{m[1]}"',content)
                level=min(depth+1,6)
                content=re.sub(r'<(/?)h([1-6])\b',lambda m:'<'+m[1]+'h'+str(min(6,level+int(m[2])-1)),content,flags=re.I)
                sections.append(f'<section class="chapter-section" id="{prefix}">{content}</section>')
                original=f'/archive/{book}/{name}';target=f'/archive/{book}/{destination}'
                mapping[original]=(target,prefix)
                for child in descendants:visit(child['href'],depth+1)
            visit(filename)
            # Rewrite intra-chapter links after every descendant has been discovered.
            content='\n'.join(sections)
            def chapter_link(match):
                name,anchor=match[1],match[2]
                if name not in seen:return match[0]
                return 'href="#'+Path(name).stem+('-'+anchor if anchor else '')+'"'
            content=re.sub(r'href="(read-[\w-]+\.html)(?:#([^"]+))?"',chapter_link,content)
            original=(folder/filename).read_text(encoding='utf8')
            result=re.sub(r'<article\b[^>]*>.*?</article>',lambda m:'<article class="chapter-reading">'+content+'</article>',original,flags=re.S|re.I)
            result=result.replace('</body>','<script src="/book-toc.js" defer></script></body>')
            (folder/destination).write_text(result,encoding='utf8')
            group['chapters'].append({'title':entry['title'],'href':f'/archive/{book}/{destination}','sections':len(seen)})
        if group['chapters']:groups.append(group)
    compact=[]
    for group in groups:
        if compact and compact[-1]['title']==group['title']:compact[-1]['chapters'].extend(group['chapters'])
        else:compact.append(group)
    groups=compact
    manifest[book]=groups
    # Replace only the directory body; old chapter documents remain intact.
    index=folder/'index.html';raw=index.read_text(encoding='utf8')
    heading=re.search(r'<h1\b[^>]*>.*?</h1>',body(raw),re.S|re.I)[0]
    content=heading+'<p><a href="/books/">← 规则书</a> · <a href="cover.html">本书封面</a></p>'
    for i,group in enumerate(groups):
        title='' if group['title']=='章节' else '<h2>'+html.escape(group['title'])+'</h2>'
        content+=f'<section id="part-{i}">{title}<ul class="book-outline">'
        content+=''.join(f'<li><a href="{html.escape(ch["href"],quote=True)}">{html.escape(ch["title"])}</a></li>' for ch in group['chapters'])+'</ul></section>'
    raw=re.sub(r'<article\b[^>]*>.*?</article>',lambda m:'<article>'+content+'</article>',raw,flags=re.S|re.I)
    index.write_text(raw,encoding='utf8')
(ROOT/'src/data/public/book-reading.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
lookup=ARCHIVE/'lookup.json';data=json.loads(lookup.read_text(encoding='utf8'))
for entry in data['entries']:
    original=entry.get('originalHref',entry['href']);page,_,anchor=original.partition('#')
    if page in mapping:
        target,prefix=mapping[page];target=target.replace('/archive/','/read/').replace('/chapter-','/').replace('.html','/');entry['originalHref']=original;entry['href']=target+'#'+prefix+('-'+anchor if anchor else '')
lookup.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(f'{len(manifest)} books; {sum(len(g["chapters"]) for groups in manifest.values() for g in groups)} chapters; {len(mapping)} preserved legacy pages')

# Legacy bookmarks enter the same reading frame; original source HTML stays intact.
def redirect(path,target,prefix=''):
    raw=path.read_text(encoding='utf8')
    raw=re.sub(r'<script data-reader-redirect>.*?</script>','',raw,flags=re.S)
    expression=json.dumps(target)+(('+"#'+prefix+'"+(location.hash?"-"+location.hash.slice(1):"")') if prefix else '+location.hash')
    script='<script data-reader-redirect>location.replace('+expression+')</script>'
    raw=raw.replace('<title>',script+'<title>',1)
    path.write_text(raw,encoding='utf8')
for original,(target,prefix) in mapping.items():
    canonical=target.replace('/archive/','/read/').replace('/chapter-','/').replace('.html','/')
    redirect(ROOT/'public'/original.lstrip('/'),canonical,prefix)
for book,groups in manifest.items():
    for group in groups:
        for chapter in group['chapters']:
            target=chapter['href'].replace('/archive/','/read/').replace('/chapter-','/').replace('.html','/')
            redirect(ROOT/'public'/chapter['href'].lstrip('/'),target)
    for name in ['index.html','cover.html']:
        path=ARCHIVE/book/name
        if path.exists():redirect(path,'/read/'+book+'/')
