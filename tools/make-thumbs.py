#!/usr/bin/env python3
"""Makes small copies of the photographs for the grid on the Photos page.

Run it in the folder of the site:   python3 tools/make-thumbs.py
Needs once:                         pip install pillow

For every picture images/NAME.jpeg (or .jpg) a copy images/small/NAME.jpeg
about 600 pixels wide is made. Copies that already exist are skipped, so it is
safe to run again after adding new photographs. Then commit the new files.
The page works without the copies too: it then loads the big pictures."""
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is missing. Run once:  pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "images")
TARGET = os.path.join(SOURCE, "small")
SIZE = 600

os.makedirs(TARGET, exist_ok=True)
made = 0
for name in sorted(os.listdir(SOURCE)):
    path = os.path.join(SOURCE, name)
    if not os.path.isfile(path) or not name.lower().endswith((".jpg", ".jpeg")):
        continue
    out = os.path.join(TARGET, name)
    if os.path.exists(out):
        continue
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((SIZE, SIZE * 2))
        img.save(out, "JPEG", quality=80, optimize=True, progressive=True)
    made += 1
    print("made", os.path.relpath(out, ROOT))
print(f"Done: {made} new small pictures.")
