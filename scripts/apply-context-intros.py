#!/usr/bin/env python3
"""Apply context-intro paragraphs from contexts-data.json to context HTML pages."""

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTEXT_DIR = ROOT / "contextos"
DATA_FILE = ROOT / "contexts-data.json"

INTRO_SECTION_RE = re.compile(
    r'<section class=\\?"context-intro\\?" aria-label="Sobre este contexto">\s*'
    r'(?:<p class="context-intro-text">[^<]*</p>\s*)+'
    r'</section>',
    re.DOTALL,
)


def build_intro_section(paragraphs: list[str]) -> str:
    paras_html = "".join(
        f'\n              <p class="context-intro-text">{html.escape(p)}</p>'
        for p in paragraphs
    )
    return (
        '<section class="context-intro" aria-label="Sobre este contexto">'
        f"{paras_html}\n"
        "            </section>"
    )


def patch_file(path: Path, paragraphs: list[str]) -> None:
    content = path.read_text(encoding="utf-8")
    section = build_intro_section(paragraphs)
    if INTRO_SECTION_RE.search(content):
        content = INTRO_SECTION_RE.sub(section, content, count=1)
    else:
        raise ValueError(f"context-intro section not found in {path.name}")
    path.write_text(content, encoding="utf-8")


def main() -> None:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    contexts = data["contexts"]
    patched = 0
    for slug, info in contexts.items():
        path = CONTEXT_DIR / f"{slug}.html"
        if not path.exists():
            raise FileNotFoundError(path)
        patch_file(path, info["paragraphs"])
        patched += 1
    print(f"Applied intros to {patched} context pages")


if __name__ == "__main__":
    main()
