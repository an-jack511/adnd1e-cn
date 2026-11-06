"""Inventory names, match evidenced references, and audit/apply reviewed decisions.

No plural/word-order/name-author removal is allowed in automatic matching.
The inventory contains candidates, not a claim of complete human verification.
"""
from pathlib import Path
from collections import defaultdict, Counter
import argparse, csv, hashlib, html, json, re, shutil, unicodedata
from difflib import SequenceMatcher, get_close_matches
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'terminology'
DATE = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
KINDS = {'spells':'spell','items':'item','monsters':'monster','classes':'class','races':'race'}
REFKINDS = {'baseitem':'item','subrace':'race','deity':'proper','book':'book'}

def load(p, fallback=None):
    return json.loads(p.read_text(encoding='utf-8-sig')) if p.exists() else fallback

def write(p, obj):
    p.parent.mkdir(parents=True,exist_ok=True)
    content=json.dumps(obj,ensure_ascii=False,indent=2)+'\n'
    if not p.exists() or p.read_text(encoding='utf-8-sig') != content: p.write_text(content,encoding='utf-8')

def norm(s):
    s=html.unescape(unicodedata.normalize('NFKC',s)).replace('’',"'").replace('‘',"'").replace('–','-').replace('—','-')
    return re.sub(r'\s+',' ',s).strip().casefold()

def key(category,en): return category+':'+norm(en)

def paths():
    for base in ['src','scripts/import']:
        for p in sorted((ROOT/base).rglob('*')):
            if 'src/data/terminology/' in p.relative_to(ROOT).as_posix():continue
            if p.suffix in ['.md','.json','.ts','.astro','.py','.mjs'] and p.is_file(): yield p

def inventory():
    entries={}
    previous={e['key']:e for e in load(OUT/'catalog.json',{'entries':[]})['entries']}
    def add(en,zh,category,path,location='',id=None,active=False,untranslated=False):
        en,zh=str(en).strip(),str(zh).strip().strip('*')
        if not en or not zh or not re.search('[A-Za-z]',en) or (not untranslated and not re.search('[\u3400-\u9fff]',zh)): return
        k=key(category,en)
        if k not in entries:
            prev=previous.get(k,{})
            current=prev.get('zh',zh) if prev.get('status','').startswith(('verified','adapted')) else zh
            entries[k]={'key':k,'category':category,'en':en,'zh':current,'englishVariants':set(prev.get('englishVariants',[])), 'legacyZh':set(prev.get('legacyZh',[])),'occurrences':[], 'activeIds':[], 'status':'pending','references':[],'notes':[]}
        e=entries[k];e['englishVariants'].add(en);e['legacyZh'].add(zh)
        occurrence={'path':path,'location':location,'zh':zh}
        if occurrence not in e['occurrences']:e['occurrences'].append(occurrence)
        if active and id and id not in e['activeIds']:e['activeIds'].append(id)
    library=load(ROOT/'.git/terminology/library.json',{})
    for group, rows in library.items():
        for r in rows:add(r['nameEn'],r['nameZh'],KINDS[group],'@library',id=r['id'],active=True)
    def walk(obj,path,category,loc=''):
        if isinstance(obj,dict):
            if obj.get('nameEn') and obj.get('nameZh'):add(obj['nameEn'],obj['nameZh'],category,path,loc)
            if obj.get('titleEn') and obj.get('title'):add(obj['titleEn'],obj['title'],'heading',path,loc)
            for k,v in obj.items():walk(v,path,category,loc+'/'+str(k))
        elif isinstance(obj,list):
            for i,v in enumerate(obj):walk(v,path,category,loc+'/'+str(i))
    file_count=0
    for p in paths():
        file_count+=1;rel=p.relative_to(ROOT).as_posix();name=p.name
        category=next((v for k,v in KINDS.items() if k.rstrip('s') in name),'candidate')
        if name.startswith(('class-','classes')):category='class'
        if name.startswith(('race-','races')):category='race'
        if p.suffix=='.json':
            walk(load(p),rel,category)
        elif p.suffix=='.md':
            for n,line in enumerate(p.read_text(encoding='utf-8-sig').splitlines(),1):
                if not re.match(r'^#{1,6}\s',line):continue
                clean=html.unescape(re.sub('<[^>]+>','',re.sub(r'^#+\s*','',line))).replace('*','').strip()
                m=re.match(r'(?P<zh>[^A-Za-z]+?)\s+(?P<en>[A-Za-z][A-Za-z0-9 ,’\'\-/:&().+]+?)(?:[（（]|$)',clean)
                if m:add(m['en'].rstrip(' ('),m['zh'].strip(' （('),'heading',rel,str(n))
                elif re.fullmatch(r'[A-Za-z][A-Za-z0-9 ,’\'\-/:&().+]+',clean):
                    add(clean,clean,'heading',rel,str(n),untranslated=True)
        elif p.suffix=='.ts':
            s=p.read_text(encoding='utf-8-sig')
            for m in re.finditer(r"nameZh:\s*(['\"])(.*?)\1,\s*nameEn:\s*(['\"])((?:\\.|(?!\3).)*)\3",s):
                add(m[4].replace("\\'","'"),m[2],category,rel,str(s[:m.start()].count('\n')+1))
    for source in ['glossary.json','translation/monster-names.tsv','translation/monster-rule-terms.tsv']:
        p=ROOT.parent/source
        if not p.exists():continue
        if p.suffix=='.json':
            for r in load(p):add(r['original_term'],r['translated_term'],'legacy-term','../'+source)
        else:
            for n,line in enumerate(p.read_text(encoding='utf-8-sig').splitlines(),1):
                if line.startswith('#') or '\t' not in line:continue
                en,zh,*_=line.split('\t');add(en,zh,'monster' if 'monster-names' in source else 'legacy-term','../'+source,str(n))
    for en,zh in load(ROOT/'scripts/import/regional-names.json',{}).items():add(en,zh,'proper','scripts/import/regional-names.json')
    for d in load(OUT/'decisions.json',{'entries':[]})['entries']:
        if d['category']=='proper':add(d['en'],d['zh'],'proper','terminology/decisions.json')
    selected=load(OUT/'settings-entities.json',{'entries':[]})['entries']
    for entity in selected:
        en=entity['en']; token=re.compile(r'(?<![A-Za-z])'+re.escape(en)+r'(?![A-Za-z])')
        for folder in entity['folders']:
            for p in sorted((ROOT/'src/published/books'/folder).glob('*.md')):
                for n,line in enumerate(p.read_text(encoding='utf-8-sig').splitlines(),1):
                    if not token.search(line):continue
                    add(en,en,'proper',p.relative_to(ROOT).as_posix(),str(n),untranslated=True)
                    for alias in entity.get('legacyZh',[]):add(en,alias,'proper',p.relative_to(ROOT).as_posix(),str(n))
                    # Read existing bilingual Chinese labels, without guessing words in prose.
                    label=re.search(r'^#{1,6}\s+([\u3400-\u9fff·]+)\s*[（(]?\s*'+re.escape(en)+r'(?![A-Za-z])',line)
                    if label:add(en,label[1],'proper',p.relative_to(ROOT).as_posix(),str(n))
    # A heading is not automatically a named entity. Link exact bilingual spell/monster
    # headings to known names, preserving uncertain chapter headings separately.
    known=defaultdict(list)
    for e in entries.values():
        if e['category'] not in ['heading','candidate','legacy-term']:known[norm(e['en'])].append(e)
    for k,e in list(entries.items()):
        matches=known[norm(e['en'])]
        if e['category'] in ['heading','candidate'] and len(matches)==1:
            dest=matches[0];dest['legacyZh'].update(e['legacyZh']);dest['englishVariants'].update(e['englishVariants']);dest['occurrences']+=e['occurrences'];del entries[k]
    refindex=defaultdict(list)
    for r in load(OUT/'references/5etools-names.json',{'records':[]})['records']:
        category=REFKINDS.get(r['category'],r['category']);refindex[key(category,r['en'])].append(r)
    for r in load(OUT/'references/huiji-names.json',{'records':[]})['records']:refindex[key(r['category'],r['en'])].append(r)
    selected_keys={key('proper',r['en']) for r in selected}
    for r in load(OUT/'references/setting-names.json',{'records':[]})['records']:
        if key('proper',r['en']) in selected_keys:refindex[key('proper',r['en'])].append(r)
    decisions=load(OUT/'decisions.json',{'entries':[]})['entries']
    manual={key(d['category'],d['en']):d for d in decisions}
    for e in entries.values():
        refs=refindex[e['key']]
        if e['category']=='monster':refs=[r for r in refs if not r.get('isNpc')]
        e['references']=refs
        if refs:
            rank={'3R':0,'5R':1,'5E':2}
            best=min(rank.get(r['edition'],9) for r in refs)
            options=sorted(set(r['zh'] for r in refs if rank.get(r['edition'],9)==best))
            if len(options)==1:
                e['zh']=options[0];e['status']='verified-exact';e['notes'].append('英文仅正规化大小写、空白、弯引号及横线；名称据源数据核对，规则仍为1e。')
            else:e['status']='reference-conflict';e['notes'].append('同优先级来源译名有分歧，等待人工裁定：'+' / '.join(options))
        if e['key'] in manual:
            d=manual[e['key']]
            # A later-edition adaptation cannot override an exact 3R name.
            if d.get('userOverride') or not (e['status']=='verified-exact' and any(r['edition']=='3R' for r in refs) and d['status'].startswith('adapted')):
                e['zh']=d['zh'];e['status']=d['status'];e['references']+=d.get('references',[]);e['notes'].append(d['reason']);e['verificationScope']=d.get('verificationScope','whole-name')
        e['englishVariants']=sorted(e['englishVariants']);e['legacyZh']=sorted(e['legacyZh']-{e['zh']})
    result={'schemaVersion':1,'accessed':DATE,'policy':'3R > 5R > 5E (user preference); names only, never rule equivalence. Unverified entries retain project translations.','scannedFiles':file_count,'entries':sorted(entries.values(),key=lambda e:e['key'])}
    write(OUT/'catalog.json',result)
    write(OUT/'reports/pending.json',[e for e in result['entries'] if e['status']=='pending'])
    write(OUT/'reports/conflicts.json',[e for e in result['entries'] if e['status']=='reference-conflict' or len(e['legacyZh'])>1])
    candidates=[]
    possible=defaultdict(dict)
    for rk,rs in refindex.items():
        if rs:possible[rk.split(':',1)[0]][norm(rs[0]['en'])]=rs[0]
    for e in result['entries']:
        if e['status']!='pending' or not e['activeIds']:continue
        nearby=[]
        options=possible[e['category']]
        for match in get_close_matches(norm(e['en']),options,n=3,cutoff=0.78):
            r=options[match];score=SequenceMatcher(None,norm(e['en']),match).ratio()
            nearby.append({'en':r['en'],'zh':r['zh'],'similarity':round(score,3),'url':r['url']})
        if nearby:candidates.append({'key':e['key'],'en':e['en'],'currentZh':e['zh'],'candidates':sorted(nearby,key=lambda r:-r['similarity'])[:3],'action':'review-only; never automatically merge plurals, word order or omitted name elements'})
    write(OUT/'reports/near-matches.json',candidates)
    with (OUT/'names.tsv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.writer(stream,delimiter='\t');writer.writerow(['category','English','Chinese','status','verificationScope','oldChinese','EnglishVariants','editions','sourceURLs','accessed'])
        for e in result['entries']:writer.writerow([e['category'],e['en'],e['zh'],e['status'],e.get('verificationScope','whole-name' if e['status']=='verified-exact' else 'pending'),'; '.join(e['legacyZh']),'; '.join(e['englishVariants']),'; '.join(sorted(set(r['edition'] for r in e['references']))),'; '.join(sorted(set(r['url'] for r in e['references']))),DATE if e['references'] else ''])
    print(json.dumps({'scannedFiles':file_count,'entries':len(entries),'status':dict(Counter(e['status'] for e in entries.values()))},ensure_ascii=False))
    return result

def replacement_plan(catalog):
    approved=[e for e in catalog['entries'] if e['status'].startswith(('verified','adapted')) and e['category'] not in ['heading','legacy-term','candidate']]
    owners=defaultdict(set);targets=defaultdict(set)
    for e in catalog['entries']:
        for zh in [e['zh']]+e['legacyZh']:owners[zh].add(e['key'])
    for e in approved:
        for old in e['legacyZh']:targets[old].add(e['zh'])
    replacements={};blocked=[]
    proper_aliases={old for e in approved if e['category'] in ['proper','class'] for old in e['legacyZh']}
    for old,values in targets.items():
        other_targets={e['zh'] for e in catalog['entries'] if e['key'] in owners[old] and e not in approved}
        # A former label can be another entity's CURRENT canonical label (e.g.
        # Raise Dead / Resurrection). Never rewrite those references globally.
        other_targets|={e['zh'] for e in catalog['entries'] if e['zh']==old}
        if len(values)!=1 or (other_targets-values) or len(old)<(2 if old in proper_aliases else 3) or not re.fullmatch('[\u3400-\u9fff·]+',old):
            blocked.append({'old':old,'targets':sorted(values),'reason':'ambiguous, short/generic, or mixed-language name; contextual replacement only'});continue
        replacements[old]=next(iter(values))
    # Protect canonical and longer known names against substring damage and repeat suffixes.
    old_pattern=re.compile('|'.join(map(re.escape,sorted(replacements,key=len,reverse=True)))) if replacements else re.compile(r'(?!)')
    protected={e['zh'] for e in approved if e['zh'] not in replacements and old_pattern.search(e['zh'])}
    protected|={v for v in replacements.values()}
    protected|={d['annotation'] for d in load(OUT/'decisions.json',{'entries':[]})['entries'] if d.get('annotation')}
    tokens=sorted(set(replacements)|protected,key=lambda s:(-len(s),s))
    pattern=re.compile('|'.join(map(re.escape,tokens))) if tokens else re.compile(r'(?!)')
    return replacements,pattern,blocked

def apply(catalog,do_apply=False):
    replacements,pattern,blocked=replacement_plan(catalog)
    entries=catalog['entries'];by_key={e['key']:e for e in entries if e['status'].startswith(('verified','adapted'))}
    changes=[]
    def substitute(s):
        for _ in range(5):
            updated=pattern.sub(lambda m:replacements.get(m[0],m[0]),s)
            if updated==s:return s
            s=updated
        raise ValueError('Replacement chain did not converge; review conflicting aliases.')
    # Bilingual labels disambiguate short and colliding Chinese names. The English
    # phrase must match in full (not Hold Person within Hold Person or Mammal).
    bilingual=defaultdict(list)
    for e in by_key.values():
        if e['category'] in ['heading','candidate','legacy-term']:continue
        for old in e['legacyZh']:
            for en in e['englishVariants']:
                en_pattern=re.escape(en).replace("'","['’]")
                bilingual[old].append((re.compile(r'\s*[（(]?\s*\*{0,2}'+en_pattern+r'(?![A-Za-z\'’]|\s+[A-Za-z])',re.I),e['zh']))
    bilingual_pattern=re.compile(r'(?<![\u3400-\u9fff])(?:'+'|'.join(map(re.escape,sorted(bilingual,key=len,reverse=True)))+')') if bilingual else re.compile(r'(?!)')
    def contextual(s):
        def replace(m):
            for pat,zh in bilingual[m[0]]:
                if pat.match(s,m.end()):return zh
            return m[0]
        s=bilingual_pattern.sub(replace,s)
        return substitute(s)
    selected=load(OUT/'settings-entities.json',{'entries':[]})['entries']
    def label_english(s,folder):
        for choice in selected:
            e=by_key.get(key('proper',choice['en']))
            if folder not in choice['folders'] or not e or not re.fullmatch('[\u3400-\u9fff·]+',e['zh']):continue
            pat=re.compile(r'(?<![A-Za-z])'+re.escape(choice['en'])+r'(?![A-Za-z]|\s+[A-Za-z])')
            labels=[e['zh']]+[x for x in e['legacyZh'] if re.search('[\u3400-\u9fff]',x)]
            def expand(m):
                prefix=s[:m.start()]; line=prefix.rsplit('\n',1)[-1]
                if not re.search('[\u3400-\u9fff]',line) and not re.match(r'^#{1,6}\s*$',line):return m[0]
                if any(re.search(re.escape(label)+r'\s*[（(]?\s*$',prefix) for label in labels):return m[0]
                if re.search(r'(?:^|[；;|])\s*[\u3400-\u9fff·]{2,}\s*[（(]?\s*$',line):return m[0]
                # English sentences, possessives and longer compound names need review.
                if re.search(r'[A-Za-z]\s+$',prefix) or s[m.end():m.end()+2] in ["'s",'’s']:return m[0]
                return e['zh']+'（'+m[0]+'）'
            s=pat.sub(expand,s)
        return s
    # Never touch stable IDs, URLs, original English, or source attribution fields.
    immutable={'id','slug','href','url','src','sourceFile','nameEn','titleEn','book','section','original','english','en','source','sourceTitle','sourceLabel'}
    def transform(obj,category):
        if isinstance(obj,list):return [transform(v,category) for v in obj]
        if not isinstance(obj,dict):return contextual(obj) if isinstance(obj,str) else obj
        out={k:v if k in immutable else transform(v,category) for k,v in obj.items()}
        if obj.get('nameEn') and obj.get('nameZh'):
            e=by_key.get(key(category,obj['nameEn']))
            if e:out['nameZh']=e['zh']
        return out
    for p in paths():
        before=p.read_text(encoding='utf-8-sig');rel=p.relative_to(ROOT).as_posix()
        category=next((v for k,v in KINDS.items() if k.rstrip('s') in p.name),'candidate')
        if p.name.startswith(('class-','classes')):category='class'
        if p.name.startswith(('race-','races')):category='race'
        after=before
        if p.suffix=='.json':
            obj=load(p);nextobj=transform(obj,category)
            if nextobj!=obj:
                after=(json.dumps(nextobj,ensure_ascii=False,separators=(',',':')) if before.count('\n')<5 else json.dumps(nextobj,ensure_ascii=False,indent=2))+'\n'
        else:
            # Split HTML tags and markdown destinations so visible text changes but links/anchors do not.
            parts=re.split(r'(<[^>]*>|\]\([^\n)]*\))',before)
            for i in range(0,len(parts),2):
                parts[i]=contextual(parts[i])
                if p.suffix=='.md' and p.parent.parent.name=='books':parts[i]=label_english(parts[i],p.parent.name)
            after=''.join(parts)
            if p.suffix=='.ts':
                def namefield(m):
                    e=by_key.get(key(category,m['en'].replace("\\'","'")))
                    return m[0] if not e else m[0].replace(m['zh'],e['zh'],1)
                after=re.sub(r"nameZh:\s*(?P<q>['\"])(?P<zh>.*?)(?P=q),\s*nameEn:\s*(?P<r>['\"])(?P<en>(?:\\.|(?!(?P=r)).)*)(?P=r)",namefield,after)
        if after!=before:
            changes.append({'path':rel,'beforeSha256':hashlib.sha256(before.encode()).hexdigest(),'afterSha256':hashlib.sha256(after.encode()).hexdigest()})
            if do_apply:p.write_text(after,encoding='utf-8')
    write(OUT/'reports'/('last-application.json' if do_apply else 'drift.json'),{'files':len(changes),'changes':changes,'globalReplacements':replacements,'contextOnly':blocked})
    # Keep a bounded excerpt but every affected book/line for human context review.
    aliases={r['old'] for r in blocked if len(r['old'])>=2}
    remaining=[]
    alias_pattern=re.compile('|'.join(map(re.escape,sorted(aliases,key=len,reverse=True)))) if aliases else re.compile(r'(?!)')
    for p in sorted((ROOT/'src/published/books').glob('*/*.md')):
        for line,text in enumerate(p.read_text(encoding='utf-8-sig').splitlines(),1):
            for old in sorted(set(alias_pattern.findall(text))):remaining.append({'alias':old,'path':p.relative_to(ROOT).as_posix(),'line':line,'excerpt':text[:220],'status':'context-review; a surviving generic word is not necessarily an incorrect name'})
    write(OUT/'reports/context-review.json',remaining)
    # Small browser-safe lookup supports old-name searches and stored character labels.
    runtime=[]
    for e in entries:
        if e['category'] in ['heading','candidate','legacy-term']:continue
        runtime.append({'category':e['category'],'en':e['en'],'zh':e['zh'],'aliases':e['legacyZh'],'status':e['status'],'ids':e['activeIds']})
    write(ROOT/'src/data/terminology/names.json',runtime)
    print(('Applied' if do_apply else 'Found')+f' terminology changes in {len(changes)} files; {len(blocked)} names require contextual handling.')
    return len(changes)

def sync_parent():
    destination=ROOT.parent/'translation/names'
    destination.mkdir(parents=True,exist_ok=True)
    shutil.copytree(OUT,destination,dirs_exist_ok=True)
    print('Synced complete table and evidence to '+str(destination))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--inventory',action='store_true');parser.add_argument('--apply',action='store_true');parser.add_argument('--check',action='store_true');parser.add_argument('--export-parent',action='store_true');args=parser.parse_args()
    catalog=inventory() if args.inventory else load(OUT/'catalog.json')
    if not catalog:raise SystemExit('Run export-library.ts, then --inventory first.')
    drift=apply(catalog,args.apply)
    if args.export_parent:sync_parent()
    if args.check and drift:raise SystemExit(1)
