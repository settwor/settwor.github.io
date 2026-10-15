#!/usr/bin/env python3
"""
Fetches YouTube numbers and writes _data/auto_stats.json (the site reads it).
Used by .github/workflows/stats.yml every 3 hours. Needs one secret: YOUTUBE_API_KEY
(Google Cloud -> APIs -> YouTube Data API v3 -> create an API key).
Settings (handle / channel_id / track_playlist / track_videos) are read from _data/streams.yml.

What is counted:
  channel_total_views  all views of the whole channel (the number from the channel itself)
  clips_views          views of the videos in the releases playlist (+ extra track_videos) that belong to the channel
  other_views          channel_total_views - clips_views   (so nothing is counted twice)
  playlist_views_all   every video in the playlist, even from other channels (for information only)

If something fails the old file stays as it was AND the run is marked red in GitHub -> Actions,
with the reason in the log.

  --dry-run   only print the result (nothing is written)
Local test (Windows):  set YOUTUBE_API_KEY=your_key  then  python tools\\fetch-stats.py --dry-run
"""
import datetime
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "_data", "auto_stats.json")
API = "https://www.googleapis.com/youtube/v3/"


class Fail(Exception):
    pass


def call(endpoint, key, **params):
    params["key"] = key
    url = API + endpoint + "?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            msg = json.loads(body)["error"]["message"]
        except Exception:
            msg = body[:300]
        raise Fail(f"YouTube API {endpoint} answered {e.code}: {msg}")


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def main():
    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not key:
        print("No YOUTUBE_API_KEY: nothing to do (the numbers typed in Pages CMS are used).")
        return 0
    with open(os.path.join(ROOT, "_data", "streams.yml"), encoding="utf-8") as f:
        cfg = (yaml.safe_load(f) or {}).get("youtube") or {}
    extra = [str(v).strip() for v in (cfg.get("track_videos") or []) if str(v).strip()]

    # 1) the channel: its total views and the playlist of all its uploads
    params = {"part": "id,contentDetails,statistics"}
    if str(cfg.get("channel_id") or "").strip():
        params["id"] = str(cfg["channel_id"]).strip()
    else:
        params["forHandle"] = "@" + str(cfg.get("handle") or "settwor").lstrip("@")
    res = call("channels", key, **params)
    if not res.get("items"):
        raise Fail(f"Channel not found for {params}. Check the channel name / ID in _data/streams.yml.")
    ch = res["items"][0]
    channel_id = ch["id"]
    channel_total = int(ch["statistics"].get("viewCount", 0))

    # 2) the releases playlist (every page) + the extra clips
    def playlist_ids(pl):
        out, token = [], None
        while True:
            p = {"part": "contentDetails", "playlistId": pl, "maxResults": 50}
            if token:
                p["pageToken"] = token
            page = call("playlistItems", key, **p)
            out += [i["contentDetails"]["videoId"] for i in page.get("items", [])]
            token = page.get("nextPageToken")
            if not token:
                return out

    ids = []
    playlist = str(cfg.get("track_playlist") or "").strip()
    if playlist:
        ids += playlist_ids(playlist)
    ids += extra
    ids = list(dict.fromkeys(ids))

    # 3) views of every one of them; only videos of THIS channel are taken away from the channel total
    own = other_channels = missing = 0
    for part in chunks(ids, 50):
        found = {}
        for v in call("videos", key, part="snippet,statistics", id=",".join(part)).get("items", []):
            found[v["id"]] = v
        missing += sum(1 for i in part if i not in found)       # private / deleted videos
        for v in found.values():
            n = int(v["statistics"].get("viewCount", 0))
            if v["snippet"]["channelId"] == channel_id:
                own += n
            else:
                other_channels += n

    if playlist and not ids:
        raise Fail("The releases playlist is empty or not public. Check track_playlist in _data/streams.yml.")

    clips = own
    other = max(channel_total - clips, 0)
    result = {
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
        "youtube": {
            "channel_total_views": channel_total,
            "clips_views": clips,
            "other_views": other,
            "playlist_videos": len(ids) - missing,
            "playlist_views_other_channels": other_channels,
        },
    }
    text = json.dumps(result, indent=2) + "\n"
    print(text)
    if missing:
        print(f"Note: {missing} video(s) of the playlist are private or deleted and cannot be counted.")
    if "--dry-run" in sys.argv:
        return 0
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(text)
    print("Saved", OUT)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Fail as e:
        print("ERROR:", e)
        sys.exit(1)          # red run in GitHub Actions; the old file stays as it was
