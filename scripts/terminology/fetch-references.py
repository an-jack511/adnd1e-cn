"""Refresh name-only references. Never import another edition's rule text."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from urllib.parse import quote
import json, hashlib
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'terminology/references'
DATE = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
BASE = 'https://5e.kiwee.top/'

def fetch(path):
    url = BASE + path
    data = urlopen(Request(url, headers={'User-Agent': 'ADND1e-Terminology/1.0'}), timeout=45).read()
    return path, data, json.loads(data.decode('utf-8-sig'))

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = fetch('data/spells/index.json')[2]
    paths = ['data/spells/' + p for p in index.values()]
    paths += ['data/items.json', 'data/items-base.json', 'data/races.json', 'data/deities.json', 'data/books.json']
    paths += ['data/bestiary/bestiary-' + x + '.json' for x in ['xmm','mm','mpmm','mtf','vgm']]
    paths += ['data/class/class-' + x + '.json' for x in ['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','wizard']]
    records, sources, errors = [], [], []
    def safe(path):
        try: return fetch(path)
        except Exception as e: return path, None, str(e)
    with ThreadPoolExecutor(max_workers=6) as pool:
        for path, data, obj in pool.map(safe, paths):
            if data is None:
                errors.append({'url':BASE+path,'error':obj}); continue
            count = 0
            for kind in ['spell','item','baseitem','monster','race','subrace','class','deity','book']:
                for entry in obj.get(kind, []):
                    en, zh = entry.get('ENG_name'), entry.get('name')
                    if not en or not zh or en == zh: continue
                    source = entry.get('source', entry.get('id',''))
                    edition = '5R' if source in ['XPHB','XDMG','XMM','FRHoF','FRBiF','EFA'] else '5E'
                    page = {'spell':'spells','item':'items','baseitem':'items','monster':'bestiary','race':'races','subrace':'races','class':'classes','deity':'deities','book':'books'}[kind]
                    records.append({'en':en,'zh':zh,'category':kind,'edition':edition,'source':source,'page':entry.get('page'),'url':BASE+path,'entryUrl':BASE+page+'.html#'+quote(zh.lower(),safe='')+'_'+quote(source.lower(),safe=''),'accessed':DATE})
                    count += 1
            sources.append({'url':BASE+path,'accessed':DATE,'sha256':hashlib.sha256(data).hexdigest(),'nameRecords':count})
    output = {'accessed':DATE,'policy':'Name pairs only; no later-edition rule text. Exact English names remain separate from aliases.','sources':sources,'errors':errors,'records':records}
    (OUT/'5etools-names.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'records':len(records),'sources':len(sources),'errors':errors},ensure_ascii=False))

if __name__ == '__main__': main()
