#!/usr/bin/env python3
"""
Fetches YouTube numbers and writes _data/auto_stats.json (the site reads it).
Used by .github/workflows/stats.yml every 3 hours. Needs one secret: YOUTUBE_API_KEY
(Google Cloud -> APIs -> YouTube Data API v3 -> create an API key).
Settings (handle / channel_id / track_videos) are read from _data/streams.yml.
If anything fails the old file stays as it was.
  --dry-run   only print the result
"""
import datetime
import json
import os
import sys
import urllib.parse
import urllib.request

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "_data", "auto_stats.json")
API = "https://www.googleapis.com/youtube/v3/"


def call(endpoint, key, **params):
    params["key"] = key
    url = API + endpoint + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def main():
    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not key:
        print("No YOUTUBE_API_KEY: nothing to do.")
        return 0
    with open(os.path.join(ROOT, "_data", "streams.yml"), encoding="utf-8") as f:
        cfg = (yaml.safe_load(f) or {}).get("youtube") or {}
    track_ids = {str(v).strip() for v in (cfg.get("track_videos") or []) if str(v).strip()}

    params = {"part": "contentDetails,statistics"}
    if cfg.get("channel_id"):
        params["id"] = cfg["channel_id"]
    else:
        params["forHandle"] = "@" + str(cfg.get("handle", "settwor")).lstrip("@")
    ch = call("channels", key, **params)
    if not ch.get("items"):
        print("Channel not found:", params)
        return 1
    ch = ch["items"][0]
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]

    ids, token = [], None
    while True:
        p = {"part": "contentDetails", "playlistId": uploads, "maxResults": 50}
        if token:
            p["pageToken"] = token
        page = call("playlistItems", key, **p)
        ids += [i["contentDetails"]["videoId"] for i in page.get("items", [])]
        token = page.get("nextPageToken")
        if not token:
            break

    views = {}
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        for v in call("videos", key, part="statistics", id=",".join(chunk)).get("items", []):
            views[v["id"]] = int(v["statistics"].get("viewCount", 0))

    clips = sum(n for vid, n in views.items() if vid in track_ids)
    total_videos = sum(views.values())
    other = total_videos - clips
    result = {
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
        "youtube": {
            "clips_views": clips,
            "other_views": other,
            "videos": len(views),
            "channel_total_views": int(ch["statistics"].get("viewCount", 0)),
        },
    }
    text = json.dumps(result, indent=2) + "\n"
    if "--dry-run" in sys.argv:
        print(text)
        return 0
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(text)
    print("Saved", OUT, result)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # keep the old numbers
        print("Failed, old numbers kept:", e)
        sys.exit(0)
