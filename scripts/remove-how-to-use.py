#!/usr/bin/env python3
"""Remove duplicate how-to-use section from context pages."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTEXT_DIR = ROOT / 'contextos'

HOW_TO_USE_RE = re.compile(
    r'\s*<section class="how-to-use" aria-label="Como usar">\s*'
    r'<h2 class="how-to-use-title">Como usar</h2>\s*'
    r'<p class="how-to-use-text">\s*'
    r'Escolha um contexto no menu ao lado\.[^<]*'
    r'</p>\s*'
    r'\s*</section>\s*\n',
    re.DOTALL,
)


def main() -> None:
    count = 0
    for path in sorted(CONTEXT_DIR.glob('*.html')):
        html = path.read_text(encoding='utf-8')
        new_html, n = HOW_TO_USE_RE.subn('\n', html, count=1)
        if n:
            path.write_text(new_html, encoding='utf-8')
            count += 1
    print(f'Removed how-to-use from {count} context pages')


if __name__ == '__main__':
    main()
