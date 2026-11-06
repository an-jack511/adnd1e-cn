"""Refresh the translated FF/MM2 reader chapters without reimporting other books."""
import html
import json
import re
from pathlib import Path
from reader_cleanup import clean_reader_text

site = Path(__file__).resolve().parents[2]
index_path = site / 'src/data/published/books.json'
search_path = site / 'src/data/published/book-search.json'
index = json.loads(index_path.read_text(encoding='utf-8'))
search = json.loads(search_path.read_text(encoding='utf-8'))
for book in ('ff', 'mm2'):
    manifest = json.loads((site.parent / 'manuscript' / book / 'book.json').read_text(encoding='utf-8'))
    for topic in manifest['topics']:
        if any(e['book'] == book and e['slug'] == topic['slug'] for e in index):
            continue
        entry = dict(book=book, slug=topic['slug'], title=topic['title'], titleEn=topic.get('title_en', ''),
                     group=topic.get('group', ''), excerpt='', sourceFile=f"manuscript/{book}/{topic['file']}")
        index.append(entry)
        search.append(dict(book=book, slug=topic['slug'], title=entry['title'], titleEn=entry['titleEn'], text=''))
aliases = {(e['book'], Path(e['sourceFile']).stem): e['slug'] for e in index}

for entry in index:
    if entry['book'] not in ('ff', 'mm2'):
        continue
    book = entry['book']
    raw = (site.parent / entry['sourceFile']).read_text(encoding='utf-8')
    raw = re.sub(r'^#\s+.+\r?\n', '', raw)
    raw = re.sub(r'!\[[^\]]*\]\([^)]*\)\s*|<img\b[^>]*>', '', raw, flags=re.I)

    def target(match):
        href = match[1]
        if re.match(r'(?:https?:|mailto:|#|/)', href):
            return match[0]
        file, _, anchor = href.partition('#')
        if not re.search(r'\.(?:md|html)$', file):
            return match[0]
        parts = Path(file).parts
        dest_book = parts[-2] if len(parts) > 1 and parts[-2] != '..' else book
        slug = aliases.get((dest_book, Path(file).stem), Path(file).stem)
        return '](/books/' + dest_book + '/' + slug + '/' + ('#' + anchor if anchor else '') + ')'

    raw = re.sub(r'\]\(([^)]+)\)', target, raw)
    raw = clean_reader_text(raw)
    raw = re.sub(r'\*\*([^*|\n]+)\*\*', r'<strong>\1</strong>', raw)
    (site / 'src/published/books' / book / (entry['slug'] + '.md')).write_text(raw.strip() + '\n', encoding='utf-8')
    text = re.sub(r'<[^>]*>', ' ', raw)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'[#*_|>`~]', ' ', text)
    text = ' '.join(html.unescape(text).split())
    entry['excerpt'] = text[:170]
    record = next(e for e in search if e['book'] == book and e['slug'] == entry['slug'])
    record['text'] = text

for path, data in [(index_path, index), (search_path, search)]:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Refreshed FF/MM2 chapters and their full-text search records.')
