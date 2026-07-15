#!/usr/bin/env python3
"""Generate robots.txt, sitemap.xml, and canonical tags from site-url.txt."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = (ROOT / "site-url.txt").read_text(encoding="utf-8").strip().rstrip("/")

CONTEXT_PAGES = sorted((ROOT / "contextos").glob("*.html"))
LEGAL_PAGES = [
    "about.html",
    "contact.html",
    "cookies.html",
    "privacy-policy.html",
    "terms.html",
]

CANONICAL_RE = re.compile(r'\s*<link rel="canonical" href="[^"]*" />\n?', re.MULTILINE)
ROBOTS_RE = re.compile(r'\s*<meta name="robots" content="[^"]*" />\n?', re.MULTILINE)


def write_robots() -> None:
    (ROOT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n",
        encoding="utf-8",
    )


def write_sitemap() -> None:
    entries = [
        f"  <url>\n    <loc>{SITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>"
    ]

    for path in CONTEXT_PAGES:
        loc = f"{SITE_URL}/contextos/{path.name}"
        entries.append(
            f"  <url>\n    <loc>{loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>"
        )

    for name in LEGAL_PAGES:
        loc = f"{SITE_URL}/{name}"
        entries.append(
            f"  <url>\n    <loc>{loc}</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.4</priority>\n  </url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")


def set_robots_and_canonical(html: str, canonical: str, robots: str = "index, follow") -> str:
    html = CANONICAL_RE.sub("", html)
    html = ROBOTS_RE.sub("", html)
    description_match = re.search(r'\s*<meta name="description"[^>]*/>\s*', html)
    if not description_match:
        raise ValueError("Could not find meta description")
    insert_at = description_match.end()
    block = (
        f'\n  <meta name="robots" content="{robots}" />\n'
        f'  <link rel="canonical" href="{canonical}" />\n'
    )
    return html[:insert_at] + block + html[insert_at:]


def patch_index() -> None:
    path = ROOT / "index.html"
    html = path.read_text(encoding="utf-8")
    html = set_robots_and_canonical(html, f"{SITE_URL}/", "index, follow")
    path.write_text(html, encoding="utf-8")


def patch_context_pages() -> None:
    for path in CONTEXT_PAGES:
        canonical = f"{SITE_URL}/contextos/{path.name}"
        html = path.read_text(encoding="utf-8")
        path.write_text(set_robots_and_canonical(html, canonical), encoding="utf-8")


def patch_legal_pages() -> None:
    for name in LEGAL_PAGES:
        path = ROOT / name
        canonical = f"{SITE_URL}/{name}"
        html = path.read_text(encoding="utf-8")
        path.write_text(set_robots_and_canonical(html, canonical), encoding="utf-8")


def main() -> None:
    write_robots()
    write_sitemap()
    patch_index()
    patch_context_pages()
    patch_legal_pages()
    print(f"SEO applied for {SITE_URL}")
    print(f"  contexts: {len(CONTEXT_PAGES)}")
    print(f"  legal pages: {len(LEGAL_PAGES)}")


if __name__ == "__main__":
    main()
