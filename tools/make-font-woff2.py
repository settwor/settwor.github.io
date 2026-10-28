#!/usr/bin/env python3
"""
SETTWOR: tools/make-font-woff2.py
=================================
WHAT:   Puts the Geologica font into /fonts under the names that /fonts.css expects.
        Writes fonts/Geologica-VariableFont.woff2 (converted) and fonts/Geologica-VariableFont.ttf (copy).
        The glyphs are not changed, only the file format (allowed by the SIL OFL, see fonts/OFL.txt).
USAGE:  pip install fonttools brotli
        python tools/make-font-woff2.py "C:/path/to/Geologica[CRSV,SHRP,slnt,wght].ttf"
        Run it from the site root (the folder that contains fonts.css).
NEEDS:  Python 3.8+, the packages fonttools and brotli (brotli is needed for woff2).
SEE:    fonts.css (@font-face), fonts/README.txt (the full steps), fonts/OFL.txt (licence).
"""
import shutil
import sys
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "fonts"      # <site root>/fonts
OUT_NAME = "Geologica-VariableFont"                              # must match fonts.css


def convert(src: Path, out_dir: Path = OUT_DIR, flavor: str = "woff2") -> Path:
    """Writes <out_dir>/<OUT_NAME>.<flavor> from the .ttf file `src`; returns the new path."""
    from fontTools.ttLib import TTFont                           # imported here so --help works without it
    font = TTFont(str(src))
    font.flavor = flavor                                         # "woff2" (needs brotli) or "woff"
    dst = out_dir / f"{OUT_NAME}.{flavor}"
    font.save(str(dst))
    return dst


def main(argv: list) -> int:
    if len(argv) != 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 1
    src = Path(argv[1])
    if not src.is_file() or src.suffix.lower() != ".ttf":
        print(f"ERROR: {src} is not a .ttf file")
        return 1
    try:
        import brotli  # noqa: F401  (only checks that it is installed)
        from fontTools.ttLib import TTFont  # noqa: F401
    except ImportError:
        print("ERROR: run first:  pip install fonttools brotli")
        return 1
    OUT_DIR.mkdir(exist_ok=True)
    woff2 = convert(src)
    ttf = OUT_DIR / f"{OUT_NAME}.ttf"
    shutil.copyfile(src, ttf)
    print(f"OK: {woff2} ({woff2.stat().st_size // 1024} KB)")
    print(f"OK: {ttf} ({ttf.stat().st_size // 1024} KB)")
    print("Check that fonts/OFL.txt is next to them. Then publish the site.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
