"""Read setting name pairs, keeping rules out of the retained evidence."""
from pathlib import Path
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
import hashlib, json, re

ROOT=Path(__file__).resolve().parents[2]
DATE=datetime.now(timezone(timedelta(hours=8))).date().isoformat()
BASE='https://5e.kiwee.top/'
ORIGINAL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/'
SOURCES=[('data/book/book-scag.json','SCAG','FR'),('data/book/book-frhof.json','FRHoF','FR'),('data/adventure/adventure-fraif.json','FRAiF','FR'),('data/book/book-xdmg.json','XDMG','Greyhawk'),('data/adventure/adventure-dsotdq.json','DSotDQ','Dragonlance')]

def fetch(url):
    raw=urlopen(Request(url,headers={'User-Agent':'ADND1e-Terminology/1.0'}),timeout=45).read()
    return raw,json.loads(raw.decode('utf-8-sig'))

def walk(obj,loc=''):
    if isinstance(obj,dict):
        yield obj,loc
        for k,v in obj.items():yield from walk(v,loc+'/'+k)
    elif isinstance(obj,list):
        for i,v in enumerate(obj):yield from walk(v,loc+'/'+str(i))

def main():
    records=[];sources=[];errors=[]
    def read(source):
        path,code,world=source
        try:return source,fetch(BASE+path),None
        except Exception as e:return source,None,str(e)
    for (path,code,world),result,error in ThreadPoolExecutor(max_workers=5).map(read,SOURCES):
        if error:errors.append({'url':BASE+path,'error':error});continue
        raw,obj=result
        sources.append({'url':BASE+path,'accessed':DATE,'sha256':hashlib.sha256(raw).hexdigest()})
        def record(en,zh,loc,page=None,**extra):
            if not re.search('[\u3400-\u9fff]',zh):return
            records.append({'category':'proper','en':en,'zh':zh,'world':world,'edition':'5R' if code in ['XDMG','FRHoF','FRAiF'] else '5E','source':code,'page':page,'url':BASE+path,'location':loc,'accessed':DATE,**extra})
        for node,loc in walk(obj):
            if node.get('ENG_name') and node.get('name'):
                record(node['ENG_name'],node['name'],loc,node.get('page'),evidenceType='explicit-name-pair')
        # Greyhawk's countries are table cells rather than bilingual headings.
        # Match the same stable parent ID and row number in the original dataset.
        if code=='XDMG':
            try:
                original_raw,original=fetch(ORIGINAL+path)
                sources.append({'url':ORIGINAL+path,'accessed':DATE,'sha256':hashlib.sha256(original_raw).hexdigest()})
                ids={n['id']:n for n,_ in walk(original) if n.get('id')}
                for node,loc in walk(obj):
                    if node.get('id') not in ['340','349','351','35a','364']:continue
                    old=ids[node['id']]
                    a=[v for v in old['entries'] if isinstance(v,dict) and v.get('type')=='table'][0]
                    b=[v for v in node['entries'] if isinstance(v,dict) and v.get('type')=='table'][0]
                    if len(a['rows'])!=len(b['rows']):raise ValueError('Country table row counts differ')
                    for i,(enrow,zhrow) in enumerate(zip(a['rows'],b['rows'])):
                        record(enrow[0],zhrow[0],loc+'/table/rows/'+str(i)+'/0',node.get('page'),englishUrl=ORIGINAL+path,parentId=node['id'],evidenceType='aligned-country-table-cell')
            except Exception as e:errors.append({'url':ORIGINAL+path,'error':str(e)})
    output={'accessed':DATE,'policy':'Name pairs and country table labels only. Selection for use is separately curated; headings are not automatically proper nouns.','sources':sources,'errors':errors,'records':records}
    (ROOT/'terminology/references/setting-names.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'records':len(records),'sources':len(sources),'errors':errors},ensure_ascii=False))

if __name__=='__main__':main()
