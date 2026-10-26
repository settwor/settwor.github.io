/* =============================================================
   SETTWOR - fluid.js (v9.6): one small spring system, no libraries.
   -------------------------------------------------------------
   Everything that moves under a finger or a mouse is a spring: it has a position, a speed and a target. Every frame the
   target pulls the value. A new spring starts from the value AND the speed that are on the screen now, so any motion can
   be caught or turned round at any moment and nothing jumps. Only scale, translate, rotate and opacity are animated.

   1. Engine        to / set / jump (and get, stop, glide, appear). Settings at the top of 1.
   2. Press         every control, card, text and section answers a press at once (pointerdown, not pointerup).
   3. Hover         mouse and pen only: buttons grow and lean to the pointer, names slide, arrows shoot out.
   4. Avatar        the round photo grows, sinks, can be dragged (rubber band at the edge, throw with a soft bounce).
   5. Lens          one highlight slides between the rows of a list marked data-lens; a ripple opens at a touch.
   6. Keyboard      Enter and Space press a control the same way a mouse does.
   Reduced motion: no scale, no shift, no springs; a press is a short dip of opacity (0.72) and entrances are a plain fade.

   Why `translate`, `rotate` and `scale` (the separate CSS properties) and not one `transform` string: this site already
   has CSS transforms on the same elements (cover tilt, hover lift, reveal). The separate properties are applied before
   `transform` and do not overwrite it, so both work together. Browsers without them (Safari before 14.1) get one
   `transform` string instead.

   The class `fluid` on <html> tells main.css that this file is running: CSS press rules, hover moves and the reveal slide
   step aside only then. Without this file (old browser, blocked script) the CSS rules still work.
   ============================================================= */
(function () {
    'use strict';

    if (!window.PointerEvent || !window.requestAnimationFrame || !window.Map) return;

    var root = document.documentElement;
    var STW = window.STW = window.STW || {};
    var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    var PROPS = !!(window.CSS && CSS.supports && CSS.supports('scale', '1'));

    function reduced() { return reduceQuery.matches; }

    root.classList.add('fluid');

    /* ---------- 1. Engine ---------- */
    // channels: x, y (px), s (scale), sx (extra scale along X), r (degrees), o (opacity). Rest = the value of plain CSS.
    var DEF = { x: 0, y: 0, s: 1, sx: 1, r: 0, o: 1 };
    var REST = { x: 0.04, y: 0.04, s: 0.0004, sx: 0.0004, r: 0.02, o: 0.002 };   // "arrived" threshold of each channel
    var TWO_PI = 2 * Math.PI;
    var MAX_STEP = 0.004;       // s: one physics step is at most 4 ms
    var MAX_DT = 0.05;          // s: a tab that wakes up after a pause must not shoot
    var states = new Map();     // element -> { ch: {k: {p, v, t, w, z, hold}}, css: written strings, ... }
    var raf = 0, last = 0;

    function stateOf(el) {
        var st = states.get(el);
        if (!st) { st = { ch: {}, css: {}, on: false, po: undefined, tr: null, done: null }; states.set(el, st); }
        return st;
    }

    function channel(el, st, k) {
        var c = st.ch[k];
        if (!c) {
            c = st.ch[k] = { p: DEF[k], v: 0, t: DEF[k], w: TWO_PI / 0.4, z: 1, hold: false };
            if (k === 'o' && st.tr === null) guardOpacity(el, st);
        }
        return c;
    }

    // A CSS `transition: opacity` on the element would smooth every frame of the spring (it would lag behind). While the
    // spring owns the opacity, `opacity` is taken out of the transition list (put back when the spring is done).
    function guardOpacity(el, st) {
        var list = window.getComputedStyle(el).transitionProperty.split(',').map(function (s) { return s.trim(); });
        if (list.indexOf('opacity') < 0 && list.indexOf('all') < 0) { st.tr = false; return; }
        st.tr = el.style.transitionProperty;
        el.style.transitionProperty = list.filter(function (s) { return s !== 'opacity' && s !== 'all'; }).join(',') || 'none';
    }

    function wake(el, st, origin) {
        if (!st.on) {
            st.on = true;
            el.style.willChange = PROPS ? 'translate, rotate, scale, opacity' : 'transform, opacity';
        }
        if (origin != null) {
            if (st.po === undefined) st.po = el.style.transformOrigin;
            el.style.transformOrigin = origin;
        }
    }

    function num(n) { return String(Math.round(n * 1000) / 1000); }

    function paint(el, st) {
        var c = st.ch, s = el.style, css = st.css;
        var x = c.x ? c.x.p : 0, y = c.y ? c.y.p : 0, r = c.r ? c.r.p : 0;
        var sc = c.s ? c.s.p : 1, sx = c.sx ? c.sx.p : 1;
        var tr = num(x) + 'px ' + num(y) + 'px', ro = num(r) + 'deg', sl = num(sc * sx) + ' ' + num(sc);
        if (PROPS) {
            if ((c.x || c.y) && css.t !== tr) s.translate = css.t = tr;
            if (c.r && css.r !== ro) s.rotate = css.r = ro;
            if ((c.s || c.sx) && css.s !== sl) s.scale = css.s = sl;
        } else {
            var all = 'translate(' + tr.replace(' ', ', ') + ') rotate(' + ro + ') scale(' + sl.replace(' ', ', ') + ')';
            if (css.a !== all) s.transform = css.a = all;
        }
        if (c.o) {
            var o = num(Math.max(0, Math.min(1, c.o.p)));
            if (css.o !== o) s.opacity = css.o = o;
        }
    }

    function clear(el, st) {
        states.delete(el);
        var s = el.style, css = st.css;
        if (css.t !== undefined) s.removeProperty('translate');
        if (css.r !== undefined) s.removeProperty('rotate');
        if (css.s !== undefined) s.removeProperty('scale');
        if (css.a !== undefined) s.removeProperty('transform');
        if (css.o !== undefined) s.removeProperty('opacity');
        s.removeProperty('will-change');
        if (st.po !== undefined) { if (st.po) s.transformOrigin = st.po; else s.removeProperty('transform-origin'); }
        if (st.tr) s.transitionProperty = st.tr; else if (st.tr === '') s.removeProperty('transition-property');
    }

    // Every channel has arrived. If all of them are back at the plain CSS value the element is cleaned (inline styles,
    // will-change and origin go); a channel that rests somewhere else (a hover scale, a lens position) stays as it is.
    function finish(el, st) {
        var rest = true;
        for (var k in st.ch) {
            var c = st.ch[k];
            if (c.hold || Math.abs(c.p - DEF[k]) > REST[k]) { rest = false; break; }
        }
        var done = st.done;
        st.done = null;
        if (rest) clear(el, st);
        if (done) done(el);
    }

    function atRest(k, c) { return Math.abs(c.p - c.t) < REST[k] && Math.abs(c.v) < REST[k] * 10; }

    function kick() {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }

    function frame(now) {
        raf = 0;
        var dt = Math.min(Math.max((now - last) / 1000, 0), MAX_DT);
        last = now;
        var n = Math.max(1, Math.ceil(dt / MAX_STEP)), h = dt / n, busy = false;
        states.forEach(function (st, el) {
            var moving = false;
            for (var k in st.ch) {
                var c = st.ch[k];
                if (c.hold) continue;                                   // set() owns it (1:1 following): no physics
                if (!atRest(k, c)) {
                    for (var i = 0; i < n; i++) {                       // semi-implicit Euler
                        c.v += (-c.w * c.w * (c.p - c.t) - 2 * c.z * c.w * c.v) * h;
                        c.p += c.v * h;
                    }
                }
                if (atRest(k, c)) { c.p = c.t; c.v = 0; } else moving = true;
            }
            paint(el, st);
            if (moving) busy = true; else finish(el, st);
        });
        if (busy && !raf) raf = requestAnimationFrame(frame);
    }

    function bump(el, k) { var q = el.__fq || (el.__fq = {}); return (q[k] = (q[k] || 0) + 1); }

    // to(el, {x, y, s, sx, r, o}, {t: response s, z: damping, delay: ms, origin: 'x y', v: {k: speed}, done: fn})
    // Aims the channels. Position and speed that are on the screen now are kept.
    function to(el, targets, o) {
        o = o || {};
        var k;
        if (o.delay > 0) {
            var tokens = {}, later = {}, a;
            for (k in targets) tokens[k] = bump(el, k);
            for (a in o) later[a] = o[a];
            later.delay = 0;
            setTimeout(function () {
                var live = {}, any = false, key;
                for (key in targets) if (el.__fq[key] === tokens[key]) { live[key] = targets[key]; any = true; }
                if (any) to(el, live, later);
            }, o.delay);
            return;
        }
        var st = stateOf(el), w = TWO_PI / (o.t || 0.4), z = o.z == null ? 1 : o.z, rd = reduced();
        wake(el, st, o.origin);
        for (k in targets) {
            var c = channel(el, st, k);
            bump(el, k);
            c.t = targets[k]; c.w = w; c.z = z; c.hold = false;
            if (rd) { c.p = c.t; c.v = 0; }                              // reduced motion: no travel, it just arrives
            else if (o.v && o.v[k] != null) c.v = o.v[k];
        }
        if (o.done) st.done = o.done;
        kick();
    }

    // set(el, {k: value}): puts the value on the screen now and holds it (following a finger 1:1, start states)
    function set(el, values) {
        var st = stateOf(el);
        wake(el, st);
        for (var k in values) {
            var c = channel(el, st, k);
            bump(el, k);
            c.p = c.t = values[k]; c.v = 0; c.hold = true;
        }
        paint(el, st);
    }

    // jump(el, {k: value}, speed): moves the shown value, the target stays. speed: a number or {k: speed}
    function jump(el, values, speed) {
        var st = stateOf(el);
        wake(el, st);
        for (var k in values) {
            var c = channel(el, st, k);
            c.p = values[k]; c.hold = false;
            if (speed != null) c.v = typeof speed === 'object' ? (speed[k] || 0) : speed;
        }
        paint(el, st);
        kick();
    }

    function get(el, k) {
        var st = states.get(el);
        return st && st.ch[k] ? st.ch[k].p : DEF[k];
    }

    function stop(el) {
        var st = states.get(el);
        if (st) clear(el, st);
    }

    // Moves a box (absolutely placed, with left/top/width/height) to a new place. The new place is written at once and
    // the shown shape is kept with x, y and sx, then the springs bring it home: caught in the middle of a move it
    // stretches and squeezes (sx) instead of jumping. `box` = {left, top, width, height}; animate = false puts it at once.
    function glide(el, box, animate) {
        var prev = el.__box, s = el.style;
        el.__box = box;
        if (!prev || !animate || reduced()) {
            stop(el);
        }
        var oldL = prev ? prev.left + get(el, 'x') : 0, oldT = prev ? prev.top + get(el, 'y') : 0;
        var oldW = prev ? prev.width * get(el, 'sx') : 0;
        s.left = box.left + 'px'; s.top = box.top + 'px'; s.width = box.width + 'px'; s.height = box.height + 'px';
        if (!prev || !animate || reduced()) return;
        var st = states.get(el);
        if (st && st.ch.sx) st.ch.sx.v *= prev.width / (box.width || 1);   // the speed of the stretch follows the new width
        jump(el, { x: oldL - box.left, y: oldT - box.top, sx: oldW / (box.width || 1) });
        to(el, { x: 0, y: 0, sx: 1 }, { t: 0.4, origin: '0 0' });
    }

    // A thing comes in: from 12 px below and transparent, a 0.5 s spring, one after another (index * 24 ms, at most 14 steps).
    // Returns false when reduced motion is on (the caller shows it with the plain fade of the CSS).
    function appear(el, index) {
        if (reduced()) return false;
        set(el, { y: 12, o: 0 });
        to(el, { y: 0, o: 1 }, { t: 0.5, delay: Math.min(index || 0, 14) * 24 });
        return true;
    }

    STW.fluid = { to: to, set: set, jump: jump, get: get, stop: stop, glide: glide, appear: appear, reduced: reduced };

    /* ---------- settings of the layers (all numbers are here) ---------- */
    var PRESS_T = 0.22;          // response of a press going in
    var RELEASE_T = 0.4;         // response of coming back
    var SLOP = 8;                // px: a press on text or a section is given up after this (text selection, drag)
    var LEAVE = 10;              // px: a press on a control is cancelled this far outside of it, and comes back if the pointer returns
    var TOUCH_DELAY = 70;        // ms: on touch the reaction of cards and text shows after this (the start of a scroll never flashes)
    var MIN_SHOWN = 90;          // ms: a reaction stays visible at least this long, so a very quick tap is seen
    var REDUCED_OPACITY = 0.72;  // reduced motion: the only reaction
    var TILE = { px: 8, min: 0.008, max: 0.03 };      // cards: total shrink in px, kept between min and max (a fraction)
    var SECTION = { px: 3, min: 0, max: 0.006 };
    var TEXT = { px: 10, min: 0.01, max: 0.035 };     // text blocks: shrink on a spring, and a light dip of opacity as well
    var BTN_DEPTH = { min: 0.02, max: 0.045, px: 5 }; // buttons, tabs, chips: shrink = clamp(px / width)
    var DIP_OPACITY = 0.55;
    var TEXT_OPACITY = 0.82;
    var BIG_W = 120, BIG_H = 56; // a link at least this big is a tile, a smaller one is a dip
    var HOVER_BTN = 1.025;       // hover on a button
    var LEAN = { max: 2.5, k: 0.12 };                 // hover: the button leans to the pointer (px)
    var NAME_SHIFT = 2.5;        // px: a name slides to the right on hover
    var ARROW_SHOOT = 3;         // px: an arrow shoots out and returns
    var AVATAR_HOVER = 1.07, AVATAR_DRAG = 1.1;   // the sink on press comes from the button rule (5 px / width)
    var DRAG_START = 8;          // px: a held avatar starts to be dragged after this
    var RUBBER = { from: 18, dim: 140, c: 0.55 };     // 1:1 up to `from` px, then slower and slower
    var THROW = { window: 100, k: 0.55, max: 3000, turn: 0.14 };   // last 100 ms of the gesture, 55 percent of its speed, +-3000 px/s; turn = deg per px

    /* ---------- 2. Press ---------- */
    var SEL_SKIP = '.rmodal, .lightbox, .mobile-menu, .consent, .push-ask, [data-no-press], input, textarea, select, option, [disabled], [aria-disabled="true"]';
    var SEL_CHIP = '.btn, .year-tabs__link, .langs__link';
    var SEL_CONTROL = 'a[href], button, summary, [role="button"], [role="tab"], .link-button, ' + SEL_CHIP;
    var SEL_CARD = '.news-card, .release, .release-mini, .plat, .yt, .numbers__hero, .bio-facts__item, .bio-moments__item, .callout, .faq__item, .embed-block, .empty, figure, .photo-grid li';
    var SEL_TEXT = 'p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote, figcaption, td, th';
    var SEL_SECTION = 'section, article, .page-head, .section__body, .prose, .site-footer';
    var SEL_FIXED_INSIDE = '.consent, .push-ask, .mobile-menu, .lightbox, .rmodal, .progress';   // a scaled box would hold these: such sections do not scale
    var AVATAR = '.hero__ring';

    var presses = new Map();     // pointerId (or 'key') -> the press in progress

    function box(el) { return el.getBoundingClientRect(); }

    function isBig(el) { var b = box(el); return b.width >= BIG_W && b.height >= BIG_H; }

    function holdsFixed(el) {
        var list = el.querySelectorAll(SEL_FIXED_INSIDE);
        for (var i = 0; i < list.length; i++) if (list[i].getClientRects().length) return true;
        return false;
    }

    // Walks up from what was pressed and returns { el, kind } for the one element that answers, or null.
    // 1. the nearest control or card -> btn (button, tab, chip), tile (big) or dip (small link)   2. else text   3. else section
    function resolve(target) {
        if (!target || !target.closest || target.closest(SEL_SKIP)) return null;
        var text = null, section = null;
        for (var el = target; el && el !== document.body && el !== root; el = el.parentElement) {
            if (el.matches(SEL_CONTROL)) return { el: el, kind: el.matches(SEL_CHIP) ? 'btn' : (isBig(el) ? 'tile' : 'dip') };
            if (el.matches(SEL_CARD)) return { el: el, kind: 'tile' };
            if (!text && el.matches(SEL_TEXT)) text = el;
            if (!section && el.matches(SEL_SECTION) && !holdsFixed(el)) section = el;
        }
        if (text) return { el: text, kind: 'text' };
        if (section) return { el: section, kind: 'section' };
        return null;
    }

    function shrinkFor(el, cfg) {
        var b = box(el);
        return Math.min(cfg.max, Math.max(cfg.min, cfg.px / Math.max(b.width, b.height, 1)));
    }

    // scale of an element from its hover and press (several pointers can press one element)
    function ui(el) { return el.__ui || (el.__ui = { n: 0, press: 0, hover: 0 }); }
    function scaleOf(el) {
        var u = el.__ui;
        return !u ? 1 : (u.n > 0 && u.press ? u.press : (u.hover || 1));
    }

    function dipReduced(p, on) {
        var el = p.el;
        if (!el.animate) return;
        if (on) {
            p.base = parseFloat(window.getComputedStyle(el).opacity);
            if (isNaN(p.base)) p.base = 1;
            if (p.anim) p.anim.cancel();
            p.anim = el.animate([{ opacity: p.base }, { opacity: REDUCED_OPACITY }], { duration: 60, fill: 'forwards' });
        } else if (p.anim) {
            var now = window.getComputedStyle(el).opacity;
            p.anim.cancel();
            p.anim = null;
            el.animate([{ opacity: now }, { opacity: p.base }], { duration: 160 });
        }
    }

    function show(p) {
        if (p.shown || p.ended || !p.inside) return;
        clearTimeout(p.timer);
        clearTimeout(p.hideTimer);
        p.shown = true;
        p.shownAt = performance.now();
        var el = p.el, u;
        if (reduced()) { if (p.kind !== 'section') dipReduced(p, true); return; }
        if (p.kind === 'btn' || p.kind === 'tile') {
            u = ui(el);
            u.n++;
            u.press = p.drag ? AVATAR_DRAG : 1 - (p.kind === 'btn' ? Math.min(BTN_DEPTH.max, Math.max(BTN_DEPTH.min, BTN_DEPTH.px / Math.max(box(el).width, 1))) : shrinkFor(el, TILE));
            to(el, { s: scaleOf(el) }, { t: PRESS_T });
        } else if (p.kind === 'section') {
            var b = box(el);
            to(el, { s: 1 - shrinkFor(el, SECTION) }, { t: PRESS_T, origin: Math.round(p.x - b.left) + 'px ' + Math.round(p.y - b.top) + 'px' });
        } else {
            p.base = parseFloat(window.getComputedStyle(el).opacity);
            if (isNaN(p.base)) p.base = 1;
            if (p.base < 0.999) jump(el, { o: p.base });                 // the element is not fully opaque by itself: start from there
            var tg = { o: Math.min(p.base, p.kind === 'dip' ? DIP_OPACITY : TEXT_OPACITY) };
            if (p.kind === 'text') tg.s = 1 - shrinkFor(el, TEXT);       // text springs in too, not only dims
            to(el, tg, { t: PRESS_T });
        }
    }

    function hide(p) {
        if (!p.shown) return;
        p.shown = false;
        var el = p.el, u;
        if (reduced()) { if (p.kind !== 'section') dipReduced(p, false); return; }
        if (p.kind === 'btn' || p.kind === 'tile') {
            u = ui(el);
            u.n = Math.max(0, u.n - 1);
            if (!u.n) u.press = 0;
            to(el, { s: scaleOf(el) }, { t: RELEASE_T });
        } else if (p.kind === 'section') {
            to(el, { s: 1 }, { t: RELEASE_T });
        } else {
            var base = p.base == null ? 1 : p.base;
            var back = { o: base };
            if (p.kind === 'text') back.s = 1;
            to(el, back, { t: RELEASE_T, done: base < 0.999 ? function () { stop(el); } : null });
        }
    }

    // Ends a press. tap = the pointer was lifted in place: a quick tap shows first, then comes back.
    function end(p, tap) {
        if (!p || p.ended) return;
        clearTimeout(p.timer);
        if (!p.shown && tap && p.inside) show(p);
        p.ended = true;
        presses.delete(p.id);
        if (!p.shown) return;
        var wait = Math.max(0, p.shownAt + MIN_SHOWN - performance.now());
        if (wait) p.hideTimer = setTimeout(function () { hide(p); }, wait); else hide(p);
    }

    function endAll(tap) { presses.forEach(function (p) { end(p, tap); }); }

    function begin(id, hit, x, y, immediate, extra) {
        var old = presses.get(id);
        if (old) end(old, false);
        var p = { id: id, el: hit.el, kind: hit.kind, x: x, y: y, timer: 0, hideTimer: 0, shown: false, ended: false, inside: true, base: 1 };
        if (extra) for (var k in extra) p[k] = extra[k];
        presses.set(id, p);
        if (immediate) show(p); else p.timer = setTimeout(function () { show(p); }, TOUCH_DELAY);
        return p;
    }

    document.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        var target = event.target;
        if (!target || !target.closest) return;
        var avatar = target.closest(AVATAR);
        if (avatar && !reduced() && !target.closest(SEL_SKIP)) { avatarDown(event, avatar); return; }
        lensDown(event);
        var hit = resolve(target);
        if (!hit) return;
        // a press is shown at once with a mouse and on a button; on touch a card or a text waits a moment (a scroll may start)
        begin(event.pointerId, hit, event.clientX, event.clientY, event.pointerType === 'mouse' || hit.kind === 'btn');
    }, { passive: true, capture: true });

    document.addEventListener('pointermove', function (event) {
        var p = presses.get(event.pointerId);
        if (p && !p.ended && !p.drag) {
            if (p.kind === 'text' || p.kind === 'section') {
                var dx = event.clientX - p.x, dy = event.clientY - p.y;
                if (dx * dx + dy * dy > SLOP * SLOP) end(p, false);      // it became a selection, a scroll or a drag
            } else {
                var b = box(p.el);
                var inside = event.clientX >= b.left - LEAVE && event.clientX <= b.right + LEAVE &&
                             event.clientY >= b.top - LEAVE && event.clientY <= b.bottom + LEAVE;
                if (inside !== p.inside) {                               // out: the press is taken back; back in: it goes on
                    p.inside = inside;
                    if (inside) show(p); else { clearTimeout(p.timer); hide(p); }
                }
            }
        }
        avatarMove(event);
        hoverMove(event);
        lensMove(event);
    }, { passive: true, capture: true });

    document.addEventListener('pointerup', function (event) {
        avatarUp(event, true);
        lensUp(event);
        end(presses.get(event.pointerId), true);
    }, { passive: true, capture: true });

    document.addEventListener('pointercancel', function (event) {
        avatarUp(event, false);
        lensUp(event);
        end(presses.get(event.pointerId), false);
    }, { passive: true, capture: true });

    document.addEventListener('dragstart', function (event) {
        // the photo and button-like links are not draggable pictures: the browser's drag would take the pointer away,
        // and a press that left a button and came back could not go on
        if (event.target && event.target.closest && event.target.closest(AVATAR + ', ' + SEL_CHIP)) { event.preventDefault(); return; }
        endAll(false);
    }, true);
    document.addEventListener('contextmenu', function () { endAll(false); }, true);
    document.addEventListener('scroll', function () { endAll(false); }, { passive: true, capture: true });
    window.addEventListener('blur', function () { endAll(false); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) endAll(false); });

    /* ---------- 6. Keyboard ---------- */
    document.addEventListener('keydown', function (event) {
        if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
        var hit = resolve(event.target);
        if (!hit || hit.kind === 'text' || hit.kind === 'section') return;
        if (event.key === ' ' && hit.el.tagName === 'A') return;        // Space does not activate a link
        begin('key', hit, 0, 0, true);
    }, true);
    document.addEventListener('keyup', function (event) {
        if (event.key === 'Enter' || event.key === ' ') end(presses.get('key'), true);
    }, true);

    /* ---------- 3. Hover (mouse and pen only) ---------- */
    var SEL_HOVER = SEL_CHIP + ', .section-head__more, .rail-link, ' + AVATAR;
    var hovered = null;

    function hoverKind(el) {
        if (el.matches(AVATAR)) return 'avatar';
        if (el.matches(SEL_CHIP)) return 'chip';
        if (el.matches('.rail-link')) return 'name';
        return 'link';
    }

    function shoot(arrow, dir) {
        to(arrow, { x: dir * ARROW_SHOOT }, {
            t: 0.16,
            done: function () { to(arrow, { x: 0 }, { t: 0.5, z: 0.75 }); }
        });
    }

    function hoverEnter(el) {
        var kind = hoverKind(el), u = ui(el);
        if (kind === 'chip' || kind === 'avatar') {
            u.hover = kind === 'avatar' ? AVATAR_HOVER : HOVER_BTN;
            to(el, { s: scaleOf(el) }, { t: 0.35 });
        } else if (kind === 'name') {
            var name = el.querySelector('.rail-link__name');
            if (name) to(name, { x: NAME_SHIFT }, { t: 0.3 });
        }
        var arrow = el.querySelector('.section-head__arrow, .btn__arrow');
        if (arrow) shoot(arrow, el.matches('.btn--back') ? -1 : 1);
    }

    function hoverLeave(el) {
        var kind = hoverKind(el), u = ui(el);
        if (kind === 'chip' || kind === 'avatar') {
            u.hover = 0;
            to(el, { s: scaleOf(el), x: 0, y: 0 }, { t: RELEASE_T });
        } else if (kind === 'name') {
            var name = el.querySelector('.rail-link__name');
            if (name) to(name, { x: 0 }, { t: RELEASE_T });
        }
    }

    function hoverOn(event) { return event.pointerType !== 'touch' && fineQuery.matches && !reduced(); }

    document.addEventListener('pointerover', function (event) {
        if (!hoverOn(event)) return;
        var el = event.target.closest ? event.target.closest(SEL_HOVER) : null;
        if (el && el.closest(SEL_SKIP)) el = null;
        if (el === hovered) return;
        if (hovered) hoverLeave(hovered);
        hovered = el;
        if (el) hoverEnter(el);
    }, true);

    document.addEventListener('pointerout', function (event) {
        if (hovered && !event.relatedTarget) { hoverLeave(hovered); hovered = null; }
    }, true);

    function hoverMove(event) {
        if (!hovered || !hoverOn(event) || hoverKind(hovered) !== 'chip') return;
        var b = box(hovered);
        var dx = event.clientX - (b.left + b.width / 2), dy = event.clientY - (b.top + b.height / 2);
        var lim = LEAN.max;
        to(hovered, { x: Math.max(-lim, Math.min(lim, dx * LEAN.k)), y: Math.max(-lim, Math.min(lim, dy * LEAN.k)) }, { t: 0.3 });
    }

    /* ---------- 4. Avatar: hold, drag with a rubber band, throw ---------- */
    var drags = new Map();   // pointerId -> { el, x, y, on, trail }

    function rubber(d) {
        var a = Math.abs(d);
        if (a <= RUBBER.from) return d;
        var over = a - RUBBER.from;
        return (d < 0 ? -1 : 1) * (RUBBER.from + (over * RUBBER.dim * RUBBER.c) / (RUBBER.dim + RUBBER.c * over));
    }

    function avatarDown(event, el) {
        var p = begin(event.pointerId, { el: el, kind: 'btn' }, event.clientX, event.clientY, true);
        drags.set(event.pointerId, { el: el, x: event.clientX, y: event.clientY, on: false, trail: [], press: p });
    }

    function avatarMove(event) {
        var d = drags.get(event.pointerId);
        if (!d) return;
        var dx = event.clientX - d.x, dy = event.clientY - d.y;
        if (!d.on) {
            if (dx * dx + dy * dy < DRAG_START * DRAG_START) return;
            d.on = true;
            d.press.drag = true;
            d.press.inside = true;
            var u = ui(d.el);
            u.press = AVATAR_DRAG;                                       // grabbed: it grows
            to(d.el, { s: scaleOf(d.el) }, { t: PRESS_T });
            try { d.el.setPointerCapture(event.pointerId); } catch (e) { /* the pointer is gone: nothing to hold */ }
        }
        var x = rubber(dx), y = rubber(dy);
        set(d.el, { x: x, y: y, r: x * THROW.turn });                   // 1:1 with the hand, a small turn from the shift
        d.trail.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
        while (d.trail.length > 2 && event.timeStamp - d.trail[0].t > THROW.window) d.trail.shift();
    }

    function avatarUp(event, released) {
        var d = drags.get(event.pointerId);
        if (!d) return;
        drags.delete(event.pointerId);
        if (!d.on) return;
        var vx = 0, vy = 0, t = d.trail;
        if (released && t.length > 1) {
            var a = t[0], b = t[t.length - 1], dt = (b.t - a.t) / 1000;
            if (dt > 0 && event.timeStamp - b.t < 80) {
                vx = Math.max(-THROW.max, Math.min(THROW.max, (b.x - a.x) / dt * THROW.k));
                vy = Math.max(-THROW.max, Math.min(THROW.max, (b.y - a.y) / dt * THROW.k));
            }
        }
        d.press.drag = false;
        var u = ui(d.el);
        u.press = 0;
        // the one place with a bounce (damping 0.8): the hand had a speed when it let go
        to(d.el, { x: 0, y: 0, r: 0, s: scaleOf(d.el) }, { t: 0.45, z: 0.8, v: { x: vx, y: vy, r: vx * THROW.turn } });
    }

    /* ---------- 5. Lens: one highlight for the rows of a list marked data-lens ---------- */
    var lensList = null;     // the list the lens is shown in now
    var ripples = new Map(); // pointerId -> { rip, lens }

    function lensOf(list) {
        var lens = list.__lens;
        if (!lens || lens.parentNode !== list) {
            lens = document.createElement('span');
            lens.className = 'lens';
            lens.setAttribute('aria-hidden', 'true');
            list.insertBefore(lens, list.firstChild);
            list.__lens = lens;
            set(lens, { o: 0 });
        }
        return lens;
    }

    function lensRow(target) { return target && target.closest ? target.closest('[data-lens] > li') : null; }

    function lensGo(li) {
        var list = li.parentNode, lens = lensOf(list), y = li.offsetTop, h = li.offsetHeight;
        if (lens.__h !== h) { lens.__h = h; lens.style.height = h + 'px'; }
        if (lensList === list && lens.__on) {
            to(lens, { y: y }, { t: 0.3 });
        } else {
            if (lensList && lensList !== list) lensOff(lensList);
            set(lens, { y: y });
            lens.__on = true;
            to(lens, { o: 1 }, { t: 0.25 });
        }
        lensList = list;
    }

    function lensOff(list) {
        var lens = list.__lens;
        if (lens && lens.__on) { lens.__on = false; to(lens, { o: 0 }, { t: 0.3 }); }
        if (lensList === list) lensList = null;
    }

    function lensMove(event) {
        if (event.pointerType === 'touch' || !fineQuery.matches) return;
        var li = lensRow(event.target);
        if (li) lensGo(li);
        else if (lensList) lensOff(lensList);
    }

    // a touch: the lens shows on the row and a ripple opens from the touch point
    function lensDown(event) {
        if (event.pointerType === 'mouse') return;
        var li = lensRow(event.target);
        if (!li) return;
        lensGo(li);
        if (reduced()) return;
        var lens = lensOf(li.parentNode), b = box(li);
        var px = event.clientX - b.left, py = event.clientY - b.top;
        var R = Math.sqrt(Math.pow(Math.max(px, b.width - px), 2) + Math.pow(Math.max(py, b.height - py), 2));
        var rip = document.createElement('span');
        rip.className = 'lens__ripple';
        rip.style.cssText = 'left:' + (px - R) + 'px;top:' + (py - R) + 'px;width:' + (2 * R) + 'px;height:' + (2 * R) + 'px';
        lens.appendChild(rip);
        set(rip, { s: 0.15, o: 1 });
        to(rip, { s: 1 }, { t: 0.5 });
        ripples.set(event.pointerId, { rip: rip, list: li.parentNode });
    }

    function lensUp(event) {
        var r = ripples.get(event.pointerId);
        if (!r) return;
        ripples.delete(event.pointerId);
        to(r.rip, { o: 0 }, { t: 0.35, done: function () { stop(r.rip); if (r.rip.parentNode) r.rip.parentNode.removeChild(r.rip); } });
        setTimeout(function () { lensOff(r.list); }, 160);
    }

    document.addEventListener('pointerout', function (event) {
        if (lensList && event.pointerType !== 'touch' && !event.relatedTarget) lensOff(lensList);
    }, true);
})();
