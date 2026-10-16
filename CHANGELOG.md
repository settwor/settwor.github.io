# SETTWOR site: version history

Every change of the site raises the version. The archive is named `settwor-site-vX.Y.zip`.

## 1.9
- Black panel (home and Streams): finished the 1.8 change. The other YouTube videos are not counted in any number, bar or list of the panel. Only the big number (music platforms) and the smaller number under it (music platforms + YouTube release videos) remain. The panel is now shown whenever that smaller number is above zero (before, the whole channel was checked, so a channel with only other videos could show an empty panel).
- Files: `_includes/stats-panel.html`, `_includes/stats-block.html`, `sw.js` (cache version v8, so visitors get the new styles), `VERSION`, `CHANGELOG.md`, `AI-NOTES.md`.
- The YouTube section of the Streams page is unchanged: whole channel, release videos, other videos.

## 1.8
- Black panel (home and Streams): the other YouTube videos are no longer counted or shown there. The smaller number is music platforms + YouTube release videos; the bar and the list under it have no "other videos". The YouTube section of the Streams page still shows the whole channel, release videos and other videos.

## 1.7
- Archives no longer contain data files (everything the owner edits in Pages CMS: `_data/*.yml`, `_data/platforms/`, `_posts`, `_releases`, `_bio`). Earlier archives (1.1 to 1.6) did, and they overwrote the plays and texts the owner had entered. The owner restores them from the GitHub history.
- The Apple Music artist link and the Streams page heading text now have defaults in the templates, so no data file has to be shipped.

## 1.6
- Black panel: the big number is now the streams on music platforms only. Under it, a smaller number "with YouTube video views" (music platforms plus the whole YouTube channel).

## 1.5
- Streams page: the block "How the numbers are counted" removed.
- New file AI-NOTES.md: project memory and rules for any AI that gets the site, with a line to paste into a new chat.

## 1.4
- Streams page: the status line has only the Live / Verified badge, no text and no date.
- Streams page: the second part of the YouTube bar (Other videos) is visible.
- Apple Music artist page link added.
- Version number and this history added to the site files.

## 1.3
- Home: the black panel is one link to Streams; every platform has its own line and colour.
- Streams page redesigned (equal cards, status, official profiles, how the numbers are counted, structured data).
- Mobile menu: all items animate.

## 1.2
- New Streams page, Pages CMS group Streams (one file per platform), home page shows only the black panel before the news.

## 1.1
- Fixed start.bat (preview.py filters, JSON data), new numbers block, full numbers, YouTube script reports errors.

## 1.0
- The archive as it was received.
