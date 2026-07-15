#!/usr/bin/env python3
"""Fix duplicate robots meta, back links, and legal page lang attributes."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTEXT_DIR = ROOT / 'contextos'

ROBOTS_META = '<meta name="robots" content="index, follow" />'
DUPLICATE_ROBOTS_RE = re.compile(
    r'(<meta name="robots" content="index, follow" />\s*)+',
    re.MULTILINE,
)
BACK_LINK_OLD = '<a class="btn-link" href="./contextos/greetings.html">← Voltar ao início</a>'
BACK_LINK_NEW = '<a class="btn-link" href="./index.html">← Voltar ao início</a>'
LANG_EN = '<html lang="en">'
LANG_PT = '<html lang="pt-BR">'


def dedupe_robots(html: str) -> str:
    if ROBOTS_META not in html:
        return html
    # Keep canonical/stylesheet line clean after single robots tag
    html = DUPLICATE_ROBOTS_RE.sub(ROBOTS_META + '\n  ', html, count=1)
    html = html.replace(
        ROBOTS_META + '  ' + ROBOTS_META,
        ROBOTS_META,
    )
    html = html.replace(
        ROBOTS_META + '  <link',
        ROBOTS_META + '\n  <link',
    )
    html = html.replace(
        ROBOTS_META + '  <meta name="robots"',
        ROBOTS_META + '\n  ',
    )
    # Final pass: collapse any remaining duplicates
    while ROBOTS_META + '\n  ' + ROBOTS_META in html:
        html = html.replace(ROBOTS_META + '\n  ' + ROBOTS_META, ROBOTS_META + '\n  ')
    while ROBOTS_META + '  ' + ROBOTS_META in html:
        html = html.replace(ROBOTS_META + '  ' + ROBOTS_META, ROBOTS_META + '\n  ')
    return html


def patch_html(path: Path) -> bool:
    html = path.read_text(encoding='utf-8')
    original = html
    html = dedupe_robots(html)
    if BACK_LINK_OLD in html:
        html = html.replace(BACK_LINK_OLD, BACK_LINK_NEW)
    if path.name in {'about.html', 'contact.html', 'cookies.html', 'privacy-policy.html', 'terms.html'}:
        html = html.replace(LANG_EN, LANG_PT)
    if html != original:
        path.write_text(html, encoding='utf-8')
        return True
    return False


def main() -> None:
    changed = 0
    for path in list(CONTEXT_DIR.glob('*.html')) + list(ROOT.glob('*.html')):
        if patch_html(path):
            changed += 1
    print(f'Patched {changed} HTML files')


if __name__ == '__main__':
    main()
