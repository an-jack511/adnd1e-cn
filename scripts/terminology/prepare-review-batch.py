"""Prepare compact terminology review packets; never edit canonical translations.

Receipts are JSON arrays of {en, locator, outcome, reason}; the locator must
match one of the candidate's source locators. They record queue disposition,
not an alternative translation authority. Exact spelling is preserved.
"""
import argparse
import csv
import json
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TERM = ROOT / 'terminology'
APPROVED = {'verified-exact', 'adapted-variant'}
OUTCOMES = {'reuse', 'alias', 'approved', 'excluded', 'unresolved'}


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def norm(text):
    # Do not collapse punctuation, plurals, or word order: these can change sense.
    return re.sub(r'\s+', ' ', text.replace('’', "'")).strip().casefold()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--book', default='PHB', help='Corpus prefix, e.g. PHB, DMG, OA')
    ap.add_argument('--limit', type=int, default=40)
    ap.add_argument('--pages', help='Restrict listed source pages, inclusive, e.g. 10:14')
    ap.add_argument('--terms', type=Path, help='UTF-8 file with one exact headword per line')
    ap.add_argument('--receipts', type=Path, help='Previously handled candidates, JSON array')
    ap.add_argument('--reference-cache', type=Path,
                    default=ROOT.parent / 'tmp/terminology-reference-cache',
                    help='Offline reference cache; no network requests are made')
    ap.add_argument('--output', type=Path, default=ROOT / 'generated/terminology-review-batch.json')
    args = ap.parse_args()
    offline_path = args.reference_cache / 'names.sqlite3'
    offline = (sqlite3.connect(offline_path.resolve().as_uri() + '?mode=ro', uri=True)
               if offline_path.exists() else None)
    if args.limit < 1:
        ap.error('--limit must be positive')
    page_range = None
    if args.pages:
        if not re.fullmatch(r'\d+:\d+', args.pages):
            ap.error('--pages must have the form 10:14')
        low, high = map(int, args.pages.split(':'))
        if low < 1 or high < low:
            ap.error('--pages must be a positive ascending range')
        page_range = (low, high)

    known = defaultdict(list)
    for entry in read_json(TERM / 'catalog.json')['entries']:
        if entry['status'] in APPROVED:
            for name in [entry['en'], *entry.get('englishVariants', [])]:
                known[norm(name)].append({k: entry[k] for k in ['key', 'category', 'en', 'zh', 'status']})
    # Unpublished decisions override a stale generated catalog in the packet.
    with (TERM / 'rule-terms.tsv').open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream, delimiter='\t'):
            if row['status'] in APPROVED:
                known[norm(row['English'])] = [{
                    'category': 'rule', 'en': row['English'], 'zh': row['Chinese'],
                    'status': row['status'], 'source': 'terminology/rule-terms.tsv',
                }]
    for entry in read_json(TERM / 'decisions.json')['entries']:
        if entry.get('status') in APPROVED:
            known[norm(entry['en'])].append({k: entry[k] for k in ['category', 'en', 'zh', 'status']})

    refs = defaultdict(list)
    for filename in ['huiji-names.json', '5etools-names.json', 'setting-names.json']:
        for ref in read_json(TERM / 'references' / filename).get('records', []):
            refs[norm(ref['en'])].append({k: ref[k] for k in
                ['en', 'zh', 'category', 'edition', 'source', 'page', 'url'] if k in ref})

    receipts = set()
    if args.receipts:
        for row in read_json(args.receipts):
            if row['outcome'] not in OUTCOMES or not row.get('locator') or not row.get('reason'):
                raise ValueError('Receipt requires a valid outcome, source locator and reason')
            # Unresolved items stay in their separate queue, out of routine retries.
            receipts.add((norm(row['en']), row['locator']))
    requested = None
    if args.terms:
        requested = {norm(s) for s in args.terms.read_text(encoding='utf-8-sig').splitlines()
                     if s.strip() and not s.lstrip().startswith('#')}

    counts = Counter()
    packet = []
    seen = set()
    with (TERM / 'reports/source-candidates-priority.tsv').open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream, delimiter='\t'):
            key = norm(row['en'])
            if requested is not None and key not in requested:
                continue
            locators = [x.strip() for x in row['ocrPages'].split(';') if x.strip()]
            locators = [x for x in locators if re.match(re.escape(args.book) + r'(?:-core)?/', x, re.I)]
            if page_range:
                locators = [x for x in locators if (m := re.search(r'p\.(\d+)$', x))
                            and page_range[0] <= int(m[1]) <= page_range[1]]
            if not locators or key in seen:
                continue
            seen.add(key)
            counts['matchingCandidates'] += 1
            remaining = [x for x in locators if (key, x) not in receipts]
            if not remaining:
                counts['handledAtListedLocators'] += 1
                continue
            # Known names are still shown as reuse suggestions: identical English
            # does not prove that a new occurrence has the same meaning.
            counts['withExistingDecision' if known.get(key) else 'needsDecision'] += 1
            if len(packet) >= args.limit:
                continue
            matches = list(refs.get(key, []))
            if offline:
                matches.extend(json.loads(item[0]) for item in offline.execute(
                    'SELECT payload FROM names WHERE en_key=?', (key,)))
            matches = sorted(matches, key=lambda r: (
                {'3R': 0, '5E': 1, '5R': 2}.get(r.get('edition'), 3),
                r.get('category') == 'heading-reference'))
            unique_refs = []
            for ref in matches:
                if ref not in unique_refs:
                    unique_refs.append(ref)
            packet.append({'en': row['en'], 'locators': remaining,
                           'existingDecisions': known.get(key, []),
                           'exactReferences': unique_refs,
                           'draftHint': row['draftChinese'],
                           'signal': row['reviewSignal']})
    if offline:
        offline.close()
    result = {'purpose': 'review-input-only; confirm 1E meaning before approving',
              'referenceMode': 'offline SQLite + tracked evidence' if offline else 'tracked evidence only; cache not built',
              'referenceCoverage': '3R remains partial; no local match is not proof of no translation. Downloaded headings require sense review.',
              'book': args.book, 'pages': args.pages, 'counts': dict(counts), 'batchSize': len(packet),
              'sourceLocatorLimit': 'Candidate TSV may truncate page lists; not full-book coverage.',
              'items': packet}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(args.output), 'batchSize': len(packet), **counts}, ensure_ascii=False))


if __name__ == '__main__':
    main()
