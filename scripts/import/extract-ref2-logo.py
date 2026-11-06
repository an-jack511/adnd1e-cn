"""Extract REF2's original filled vector outlines into a standalone SVG."""
from pathlib import Path
import pymupdf

root = Path(__file__).resolve().parents[2]
source = root.parent / '__RESOURCES/REF/TSR Inc - AD&D 1st Edition - REF2 - Player Character Sheets.pdf'
target = root / 'public/images/ref2/adnd-logo.svg'
target.parent.mkdir(parents=True, exist_ok=True)
with pymupdf.open(source) as document:
    clip = pymupdf.Rect(378, 25, 576, 65)
    drawings = [drawing for drawing in document[2].get_drawings() if clip.contains(drawing['rect'])]
    assert len(drawings) == 32 and all(drawing['type'] == 'f' for drawing in drawings)
    paths = []
    def point(value):
        return f'{value.x:.6f} {value.y:.6f}'
    for drawing in drawings:
        commands, current = [], None
        for item in drawing['items']:
            if item[0] not in ('l', 'c'):
                raise ValueError(f'Unexpected logo primitive: {item[0]}')
            if current != item[1]:
                commands.append('M' + point(item[1]))
            if item[0] == 'l':
                commands.append('L' + point(item[2]))
                current = item[2]
            else:
                commands.append('C' + ' '.join(point(value) for value in item[2:]))
                current = item[4]
        if drawing['closePath']:
            commands.append('Z')
        color = '#'+''.join(f'{round(channel * 255):02x}' for channel in drawing['fill'])
        rule = 'evenodd' if drawing['even_odd'] else 'nonzero'
        paths.append(f'<path fill="{color}" fill-rule="{rule}" d="{" ".join(commands)}"/>')
    target.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="378 25 198 40" width="1188" height="240" role="img" aria-labelledby="title"><title id="title">Advanced Dungeons &amp; Dragons</title>\n'+'\n'.join(paths)+'\n</svg>\n', encoding='utf-8')
    # A rendered extraction preview is kept with local QA files, outside site assets.
    preview = root / '.git/ref2-logo-vector.png'
    with pymupdf.open(target) as vector:
        vector[0].get_pixmap().save(preview)
print(target)
