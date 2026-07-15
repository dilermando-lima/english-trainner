#!/usr/bin/env python3
"""Remove inline AdSense tags and add context-intro + ad slot to context pages."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTEXT_DIR = ROOT / "contextos"

ADS_SCRIPT_RE = re.compile(
    r'\s*<script async src="https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js[^"]*" crossorigin="anonymous"></script>\n?',
)
DUPLICATE_ROBOTS_RE = re.compile(
    r'(<link rel="canonical" href="[^"]*" />\n)\s*<meta name="robots" content="index, follow" />\s*',
)
META_DESC_RE = re.compile(r'<meta name="description" content="([^"]*)" />')
HOW_TO_USE_END = re.compile(
    r'(</section>\s*\n\s*)(<section class="trainer-controls")',
    re.MULTILINE,
)
SENTENCES_LIST = re.compile(
    r'(\s*<div id="sentencesList" class="sentences-list">)',
    re.MULTILINE,
)
MAIN_SCRIPT = '<script src="../main.js"></script>'
ADS_SCRIPT = '<script src="../ads.js"></script>\n  <script src="../main.js"></script>'


def extract_description(html: str) -> str:
    match = META_DESC_RE.search(html)
    return match.group(1) if match else ""


def patch_context_file(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    html = ADS_SCRIPT_RE.sub("", html)
    html = DUPLICATE_ROBOTS_RE.sub(r"\1", html)
    html = html.replace(
        '  <meta name="robots" content="index, follow" />  <link rel="stylesheet"',
        '  <meta name="robots" content="index, follow" />\n  <link rel="stylesheet"',
    )

    description = extract_description(html)
    intro_block = (
        '\n            <section class="context-intro" aria-label="Sobre este contexto">\n'
        f'              <p class="context-intro-text">{description}</p>\n'
        "            </section>\n"
    )

    if 'class="context-intro"' not in html:
        html = HOW_TO_USE_END.sub(r"\1" + intro_block + r"\2", html, count=1)

    if 'id="contextAdSlot"' not in html:
        ad_block = '\n            <div id="contextAdSlot" class="context-ad-slot" aria-label="Publicidade"></div>'
        html = SENTENCES_LIST.sub(ad_block + r"\1", html, count=1)

    if '../ads.js' not in html:
        html = html.replace(MAIN_SCRIPT, ADS_SCRIPT)

    path.write_text(html, encoding="utf-8")


def main() -> None:
    files = sorted(CONTEXT_DIR.glob("*.html"))
    for path in files:
        patch_context_file(path)
    print(f"Patched {len(files)} context pages")


if __name__ == "__main__":
    main()
