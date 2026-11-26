"""Download resumable reference snapshots, then search names without networking.

Raw later-edition JSON stays in a local cache, outside the published 1E corpus.
Only explicit bilingual name fields are indexed. A match still needs sense review.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import sys
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
REFS = ROOT / 'terminology/references'
DEFAULT_CACHE = ROOT.parent / 'tmp/terminology-reference-cache'
BASE = 'https://5e.kiwee.top/'
REFERENCE_FILES = ('huiji-names.json', '5etools-names.json', 'setting-names.json')
REVISION_SOURCES = {'XPHB', 'XDMG', 'XMM', 'FRHoF', 'FRAiF', 'EFA'}


def norm(value):
    return re.sub(r'\s+', ' ', value.replace('’', "'")).strip().casefold()


def read(path, fallback=None):
    return json.loads(path.read_text(encoding='utf-8-sig')) if path.exists() else fallback


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def fetch_all(cache, refresh=False, workers=6):
    manifest_path = cache / 'manifest.json'
    manifest = read(manifest_path, {'schemaVersion': 1, 'sources': {}})
    sources = manifest['sources']

    def fetch(url):
        previous = sources.get(url, {})
        if not refresh and previous.get('httpStatus') in (403, 404):
            return url, previous, previous.get('error')
        if not refresh and previous.get('path'):
            path = cache / previous['path']
            if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == previous.get('sha256'):
                return url, previous, None
        now = datetime.now(timezone.utc).isoformat()
        try:
            with urlopen(Request(url, headers={'User-Agent': 'ADND1e-Terminology/1.0'}), timeout=60) as response:
                raw = response.read()
            obj = json.loads(raw.decode('utf-8-sig'))
            # A JSON API error is not a successful database export.
            if isinstance(obj, dict) and obj.get('error'):
                raise ValueError(str(obj['error']))
            digest = hashlib.sha256(raw).hexdigest()
            path = cache / 'objects' / (digest + '.json')
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                path.write_bytes(raw)
            result = {'url': url, 'path': path.relative_to(cache).as_posix(),
                      'sha256': digest, 'bytes': len(raw), 'downloadedAt': now,
                      'status': 'downloaded'}
            return url, result, None
        except Exception as error:
            failure = {'url': url, 'lastAttempt': now, 'error': str(error),
                       'status': 'unavailable', 'httpStatus': error.code if isinstance(error, HTTPError) else None}
            if previous.get('path'):
                failure = {**previous, **failure, 'status': 'cached-refresh-failed'}
            return url, failure, str(error)

    def batch(urls):
        urls = sorted(set(urls))
        failures = 0
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(fetch, url) for url in urls]
            for count, future in enumerate(as_completed(futures), 1):
                url, result, error = future.result()
                sources[url] = result
                failures += bool(error)
                if count % 25 == 0 or count == len(urls):
                    write(manifest_path, manifest)
                    print(json.dumps({'processed': count, 'batch': len(urls), 'failed': failures}), flush=True)

    indexes = ['data/books.json', 'data/adventures.json', 'data/spells/index.json',
               'data/bestiary/index.json', 'data/class/index.json']
    batch([BASE + path for path in indexes])
    urls = set()
    for filename in REFERENCE_FILES:
        for source in read(REFS / filename, {}).get('sources', []):
            if source['url'].startswith(BASE):
                urls.add(source['url'])
    for group, field in [('books', 'book'), ('adventures', 'adventure')]:
        entry = sources.get(BASE + f'data/{group}.json', {})
        if entry.get('path'):
            for book in read(cache / entry['path']).get(field, []):
                code = book.get('id')
                if code:
                    urls.add(BASE + f'data/{field}/{field}-{quote(code.lower(), safe="")}.json')
    for group in ('spells', 'bestiary', 'class'):
        entry = sources.get(BASE + f'data/{group}/index.json', {})
        if entry.get('path'):
            for path in read(cache / entry['path']).values():
                if isinstance(path, str):
                    urls.add(BASE + f'data/{group}/' + quote(path, safe='/-._'))
    # Public 3R endpoints: record access limits; no login or access-control bypass.
    title = quote('Data:数据库目录.json')
    urls.update([
        'https://dnd3r.huijiwiki.com/api.php?action=query&format=json&prop=revisions&rvprop=content&titles=' + title,
        'https://dnd3r.huijiwiki.com/index.php?title=' + title + '&action=raw',
    ])
    batch(urls)
    manifest['coverage'] = {
        '5E/5R': 'Available indexed books/adventures, spell/bestiary/class indexes and existing reference-source JSON. Not a complete website mirror.',
        '3R': 'Existing curated name evidence; full database only if public export succeeded. HTTP errors remain explicit.',
    }
    write(manifest_path, manifest)


def walk(obj, location='', source='', page=None, category='heading-reference'):
    if isinstance(obj, dict):
        candidate_source = obj.get('source', source)
        if isinstance(candidate_source, str):
            source = candidate_source
        page = obj.get('page', page)
        en, zh = obj.get('ENG_name'), obj.get('name')
        if isinstance(en, str) and isinstance(zh, str) and en != zh and re.search('[\u3400-\u9fff]', zh):
            yield {'en': en, 'zh': zh, 'source': source, 'page': page,
                   'category': category, 'location': location,
                   'retrieval': 'downloaded explicit ENG_name/name fields; sense review required'}
        for key, value in obj.items():
            escaped = key.replace('~', '~0').replace('/', '~1')
            yield from walk(value, location + '/' + escaped, source, page,
                            key if not location else 'heading-reference')
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            yield from walk(value, location + '/' + str(index), source, page, category)


def build_index(cache):
    manifest = read(cache / 'manifest.json', {'sources': {}})
    cache.mkdir(parents=True, exist_ok=True)
    # Replace the database only after a complete successful rebuild.
    temporary = cache / 'names.new.sqlite3'
    editions = {}
    records = []
    for filename in REFERENCE_FILES:
        for record in read(REFS / filename, {}).get('records', []):
            records.append({**record, 'referenceFile': filename})
            if record.get('source') and record.get('edition') in ('5E', '5R', 'other'):
                editions[record['source']] = record['edition']
    canonical_sources = {source.casefold(): source for source in {*editions, *REVISION_SOURCES}}
    for url, entry in sorted(manifest['sources'].items()):
        if not entry.get('path') or not url.startswith(BASE):
            continue
        path = cache / entry['path']
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('Snapshot hash mismatch: ' + str(path))
        source_match = re.search(r'/data/(?:book|adventure)/(?:book|adventure)-([^/]+)\.json$', url)
        source_hint = source_match[1].upper() if source_match else ''
        for record in walk(read(path), source=source_hint):
            source = canonical_sources.get(record['source'].casefold(), record['source'])
            record['source'] = source
            edition = '5R' if source in REVISION_SOURCES else editions.get(source, 'unclassified')
            records.append({**record, 'edition': edition, 'url': url,
                            'snapshotSha256': entry['sha256'], 'accessed': entry['downloadedAt'][:10]})
    connection = sqlite3.connect(temporary)
    connection.execute('DROP TABLE IF EXISTS names')
    connection.execute('CREATE TABLE names (en_key TEXT, zh TEXT, edition TEXT, category TEXT, payload TEXT UNIQUE)')
    with connection:
        connection.executemany('INSERT OR IGNORE INTO names VALUES (?, ?, ?, ?, ?)',
            [(norm(r['en']), r['zh'], r.get('edition', 'unclassified'), r.get('category', 'candidate'),
              json.dumps(r, ensure_ascii=False, sort_keys=True)) for r in records])
        connection.execute('CREATE INDEX names_en ON names(en_key)')
        connection.execute('CREATE INDEX names_zh ON names(zh)')
    counts = dict(connection.execute('SELECT edition, count(*) FROM names GROUP BY edition'))
    count = connection.execute('SELECT count(*) FROM names').fetchone()[0]
    connection.close()
    temporary.replace(cache / 'names.sqlite3')
    summary = {'date': datetime.now(timezone.utc).isoformat(), 'records': count, 'editions': counts,
               'downloadedFiles': sum(bool(e.get('path')) for e in manifest['sources'].values()),
               'downloadedBytes': sum(e.get('bytes', 0) for e in manifest['sources'].values()),
               'errors': [{'url': u, 'error': e['error']} for u, e in manifest['sources'].items() if e.get('error')],
               'policy': 'Reference evidence only. Headings are not automatically terms. No result does not prove absence; 3R coverage remains partial.'}
    write(cache / 'summary.json', summary)
    print(json.dumps(summary, ensure_ascii=False), flush=True)


def lookup(cache, term, contains=False, limit=30):
    path = cache / 'names.sqlite3'
    if not path.exists():
        raise SystemExit('No offline index. Run index or fetch first: ' + str(path))
    connection = sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)
    if contains:
        escaped = norm(term).replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        rows = connection.execute("SELECT payload FROM names WHERE en_key LIKE ? ESCAPE '\\' OR zh LIKE ? ESCAPE '\\'",
                                  ('%' + escaped + '%', '%' + escaped + '%'))
    else:
        rows = connection.execute('SELECT payload FROM names WHERE en_key=? OR zh=?', (norm(term), term))
    records = [json.loads(row[0]) for row in rows]
    connection.close()
    records.sort(key=lambda r: ({'3R': 0, '5E': 1, '5R': 2}.get(r.get('edition'), 3),
                                r.get('category') == 'heading-reference',
                                'referenceFile' not in r, r['en'], r.get('url', '')))
    print(json.dumps({'query': term, 'mode': 'contains' if contains else 'exact', 'total': len(records),
                      'shown': min(limit, len(records)), 'records': records[:limit]}, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['fetch', 'index', 'query'])
    parser.add_argument('term', nargs='?')
    parser.add_argument('--cache', type=Path, default=DEFAULT_CACHE)
    parser.add_argument('--refresh', action='store_true', help='Re-download; retain previous good snapshot on errors')
    parser.add_argument('--workers', type=int, default=6, choices=range(1, 9))
    parser.add_argument('--contains', action='store_true')
    parser.add_argument('--limit', type=int, default=30)
    args = parser.parse_args()
    if args.limit < 1:
        parser.error('--limit must be positive')
    if args.command == 'query':
        if not args.term:
            parser.error('query requires a term')
        lookup(args.cache, args.term, args.contains, args.limit)
    else:
        if args.command == 'fetch':
            fetch_all(args.cache, args.refresh, args.workers)
        build_index(args.cache)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
