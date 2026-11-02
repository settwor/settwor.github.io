# todo i18n: the whole site in every biography language (plan, nothing built yet)

Written in site version 11.28 (plan only, no site code changed). Read this together with `AI-NOTES.md` (rules 1 to 11) and `CHANGELOG.md`. Everything in this file is English on purpose (owner rule 1); talk to the owner in Russian.

## 0. The task in one paragraph

The owner wants the whole site in every language that has a biography in `_bio/`: **en** (main), **ru**, **pl**, **es**, **pt**, **uk**. English stays the main version at the addresses it has today. Every other language gets its own real pages, and Google must be able to find, index and show them (more pages, more information, more chances to be found in each language). This is an SEO and content job, not a "translate button". The owner does NOT want it done in one go: work in the phases below, **one phase = one site version (+0.1), then stop and wait for the owner to say "дальше"**.

## 1. Facts found in the code (v11.27), so nobody has to search again

- Stack: Jekyll 3 with the `github-pages` gem, no other plugins (so NO `jekyll-polyglot`, `jekyll-multiple-languages`, `jekyll-redirect-from`). Hosted on Cloudflare Pages, repository stays the source. Real Jekyll was NOT available in the sandbox; the local emulator is `tools/preview.py` (see AI-NOTES: no `case/when`, partial Liquid). Every phase must be run through `preview.py` and the owner must read the Actions / build log once.
- Languages today exist ONLY for the biography: `_bio/en|ru|pl|es|pt|uk.md`, each with `lang`, `lang_name`, `order`. Addresses are fixed (known to Google, NEVER change them): en `/bio.html`, ru `/bioRU.html`, pl `/bioPL.html` (all three set in `_config.yml` defaults), es `/bio/es/`, pt `/bio/pt/`, uk `/bio/uk/`.
- hreflang exists only for biographies: `_layouts/default.html` lines ~59 to 67 (`page.collection == "bio"`) and `sitemap.xml` (bio block). Every other page has no `lang`, `<html lang>` falls back to `site.lang` (en).
- `_includes/bio-router.html` (included in `default.html`) redirects by JavaScript from `/bio.html` to the visitor's language when the browser language is not English. Google advises against automatic redirects by language. See decision D5.
- Hardcoded English in the structured data: `_includes/article-jsonld.html` (`"inLanguage": "en"`), `_includes/person-jsonld.html` (`subjectOf` has `en` and `ru` Ledgertone pages: that is correct, those are other sites). `_includes/profile-jsonld.html` already takes `lang=`.
- Hardcoded English UI texts (about 75 KB of templates and pages in total): `_includes/header.html`, `footer.html`, `rail-start.html` ("Biography in", "On this site" ...), `rail-follow.html`, `rail-end.html`, `rail-reading.html`, `consent.html`, `push-ask.html`, `subscribe.html`, `empty-state.html`, `back-link.html`, `404.html`, plus the page files `index.html`, `news.html`, `releases.html`, `streams.html`, `photo.html`, `top-phonk-artist.html`, `privacy.html`, `license.html`. Texts already in data (English only): `_data/home.yml`, `_data/pages.yml`, `_data/links.yml` (labels), `_data/bioui.yml` (already has en, ru, pl, es, pt; `uk` is built into `_layouts/bio.html`).
- News: 9 files in `_posts/`, one layout `article`. `site.posts` is used by `_layouts/article.html` (previous / next, latest 5), `_includes/rail-start.html`, `feed.xml`, `sitemap.xml`. **Translated news must NOT go into `_posts`**, or they appear in the English lists and feed.
- Releases: 44 files in `_releases/` (`output: false`, shown in one window on `/releases.html`). Titles are song names: not translated.
- Lyrics: one page (`lyrics/got-me-up-2.md`). Song words are not translated.
- `robots.txt` and `sitemap.xml` are Liquid files (`layout: null`). `sw.js` caches CSS/JS: raise its `VERSION` whenever `css/` or `js/` change.

## 2. Target design (what "done" looks like)

URL scheme (decision D1, recommended default):

| Language | Home | Pattern | Notes |
|---|---|---|---|
| en (main) | `/` | the addresses that exist today, unchanged | never moved, no `/en/` |
| ru, pl, es, pt, uk | `/ru/`, `/pl/`, `/es/`, `/pt/`, `/uk/` | `/<lang>/news/`, `/<lang>/releases/`, `/<lang>/streams/`, `/<lang>/photo/`, `/<lang>/top-phonk-artist/`, `/<lang>/privacy/`, `/<lang>/license/` | folders with a trailing slash; one subfolder per language on the SAME domain (not subdomains, not `?lang=`) |
| biographies | stay where they are | `/bioRU.html`, `/bioPL.html`, `/bio/es/`, `/bio/pt/`, `/bio/uk/` | they join the language clusters, no move, no redirect |

Rules for Google (every phase must keep all of them true):

1. One page per language per topic, real translated text (title, description, headings, body, alt texts, FAQ, JSON-LD `inLanguage`). A page that would be English text under a `/ru/` address is NOT created.
2. Every page is self-canonical (canonical = its own absolute address). Never canonical a translation to the English page.
3. hreflang: every page of a group lists ALL ready versions including itself, with absolute addresses, plus `x-default` = the English page. Codes are language only: `en ru pl es pt uk` (D3 for `pt`). The same set goes into `<head>` and into `sitemap.xml`. Links must be reciprocal: if A lists B, B lists A. Never list a page that is `noindex`, redirected or missing.
4. `<html lang>`, `og:locale` (+ `og:locale:alternate`), `inLanguage` in JSON-LD follow the page language.
5. No automatic redirect or content swap by browser language, IP or cookie on indexable pages. A visitor can switch by a plain crawlable link `<a href hreflang lang>`. A quiet "this page is also in Русский" banner is allowed (D5).
6. Google Translate widgets and client-side translation are not used (Google cannot index them).
7. A translation that is not reviewed yet stays out: front matter `i18n_ready: false` means `noindex, follow`, not in any hreflang set, not in the sitemap, not linked from the language switcher.
8. The language switcher (footer, `lang-switch.html`) links to the SAME page in every language that has a ready version; the link to the language home for a missing version comes in Phase 3. It is part of the header or footer on every page.
9. Names that are never translated: SETTWOR, release and track names, platform names, CDRA, Ledgertone. Dates and numbers: see D4.
10. Owner rules 3, 4, 7, 10, 11 of `AI-NOTES.md` stay in force in every language (no "typed by hand" hint, full numbers, no guessed links, no SoundCloud, ONE artist `@id` `https://settwor.com.pl/#artist`: translated pages refer to it by `@id` and never redefine the type).

## 3. Decisions the owner must make (ask in Russian, short; use the default if the owner says "как хочешь")

- D1 URL scheme: default = table above (English unchanged, others in `/<lang>/`).
- D2 Biography addresses stay as they are: default yes, fixed.
- D3 Portuguese code: default `pt` (same as the biography). Alternative `pt-BR` if the owner wants Brazil only (then change the bio `lang` too: ask first).
- D4 Number format: default = commas in every language (`16,234,264`, owner rule 4). Alternative: local style (`16 234 264`). Dates: write the month as a word in each language.
- D5 Automatic redirect of `/bio.html` by browser language: default = remove it and show a small dismissable suggestion banner on English pages for visitors whose browser language is one of the six. The remembered choice (`localStorage` key `settwor-bio-lang`) is kept.
- D6 Where translated texts live: default = NEW data files `_data/i18n/<lang>.yml` (interface) and, CORRECTED in 11.38 (a folder and a file of the same name collide in Jekyll data), `_data/i18n_home/<lang>.yml` for the home page and `_data/i18n_pages/<lang>.yml` for the other pages (labels only). They are new files the live site does not have yet, so a zip cannot overwrite the owner's work; give them marked "create only if missing" (AI-NOTES rule 8). Templates always fall back to English.
- D7 Translation quality: default = AI drafts, the owner (or someone he trusts) reads each language before `i18n_ready: true`. Ru, uk, pl the owner can check himself; es and pt need a second reader (ask the owner who) before they go live.
- D8 Rollout order: default = pt, pl, ru, uk, es (audience: USA first, then Brazil; Poland is home).
- D9 News: default = translate all 9 articles over time, newest first, one language at a time; articles without a translation simply have no page in that language.

## 4. The phases (do one, stop, wait for "дальше")

Legend: `[ ]` open, `[x]` done (write the version next to it). Each phase ends with the usual: `VERSION`, `_includes/site-version.html`, `CHANGELOG.md`, "Open items" and "Hints" in `AI-NOTES.md`, `sw.js` if css/js changed, bundle `settwor-site-vX.Y-bundle.zip`.

### Phase 1: foundation, no translated text yet (the engine) `[x]` DONE in 11.32 (11.29: checker tool + article inLanguage; 11.30: generic hreflang + noindex for unready + generic sitemap; 11.31: `og:locale`, `i18n-lang.html`, `i18n-t.html`; 11.32: language switcher `lang-switch.html` + CSS; `lang`/`ref`/`order`/`i18n_ready` on English pages are added together with the first translated page, Phase 3)
Goal: the site knows what a language and a translation group are, and prints correct head tags. English output stays byte-for-byte the same except the new tags.
- Front matter contract (document it in AI-NOTES): `lang` (code), `ref` (name of the translation group, same in all languages: `home`, `news`, `releases`, `streams`, `photo`, `top-phonk`, `privacy`, `license`, `bio`, and for articles the English post slug), `i18n_ready` (true / false; English pages are always ready).
- New includes: `i18n-lang.html` (finds `lp`, the prefix: empty for en, `/ru` for ru ...), `i18n-t.html` (text by key with English fallback), `i18n-alternates.html` (all READY pages with the same `ref`, from `site.pages`, `site.bio`, the news collection) and `lang-switch.html`. Unique variable prefixes `i18n_` (assign inside an include is global).
- `_layouts/default.html`: `<html lang>`, generic hreflang block for every page that has a group (replace the bio-only block, keep bio working), `x-default`, `og:locale` and alternates, `noindex` when `i18n_ready` is false.
- `sitemap.xml`: one generic loop with `xhtml:link` alternates for all grouped pages (keep the lists of fixed pages, posts, lyrics working as today).
- Bio: the six `_bio` pages need `ref: bio`. Add it through one `_config.yml` defaults entry for `path: "_bio"` (a 3-line snippet the owner pastes; AI never ships `_config.yml`). The addresses in the existing defaults stay untouched.
- Fix `inLanguage` in `article-jsonld.html` (use `page.lang | default: "en"`).
- New tool `tools/check-hreflang.py` (works on the folder `preview.py` builds): checks self-reference, reciprocity, canonical = own address, `x-default`, no `noindex` page inside a set, valid codes, absolute addresses, every `<html lang>` equals the page language. It is used at the end of every later phase.
- Prototype: one fake test group in a temporary folder (not shipped) to prove that hreflang, canonical and sitemap come out right in `preview.py`. Not tested on real Jekyll: say it.
- Needs the owner: decisions D1 to D6.

### Phase 2: interface texts in every language `[x]` DONE in 11.37 (11.37: skip link + texts of `main.js` / `fluid.js` through `js-strings.html`; 11.33: header; 11.34: footer; 11.35: rails + `i18n-gate.html`; 11.36: consent, push ask, subscribe, empty state, back link, 404; 11.33 also: burger label + `nav-current.html` + `i18n_bio`; ru, pl, es, pt, uk files hold header keys only; header is gated for biography pages until Phase 4. )
- `_data/i18n/<lang>.yml` for ru, pl, es, pt, uk (en = the defaults in the templates, so no `en.yml` is needed): menu names, buttons, footer titles, rails ("Biography in", "On this site", "Follow"), cookie notice (`consent.html`), push ask, empty states, "Skip to content", aria labels, 404, theme switch labels, "Listen on ...".
- Replace hardcoded strings in `header.html`, `footer.html`, `rail-*.html`, `consent.html`, `push-ask.html`, `subscribe.html`, `empty-state.html`, `back-link.html`, `404.html` with `i18n-t.html` calls. Internal links get the language prefix.
- Language switcher in the footer and in the mobile menu (CSS: reuse `.langs`; css/js change means `sw.js` VERSION +1).
- Done when: with `lang: ru` on a test page the header, footer and rails are fully Russian and English pages are unchanged.

### Phase 3: home page in every language `[x]` DONE in 11.38 (code and AI-draft texts; the five pages stay `i18n_ready: false` until the owner has read them, then flip language by language in the D8 order; D1 to D9 defaults used; news list left out until Phase 6)
- `ru/index.html` ... `uk/index.html`: thin files (front matter + one include `home-body.html` made from the current `index.html` body), texts from `_data/i18n_home/<lang>.yml` (hero, About, key line, FAQ, photo alt). Real `seo_title` and `description` per language (use the words people search in that language: "phonk артист и продюсер", "produtor de phonk e funk brasileiro" ...; ask the owner before changing the genre wording, see Open items 11.20).
- JSON-LD on the translated home: WebPage / WebSite nodes with `inLanguage`, refer to `https://settwor.com.pl/#artist` by `@id` only; the one full `MusicGroup` node stays on the English home.
- `i18n_ready: false` until the owner has read the text. Then flip to true language by language (D8 order).

### Phase 4: biographies join the clusters, router removed `[x]` DONE in 11.40 (router replaced by `lang-suggest.html`; gates removed; `ref: bio` needed no `_config.yml` change because the collection is already the group `bio`)
- The six bio pages get `ref: bio`; the generic hreflang covers them; addresses unchanged.
- Remove the language redirect in `bio-router.html` and add the banner (D5). Keep "Biography" menu links pointing to the language of the page the visitor is on.
- Rails and footer: "Biography in" stays; links from every language home to its biography.
- Check with `check-hreflang.py` that nothing that worked for the bio before (hreflang, x-default, sitemap entries) was lost.

### Phase 5: Streams, Releases, Photos, Top Phonk page `[x]` DONE in 11.48 (all pages `i18n_ready: false`; history: (11.41: own texts of `streams.html` read `_data/i18n_pages/<lang>.yml`; 11.42: `stats-trend.html`; 11.43: `stats-details.html`; 11.44: Streams language pages, all `i18n_ready: false`; 11.45: Releases language pages, same state; 11.46: Photo language pages, same state; 11.47: Top Phonk body include, numbers read from one page; 11.48: Top Phonk texts and language pages)
- `/<lang>/streams/`, `/releases/`, `/photo/`, `/top-phonk-artist/`: texts from `_data/i18n_pages/<lang>.yml`; the numbers are the same `stats-*` includes (do not copy the maths; only labels are translated, D4 for format).
- Release names and track names are not translated; the release window text, tabs and labels are.
- `top-phonk-artist.html` has the Ledgertone figures in its front matter (`lt_*`): translated pages read the SAME values, never a second copy.

### Phase 6: news in every language `[x]` DONE for pt in 11.57; pl, ru, uk, es done as drafts in 11.63 to 11.65 (9 of 9 each; file names of non-pt articles start with `<lang>-`, e.g. `pl-2026-11-01-...md`; all five languages have all nine articles) (11.49: article layout is language aware and translated; 11.50: News list pages, not ready; 11.51: columns, breadcrumbs, push preview per language; 11.52: article groups by slug, first article pt; 11.53: second article pt; 11.54: third article pt; 11.55: fourth and fifth article pt; 11.56: sixth and seventh article pt; 11.57: last two articles pt)
- New collection `news_tr` (folder `_news_tr/`, `output: true`) so `site.posts`, the feed and the English lists stay English only. File = one translated article, front matter: `lang`, `ref` (English post slug), `i18n_ready`, `title`, `description`, `date` (same as the English post), explicit `permalink: /<lang>/news/<yyyy>/<mm>/<slug>/`, `layout: article`.
- `_config.yml` needs the new collection (the owner pastes a 4-line snippet, AI never ships `_config.yml`).
- `article.html` / `article-jsonld.html` / `rail-start.html`: previous / next and "latest" must stay inside the same language (filter by `lang`).
- `/<lang>/news/` list page. Per-language feeds are NOT made (English feed only).
- Translate newest first (D9).

### Phase 7: privacy, license, lyrics `[x]` DONE in 11.59 (11.58: engine, pt and pl pages; 11.59: ru, uk, es pages and the photo viewer link; all `i18n_ready: false`)
- `privacy` and `license` are translated (legal text: add a line "The English version is the reference").
- Lyrics are not translated; the lyrics page keeps no hreflang. The translated release window still links to the one lyrics page.

### Phase 8: Pages CMS and the owner's guide `[x]` DONE in 11.68 (11.68: `docs/i18n-guide-ru.md`; 11.66: `news_tr` collection in `.pages.yml`; 11.67: five groups "Texts: <language>" for `_data/i18n*`)
- `.pages.yml`: groups "Texts: Русский", "Texts: Polski" ... for `_data/i18n/*`, the `news_tr` collection with a `lang` select and an `i18n_ready` switch. Keep the English groups as they are.
- `docs/i18n-guide-ru.md` (Russian, for the owner): how to add a translated article, how to turn a language on (`i18n_ready: true`), what never to change (`ref`, `permalink`).

### Phase 9: launch checks and Search Console `[x]` code part DONE in 11.69 (checker run, rule 12, file map); the Search Console steps below are the owner's and wait until a language goes live
- Run `check-hreflang.py` on the full build; read the real build log.
- Owner steps (outside the code): submit `sitemap.xml` again; Inspect URL and "Request indexing" for each language home; look at Pages > "Alternate page with proper canonical tag" and "Duplicate" reports after 2 to 4 weeks; check validator.schema.org on one translated page per language. Note: Google's old International Targeting report is gone; do not set it. Results take weeks; do not promise a date.
- Update `AI-NOTES.md` file map and rule list (one new rule: "never add an English text under a language address").

## 5. Never do

- Never move or redirect existing English addresses or the existing biography addresses.
- Never put a translated page into hreflang or the sitemap while it is `noindex` or unreviewed.
- Never use one canonical for all languages; never hreflang without the return link.
- Never ship `_data/*` that already exists live (`home.yml`, `pages.yml`, `links.yml`, `bioui.yml`, `platforms/`), `_posts`, `_bio`, `_releases`, `_config.yml`.
- Never auto-translate in the browser or redirect by browser language on indexable pages.
- Never translate lyrics or write them from the internet; never invent links (rule 7).
- Never add junk files to the zip (11.25 rule).

**11.70: the owner switched every language on (all pages and articles `i18n_ready: true`) without reading the drafts. New translations still start with `i18n_ready: false`.**

## 6. Status

| Phase | Version | State |
|---|---|---|
| Plan | 11.28 | done |
| 1 foundation | 11.32 | done: checker, article `inLanguage`, generic hreflang, `i18n_ready`, generic sitemap, `og:locale`, prefix include, `i18n-t.html`, switcher `lang-switch.html` |
| 2 interface texts | 11.37 | done: header, footer, rails, cookie notice, push ask, subscribe, empty state, back link, 404, skip link, script texts |
| 3 home pages | 11.38 | done as code: `home-body.html`, five pages `i18n_ready: false` (not read yet), `i18n-urls.html` fallback, `i18n-date.html` |
| 4 biographies and router | 11.40 | done: no redirect, quiet bar on English pages, bio pages have their own interface language, `i18n_u_home` |
| 5 streams, releases, photos, top phonk | 11.48 | done: Streams, Releases and Photo done as code in five languages (`*-body.html`, pages `<lang>/streams/`, `/releases/`, `/photo/`, not ready); Top Phonk too (11.47 body, 11.48 texts and pages) |
| 6 news | 11.65 | done: 9 articles in each of pt, pl, ru, uk, es (all not ready) |
| 7 privacy, license, lyrics | 11.59 | done: privacy and license pages in all five languages (not ready), links per language in footer, cookie notice, right column and photo viewer |
| 8 Pages CMS and guide | 11.68 | done: `news_tr` collection, five text groups in `.pages.yml`, owner guide `docs/i18n-guide-ru.md` |
| 9 launch checks | 11.69 | code part done (checker 0 errors on the full build, rule 12, file map); Search Console steps wait for the owner |
