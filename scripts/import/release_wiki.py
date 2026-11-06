"""Import the v1 book-layout output, retaining relative links, art and table markup."""
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from reader_cleanup import clean_reader_text, is_editorial_title, directory_redirect

parser = argparse.ArgumentParser()
parser.add_argument("release", type=Path, help="CHM build directory containing book-layout.json")
args = parser.parse_args()
site = Path(__file__).resolve().parents[2]
out = site / "public/archive"
out.mkdir(parents=True, exist_ok=True)
layout = json.loads((args.release / "book-layout.json").read_bytes())
escape = html.escape
topics = {}
books = {}
entries = []


def walk(node, book):
    path = node["local"].removeprefix("content/").split("#")[0]
    topics.setdefault(path, (book, clean_reader_text(node["title"]), node.get("page")))
    for child in node.get("children", []):
        walk(child, book)


for root in layout["roots"]:
    if root.get("children"):
        book = root["local"].split("/")[1]
        books[book] = root["title"]
        walk(root, book)


def plain(markup):
    return " ".join(html.unescape(re.sub(r"<[^>]*>", " ", markup)).split())


def convert(path, raw):
    book, title, page = topics.get(path, ("", "", None))
    if is_editorial_title(title):
        return directory_redirect()
    url = "/archive/" + path
    source = " · ".join(filter(None, [books.get(book), title, f"章节起页 {page}" if page else None]))
    body = re.search(r"<body\b[^>]*>(.*)</body>", raw, re.I | re.S)[1]
    body = re.sub(r'<p class="home-link">.*?</p>', "", body, flags=re.I | re.S)
    if path == "index.html":
        return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/books/"><title>规则书目录</title><a href="/books/">规则书目录</a></html>'
    body = clean_reader_text(body)
    if book:
        entries.append(dict(book=book, title=title, href=url, source=source, kind="章节"))
    counter = 0
    output = []
    last = 0
    for match in re.finditer(r"<table\b.*?</table>", body, re.I | re.S):
        before = body[last:match.start()]
        table = match[0]
        if not book:
            output.extend([before, table])
            last = match.end()
            continue
        counter += 1
        captions = re.findall(r'<(?:p|div)\b[^>]*class=["\']table-caption["\'][^>]*>(.*?)</(?:p|div)>', before, re.I | re.S)
        caption = re.search(r"<caption\b[^>]*>(.*?)</caption>", table, re.I | re.S)
        headings = re.findall(r"<h[1-6]\b[^>]*>(.*?)</h[1-6]>", before, re.I | re.S)
        label = plain(caption[1] if caption else captions[-1] if captions else headings[-1] if headings else title)
        anchor = f"table-{counter}"
        label = label or f"表 {counter}"
        cite = f"《AD&D 1e 不全书》v{layout['version']} · {source} · 表 {counter} {label}"
        if book:
            entries.append(dict(book=book, title=label, href=url+"#"+anchor, source=source,
                                kind="表格", text=plain(table)))
        output.extend([before, f'<figure class="rule-table" id="{anchor}"><figcaption><a href="#{anchor}">表 {counter}　{escape(label)}</a><button type="button" data-cite="{escape(cite)}">复制引用</button></figcaption><div class="scroll-table" tabindex="0" aria-label="规则表格">', table, "</div></figure>"])
        last = match.end()
    output.append(body[last:])
    heading = escape(title or "规则书目录")
    return f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{heading} · AD&amp;D 1e 不全书</title><link rel="stylesheet" href="/archive/style.css"><link rel="stylesheet" href="/archive/stat-block.css"><link rel="stylesheet" href="/wiki.css"><body class="reader"><header class="reader-head"><a href="/">AD&amp;D 第一版中文规则索引</a><nav><a href="/reference/">规则书检索</a><a href="/reference/?kind=表格">表格索引</a><a href="/tables/">随机表工具</a></nav></header><main><article>{''.join(output)}</article><footer>{escape(source)}</footer></main><script src="/reference-copy.js" defer></script></body></html>'''


content = args.release / "content"
for file in sorted(content.rglob("*")):
    if not file.is_file():
        continue
    rel = file.relative_to(content)
    dest = out / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if file.suffix.lower() == ".html":
        dest.write_text(convert(rel.as_posix(), file.read_bytes().decode("gb18030")), encoding="utf8")
    else:
        shutil.copyfile(file, dest)

(out / "lookup.json").write_text(json.dumps(dict(version=layout["version"], books=books, entries=entries),
                                           ensure_ascii=False, separators=(",", ":")), encoding="utf8")
print(f"{len(books)} books, {len(entries)} searchable records")


# Rebuild web chapters and search anchors after refreshing the source archive.
import subprocess, sys
subprocess.run([sys.executable, str(site / "scripts/import/consolidate-book-reading.py"), "--refresh-outlines"], check=True)
