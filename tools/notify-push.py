#!/usr/bin/env python3
"""
Sends a browser push notification (OneSignal) about every NEW article (a new file in _posts).
Used by .github/workflows/push-news.yml. Needs one secret (see docs/news-guide-ru.md):
  ONESIGNAL_API_KEY   the "REST API Key" of the OneSignal app
The App ID is read from onesignal_app_id in _config.yml.

The address of the article is NOT calculated: the script waits until the article appears in
the published /feed.xml and takes the address from there. So it never sends a link that does
not open yet, and special addresses (permalink in an article) work by themselves.

Usage:
  notify-push.py FILE [FILE ...]            normal run
  notify-push.py --dry-run FILE [FILE ...]  only print what would be sent
  --feed URL_OR_FILE   where to read the feed from (default: the live site)
"""
import json
import os
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATOM = "{http://www.w3.org/2005/Atom}"
API = "https://api.onesignal.com/notifications"
WAIT_MINUTES = 15


def read_json_yaml(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return yaml.safe_load(f)


def front_matter(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    return (yaml.safe_load(m.group(1)) or {}) if m else {}


def fetch(src):
    if os.path.exists(src):
        with open(src, "rb") as f:
            return f.read()
    req = urllib.request.Request(src, headers={"User-Agent": "settwor-push/1.0", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def find_link(feed_src, title):
    """Return the address of the feed entry with this title, or None."""
    try:
        root = ET.fromstring(fetch(feed_src))
    except Exception as e:  # network or XML problem: try again later
        print("  feed not readable yet: %s" % e)
        return None
    for entry in root.findall(ATOM + "entry"):
        if (entry.findtext(ATOM + "title") or "").strip() == title.strip():
            link = entry.find(ATOM + "link")
            if link is not None and link.get("href"):
                return link.get("href")
    return None


def page_is_live(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "settwor-push/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200
    except Exception:
        return False


def send(app_id, key, title, text, url, segment="Total Subscriptions"):
    body = json.dumps({
        "app_id": app_id,
        "target_channel": "push",
        "included_segments": [segment],
        "headings": {"en": title},
        "contents": {"en": text},
        "url": url,
    }).encode("utf-8")
    req = urllib.request.Request(API, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "Authorization": "Key " + key,
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8") or "{}")


SEGMENTS = ["Total Subscriptions", "Active Subscriptions", "Subscribed Users"]


def diagnose(app_id, key):
    """Print what OneSignal sees for this App ID + key (helps to find a mismatch)."""
    print("DIAG: app_id=%s  key=%s...%s (len %d)" % (app_id, key[:4], key[-4:], len(key)))
    url = "https://api.onesignal.com/players?app_id=%s&limit=1" % app_id
    for scheme in ("Key", "Basic"):
        try:
            req = urllib.request.Request(url, headers={"Authorization": "%s %s" % (scheme, key)})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8") or "{}")
            print("DIAG: players total_count=%s (auth scheme %s)" % (data.get("total_count"), scheme))
            return
        except Exception as e:
            detail = e.read().decode("utf-8", "replace")[:200] if hasattr(e, "read") else ""
            print("DIAG: players request with %s failed: %s %s" % (scheme, e, detail))


def send_any_segment(app_id, key, title, text, url):
    res = {}
    for seg in SEGMENTS:
        res = send(app_id, key, title, text, url, seg)
        print("OneSignal answered for segment '%s': %s" % (seg, json.dumps(res, ensure_ascii=False)))
        if res.get("id") and not res.get("errors"):
            return res
    diagnose(app_id, key)
    return res


def main(argv):
    dry = "--dry-run" in argv
    feed = "https://settwor.com.pl/feed.xml"
    files = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--feed":
            feed = argv[i + 1]
            i += 1
        elif not a.startswith("--"):
            files.append(a)
        i += 1
    if not files:
        print("No new articles: nothing to send.")
        return 0

    app_id = str((read_json_yaml("_config.yml") or {}).get("onesignal_app_id") or "")
    key = os.environ.get("ONESIGNAL_API_KEY", "")
    if not dry and (not app_id or not key):
        print("OneSignal is not set up (onesignal_app_id or ONESIGNAL_API_KEY is empty): nothing sent.")
        return 0

    failed = 0
    for path in files:
        # accept "_posts/2026-10-10-title.md", "2026-10-10-title.md" or just "2026-10-10-title"
        path = path.strip()
        candidates = [path, os.path.join("_posts", path), os.path.join("_posts", path + ".md")]
        found = next((c for c in candidates if os.path.isfile(c)), None)
        if not found:
            print("FAILED: article file not found: %s (looked in _posts)" % path)
            failed += 1
            continue
        path = found
        meta = front_matter(path)
        title = str(meta.get("title") or "").strip()
        if not title or meta.get("published") is False:
            print("Skipped (no title or not published): %s" % path)
            continue
        text = re.sub(r"\s+", " ", str(meta.get("description") or title)).strip()
        if len(text) > 180:
            text = text[:177].rstrip() + "..."

        deadline = time.time() + WAIT_MINUTES * 60
        url = None
        while True:
            url = find_link(feed, title)
            if url and (dry or page_is_live(url)):
                break
            if dry or time.time() > deadline:
                url = None
                break
            print("  waiting for the article to appear on the site...")
            time.sleep(30)
        if not url:
            print("FAILED: the article did not appear on the site: %s" % path)
            failed += 1
            continue

        if dry:
            print("DRY RUN\n  title: %s\n  text:  %s\n  url:   %s" % (title, text, url))
            continue
        try:
            res = send_any_segment(app_id, key, title, text, url)
            if not res.get("id") or res.get("errors"):
                print("NOT SENT: OneSignal created no message. Most likely nobody is subscribed yet "
                      "(check OneSignal -> Audience -> Subscriptions) or the API key / App ID do not match.")
                failed += 1
            else:
                print("Sent: %s -> %s (message id %s)" % (title, url, res["id"]))
        except Exception as e:
            detail = e.read().decode("utf-8", "replace") if hasattr(e, "read") else ""
            print("FAILED to send %s: %s %s" % (path, e, detail))
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
