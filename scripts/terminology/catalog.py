"""Inventory names, match evidenced references, and audit/apply reviewed decisions.

No plural/word-order/name-author removal is allowed in automatic matching.
The inventory contains candidates, not a claim of complete human verification.
"""
from pathlib import Path
from collections import defaultdict, Counter
import argparse, csv, hashlib, html, json, re, shutil, unicodedata
from difflib import SequenceMatcher, get_close_matches
from datetime import datetime, timezone, timedelta
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'terminology'
DATE = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
KINDS = {'spells':'spell','items':'item','monsters':'monster','classes':'class','races':'race'}
REFKINDS = {'baseitem':'item','subrace':'race','deity':'proper','book':'book'}
SETTING_REFERENCE_CATEGORY = 'setting-reference'

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
        prev=previous.get(k,{})
        if k not in entries:
            current=prev.get('zh',zh) if prev.get('status','').startswith(('verified','adapted')) else zh
            entries[k]={'key':k,'category':category,'en':en,'zh':current,'englishVariants':set(prev.get('englishVariants',[])), 'legacyZh':set(prev.get('legacyZh',[])),'occurrences':[], 'activeIds':[], 'status':'pending','references':[],'notes':[]}
        e=entries[k];e['englishVariants'].add(en);e['legacyZh'].add(zh)
        if (prev.get('status','').startswith(('verified','adapted'))
                and prev.get('zh') and prev['zh'] != zh):
            # Keep the previously approved canonical label searchable when a
            # reviewed source correction changes it.
            e['legacyZh'].add(prev['zh'])
        occurrence={'path':path,'location':location,'zh':zh}
        if occurrence not in e['occurrences']:e['occurrences'].append(occurrence)
        if active and id and id not in e['activeIds']:e['activeIds'].append(id)
    source_drafts=load(OUT/'source-draft-candidates.json',{'entries':[]})['entries']
    for index,draft in enumerate(source_drafts,1):
        add(draft['en'],draft['zh'],draft['category'],'terminology/source-draft-candidates.json',str(index))
    try:
        library_path=subprocess.check_output(['git','rev-parse','--git-path','terminology/library.json'],cwd=ROOT,text=True).strip()
        library_path=Path(library_path)
        if not library_path.is_absolute():library_path=ROOT/library_path
    except (subprocess.CalledProcessError,FileNotFoundError):
        library_path=ROOT/'.git/terminology/library.json'
    library=load(library_path,{})
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
                ordinal=re.match(r'(?P<zh>[\u3400-\u9fff·]+)\s+(?P<level>VII|VI|V|IV|III|II|I|X)\s+(?P<en>[A-Za-z][A-Za-z0-9 ,’\'\-/:&().+]+?)(?:[（]|$)',clean)
                if ordinal and ordinal['en'].rstrip().endswith(' '+ordinal['level']):
                    add(ordinal['en'].rstrip(),ordinal['zh']+' '+ordinal['level'],'heading',rel,str(n))
                else:
                    m=re.match(r'(?P<zh>[^A-Za-z]+?)\s+(?P<en>[A-Za-z][A-Za-z0-9 ,’\'\-/:&().+]+?)(?:[（（]|$)',clean)
                    if m:add(m['en'].rstrip(' ('),m['zh'].strip(' （('),'heading',rel,str(n))
                if not ordinal and re.fullmatch(r'[A-Za-z][A-Za-z0-9 ,’\'\-/:&().+]+',clean):
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
    rule_catalog={}
    rule_source=OUT/'rule-terms.tsv'
    rule_rows=[]
    if rule_source.exists():
        with rule_source.open(encoding='utf-8-sig',newline='') as stream:
            rule_rows=list(csv.DictReader(stream,delimiter='\t'))
    rule_english={norm(row['English']) for row in rule_rows}
    # Index explicit bilingual entries from both maintained DMG glossary files.
    # They are useful 1E name evidence; definitions remain contextual evidence,
    # not automatic claims that the related rule mechanism was audited.
    glossary_candidates=defaultdict(list)
    glossary_sources=[
        (ROOT/'src/published/books/dmg/dmg-glossary.md','DMG translated glossary'),
        (ROOT/'src/published/books/dmg/glossary-2.md','AD&D 1E curated glossary'),
    ]
    for glossary_path,glossary_source in glossary_sources:
      for line_number,line in enumerate(glossary_path.read_text(encoding='utf-8-sig').splitlines(),1):
        if not line.startswith('|') or line.startswith('|---'):continue
        cell=line.strip('|').split('|',1)[0].strip()
        first_english=re.search('[A-Za-z]',cell)
        if not first_english:continue
        zh=cell[:first_english.start()].strip();en=cell[first_english.start():].strip()
        if not zh:continue
        # Parenthetical stat abbreviations are lookup aliases, not part of the
        # English headword. Keep the abbreviation in the glossary itself.
        en=re.sub(r'[（(](?:AC|HD|HP|XP|MU|M-U|THAC0|DM|NPC|PC|WIS|WS)[）)]$','',en).strip()
        zh_parts=[part.strip() for part in zh.split('／')]
        en_parts=[part.strip() for part in en.split('／')]
        pairs=[]
        if len(zh_parts)>1 and len(en_parts)>1:
            suffix=''
            if zh_parts[-1].endswith('豁免'):
                zh_parts[-1]=zh_parts[-1][:-2]
                suffix='豁免'
            if len(zh_parts)==len(en_parts):
                save_prefix=en_parts[0].split(' ',2)[:2] if en_parts[0].startswith('Save vs.') else []
                for index,(zh_part,en_part) in enumerate(zip(zh_parts,en_parts)):
                    if index and save_prefix and not en_part.startswith('Save vs.'):
                        en_part=' '.join(save_prefix+[en_part])
                    pairs.append((en_part,zh_part+suffix))
            elif en_parts[0].startswith('Save vs.') and len(zh_parts)==len(en_parts)+1:
                pairs.append((en_parts[0],zh_parts[0]+suffix))
                pairs.append((en_parts[0],zh_parts[1]+suffix))
                for zh_part,en_part in zip(zh_parts[2:],en_parts[1:]):
                    pairs.append((en_part if en_part.startswith('Save vs.') else 'Save vs. '+en_part,zh_part+suffix))
            else:continue
        else:
            for en_part in en_parts:
                pairs.append((en_part,zh_parts[0]))
        for term_en,term_zh in pairs:
            if not term_en or not term_zh or not re.search(r'[\u3400-\u9fff]',term_zh):continue
            evidence={'edition':'1E','source':glossary_source,'en':term_en,'zh':term_zh,
                'url':f"{glossary_path.relative_to(ROOT).as_posix()}#{line_number}"}
            glossary_candidates[norm(term_en)].append({'en':term_en,'zh':term_zh,'path':glossary_path.relative_to(ROOT).as_posix(),
                'line':line_number,'reference':evidence})
    glossary_decisions={}
    glossary_category_priority={'rule':0,'class':1,'monster':2,'item':3,'spell':4,'race':5,'proper':6}
    for candidate_rows in glossary_candidates.values():
        en=candidate_rows[0]['en']
        translations=sorted({row['zh'] for row in candidate_rows})
        contextual=len(translations)>1
        zh='／'.join(translations) if contextual else translations[0]
        matches=[e for e in entries.values() if norm(e['en'])==norm(en) and e['occurrences'] and e['category'] not in ['heading','candidate','legacy-term']]
        category='glossary-context' if contextual else 'rule' if norm(en) in rule_english else min((e['category'] for e in matches),key=lambda value:glossary_category_priority.get(value,9)) if matches else 'glossary-term'
        for row in candidate_rows:add(en,row['zh'],category,row['path'],str(row['line']))
        glossary_key=key(category,en)
        glossary_decisions[glossary_key]={'en':en,'zh':zh,'status':'reference-conflict' if contextual else 'verified-exact',
            'verificationScope':'1e-glossary-context' if contextual else '1e-glossary-label',
            'reason':'同一英文词头在术语表中对应多个中文语境，保留冲突供人工区分。' if contextual else 'AD&D 1E 术语表提供明确中英名称对照；此证据只核定术语名称，不替代对规则机制的审查。',
            'references':[row['reference'] for row in candidate_rows],'userOverride':False}
    for n,row in enumerate(rule_rows,2):
        add(row['English'],row['Chinese'],'rule',rule_source.relative_to(ROOT).as_posix(),str(n))
        rule_catalog[key('rule',row['English'])]=row
    # A small number of creature-category labels (e.g. Humanoid, Undead) were
    # historically stored in monster-names.tsv as well as the reviewed rule
    # lexicon. Keep the source occurrence for audit, but expose one canonical
    # lookup record when both English and Chinese labels match exactly.
    for rule_key,row in rule_catalog.items():
        monster_key=key('monster',row['English'])
        if monster_key not in entries or rule_key not in entries:continue
        legacy=entries[monster_key];rule=entries[rule_key]
        if norm(legacy['zh'])!=norm(rule['zh']):continue
        rule['legacyZh'].update(legacy['legacyZh'])
        rule['englishVariants'].update(legacy['englishVariants'])
        for occurrence in legacy['occurrences']:
            if occurrence not in rule['occurrences']:rule['occurrences'].append(occurrence)
        del entries[monster_key]
    for en,zh in load(ROOT/'scripts/import/regional-names.json',{}).items():add(en,zh,'proper','scripts/import/regional-names.json')
    for d in load(OUT/'decisions.json',{'entries':[]})['entries']:
        # Reviewed source names may be absent from the playable library. Newly
        # inventoried non-race/language categories opt in explicitly; later-
        # edition references alone must never seed them into the 1E catalog.
        has_1e_source=any(r.get('edition')=='1E' for r in d.get('references',[]))
        reviewed_inventory=d.get('sourceInventory') and d.get('status') in ['verified-exact','adapted-variant']
        if d['category']=='proper' or (has_1e_source and (d['category'] in ['race','language'] or reviewed_inventory)):
            add(d['en'],d['zh'],d['category'],'terminology/decisions.json')
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
    explicit_aliases=defaultdict(set)
    protected_heading_names=set()
    for decision in load(OUT/'decisions.json',{'entries':[]})['entries']:
        if decision.get('status') not in ['verified-exact','adapted-variant']:continue
        if decision.get('preserveUnclassifiedHeadings'):
            # A generic material such as Water does not identify an unrelated
            # abbreviated item heading with the same English spelling.
            protected_heading_names.update(norm(v) for v in
                [decision['en']]+decision.get('englishVariants',[]))
        # Dwarven/Elven can denote languages or racial adjectives. Expose their
        # language aliases for lookup, but do not reclassify headings by them.
        if decision['category']=='language':continue
        explicit_aliases[key(decision['category'],decision['en'])].update(
            norm(alias) for alias in decision.get('englishVariants',[]))
    known=defaultdict(list)
    for e in entries.values():
        if e['category'] not in ['heading','candidate','legacy-term']:
            # Explicit reviewed aliases only: do not guess plurals or resolve
            # homonyms when more than one sense/category shares an alias.
            aliases={norm(e['en'])}
            aliases.update(explicit_aliases[e['key']])
            for alias in aliases:known[alias].append(e)
    for k,e in list(entries.items()):
        matches=known[norm(e['en'])]
        if (e['category'] in ['heading','candidate'] and len(matches)==1
                and norm(e['en']) not in protected_heading_names):
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
    for k,row in rule_catalog.items():
        supplemental=manual.get(k,{})
        merged={'en':row['English'],'zh':row['Chinese'],'status':row['status'],'verificationScope':row['verificationScope'],
                'reason':f"规则术语主表；证据：{row['evidence']}。项目术语对应已记录；未标为已核的条目继续待核。",
                'references':[{'edition':'1E','en':row['English'],'zh':row['Chinese'],'url':row['evidence']}], 'userOverride':False}
        for field in ('references','legacyZh','englishVariants'):
            for value in supplemental.get(field,[]):
                if value not in merged.setdefault(field,[]):merged[field].append(value)
        if supplemental.get('reason'):
            merged['reason'] += ' ' + supplemental['reason']
        manual[k]=merged
    for k,d in glossary_decisions.items():
        if k in manual:
            for reference in d['references']:
                if reference not in manual[k].setdefault('references',[]):manual[k]['references'].append(reference)
        else:manual[k]=d
    for d in source_drafts:
        k=key(d['category'],d['en'])
        if k not in manual:manual[k]=d
    for e in entries.values():
        decision=manual.get(e['key'])
        if decision:
            e['legacyZh'].update(decision.get('legacyZh',[]))
            e['englishVariants'].update(decision.get('englishVariants',[]))
        refs=refindex[e['key']]
        if e['category']=='monster':refs=[r for r in refs if not r.get('isNpc')]
        supplemental_decision=manual.get(e['key'],{})
        supplemental=supplemental_decision.get('references',[]) if supplemental_decision.get('rankSupplementalReferences') else []
        for reference in supplemental:
            if reference not in refs:refs.append(reference)
        e['references']=refs
        ranked_refs=[r for r in refs if r.get('edition') in {'3R','5E','5R'}]
        if ranked_refs:
            rank={'3R':0,'5E':1,'5R':2}
            best=min(rank[r['edition']] for r in ranked_refs)
            options=sorted(set(r['zh'] for r in ranked_refs if rank[r['edition']]==best))
            if len(options)==1:
                e['zh']=options[0];e['status']='verified-exact';e['notes'].append('英文仅正规化大小写、空白、弯引号及横线；名称据源数据核对，规则仍为1e。')
            else:e['status']='reference-conflict';e['notes'].append('同优先级来源译名有分歧，等待人工裁定：'+' / '.join(options))
        if e['key'] in manual:
            d=manual[e['key']]
            # Exact edition-name evidence follows the declared 3R > 5E > 5R
            # priority. A normal local decision is only a fallback; only an
            # explicit userOverride may supersede a matched edition record.
            if ranked_refs and not d.get('userOverride'):
                best_edition=min((r['edition'] for r in ranked_refs),key=lambda ed:{'3R':0,'5E':1,'5R':2}[ed])
                e['notes'].append(f'采用优先级最高的{best_edition}精确名称证据；普通人工译名记录不覆盖。')
                if d.get('verificationScope'):
                    e['verificationScope']=d['verificationScope']
                if d.get('reason') and d['reason'] not in e['notes']:
                    e['notes'].append(d['reason'])
                for reference in d.get('references',[]):
                    if reference not in e['references']:e['references'].append(reference)
            else:
                e['zh']=d['zh'];e['status']=d['status'];e['references']+=d.get('references',[]);e['notes'].append(d['reason']);e['verificationScope']=d.get('verificationScope','whole-name')
        e['englishVariants']=sorted(e['englishVariants']);e['legacyZh']=sorted(e['legacyZh']-{e['zh']})
    # Later-edition name banks are lookup evidence only. They may enrich a term
    # already found in AD&D 1E source material, but must never create standalone
    # dictionary entries for 3R/5E/5R-only terms.
    reference_rows=[]
    for r in load(OUT/'references/huiji-names.json',{'records':[]})['records']:
        reference_rows.append((key(r['category'],r['en']),r['category'],r['en'],r['zh'],r))
    for r in load(OUT/'references/5etools-names.json',{'records':[]})['records']:
        category=REFKINDS.get(r['category'],r['category'])
        reference_rows.append((key(category,r['en']),category,r['en'],r['zh'],r))
    for r in load(OUT/'references/setting-names.json',{'records':[]})['records']:
        scoped=f"{r.get('world','')}: {r['en']}"
        reference_rows.append((key(SETTING_REFERENCE_CATEGORY,scoped),SETTING_REFERENCE_CATEGORY,r['en'],r['zh'],r))
    for ref_key,category,en,zh,reference in reference_rows:
        if ref_key in entries:
            existing=entries[ref_key]
            if existing['status']=='reference-only':
                if reference not in existing['references']:existing['references'].append(reference)
                ranked_refs=[r for r in existing['references'] if r.get('edition') in {'3R','5E','5R'}]
                if ranked_refs:
                    rank={'3R':0,'5E':1,'5R':2}
                    best=min(rank[r['edition']] for r in ranked_refs)
                    options=sorted({r['zh'] for r in ranked_refs if rank[r['edition']]==best})
                    if len(options)==1:existing['zh']=options[0]
                    existing['status']='reference-only' if len(options)<=1 else 'reference-conflict'
            # Existing 1E entries already received exact-name evidence above.
            continue
        # No matching AD&D 1E corpus term: keep the reference in its source bank,
        # but do not add it to the wiki glossary or its public API.
    seen_sense_keys=set()
    for sense_record in load(OUT/'sense-notes.json',{'entries':[]})['entries']:
        sense_key=key(sense_record['category'],sense_record['en'])
        if sense_key in seen_sense_keys:
            raise ValueError(f"Duplicate sense record: {sense_key}")
        seen_sense_keys.add(sense_key)
        if sense_key not in entries:
            raise ValueError(f"Sense notes reference missing term: {sense_key}")
        senses=sense_record.get('senses')
        if not isinstance(senses,list) or not senses:
            raise ValueError(f"Sense record has no senses: {sense_key}")
        for sense in senses:
            if any(not isinstance(sense.get(field),str) or not sense[field].strip() for field in ('context','zh','meaning','source')):
                raise ValueError(f"Incomplete sense metadata: {sense_key}")
        entries[sense_key]['senses']=sense_record['senses']
    result={'schemaVersion':1,'accessed':DATE,'policy':'3R > 5E > 5R (user preference); names only, never rule equivalence. Unverified entries retain project translations. Homographic senses are annotated with context.','scannedFiles':file_count,'entries':sorted(entries.values(),key=lambda e:e['key'])}
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
        if e['status']=='reference-only':continue
        for zh in [e['zh']]+e['legacyZh']:owners[zh].add(e['key'])
    for e in approved:
        for old in e['legacyZh']:targets[old].add(e['zh'])
    replacements={};blocked=[]
    proper_aliases={old for e in approved if e['category'] in ['proper','class'] for old in e['legacyZh']}
    # These are ordinary Chinese phrases, not safe substring-level aliases.
    # Keep them searchable, but only replace when the matching English label is
    # present in context.
    contextual_only_aliases={'动物处理','动物驯养','动物处理熟练项','动物驯养熟练项'}
    for old,values in targets.items():
        other_targets={e['zh'] for e in catalog['entries'] if e['key'] in owners[old] and e not in approved}
        # A former label can be another entity's CURRENT canonical label (e.g.
        # Raise Dead / Resurrection). Never rewrite those references globally.
        other_targets|={e['zh'] for e in catalog['entries'] if e['zh']==old}
        if old in contextual_only_aliases or len(values)!=1 or (other_targets-values) or len(old)<(2 if old in proper_aliases else 3) or not re.fullmatch('[\u3400-\u9fff·]+',old):
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
        # Apply once against the original string. Re-scanning generated Chinese
        # can match a shorter alias inside a longer canonical translation.
        return pattern.sub(lambda m:replacements.get(m[0],m[0]),s)
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
        if e['category'] in ['heading','candidate','legacy-term'] or not e['status'].startswith(('verified','adapted')):continue
        runtime.append({'category':e['category'],'en':e['en'],'zh':e['zh'],'aliases':e['legacyZh'],'status':e['status'],'ids':e['activeIds'],
            'references':[{'edition':r.get('edition'),'world':r.get('world'),'source':r.get('source'),'page':r.get('page')} for r in e['references']]})
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
