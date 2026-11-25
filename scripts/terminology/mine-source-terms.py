#!/usr/bin/env python3
"""Mine reviewable AD&D 1E terminology candidates from local OCR and drafts.

The output is a research queue, never an authority list: OCR candidates must be
checked against the original context before they enter the public glossary.
Only term strings and source locators are exported; OCR prose is not copied.
"""
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKSPACE = ROOT.parent
OCR_ROOT = WORKSPACE / "OCR"
WORKSPACE_TMP = WORKSPACE / "tmp"
PROJECT_TMP = ROOT / "tmp"
MANUSCRIPT_ROOT = WORKSPACE / "manuscript"
OUT = ROOT / "terminology" / "reports" / "source-candidates.tsv"
PRIORITY_OUT = ROOT / "terminology" / "reports" / "source-candidates-priority.tsv"
SUMMARY = ROOT / "terminology" / "reports" / "source-mining-summary.json"
DRAFT_CATALOG = ROOT / "terminology" / "source-draft-candidates.json"
METADATA_LABELS = {
    "作者", "译者", "翻译", "编辑", "主编", "副主编", "校对", "审校", "插图", "插画",
    "插图作者", "美术", "封面", "摄影", "设计", "排版", "版式", "制作", "出版", "发行",
}

TITLE = re.compile(
    r"\b[A-Z][A-Za-z0-9’'/-]*(?:&[A-Za-z0-9]+)?(?:\s+&?\s*(?:[A-Z][A-Za-z0-9’'/-]*(?:&[A-Za-z0-9]+)?|of|the|and|in|to|from|for|on|with|by|or|vs\.)){1,7}\b"
)
CAPS = re.compile(r"\b[A-Z][A-Z0-9’'/-]{1,}(?:\s+[A-Z][A-Z0-9’'/-]{1,}){1,5}\b")
WORD = re.compile(r"[A-Za-z]")
CJK = re.compile(r"[\u3400-\u9fff]")
TRIM = " \t\r\n.,;:!?*_`|()[]{}<>（）《》“”‘’、，。；：！？—–-"


def norm(value: str) -> str:
    value = value.casefold().replace("’", "'").replace("–", "-").replace("—", "-")
    value = re.sub(r"[^a-z0-9']+", " ", value)
    return " ".join(value.split())


def load_json(path: Path, default: dict) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def clean_phrase(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip(TRIM))
    value = re.sub(r"\s*([/’'-])\s*", r"\1", value)
    if len(value) < 5 or not WORD.search(value):
        return ""
    words = value.split()
    if len(words) < 2 or words[-1].casefold().strip(".,") in {"of", "the", "and", "in", "to", "from", "for", "on", "with", "by", "or", "vs"}:
        return ""
    return value


def draft_pair(line: str, start: int) -> str:
    """Return a short Chinese label only for heading/table/bold bilingual rows."""
    stripped = line.lstrip()
    if not (stripped.startswith(("#", "|", "**", "<strong>"))):
        return ""
    prefix = line[:start]
    if "|" in prefix:
        prefix = prefix.rsplit("|", 1)[-1]
    prefix = re.sub(r"<[^>]*>|</?strong>|[#*_`\[\]0-9.]", " ", prefix)
    prefix = re.sub(r"\s+", " ", prefix).strip(TRIM)
    if not prefix or len(prefix) > 32 or re.search(r"[A-Za-z]", prefix):
        return ""
    if not CJK.search(prefix) or re.search(r"[，。；：！？、]", prefix):
        return ""
    return prefix


def main() -> None:
    catalog = load_json(ROOT / "terminology/catalog.json", {"entries": []})["entries"]
    known: dict[str, list[dict]] = defaultdict(list)
    for entry in catalog:
        if entry.get("verificationScope") == "draft-bilingual-pair-unreviewed":
            continue
        for english in [entry.get("en", ""), *entry.get("englishVariants", [])]:
            if english:
                known[norm(english)].append(entry)

    external: dict[str, list[dict]] = defaultdict(list)
    for name, default in [
        ("references/huiji-names.json", "3R"),
        ("references/5etools-names.json", "5E"),
        ("references/setting-names.json", "5E"),
    ]:
        data = load_json(ROOT / "terminology" / name, {"records": []})
        for record in data.get("records", []):
            english = record.get("en")
            if english:
                external[norm(english)].append({
                    "category": record.get("category", "candidate"),
                    "en": english,
                    "edition": record.get("edition", default),
                    "zh": record.get("zh", ""),
                    "source": record.get("source", record.get("world", "")),
                    "url": record.get("url", ""),
                })

    candidates: dict[str, dict] = {}

    def add(english: str, source: str, kind: str, draft_zh: str = "") -> None:
        english = clean_phrase(english)
        if not english:
            return
        key = norm(english)
        row = candidates.setdefault(key, {
            "en": english,
            "ocrHits": 0,
            "ocrPages": set(),
            "ocrBooks": set(),
            "ocrHeadingHits": 0,
            "draftHits": 0,
            "draftFiles": set(),
            "draftChinese": set(),
            "draftPairs": set(),
        })
        if kind.startswith("ocr"):
            row["ocrHits"] += 1
            row["ocrPages"].add(source)
            row["ocrBooks"].add(source.split("/", 1)[0])
            if kind == "ocr-heading":
                row["ocrHeadingHits"] += 1
        else:
            row["draftHits"] += 1
            row["draftFiles"].add(source)
            if draft_zh:
                row["draftChinese"].add(draft_zh)
                row["draftPairs"].add((draft_zh, source))

    ocr_files = []
    if OCR_ROOT.is_dir():
        for book_dir in sorted(OCR_ROOT.glob("*-raw")):
            text_dir = book_dir / "text"
            if text_dir.is_dir():
                ocr_files.extend((book_dir.name, path, "page") for path in sorted(text_dir.glob("page-*.txt")))

    dragon_files: list[tuple[str, Path, str]] = []
    dragon_page = re.compile(r"dragon(?:-bulk)?-(\d{2,3})-pdf(\d+)\.txt$", re.I)
    dragon_book = re.compile(r"DragonMagazine(\d{2,3})_djvu\.txt$", re.I)
    for folder in (WORKSPACE_TMP, PROJECT_TMP):
        if not folder.is_dir():
            continue
        for path in folder.glob("*.txt"):
            match = dragon_page.fullmatch(path.name)
            if match:
                dragon_files.append((f"Dragon-{int(match.group(1)):03d}", path, f"pdf-p.{int(match.group(2)):03d}"))
                continue
            match = dragon_book.fullmatch(path.name)
            if match:
                dragon_files.append((f"Dragon-{int(match.group(1)):03d}", path, "djvu"))

    for book, path, source_type in [*ocr_files, *dragon_files]:
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for line_number, line in enumerate(text.splitlines(), 1):
            if source_type == "page":
                page = re.search(r"(\d+)$", path.stem)
                locator = f"{book}/p.{int(page.group(1)):03d}" if page else f"{book}/{path.stem}"
            elif source_type == "djvu":
                locator = f"{book}/djvu-line-{line_number}"
            else:
                locator = f"{book}/{source_type}"
            line = " ".join(line.split())
            if not line or len(line) > 240:
                continue
            is_heading = len(line) < 100 and sum(ch.isupper() for ch in line) >= max(4, len(line) // 3)
            for match in TITLE.finditer(line):
                add(match.group(), locator, "ocr-heading" if is_heading else "ocr-text")
            if is_heading:
                for match in CAPS.finditer(line):
                    add(match.group(), locator, "ocr-heading")

    draft_files = sorted(MANUSCRIPT_ROOT.rglob("*.md")) if MANUSCRIPT_ROOT.is_dir() else []
    for path in draft_files:
        relative = path.relative_to(MANUSCRIPT_ROOT).as_posix()
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        for line_number, line in enumerate(lines, 1):
            if not CJK.search(line):
                continue
            for match in TITLE.finditer(line):
                add(match.group(), f"manuscript/{relative}#L{line_number}", "draft", draft_pair(line, match.start()))

    fields = ["en", "status", "catalogChinese", "catalogCategories", "draftChinese", "draftPairs", "externalChinese", "externalEditions", "ocrHits", "ocrPageCount", "ocrHeadingHits", "ocrPages", "draftHits", "draftFiles"]
    output_rows = []
    for key, row in sorted(candidates.items(), key=lambda item: item[1]["en"].casefold()):
        known_rows = known.get(key, [])
        refs = external.get(key, [])
        has_1e_entry = any(entry.get("activeIds") or any(str(o.get("path", "")).startswith("src/published/") for o in entry.get("occurrences", [])) for entry in known_rows)
        only_later_refs = bool(known_rows) and not has_1e_entry and all(entry.get("status") == "reference-only" for entry in known_rows)
        status = "in-1e-catalog" if has_1e_entry else "reference-only" if only_later_refs else "catalogue-candidate" if known_rows else "external-name-match" if refs else "source-candidate"
        edition_order = {"3R": 0, "5E": 1, "5R": 2}
        refs.sort(key=lambda ref: (edition_order.get(ref.get("edition", ""), 9), ref.get("zh", "")))
        values = {
            "en": row["en"], "status": status,
            "catalogChinese": "; ".join(sorted({entry.get("zh", "") for entry in known_rows if entry.get("zh")})),
            "catalogCategories": "; ".join(sorted({entry.get("category", "") for entry in known_rows})),
            "draftChinese": "; ".join(sorted(row["draftChinese"])),
            "draftPairs": json.dumps([{"zh": zh, "source": source} for zh, source in sorted(row["draftPairs"])[:12]], ensure_ascii=False, separators=(",", ":")),
            "externalChinese": "; ".join(dict.fromkeys(ref["zh"] for ref in refs if ref.get("zh"))),
            "externalEditions": "; ".join(dict.fromkeys(ref["edition"] for ref in refs if ref.get("edition"))),
            "ocrHits": row["ocrHits"], "ocrPageCount": len(row["ocrPages"]),
            "ocrHeadingHits": row["ocrHeadingHits"], "ocrPages": "; ".join(sorted(row["ocrPages"])[:12]),
            "draftHits": row["draftHits"], "draftFiles": "; ".join(sorted(row["draftFiles"])[:8]),
        }
        output_rows.append(values)

    def write_rows(path: Path, rows: list[dict]) -> None:
        with path.open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields, delimiter="\t", lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)

    write_rows(OUT, output_rows)
    stop_starts = {"a", "after", "all", "an", "and", "as", "at", "because", "before", "but", "each", "for", "from", "if", "in", "of", "on", "once", "one", "since", "the", "to", "when", "while", "with"}
    priority_rows = []
    for row in output_rows:
        if row["status"] in ("in-1e-catalog", "reference-only"):
            continue
        has_source_signal = bool(row["draftChinese"] or int(row["ocrPageCount"]) >= 2 or int(row["ocrHeadingHits"]) >= 1)
        if not has_source_signal:
            continue
        first = row["en"].split()[0].casefold().strip("'’.,")
        if first in stop_starts and not row["draftChinese"]:
            is_repeated_title = first == "the" and len(row["en"].split()) >= 3 and int(row["ocrPageCount"]) >= 2 and int(row["ocrHeadingHits"]) >= 3
            if not is_repeated_title:
                continue
        priority_rows.append(row)
    write_rows(PRIORITY_OUT, priority_rows)

    draft_entries = []
    for row in output_rows:
        if row["status"] != "source-candidate" or not row["draftChinese"] or ";" in row["draftChinese"]:
            continue
        english = row["en"]
        chinese = row["draftChinese"].strip()
        # Role labels in manuscript credits are not translations of the following
        # person's name (e.g. "作者：Allen Varney"). Do not publish such false pairs.
        if chinese.rstrip("：:").strip() in METADATA_LABELS:
            continue
        chinese_length = len(CJK.findall(chinese))
        if not 2 <= chinese_length <= 24 or re.search(r"[A-Za-z0-9，。；：！？（）()|+*]", chinese):
            continue
        if not 2 <= len(english.split()) <= 9:
            continue
        refs = []
        for pair in json.loads(row["draftPairs"]):
            if pair["zh"] != chinese:
                continue
            refs.append({"category": "candidate", "en": english, "edition": "1E", "source": "bilingual translation manuscript", "zh": chinese, "url": pair["source"]})
        for ref in external.get(norm(english), []):
            refs.append({"category": ref.get("category", "candidate"), "en": ref.get("en", english), "edition": ref.get("edition"), "source": ref.get("source"), "zh": ref.get("zh"), "url": ref.get("url")})
        unique_refs = []
        seen_refs = set()
        for ref in refs:
            signature = (ref.get("edition"), ref.get("source"), ref.get("zh"), ref.get("url"))
            if signature in seen_refs:
                continue
            seen_refs.add(signature)
            unique_refs.append(ref)
        draft_entries.append({
            "category": "candidate",
            "en": english,
            "zh": chinese,
            "status": "pending",
            "verificationScope": "draft-bilingual-pair-unreviewed",
            "references": unique_refs[:24],
            "reason": "暂从 1E 中文底稿的中英并列标题或表格标签提取；尚未逐项核对英文原书、规则语境及 3R→5E→5R 名称。其他版本的同英文名称仅供比较，不作为 AD&D 1E 定译。",
        })
    DRAFT_CATALOG.write_text(json.dumps({"schemaVersion": 1, "generatedBy": "mine-source-terms.py", "entries": draft_entries}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    counts = Counter(row["status"] for row in output_rows)
    summary = {
        "method": "OCR title-case and all-caps phrase extraction plus bilingual manuscript headings/table labels",
        "ocrCorpus": {
            "rawBooks": len({book for book, _, _ in ocr_files}),
            "rawPages": len(ocr_files),
            "dragonOCRFiles": len(dragon_files),
            "sourceFiles": len(ocr_files) + len(dragon_files),
        },
        "manuscriptFiles": len(draft_files),
        "uniqueCandidates": len(candidates),
        "candidateStatusCounts": dict(counts),
        "priorityReviewCandidates": len(priority_rows),
        "bilingualDraftCandidatesAddedToSearch": len(draft_entries),
        "limitations": [
            "OCR phrase extraction includes false positives, OCR errors and incomplete table text.",
            "Exact 3R/5E/5R name matches are suggestions only and do not establish an AD&D 1E canonical translation.",
            "Candidate rows retain source locators but exclude OCR prose; verify each term in its source context before catalog approval.",
        ],
        "output": OUT.relative_to(ROOT).as_posix(),
        "priorityOutput": PRIORITY_OUT.relative_to(ROOT).as_posix(),
        "draftCandidateCatalog": DRAFT_CATALOG.relative_to(ROOT).as_posix(),
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
