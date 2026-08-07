#!/usr/bin/env python3
"""Re-apply quieter overview CSS to existing analytics HTML pages (preserves body content)."""

from __future__ import annotations

import re
from pathlib import Path

from _generate_module_overviews import css_block

ROOT = Path(__file__).resolve().parent
RGB = re.compile(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)")


def accents_from_css(style: str) -> tuple[tuple[int, int, int], tuple[int, int, int]] | None:
    a1_m = re.search(r"--accent-1:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)", style)
    a2_m = re.search(r"--accent-2:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)", style)
    if not a1_m or not a2_m:
        return None
    a1 = (int(a1_m.group(1)), int(a1_m.group(2)), int(a1_m.group(3)))
    a2 = (int(a2_m.group(1)), int(a2_m.group(2)), int(a2_m.group(3)))
    return a1, a2


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    m = re.search(r"(<style>\s*)(.*?)(\s*</style>)", text, re.S)
    if not m:
        print(f"skip {path.name}: no style")
        return False
    accents = accents_from_css(m.group(2))
    if not accents:
        print(f"skip {path.name}: no accents")
        return False
    a1, a2 = accents
    quiet = css_block(a1, a2)
    new_text = text[: m.start()] + m.group(1) + quiet + m.group(3) + text[m.end() :]
    # Warm grid hero class (keep any existing attributes)
    new_text2, n_hero = re.subn(
        r'<header class="hero(?![\w-])([^"]*)">',
        lambda mm: '<header class="hero grid">' if "grid" not in mm.group(1) else mm.group(0),
        new_text,
        count=1,
    )
    if n_hero == 0:
        new_text2, n_hero = re.subn(
            r"<header class='hero(?![\w-])([^']*)'>",
            lambda mm: "<header class='hero grid'>" if "grid" not in mm.group(1) else mm.group(0),
            new_text,
            count=1,
        )
    new_text = new_text2
    if new_text == text:
        print(f"unchanged {path.name}")
        return False
    path.write_text(new_text, encoding="utf-8")
    print(f"quieted {path.name}")
    return True


def main() -> None:
    changed = 0
    for path in sorted(ROOT.glob("*.html")):
        if patch_file(path):
            changed += 1
    print(f"updated {changed} pages")


if __name__ == "__main__":
    main()
