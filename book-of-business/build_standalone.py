#!/usr/bin/env python3
"""Build book-of-business.html: the whole app in one file that opens by
double-clicking (no server). Data is kept in the browser's local storage.

    python3 book-of-business/build_standalone.py
"""

from pathlib import Path

HERE = Path(__file__).resolve().parent
STATIC = HERE / "static"
OUT = HERE / "book-of-business.html"


def main():
    html = (STATIC / "index.html").read_text()
    css = (STATIC / "styles.css").read_text()
    scripts = "\n".join((STATIC / name).read_text() for name in ("local-store.js", "app.js"))
    link = '<link rel="stylesheet" href="styles.css">'
    tag = '<script src="app.js"></script>'
    assert link in html and tag in html, "index.html layout changed; update build_standalone.py"
    html = html.replace(link, f"<style>\n{css}</style>")
    # Keep a literal "</script" inside the JS from ending the inline block early.
    scripts = scripts.replace("</script", "<\\/script")
    html = html.replace(tag, f"<script>\n{scripts}</script>")
    OUT.write_text(html)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
