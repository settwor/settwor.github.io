#!/usr/bin/env python3
"""
Strict mini-Jekyll used only to test the templates (real Jekyll cannot be installed here).
It implements the small Liquid subset the site uses and raises on anything else.
Usage: preview.py SRC OUT (normally started through serve.py)
"""
import datetime
import html
import json
import os
import re
import shutil
import sys
import urllib.parse
from zoneinfo import ZoneInfo

import markdown
import yaml

TZ = ZoneInfo("Europe/Warsaw")
SRC, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])


class LiquidError(Exception):
    pass


# ---------------------------------------------------------------- helpers
def is_blank(v):
    if v is None or v is False:
        return True
    if isinstance(v, str):
        return v.strip() == ""
    if isinstance(v, (list, dict)):
        return len(v) == 0
    return False


def truthy(v):
    return not (v is None or v is False)


def to_s(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, datetime.datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S %z")
    return str(v)


def as_dt(v):
    if isinstance(v, datetime.datetime):
        return v if v.tzinfo else v.replace(tzinfo=TZ)
    if isinstance(v, datetime.date):
        return datetime.datetime(v.year, v.month, v.day, tzinfo=TZ)
    if isinstance(v, str) and v.strip():
        d = datetime.datetime.fromisoformat(v.strip().replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=TZ)
    return None


SITE_URL = "https://settwor.com.pl"


def f_date(v, fmt):
    d = as_dt(v)
    if not d:
        return ""
    # "%-d" (day without zero) is not supported on Windows: handle it by hand
    fmt = fmt.replace("%-d", str(d.day)).replace("%-m", str(d.month)).replace("%-H", str(d.hour))
    return d.strftime(fmt)


def f_abs(v):
    s = to_s(v)
    if s.startswith("http"):
        return s
    return SITE_URL + (s if s.startswith("/") else "/" + s)


def _key(v):
    d = as_dt(v) if isinstance(v, (datetime.date, datetime.datetime)) else None
    if d is not None:
        return (1, d.timestamp(), "")
    if v is None:
        return (0, 0, "")
    if isinstance(v, (int, float)):
        return (1, v, "")
    return (2, 0, to_s(v))


def f_sort(v, prop=None):
    v = list(v or [])
    if prop is None:
        return sorted(v, key=_key)
    return sorted(v, key=lambda i: _key(i.get(prop) if isinstance(i, dict) else None))


def f_where(v, prop, val):
    return [i for i in (v or []) if isinstance(i, dict) and i.get(prop) == val]


def f_md(v):
    return markdown.markdown(to_s(v), extensions=["extra", "sane_lists"])


def f_truncate(v, n=50, ell="..."):
    v = to_s(v)
    return v if len(v) <= int(n) else v[: max(0, int(n) - len(ell))] + ell


def _num(v):
    """Like Liquid: nil and "" are 0, "12" is 12, "1.5" is 1.5."""
    if v is None or v is False or v == "" or v == "__BLANK__":
        return 0
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, (int, float)):
        return v
    try:
        t = to_s(v).strip().replace(",", "")
        return int(t) if re.fullmatch(r"-?\d+", t) else float(t)
    except ValueError:
        return 0


def f_divided_by(v, n):
    a, b = _num(v), _num(n)
    if b == 0:
        raise LiquidError("divided by 0")
    if isinstance(a, int) and isinstance(b, int):
        return a // b          # Liquid: integer divided by integer is a whole number
    return a / b


def f_split(v, sep):
    parts = to_s(v).split(sep) if to_s(v) else []
    while parts and parts[-1] == "":      # Ruby (and so Liquid) drops empty pieces at the end
        parts.pop()
    return parts


def f_slice(v, start, length=1):
    t, a, n = to_s(v), int(start), int(length)
    if a < 0:
        a = max(len(t) + a, 0)
    return t[a:a + n]


FILTERS = {
    "sort": f_sort,
    "reverse": lambda v: list(reversed(list(v or []))),
    "where": f_where,
    "size": lambda v: len(v) if v is not None else 0,
    "first": lambda v: (v[0] if v else None),
    "last": lambda v: (v[-1] if v else None),
    "join": lambda v, sep=" ": to_s(sep).join(to_s(i) for i in (v or [])),
    "map": lambda v, k: [i.get(k) if isinstance(i, dict) else None for i in (v or [])],
    "uniq": lambda v: list(dict.fromkeys(v or [])),
    "replace": lambda v, a, b="": to_s(v).replace(to_s(a), to_s(b)),
    "remove": lambda v, a: to_s(v).replace(to_s(a), ""),
    "downcase": lambda v: to_s(v).lower(),
    "upcase": lambda v: to_s(v).upper(),
    "prepend": lambda v, a: to_s(a) + to_s(v),
    "plus": lambda v, n: _num(v) + _num(n),
    "minus": lambda v, n: _num(v) - _num(n),
    "times": lambda v, n: _num(v) * _num(n),
    "divided_by": lambda v, n: f_divided_by(v, n),
    "modulo": lambda v, n: _num(v) % _num(n),
    "floor": lambda v: int(_num(v) // 1),
    "ceil": lambda v: -int(-_num(v) // 1),
    "round": lambda v, d=0: int(round(_num(v))) if not d else round(_num(v), int(d)),
    "abs": lambda v: abs(_num(v)),
    "at_least": lambda v, n: max(_num(v), _num(n)),
    "at_most": lambda v, n: min(_num(v), _num(n)),
    "strip_newlines": lambda v: to_s(v).replace("\n", ""),
    "markdownify": f_md,
    "truncate": f_truncate,
    "url_encode": lambda v: urllib.parse.quote_plus(to_s(v)),
    "default": lambda v, d="": d if (v is None or v is False or v == "" or v == [] or v == {}) else v,
    "date": f_date,
    "date_to_xmlschema": lambda v: (as_dt(v).isoformat(timespec="seconds") if as_dt(v) else ""),
    "escape": lambda v: html.escape(to_s(v), quote=True),
    "xml_escape": lambda v: html.escape(to_s(v), quote=True),
    "strip_html": lambda v: re.sub(r"<[^>]*>", "", to_s(v)),
    "normalize_whitespace": lambda v: re.sub(r"\s+", " ", to_s(v)),
    "strip": lambda v: to_s(v).strip(),
    "append": lambda v, a: to_s(v) + to_s(a),
    "split": lambda v, sep: f_split(v, sep),
    "slice": lambda v, start, length=1: f_slice(v, start, length),
    "jsonify": lambda v: json.dumps(v, ensure_ascii=False, default=to_s),
    "absolute_url": f_abs,
    "uri_escape": lambda v: urllib.parse.quote(to_s(v), safe="/:?#[]@!$&'()*+,;=%-._~"),
}


# ---------------------------------------------------------------- liquid
TOKEN_RE = re.compile(r"({%-?.*?-?%}|{{-?.*?-?}})", re.S)


def tokenize(text):
    parts = TOKEN_RE.split(text)
    out = []
    for p in parts:
        if not p:
            continue
        if p.startswith("{%") or p.startswith("{{"):
            ltrim = p[2] == "-"
            rtrim = p[-3] == "-"
            inner = p[2 + (1 if ltrim else 0): len(p) - 2 - (1 if rtrim else 0)].strip()
            out.append(["tag" if p.startswith("{%") else "out", inner, ltrim, rtrim])
        else:
            out.append(["text", p, False, False])
    # whitespace control
    for i, t in enumerate(out):
        if t[0] != "text":
            if t[2] and i > 0 and out[i - 1][0] == "text":
                out[i - 1][1] = out[i - 1][1].rstrip()
            if t[3] and i + 1 < len(out) and out[i + 1][0] == "text":
                out[i + 1][1] = out[i + 1][1].lstrip()
    return out


def parse(tokens, i=0, stop=()):
    nodes = []
    while i < len(tokens):
        kind, val, _, _ = tokens[i]
        if kind == "text":
            nodes.append(("text", val))
            i += 1
        elif kind == "out":
            nodes.append(("out", val))
            i += 1
        else:
            name = val.split()[0]
            args = val[len(name):].strip()
            if name in stop:
                return nodes, i
            if name in ("if", "unless"):
                branches = []
                cond = args
                body, i = parse(tokens, i + 1, ("elsif", "else", "endif", "endunless"))
                branches.append((cond, body))
                else_body = None
                while True:
                    tname = tokens[i][1].split()[0]
                    targs = tokens[i][1][len(tname):].strip()
                    if tname == "elsif":
                        body, i = parse(tokens, i + 1, ("elsif", "else", "endif", "endunless"))
                        branches.append((targs, body))
                    elif tname == "else":
                        else_body, i = parse(tokens, i + 1, ("endif", "endunless"))
                    else:
                        i += 1
                        break
                nodes.append((name, branches, else_body))
            elif name == "for":
                body, i = parse(tokens, i + 1, ("endfor",))
                i += 1
                nodes.append(("for", args, body))
            elif name == "capture":
                body, i = parse(tokens, i + 1, ("endcapture",))
                i += 1
                nodes.append(("capture", args, body))
            elif name == "comment":
                _, i = parse(tokens, i + 1, ("endcomment",))
                i += 1
            elif name in ("assign", "include"):
                nodes.append((name, args))
                i += 1
            else:
                raise LiquidError(f"unsupported tag: {val}")
    if stop:
        raise LiquidError(f"missing end tag for {stop}")
    return nodes, i


def split_top(s, sep):
    """split on sep outside quotes"""
    out, cur, q = [], "", None
    for ch in s:
        if q:
            cur += ch
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch
            cur += ch
        elif ch == sep:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return out


class Ctx:
    def __init__(self, base):
        self.scopes = [base]

    def get(self, name):
        for sc in reversed(self.scopes):
            if name in sc:
                return sc[name]
        return None

    def assign(self, name, value):
        self.scopes[0][name] = value


def lookup(path, ctx):
    toks = re.findall(r"[A-Za-z_][\w\-]*|\[[^\]]+\]", path)
    if not toks:
        raise LiquidError(f"bad variable: {path}")
    cur = ctx.get(toks[0])
    for t in toks[1:]:
        if t.startswith("["):
            key = eval_expr(t[1:-1], ctx)
            cur = cur[int(key)] if isinstance(cur, list) and key is not None and int(key) < len(cur) else (cur.get(key) if isinstance(cur, dict) else None)
        else:
            if isinstance(cur, dict):
                cur = cur.get(t)
            elif isinstance(cur, (list, str)) and t == "size":
                cur = len(cur)
            elif isinstance(cur, list) and t == "first":
                cur = cur[0] if cur else None
            elif isinstance(cur, list) and t == "last":
                cur = cur[-1] if cur else None
            else:
                cur = None
    return cur


def eval_atom(s, ctx):
    s = s.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        return s[1:-1]
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    if s == "true":
        return True
    if s == "false":
        return False
    if s in ("nil", "null"):
        return None
    if s in ("blank", "empty"):
        return "__BLANK__"
    return lookup(s, ctx)


def eval_expr(s, ctx):
    parts = split_top(s, "|")
    val = eval_atom(parts[0], ctx)
    for f in parts[1:]:
        f = f.strip()
        name, _, rest = f.partition(":")
        name = name.strip()
        if name not in FILTERS:
            raise LiquidError(f"unsupported filter: {name}")
        args = [eval_atom(a, ctx) for a in split_top(rest, ",")] if rest.strip() else []
        val = FILTERS[name](val, *args)
    return val


CMP_RE = re.compile(r"^(.+?)\s+(==|!=|>=|<=|>|<|contains)\s+(.+)$")


def eval_cond(s, ctx):
    s = s.strip()
    if re.search(r"\sor\s", s) and re.search(r"\sand\s", s):
        raise LiquidError(f"do not mix and/or: {s}")
    if re.search(r"\sor\s", s):
        return any(eval_cond(p, ctx) for p in re.split(r"\sor\s", s))
    if re.search(r"\sand\s", s):
        return all(eval_cond(p, ctx) for p in re.split(r"\sand\s", s))
    m = CMP_RE.match(s)
    if not m:
        return truthy(eval_expr(s, ctx))
    a, op, b = eval_expr(m.group(1), ctx), m.group(2), eval_expr(m.group(3), ctx)
    if op in ("==", "!="):
        if b == "__BLANK__":
            res = False if a is None else is_blank(a)   # Liquid 4: nil == blank is false
        elif a == "__BLANK__":
            res = False if b is None else is_blank(b)
        else:
            res = a == b
        return res if op == "==" else not res
    if op == "contains":
        if a is None:
            return False
        return to_s(b) in a if isinstance(a, (str, list)) else False
    a, b = _num(a), _num(b)   # Liquid: nil counts as 0 in comparisons
    return {">": a > b, "<": a < b, ">=": a >= b, "<=": a <= b}[op]


def render(nodes, ctx, includes):
    out = []
    for n in nodes:
        k = n[0]
        if k == "text":
            out.append(n[1])
        elif k == "out":
            v = eval_expr(n[1], ctx)
            if v == "__BLANK__":
                v = ""
            out.append(to_s(v))
        elif k in ("if", "unless"):
            done = False
            for idx, (cond, body) in enumerate(n[1]):
                c = eval_cond(cond, ctx)
                if k == "unless" and idx == 0:
                    c = not c
                if c:
                    out.append(render(body, ctx, includes))
                    done = True
                    break
            if not done and n[2] is not None:
                out.append(render(n[2], ctx, includes))
        elif k == "for":
            m = re.match(r"(\w+)\s+in\s+(.+?)((?:\s+(?:limit|offset):\s*\d+)*)$", n[1])
            if not m:
                raise LiquidError(f"bad for: {n[1]}")
            seq = eval_expr(m.group(2), ctx) or []
            mo = re.search(r"offset:\s*(\d+)", m.group(3))
            ml = re.search(r"limit:\s*(\d+)", m.group(3))
            if mo:
                seq = seq[int(mo.group(1)):]
            if ml:
                seq = seq[: int(ml.group(1))]
            ctx.scopes.append({})
            for i, item in enumerate(seq):
                ctx.scopes[-1][m.group(1)] = item
                ctx.scopes[-1]["forloop"] = {"index": i + 1, "index0": i, "first": i == 0,
                                             "last": i == len(seq) - 1, "length": len(seq)}
                out.append(render(n[2], ctx, includes))
            ctx.scopes.pop()
        elif k == "capture":
            ctx.assign(n[1].strip(), render(n[2], ctx, includes))
        elif k == "assign":
            name, _, expr = n[1].partition("=")
            v = eval_expr(expr, ctx)
            ctx.assign(name.strip(), None if v == "__BLANK__" else v)
        elif k == "include":
            m = re.match(r"(\S+)\s*(.*)$", n[1])
            fname, rest = m.group(1), m.group(2)
            params = {}
            for pm in re.finditer(r"(\w+)=(\"[^\"]*\"|'[^']*'|[^\s]+)", rest):
                params[pm.group(1)] = eval_expr(pm.group(2), ctx)
            path = os.path.join(SRC, "_includes", fname)
            if not os.path.exists(path):
                raise LiquidError(f"include not found: {fname}")
            if fname not in includes:
                includes[fname] = parse(tokenize(open(path, encoding="utf-8").read()))[0]
            ctx.scopes.append({"include": params})
            out.append(render(includes[fname], ctx, includes))
            ctx.scopes.pop()
    return "".join(out)


# ---------------------------------------------------------------- site build
FM_RE = re.compile(r"\A---[ \t]*\r?\n(.*?)^---[ \t]*\r?\n?(.*)\Z", re.S | re.M)


def read_doc(path):
    text = open(path, encoding="utf-8").read()
    m = FM_RE.match(text)
    if not m:
        return None, text
    data = yaml.safe_load(m.group(1)) or {}
    return data, m.group(2)


config = yaml.safe_load(open(os.path.join(SRC, "_config.yml"), encoding="utf-8"))
SITE_URL = config["url"]
now = datetime.datetime.now(TZ)
includes = {}

def apply_defaults(rel, data, kind):
    for d in config.get("defaults", []):
        sc = d.get("scope", {})
        if sc.get("path") and not rel.startswith(sc["path"]):
            continue
        if sc.get("type") and sc["type"] != kind:
            continue
        for k, v in d.get("values", {}).items():
            data.setdefault(k, v)
    return data


# posts
posts = []
for fn in sorted(os.listdir(os.path.join(SRC, "_posts"))):
    if not fn.endswith(".md"):
        continue
    data, body = read_doc(os.path.join(SRC, "_posts", fn))
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})-(.+)\.md$", fn)
    y, mo, d, slug = m.groups()
    post = apply_defaults(f"_posts/{fn}", dict(data), "posts")
    if post.get("published") is False:
        continue
    post["layout"] = post.get("layout", "article")
    dt = as_dt(post["date"]) if post.get("date") else datetime.datetime(int(y), int(mo), int(d), tzinfo=TZ)
    post["date"] = dt
    if post.get("updated"):
        post["updated"] = as_dt(post["updated"])
    if post.get("permalink"):
        post["url"] = post["permalink"]
    else:
        post["url"] = f"/news/{dt:%Y}/{dt:%m}/{slug}/"
    post["_body"] = body
    posts.append(post)
posts.sort(key=lambda p: p["date"], reverse=True)

# _data (files and sub-folders, like Jekyll: _data/platforms/spotify.yml -> site.data.platforms.spotify)
def load_data(folder):
    out = {}
    for fn in sorted(os.listdir(folder)):
        full = os.path.join(folder, fn)
        if os.path.isdir(full):
            out[fn] = load_data(full)
        elif fn.endswith((".yml", ".yaml")):
            out[fn.rsplit(".", 1)[0]] = yaml.safe_load(open(full, encoding="utf-8"))
        elif fn.endswith(".json"):
            out[fn.rsplit(".", 1)[0]] = json.load(open(full, encoding="utf-8"))
    return out


data_dir = os.path.join(SRC, "_data")
site_data = load_data(data_dir) if os.path.isdir(data_dir) else {}


# collections (bio, releases)
collections = {}
for label, opts in (config.get("collections") or {}).items():
    opts = opts or {}
    docs = []
    folder = os.path.join(SRC, "_" + label)
    for fn in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
        if not fn.endswith(".md"):
            continue
        data, body = read_doc(os.path.join(folder, fn))
        doc = apply_defaults(f"_{label}/{fn}", dict(data or {}), label)
        slug = fn[:-3]
        doc["collection"] = label
        doc["slug"] = slug
        if doc.get("date"):
            doc["date"] = as_dt(doc["date"])
        if opts.get("output"):
            if doc.get("permalink"):
                doc["url"] = doc["permalink"]
            else:
                pat = opts.get("permalink", "/:collection/:path/")
                doc["url"] = pat.replace(":collection", label).replace(":path", slug).replace(":name", slug)
        doc["_body"] = body
        docs.append(doc)
    collections[label] = (opts, docs)

site = {"url": SITE_URL, "title": config["title"], "description": config["description"],
        "lang": config["lang"], "time": now, "posts": posts, "data": site_data}
for _k, _v in config.items():  # like real Jekyll: every key of _config.yml is available as site.<key>
    site.setdefault(_k, _v)
for label, (opts, docs) in collections.items():
    site[label] = docs
site["static_files"] = []
for _r, _d, _fs in os.walk(SRC):
    _d[:] = [d for d in _d if not d.startswith(("_", ".")) and d not in config.get("exclude", [])]
    for _f in _fs:
        site["static_files"].append({"path": "/" + os.path.relpath(os.path.join(_r, _f), SRC).replace(os.sep, "/")})

pages = []
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if not d.startswith(("_", ".")) and d not in config.get("exclude", [])]
    for fn in files:
        if fn.startswith(".") or fn in config.get("exclude", []):
            continue
        full = os.path.join(root, fn)
        rel = os.path.relpath(full, SRC)
        if rel.endswith(("_config.yml",)):
            continue
        if fn.endswith((".html", ".xml", ".txt", ".md", ".css", ".js")):
            data, body = read_doc(full)
            if data is not None:
                pages.append((rel, data, body))
                continue
        pages.append((rel, None, None))

def page_url(rel, data, quiet=False):
    """Address of a page file (permalink, or made from the file name like Jekyll does)."""
    if data.get("permalink"):
        return data["permalink"]
    relu = rel.replace(os.sep, "/")
    if not relu.endswith((".html", ".htm", ".md")):
        return "/" + relu                          # xml, txt, js, css keep their names
    base = relu.rsplit(".", 1)[0]
    if base == "index" or base.endswith("/index"):
        return "/" + base[: -len("index")]
    if config.get("permalink", "").endswith("/"):
        # Real Jekyll 3: a custom permalink that ends with "/" also applies to pages.
        if not quiet:
            print(f"NOTE: page {relu} has no permalink and is published at /{base}/")
        return "/" + base + "/"
    return "/" + base + (".html" if relu.endswith(".md") else relu[len(base):])


# site.pages (only files with front matter), like Jekyll: used for example by the lyrics pages
site["pages"] = []
for _rel, _data, _body in pages:
    if _data is not None:
        _d = dict(_data)
        _d["url"] = page_url(_rel, _data, quiet=True)
        _d["path"] = _rel.replace(os.sep, "/")
        site["pages"].append(_d)

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)


def write(url, content):
    rel = url.lstrip("/")
    if url.endswith("/"):
        rel += "index.html"
    dest = os.path.join(OUT, rel)
    if os.path.exists(dest):
        raise SystemExit(f"CONFLICT: two files write to {url}")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, "w", encoding="utf-8").write(content)


def layout_chain(content, page, layout_name):
    while layout_name and layout_name != "null":
        data, body = read_doc(os.path.join(SRC, "_layouts", layout_name + ".html"))
        ctx = Ctx({"site": site, "page": page, "content": content})
        content = render(parse(tokenize(body))[0], ctx, includes)
        layout_name = (data or {}).get("layout")
    return content


def build(url, data, body, is_md=False):
    page = dict(data)
    page["url"] = url
    ctx = Ctx({"site": site, "page": page})
    content = render(parse(tokenize(body))[0], ctx, includes)
    if is_md:
        content = markdown.markdown(content, extensions=["extra", "sane_lists", "toc"])
    page["content"] = content
    html_out = layout_chain(content, page, data.get("layout"))
    write(url, html_out)


for post in posts:
    data = {k: v for k, v in post.items() if k not in ("_body",)}
    build(post["url"], data, post["_body"], is_md=True)

for label, (opts, docs) in collections.items():
    if not opts.get("output"):
        continue
    for doc in docs:
        data = {k: v for k, v in doc.items() if k != "_body"}
        build(doc["url"], data, doc["_body"], is_md=True)

for rel, data, body in pages:
    if data is None:
        dest = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if os.path.exists(dest):
            raise SystemExit(f"CONFLICT: static file {rel}")
        shutil.copy(os.path.join(SRC, rel), dest)
        continue
    url = page_url(rel, data)
    build(url, data, body, is_md=rel.endswith(".md"))

print(f"built {len(posts)} posts, {sum(len(d) for _, d in collections.values())} collection docs and {len(pages)} files into {OUT}")
