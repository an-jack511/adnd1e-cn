"""Import the 64 local spellbooks without modifying their PDF bytes."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

import pymupdf

SITE = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = SITE.parent / '__RESOURCES' / 'Mine' / '64册成长法术书'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    args = parser.parse_args()
    source = args.source.resolve()
    files = sorted(source.glob('*.pdf'))
    expected = {f'MU-{number:02d}' for number in range(1, 49)} | {
        f'IL-{number:02d}' for number in range(1, 17)
    }
    matched = {}
    for path in files:
        match = re.fullmatch(r'((MU|IL)-\d{2})_(.+)\.pdf', path.name)
        if not match or match[1] in matched:
            raise ValueError(f'Unexpected or duplicate filename: {path.name}')
        matched[match[1]] = (path, match[2], match[3])
    if set(matched) != expected:
        raise ValueError(f'Expected MU-01–48 and IL-01–16, got {sorted(matched)}')

    checksums = json.loads((source / '文件校验.json').read_text(encoding='utf-8'))
    source_checksums = {entry['file']: entry['sha256'] for entry in checksums['results']}
    records = []
    provenance = []
    for source_id in sorted(expected, key=lambda key: (not key.startswith('MU'), key)):
        path, kind, title = matched[source_id]
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if source_checksums.get(path.name) != digest:
            raise ValueError(f'Source checksum mismatch: {path.name}')
        book_id = source_id.replace('-', '').lower()
        code = book_id.upper()
        category = 'magic-user-spellbooks' if kind == 'MU' else 'illusionist-spellbooks'
        destination = SITE / 'public' / 'manuals' / book_id
        destination.mkdir(parents=True, exist_ok=True)
        with pymupdf.open(path) as document:
            text = document[0].get_text()
            if title not in re.sub(r'\s+', '', text):
                raise ValueError(f'Cover title mismatch: {path.name}')
            latin_titles = [line.strip() for line in text.splitlines()
                            if re.fullmatch(r'[A-Z][A-Z ,;:\x27-]+', line.strip())
                            and line.strip() != 'AD']
            if len(latin_titles) != 1:
                raise ValueError(f'Ambiguous Latin title: {path.name}: {latin_titles}')
            pixmap = document[0].get_pixmap(matrix=pymupdf.Matrix(
                1200 / document[0].rect.width, 1200 / document[0].rect.width), alpha=False)
            pixmap.save(destination / 'cover.jpg', jpg_quality=94)
            pages = len(document)
        shutil.copyfile(path, destination / f'{book_id}.pdf')
        if hashlib.sha256((destination / f'{book_id}.pdf').read_bytes()).hexdigest() != digest:
            raise ValueError(f'Copied PDF checksum mismatch: {path.name}')
        records.append({
            'id': book_id, 'title': title, 'subtitle': latin_titles[0], 'code': code,
            'category': category, 'cover': f'/manuals/{book_id}/cover.jpg',
            'file': f'/manuals/{book_id}/{book_id}.pdf',
            'description': '成长法术书 · 装帧版。', 'pages': pages,
        })
        provenance.append({'id': book_id, 'source': path.name, 'sha256': digest,
                           'pages': pages, 'cover_width': pixmap.width,
                           'cover_height': pixmap.height})
    for filename, data in [('spellbooks.json', records), ('spellbook-sources.json', provenance)]:
        (SITE / 'src' / 'data' / filename).write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Imported {len(records)} books, {sum(book["pages"] for book in records)} pages; all PDF checksums match.')


if __name__ == '__main__':
    main()
