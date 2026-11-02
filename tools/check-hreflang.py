#!/usr/bin/env python3
"""Checks the language tags of a built site (the folder made by tools/preview.py).

Usage:  python tools/check-hreflang.py <built-folder> [https://settwor.com.pl] [-v]

For every page that has hreflang links it checks:
  1. the page lists itself,                      2. canonical = its own address,
  3. x-default is present,                       4. addresses are absolute,
  5. every target exists and is not noindex,     6. links are reciprocal (A lists B, B lists A),
  7. <html lang> equals the page's own code,     8. codes are valid (en ru pl es pt uk).
It also lists indexable pages without any hreflang (information only).
Exit code 1 when an error is found. English only: no third-party packages.
"""
import sys, os, re
from html.parser import HTMLParser

VALID = {"en", "ru", "pl", "es", "pt", "uk", "x-default"}


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lang = None
        self.canonical = None
        self.robots = ""
        self.alt = []
        self.refresh = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "link":
            rel = (a.get("rel") or "").lower()
            if rel == "canonical":
                self.canonical = a.get("href")
            elif rel == "alternate" and a.get("hreflang"):
                self.alt.append((a["hreflang"], a.get("href")))
        elif tag == "meta":
            if (a.get("name") or "").lower() == "robots":
                self.robots = (a.get("content") or "").lower()
            if (a.get("http-equiv") or "").lower() == "refresh":
                self.refresh = True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    root = os.path.abspath([x for x in sys.argv[1:] if not x.startswith("-")][0])
    args = [x for x in sys.argv[1:] if not x.startswith("-")]
    site = (args[1] if len(args) > 1 else "https://settwor.com.pl").rstrip("/")
    pages = {}
    for d, _, files in os.walk(root):
        for f in files:
            if not f.endswith(".html"):
                continue
            path = os.path.join(d, f)
            rel = os.path.relpath(path, root).replace(os.sep, "/")
            url = site + "/" + rel
            if rel.endswith("index.html"):
                url = site + "/" + rel[: -len("index.html")]
            h = Head()
            with open(path, encoding="utf-8", errors="replace") as fh:
                h.feed(fh.read(60000))
            pages[url] = h
    errors, infos = [], []
    for url, h in sorted(pages.items()):
        if h.refresh or "noindex" in h.robots:
            continue
        if not h.alt:
            infos.append(url)
            continue
        here = dict((c, u) for c, u in h.alt)
        mine = [c for c, u in h.alt if u == url]
        if not mine:
            errors.append(f"{url}: does not list itself")
        if "x-default" not in here:
            errors.append(f"{url}: no x-default")
        if h.canonical != url:
            errors.append(f"{url}: canonical is {h.canonical}")
        for code, href in h.alt:
            if code not in VALID:
                errors.append(f"{url}: invalid code {code}")
            if not (href or "").startswith("https://"):
                errors.append(f"{url}: not absolute: {href}")
                continue
            t = pages.get(href)
            if t is None:
                errors.append(f"{url}: target missing: {href}")
                continue
            if "noindex" in t.robots or t.refresh:
                errors.append(f"{url}: target is noindex or redirect: {href}")
            if not any(u == url for c, u in t.alt):
                errors.append(f"{url}: not reciprocal, {href} does not list it")
            if code != "x-default" and (t.lang or "") != code:
                errors.append(f"{href}: <html lang> is {t.lang}, hreflang says {code}")
    print(f"pages: {len(pages)}, with hreflang: {len(pages) - len(infos)}, errors: {len(errors)}")
    for e in errors:
        print("ERROR", e)
    if infos and "-v" in sys.argv:
        for u in infos:
            print("info (no hreflang)", u)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
