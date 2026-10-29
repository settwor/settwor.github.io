#!/usr/bin/env python3
"""
Sends a message to the Telegram channel about every NEW article (a new file in _posts).
Used by .github/workflows/telegram-news.yml, it needs two secrets (see docs/news-guide-ru.md):
  TELEGRAM_BOT_TOKEN   the token of the bot (from @BotFather)
  TELEGRAM_CHAT_ID     the channel, for example @settw0r (the bot must be an administrator)
Usage:
  notify-telegram.py FILE [FILE ...]            normal run
  notify-telegram.py --dry-run FILE [FILE ...]  only print what would be sent
"""
import datetime
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

import yaml

SITE = "https://settwor.com.pl"
TZ = ZoneInfo("Europe/Warsaw")


def read_post(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n", text, re.S)
    data = yaml.safe_load(m.group(1)) if m else {}
    return data or {}


def post_url(path, data):
    """The same address Jekyll makes: /news/YYYY/MM/<name>/ (or the permalink of the file)."""
    if data.get("permalink"):
        return SITE + urllib.parse.quote(str(data["permalink"]), safe="/:()_-.~")
    name = re.match(r"(\d{4})-(\d{2})-(\d{2})-(.+)\.md$", os.path.basename(path))
    year, month, _day, slug = name.groups()
    date = data.get("date")
    if isinstance(date, datetime.datetime):
        if date.tzinfo:
            date = date.astimezone(TZ)
        year, month = "%04d" % date.year, "%02d" % date.month
    elif isinstance(date, datetime.date):
        year, month = "%04d" % date.year, "%02d" % date.month
    return "%s/news/%s/%s/%s/" % (SITE, year, month, urllib.parse.quote(slug))


def wait_until_online(url, minutes=15):
    """GitHub Pages needs a minute or two to publish; do not announce a page that is not there yet."""
    deadline = time.time() + minutes * 60
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, method="GET"), timeout=20) as r:
                if r.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(20)
    return False


def send(token, chat, text):
    body = urllib.parse.urlencode({"chat_id": chat, "text": text}).encode()
    req = urllib.request.Request("https://api.telegram.org/bot%s/sendMessage" % token, data=body)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("ok")


def main(argv):
    dry = "--dry-run" in argv
    files = [a for a in argv if not a.startswith("--")]
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not dry and not (token and chat):
        print("Telegram is not set up (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are empty): nothing sent.")
        return 0
    for path in files:
        data = read_post(path)
        if data.get("published") is False:
            print("skipped (hidden):", path)
            continue
        url = post_url(path, data)
        title = str(data.get("title", "")).strip()
        summary = str(data.get("description", "")).strip()
        text = "\n\n".join(part for part in (title, summary, url) if part)
        if dry:
            print("---", path, "\n" + text)
            continue
        if not wait_until_online(url):
            print("The page did not appear online in time, not announced:", url)
            continue
        print("sent:", url, send(token, chat, text))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
