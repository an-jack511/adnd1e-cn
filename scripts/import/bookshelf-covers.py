"""Import cover thumbnails only; never copy or download full source books."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
import hashlib
import json
import urllib.request
import pymupdf
from PIL import Image

SITE = Path(__file__).resolve().parents[2]
ROOT = SITE.parent
OUTPUT = SITE / 'public/assets/covers'
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCES = SITE / 'src/data/cover-sources.json'
records = json.loads(SOURCES.read_text(encoding='utf-8')) if SOURCES.exists() else {}

# Re-render the exact editions already used by the library, without the CHM's
# 28 KB cap. Source pages are rendered as-is, without generated detail.
layout = json.loads((ROOT / 'build/chm-v032-book-layout/book-layout.json').read_text(encoding='utf-8'))
local_sources = {entry['book']: entry['source'] for entry in layout['covers']}
local_sources.update({
    'ref3': '__RESOURCES/REF/TSR Inc - AD&D 1st Edition - REF3 - The Book of Lairs.pdf',
    'ref4': '__RESOURCES/REF/TSR Inc - AD&D 1st Edition - REF4 - Book of Lairs II.pdf',
    'ref5': '__RESOURCES/REF/TSR Inc - AD&D 1st Edition - REF5 - Lords Of Darkness.pdf',
    'dl-atlas': '__RESOURCES/Dragonlance/Settings/Karen Wynn Fonstad - AD&D 1st Edition - Dragonlance_ Atlas of the Dragonlance World.pdf',
})
for book_id, source in local_sources.items():
    destination = OUTPUT / f'{book_id}.jpg'
    if not destination.exists():
        with pymupdf.open(ROOT / source) as pdf:
            page = pdf[0]
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1200/page.rect.width, 1200/page.rect.width), alpha=False, annots=False)
            pixmap.pil_save(str(destination), format='JPEG', quality=94, optimize=True)
    with Image.open(destination) as image:
        records[book_id] = {'cover': f'/assets/covers/{book_id}.jpg', 'source': source.replace('\\', '/'), 'page': 1, 'width': image.width, 'height': image.height, 'method': 'Original PDF cover rendered at 1200px; no AI reconstruction'}
print(f'Rendered {len(local_sources)} original book covers.', flush=True)

# The archive's HTML explicitly pairs covers/NNN.jpg with issue NNN.
archive_url = 'https://dragon.nightmare.org/'
with urllib.request.urlopen(archive_url, timeout=30) as response:
    archive_html = response.read().decode('utf-8')
issues = json.loads((SITE / 'src/data/public/dragon-books.json').read_text(encoding='utf-8'))

def download_issue(book):
    book_id = book['id']
    issue = int(book_id.split('-')[1])
    relative = f'covers/{issue:03}.jpg'
    assert f'src="{relative}"' in archive_html, f'Cover not listed by archive: {book_id}'
    url = archive_url + relative
    destination = OUTPUT / f'{book_id}.jpg'
    if not destination.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'ADND1e-cover-library/1.0'})
        with urllib.request.urlopen(request, timeout=40) as response:
            data = response.read()
        with Image.open(BytesIO(data)) as image:
            image.verify()
        destination.write_bytes(data)
    with Image.open(destination) as image:
        record = {'cover': f'/assets/covers/{book_id}.jpg', 'source': url, 'source_page': archive_url, 'issue': issue, 'width': image.width, 'height': image.height, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'method': 'Original archive cover JPEG, unmodified'}
    return book_id, record

failures = []
with ThreadPoolExecutor(max_workers=6) as pool:
    futures = {pool.submit(download_issue, book): book['id'] for book in issues}
    for future in as_completed(futures):
        try:
            book_id, record = future.result()
            records[book_id] = record
        except Exception as error:
            failures.append((futures[future], str(error)))
SOURCES.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(records)} verified cover records; failed: {failures}', flush=True)
if failures:
    raise SystemExit(1)
