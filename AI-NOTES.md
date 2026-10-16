# AI-NOTES: read this first (for any AI or developer who gets this site)

This file is the memory of the project. It is NOT published on the website (it is in `exclude` in `_config.yml`).

## The line to paste into a new chat (the owner can copy it)

> Это мой сайт (архив). Сначала прочитай AI-NOTES.md и CHANGELOG.md и следуй правилам оттуда. После любых изменений: подними версию в VERSION, допиши CHANGELOG.md, обнови разделы "Open items" и "Hints for the next chat" в AI-NOTES.md, и назови архив settwor-site-vX.Y.zip (X.Y = новая версия сайта).

English: "This is my site (archive). Read AI-NOTES.md and CHANGELOG.md first and follow them. After every change: raise the number in VERSION, add an entry to CHANGELOG.md, update "Open items" and "Hints for the next chat" in AI-NOTES.md, and name the archive settwor-site-vX.Y.zip (X.Y = the new site version)."

## Rules from the owner (always follow)

1. Talk to the owner in Russian. The website itself is in English.
2. Name every archive with the SITE version: `settwor-site-v1.7.zip`. Never "archive 3". Every change raises the version by 0.1 (`VERSION` file, entry in `CHANGELOG.md`).
3. The public website must never say or hint that numbers are typed or entered by hand. Not on the page, not in tooltips. (It does not build trust.) Comments in code and CMS field names are fine, visitors do not see them.
4. Numbers are shown in full with commas (16,234,264). Never round, never "2M+".
5. The biggest number in the black panel never includes YouTube video views; the number with videos is smaller and sits under it.
6. Look: monochrome black and white site. Only the platform colours (logos) are coloured. Everything must be neat, even, same-size cards, no crooked layouts.
7. Do not guess links. Only put a platform URL if it was checked (the artist name, Kryvyi Rih, born 8 Feb 2007). A wrong link is worse than none.
8. Deliver: a zip with ONLY the code, templates, styles, scripts and config that changed (full paths), so the owner can unzip over the folder. Say which file must be deleted by hand.
   **NEVER put content or data files in the zip**: `_data/*.yml`, `_data/platforms/*`, `_data/auto_stats.json`, `_posts`, `_releases`, `_bio`, `_config.yml` values the owner may have changed. The owner edits them in Pages CMS and the live copy is on GitHub, so a zip overwrites their work (this happened in versions 1.1 to 1.6 and wiped the plays the owner had entered). Make templates work with defaults instead. If a new data file is truly needed, do not zip it: tell the owner to create it in Pages CMS, or give it as a separate file marked "create only if missing".
9. If you could not test something (the live site, the YouTube API, real Jekyll), say so plainly.

## What the site is

- Official site of SETTWOR (phonk and Brazilian funk producer, Kryvyi Rih, Ukraine, based in Poland). Address: https://settwor.github.io (GitHub Pages, repository `settwor.github.io`).
- Jekyll (the `github-pages` gem, Jekyll 3, Liquid 4). No plugins beyond GitHub Pages. Pictures are not in the archive (the owner removes them).
- Content is edited by the owner in **Pages CMS** (`.pages.yml`). Texts live in `_data/*.yml`, news in `_posts`, releases in `_releases`, biographies in `_bio`.
- The service worker `sw.js` caches CSS/JS. **When CSS or JS changes, raise `VERSION` in `sw.js`** (const VERSION = 'v7' at the time of 1.4), or visitors see old styles.

## Local preview (the owner works on Windows)

- `start.bat` -> `tools/serve.py` -> `tools/preview.py <site> <site>/_preview`, then serves it.
- `tools/preview.py` is an EMULATOR of Jekyll written in Python, not real Jekyll. It supports only part of Liquid. If it crashes with `unsupported filter/tag`, either add the filter to `FILTERS` in `preview.py` or avoid it. Real GitHub Pages can still fail where the preview works, so ask the owner for the log of Actions > "pages build and deployment" if the live site does not update.
- Already added to the preview: divided_by, times, modulo, floor, ceil, round, abs, at_least, at_most, Ruby-like `split` (drops empty pieces at the end), negative `slice`, nil/"" counted as 0 in numbers and comparisons, `.json` and sub-folders in `_data`.
- Not supported by the preview: `case/when`. Do not write `a contains b == false`, use `unless`.
- Liquid: `assign` inside an include is global; use unique variable names (the prefixes `st_`, `nf_`, `p_`).

## The numbers system (the main work so far)

Pages: the home page shows only the black panel (a link) before the news; `/streams.html` shows everything.

Data and flow:
- Music platforms: one file per platform in `_data/platforms/<key>.yml` (the owner's live data, never ship them) with `y2027 ... y2021`, `earlier`, optional `url`. Keys: spotify, apple_music, pandora, youtube_music, deezer, amazon_music, tidal, soundcloud, yandex_music, vk_music, other. A year or platform left empty is not shown. The owner edits them in Pages CMS > group "Streams".
- YouTube: `tools/fetch-stats.py` (GitHub Action `.github/workflows/stats.yml`, every 3 hours, secret `YOUTUBE_API_KEY`) writes `_data/auto_stats.json`: `clips_views` (releases playlist, only videos of the own channel), `other_views` (= channel total minus clips_views), `channel_total_views`. Setup (handle, playlist id) is in `_data/streams.yml`; `clips_views_fallback` / `other_views_fallback` are used only while `auto_stats.json` is missing.
- Maths (`_includes/stats-calc.html`): music total = sum of all platform years; YouTube whole channel = clips + other; grand total = music + whole channel (no double counting). In the black panel the BIG number is the music total only (`st_plat_total`); the grand total (`st_total`, with YouTube video views) is the smaller number under it. Owner's decision, v1.6. Platforms are sorted biggest first by building strings `"000000123456|key|Name~"` and sorting them.
- Includes: `stats-calc.html` (all numbers), `stats-panel.html` (black panel, `link=` makes it clickable), `stats-block.html` (home section), `stats-details.html` (cards and YouTube tiles), `num-full.html` (full number with commas, no rounding).
- Colours: CSS classes `c-<key>` in `css/main.css` (Spotify green, Apple Music pink, Pandora blue, Deezer purple, Amazon cyan, TIDAL white/black, SoundCloud orange, Yandex yellow, VK blue, YouTube reds). Pandora's brand colour is blue, not purple.
- `js/stats.js`: count-up, bars grow, cards appear. Layout adapts with a CSS container query (`.numbers { container: numbers / inline-size }`).
- The Streams page also has "Official profiles" (links from `_data/links.yml` plus platform `url`s, `rel="me"`) and schema.org JSON-LD. Do not add text explaining how numbers are counted (the owner removed it).

## File map (only what matters)

- `index.html` home; `streams.html` Streams page; `releases.html`; `photo.html`; `_layouts/`; `_includes/` (header, footer, rails, stats-*).
- `_data/home.yml`, `pages.yml` (page headings), `links.yml` (official channels), `streams.yml`, `platforms/`, `auto_stats.json` (made by the Action, may be missing locally: `git pull`).
- `css/main.css` (one big file), `js/main.js`, `js/stats.js`, `sw.js`.
- `tools/` preview and stats scripts. `docs/` the owner's guides (Russian). `VERSION`, `CHANGELOG.md`, `AI-NOTES.md`.

## Open items (update this list at the end of every session)

- Only the Apple Music artist link was found and checked. Missing: Deezer, Pandora, TIDAL, Amazon Music, SoundCloud, Yandex Music, VK Music, YouTube Music. The owner can paste them in Pages CMS > Streams > platform > "Your artist page link".
- The YouTube API part was never run by an AI (no network). If numbers look wrong, ask for the log of the Action "Update stats" (a failure turns the run red with the reason).
- The live site was never seen by an AI; the owner once reported that the black panel was missing online while it showed locally (likely not pushed, or a Pages build error, or the cached CSS).
- The "status" on the Streams page is only a small Live / Verified badge. The owner asked for "a status", the exact meaning was not confirmed.

## Hints for the next chat (update this section at the end of every session)

- Start by reading `CHANGELOG.md`, then this file. Ask the owner only what you cannot find here.
- Before changing Liquid, run `python tools/preview.py . /tmp/out` (needs `pyyaml` and `markdown`) and look at the HTML. Screenshots with Playwright are a good check (390 px wide and 1100 px).
- Keep each change small, raise the version, write the CHANGELOG entry in plain English: what changed, which files, why.
- If the owner reports a bug, first ask: was it pushed to GitHub, did the Pages build pass, did a hard refresh (Ctrl+F5) help.
