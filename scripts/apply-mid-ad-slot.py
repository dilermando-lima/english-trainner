#!/usr/bin/env python3
"""Insert mid-list ad slot between sentence 20 and 21 on context pages."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTEXT_DIR = ROOT / "contextos"

MID_AD = (
    '\n<div id="contextAdSlotMid" class="context-ad-slot context-ad-slot--mid" '
    'aria-label="Publicidade"></div>\n'
)

BEFORE_SENTENCE_21 = re.compile(
    r'(<article class="sentence-item" id="sentence-item-20" data-sentence-index="20">)',
    re.MULTILINE,
)


def patch_context_file(path: Path) -> bool:
    html = path.read_text(encoding="utf-8")
    if 'id="contextAdSlotMid"' in html:
        return False
    if not BEFORE_SENTENCE_21.search(html):
        print(f"  skip (no sentence-item-20): {path.name}")
        return False
    html = BEFORE_SENTENCE_21.sub(MID_AD + r"\1", html, count=1)
    path.write_text(html, encoding="utf-8")
    return True


def main() -> None:
    files = sorted(CONTEXT_DIR.glob("*.html"))
    updated = sum(1 for path in files if patch_context_file(path))
    print(f"Added mid ad slot to {updated}/{len(files)} context pages")


if __name__ == "__main__":
    main()
