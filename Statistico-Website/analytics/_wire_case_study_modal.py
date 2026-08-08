#!/usr/bin/env python3
"""Wire overview Start Case Study CTAs to the framed modal (not a new tab)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRIPT_TAG = (
    '<script src="/Statistico-Website/assets/js/case-study-modal.js?v=20260808frame"></script>'
)


def patch(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    # Fix accidental escaped quotes from prior patches
    text = text.replace('\\"', '"')

    # Case-study links: stay in-page (framed modal handles them)
    def repl_case(m: re.Match) -> str:
        attrs = m.group(1)
        attrs = re.sub(r'\s*target="_blank"', "", attrs)
        attrs = re.sub(r"\s*target='_blank'", "", attrs)
        attrs = re.sub(r'\s*rel="noopener noreferrer"', "", attrs)
        if "js-case-study" not in attrs:
            attrs = attrs.replace('class="btn btn-primary"', 'class="btn btn-primary js-case-study"', 1)
        return f"<a{attrs}>{m.group(2)}</a>"

    text = re.sub(
        r'<a([^>]*href="/statistico-analytics/dialogs/views/[^"]*embed=1[^"]*demo=1[^"]*"[^>]*)>(.*?)</a>',
        repl_case,
        text,
        flags=re.S,
    )

    if SCRIPT_TAG not in text:
        if "nav-template.js" in text:
            text = text.replace(
                '<script src="/Statistico-Website/assets/js/nav-template.js?v=2026-07-31-navactivefix"></script>',
                '<script src="/Statistico-Website/assets/js/nav-template.js?v=2026-07-31-navactivefix"></script>\n  '
                + SCRIPT_TAG,
                1,
            )
        else:
            text = text.replace("</body>", f"  {SCRIPT_TAG}\n</body>", 1)

    if text == orig:
        print(f"unchanged {path.name}")
        return False
    path.write_text(text, encoding="utf-8")
    print(f"wired {path.name}")
    return True


def main() -> None:
    n = 0
    for path in sorted(ROOT.glob("*.html")):
        if patch(path):
            n += 1
    print(f"updated {n} pages")


if __name__ == "__main__":
    main()
