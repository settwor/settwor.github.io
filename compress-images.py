#!/usr/bin/env python3
"""Shrinks the pictures of the site and makes small copies for the page grids.

Runs by itself on GitHub (.github/workflows/compress-images.yml) whenever
pictures are added to the folder images (Pages CMS or git). By hand:

    python3 tools/compress-images.py                 # every picture
    python3 tools/compress-images.py images/a.jpg    # only these files
    python3 tools/compress-images.py --dry-run       # only show what would happen
    python3 tools/compress-images.py --force         # also rebuild all small copies

Needs once:  pip install pillow

1) The originals (.jpg .jpeg .png .webp) are shrunk in place, same name:
   - JPEG / WebP: quality 90, which looks the same as the original to the eye;
   - PNG: lossless only (every pixel stays exactly the same);
   - the long side is limited to 3000 px (only bigger pictures are scaled);
   - the rotation from the phone is fixed, GPS is removed, the rest of the
     metadata (author, copyright) stays;
   - the new file is kept only if it is at least 10% smaller, so running it
     again on a picture that is already shrunk changes nothing.
2) Small copies for the Photos page, the home page and the Releases page:
   images/small/<same path>.webp  (photos 800 px, covers 640 px, quality 85).
   They are made for images/photos/*, images/releases/*, every picture in
   _data/gallery.yml and every cover in _releases/*.md.
Skipped: images/small/, SVG, GIF, animated pictures."""
import glob
import os
import re
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is missing. Run once:  pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, "images")
SMALL = os.path.join(IMAGES, "small")

MAX_SIDE = 3000          # longest side of an original, in pixels
SKIP_BELOW = 800 * 1024  # a normal-sized file smaller than this is left alone
QUALITY = 90             # originals: practically no visible change
MIN_GAIN = 0.10          # keep the result only if the file is 10% smaller
THUMB_PHOTO = 800        # width of the small copy of a photo
THUMB_COVER = 640        # side of the small copy of a cover
THUMB_QUALITY = 85
EXTS = (".jpg", ".jpeg", ".png", ".webp")

DRY = "--dry-run" in sys.argv
FORCE = "--force" in sys.argv
Image.MAX_IMAGE_PIXELS = 300_000_000  # allow very big camera files


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def is_picture(p):
    return os.path.isfile(p) and p.lower().endswith(EXTS)


def inside_images(p):
    p = os.path.abspath(p)
    return p.startswith(IMAGES + os.sep) and not p.startswith(SMALL + os.sep)


def collect(args):
    if args:
        paths = [os.path.abspath(a) for a in args]
    else:
        paths = []
        for folder, dirs, files in os.walk(IMAGES):
            dirs[:] = [d for d in dirs if os.path.join(folder, d) != SMALL]
            paths += [os.path.join(folder, f) for f in files]
    return sorted(p for p in paths if inside_images(p) and is_picture(p))


def referenced():
    """Pictures named in the gallery (image:) and in the releases (cover:)."""
    found = {}
    def read(path, key, kind):
        try:
            text = open(path, encoding="utf-8").read()
        except OSError:
            return
        for m in re.finditer(r"^\s*(?:-\s*)?%s:\s*(.+?)\s*$" % key, text, re.M):
            v = m.group(1).strip().strip("'\"")
            if v and "://" not in v:
                found[os.path.join(ROOT, v.lstrip("/"))] = kind
    read(os.path.join(ROOT, "_data", "gallery.yml"), "image", "photo")
    for f in glob.glob(os.path.join(ROOT, "_releases", "*.md")):
        read(f, "cover", "cover")
    return found


def thumb_kind(path, refs):
    """'photo', 'cover' or None (no small copy needed)."""
    if path in refs:
        return refs[path]
    if path.startswith(os.path.join(IMAGES, "releases") + os.sep):
        return "cover"
    if path.startswith(os.path.join(IMAGES, "photos") + os.sep):
        return "photo"
    return None


def shrink(path):
    """Shrinks one original. Returns (old, new) or None if left as it is."""
    old = os.path.getsize(path)
    ext = os.path.splitext(path)[1].lower()
    tmp = path + ".tmp"
    try:
        with Image.open(path) as src:
            if getattr(src, "n_frames", 1) > 1:   # animated: do not touch
                return None
            big = max(src.size) > MAX_SIDE
            if not big and old < SKIP_BELOW:
                return None
            icc = src.info.get("icc_profile")
            sampling = None
            if src.format == "JPEG":                # keep the colour detail of the source
                from PIL import JpegImagePlugin
                sampling = JpegImagePlugin.get_sampling(src)
                sampling = sampling if sampling in (0, 1, 2) else None
            img = ImageOps.exif_transpose(src)
            exif = img.getexif()
            exif.pop(0x8825, None)                 # remove GPS position
            exif = exif.tobytes() if len(exif) else None
            if big:
                img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            extra = {}
            if icc:
                extra["icc_profile"] = icc
            if exif:
                extra["exif"] = exif
            if ext in (".jpg", ".jpeg"):
                if sampling is not None:
                    extra["subsampling"] = sampling
                img.convert("RGB").save(tmp, "JPEG", quality=QUALITY, optimize=True,
                                        progressive=True, **extra)
            elif ext == ".png":
                keep = img if img.mode in ("RGB", "RGBA", "L", "LA", "P") else img.convert("RGBA")
                keep.save(tmp, "PNG", optimize=True, **extra)
            else:
                img.save(tmp, "WEBP", quality=QUALITY, method=6, **extra)
        new = os.path.getsize(tmp)
        # a scaled picture is always kept; otherwise it must be clearly smaller
        if new < old and (big or new <= old * (1 - MIN_GAIN)):
            if not DRY:
                os.replace(tmp, path)
            return old, new
        return None
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def thumb_path(path):
    return os.path.join(SMALL, os.path.relpath(path, IMAGES)) + ".webp"


def make_thumb(path, kind, rebuild):
    out = thumb_path(path)
    if os.path.exists(out) and not (rebuild or FORCE):
        return False
    size = THUMB_PHOTO if kind == "photo" else THUMB_COVER
    with Image.open(path) as src:
        if getattr(src, "n_frames", 1) > 1:
            src.seek(0)
        icc = src.info.get("icc_profile")
        img = ImageOps.exif_transpose(src)
        alpha = img.mode in ("RGBA", "LA") or "transparency" in img.info
        img = img.convert("RGBA" if alpha else "RGB")
        img.thumbnail((size, size * 2), Image.LANCZOS)   # width <= size, tall photos keep ratio
        if not DRY:
            os.makedirs(os.path.dirname(out), exist_ok=True)
            img.save(out, "WEBP", quality=THUMB_QUALITY, method=6,
                     **({"icc_profile": icc} if icc else {}))
    return True


def main():
    given = [a for a in sys.argv[1:] if not a.startswith("--")]
    explicit = bool(given)
    refs = referenced()
    files = collect(given)
    # with no file list also look at pictures that the data files point to
    if not explicit:
        files = sorted(set(files) | {p for p in refs if is_picture(p) and inside_images(p)})
    saved = shrunk = thumbs = 0
    for p in files:
        try:
            res = shrink(p)
            if res:
                shrunk += 1
                saved += res[0] - res[1]
                print(f"{'would shrink' if DRY else 'shrunk'} {rel(p)}: "
                      f"{res[0] // 1024} KB -> {res[1] // 1024} KB")
            kind = thumb_kind(p, refs)
            if kind and make_thumb(p, kind, rebuild=explicit):
                thumbs += 1
                print(f"{'would make' if DRY else 'small copy'} {rel(thumb_path(p))}")
        except Exception as e:  # one broken file must not stop the others
            print(f"skip {rel(p)}: {e}")
    print(f"Done: {shrunk} pictures shrunk ({saved // 1024} KB saved), {thumbs} small copies made.")


if __name__ == "__main__":
    main()
