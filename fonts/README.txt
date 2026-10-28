FONTS FOLDER (SETTWOR site)
===========================
The site uses ONE typeface: Geologica (SIL Open Font License 1.1, free for commercial use).
Licence text: OFL.txt (keep it in this folder). @font-face: /fonts.css. Colour/size tokens: css/main.css section 1.

FILES THAT MUST BE HERE
  Geologica-VariableFont.woff2   main file (small, used by every modern browser)
  Geologica-VariableFont.ttf     fallback for old browsers
  OFL.txt                        licence (already here)

HOW TO PUT THE FONT FILES HERE (3 steps)
  1. Download the family from https://fonts.google.com/specimen/Geologica (button "Get font" -> "Download all").
     In the zip take the variable file, its name starts with "Geologica[" or "Geologica-VariableFont".
     Also take OFL.txt from the same zip and, if its text differs from the OFL.txt here, use the one from the zip.
  2. Run:  pip install fonttools brotli
           python tools/make-font-woff2.py "path/to/that/Geologica variable file.ttf"
     The script writes both files above into this folder.
  3. Commit and publish. Do NOT add other fonts without checking their licence first (see AI-NOTES.md, section "Font").

RULES OF THE LICENCE IN SHORT (not legal advice)
  - Free for commercial and personal use, on the website and in products.
  - If you copy the font files (like this folder does), keep the copyright line and OFL.txt with them.
  - The font files may not be sold on their own. A credit on pages is not required (license.html has one anyway).
  - If OFL.txt declares a "Reserved Font Name", a modified font must not use that name. Do not edit the glyphs.
