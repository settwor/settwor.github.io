# SETTWOR site: version history

Every change of the site raises the version. The archive is named `settwor-site-vX.Y.zip`.

## 2.3
- Home page on phones: the name SETTWOR is much smaller, the photo is smaller, spacing is tighter, the buttons are easier to tap, the first screen shows the text sooner.
- Home page: the button "Newest release" is removed (on all screens). Under "Listen on Spotify" there is a row of quick links: Apple Music, YouTube Music, Pandora (links from `_includes/artist-urls.html`).
- Checked at 320, 390 and 1100 px: no sideways scrolling, buttons stay on one line. Pictures were not in the archive, so the photo itself was not seen.
- Files: `index.html`, `css/main.css`, `sw.js` (cache version v11), `VERSION`, `CHANGELOG.md`, `AI-NOTES.md`. The field "latest_label" in `_data/home.yml` is not used any more (harmless, nothing to delete).

## 2.2
- Footer: on phones and narrow screens the footer texts are in one column (were in two). Wide screens keep four columns.
- Files: `css/main.css`, `sw.js` (cache version v10), `VERSION`, `CHANGELOG.md`, `AI-NOTES.md`.

## 2.1
- Artist links added all over the site: new block "Listen to SETTWOR" in the right column, a new "Listen" column in the footer (every page), the Streams page "Official profiles" and the structured data (`sameAs`). Links: Spotify, Apple Music, Pandora, YouTube Music (the last two were given by the owner).
- New file `_includes/artist-urls.html` keeps the checked links as defaults, so no data file is shipped. A link filled in Pages CMS > Streams > platform still wins.
- Footer has 4 columns on wide screens (was 3). `sw.js` cache version v9.
- Files: new `_includes/artist-urls.html`; changed `_includes/rail-follow.html`, `_includes/footer.html`, `_includes/person-jsonld.html`, `_includes/stats-calc.html`, `_includes/stats-details.html`, `streams.html`, `css/main.css`, `sw.js`, `VERSION`, `CHANGELOG.md`, `AI-NOTES.md`.

## 2.0
- Black panel (home and Streams): numbers changed by the owner's decision. The BIG number is now music platforms + YouTube release videos. The smaller number under it is music platforms + the whole YouTube channel (release videos and all other videos). The bar and the list under the numbers are unchanged: only music platforms and release videos.
- Files: `_includes/stats-panel.html`, `_includes/stats-calc.html` (comment only), `VERSION`, `CHANGELOG.md`, `AI-NOTES.md`.

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
