#!/usr/bin/env python3
"""Remove stray closing section tags after context-intro."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTEXT_DIR = ROOT / "contextos"

STRAY_SECTION_RE = re.compile(
    r'(</section>\s*\n\s*<section class="context-intro"[^>]*>.*?</section>\s*)\n\s*</section>\s*\n(\s*<section class="trainer-controls")',
    re.DOTALL,
)

HOW_TO_USE_CLOSE_RE = re.compile(
    r'(</p>\s*)\n\s*</section>\s*\n\s*<section class="context-intro"',
    re.MULTILINE,
)


def patch_file(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    html = STRAY_SECTION_RE.sub(r"\1\n\2", html)
    html = HOW_TO_USE_CLOSE_RE.sub(r"\1\n            </section>\n\n            <section class=\"context-intro\"", html)
    path.write_text(html, encoding="utf-8")


def main() -> None:
    files = sorted(CONTEXT_DIR.glob("*.html"))
    for path in files:
        patch_file(path)
    print(f"Fixed {len(files)} context pages")


if __name__ == "__main__":
    main()
