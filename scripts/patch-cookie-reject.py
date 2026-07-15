#!/usr/bin/env python3
"""Add cookie reject button to all pages with consent banner."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REJECT_BTN = (
    '<button type="button" id="cookieConsentReject" class="cookie-consent-reject">'
    'Recusar</button>\n      '
)
PATTERN = re.compile(
    r'(<button type="button" id="cookieConsentAccept" class="cookie-consent-accept">Aceitar</button>)'
)


def patch_file(path: Path) -> bool:
    html = path.read_text(encoding='utf-8')
    if 'cookieConsentReject' in html:
        return False
    if 'cookieConsentAccept' not in html:
        return False
    html = PATTERN.sub(REJECT_BTN + r'\1', html, count=1)
    path.write_text(html, encoding='utf-8')
    return True


def main() -> None:
    count = 0
    for path in ROOT.rglob('*.html'):
        if patch_file(path):
            count += 1
    print(f'Added reject button to {count} HTML files')


if __name__ == '__main__':
    main()
