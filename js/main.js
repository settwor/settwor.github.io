/* =============================================================
   SETTWOR — main.js
   1. Mobile menu   2. Cookie consent + Google Analytics
   3. Biography sections and folding parts   4. Current section in the left rail
   5. Photographs: year tabs, picture viewer, fallback to the big picture
   6. Footer year   7. Offline cache (sw.js)
   8. Motion (header, reveal, buttons, tilt)   9. Releases: preview window
   10. Motion engine (springs for gestures; window.STW.motion; used from todo design 3.2)
   11. Press layer: since v9.6 in js/fluid.js (springs for press, hover, avatar drag, list lens, reveal; settings at its top)
   Google Analytics is loaded ONLY after the visitor clicks "Accept".
   ============================================================= */
(function () {
    'use strict';

    var GA_ID = 'G-KG531WJ8DV';
    var STORAGE_KEY = 'settwor-analytics-consent'; // 'granted' | 'denied'

    /* ---------- 1. Mobile menu (todo design 3.4) ----------
       One path in and out. A spring moves the menu from the right edge (mP = 0) onto the screen (mP = 1).
       A tap during the move turns it round from where it is. A swipe to the right (the side it came from)
       closes it: it follows the finger 1:1, then a throw (over 500 px/s) decides by its sign, and a slow
       release decides by position (past 25 percent of the width = close). */
    var burger = document.getElementById('burger');
    var menu = document.getElementById('mobile-menu');
    var mP = 0;            // how far open: 0 = off-screen on the right, 1 = on screen
    var mTarget = 0;       // where it is going now
    var mSpring = null;    // the spring that carries it now, if any
    var mGrab = null;      // a finger is on the menu
    var mDragged = false;  // the last touch was a swipe: its click must not open a link

    function menuWidth() {
        return menu.getBoundingClientRect().width || window.innerWidth;
    }

    function paintMenu(p) {
        menu.style.transform = 'translate3d(' + ((1 - p) * 100) + '%, 0, 0)';
    }

    function markMenu(open) {
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.classList.toggle('menu-open', open);
        if (open) menu.classList.add('is-open');
    }

    function aimMenu(speed) {
        if (mSpring) { mSpring.to(mTarget, speed); return; }   // re-aim from the current value and speed
        var s = STW.motion.spring({
            from: mP, to: mTarget, velocity: speed || 0, damping: 1, response: 0.3, rest: 0.001,
            onUpdate: function (x) { mP = x; paintMenu(x); },
            onDone: function () {
                mP = mTarget;
                paintMenu(mP);
                if (mSpring === s) mSpring = null;
                if (!mTarget) menu.classList.remove('is-open');   // closed: invisible and not focusable
            }
        });
        mSpring = s;
    }

    function setMenu(open) {
        if (!burger || !menu) return;
        markMenu(open);
        mTarget = open ? 1 : 0;
        aimMenu();
    }

    if (burger && menu) {
        burger.addEventListener('click', function () {
            setMenu(burger.getAttribute('aria-expanded') !== 'true');
        });

        menu.addEventListener('click', function (event) {
            if (mDragged) { mDragged = false; event.preventDefault(); return; }
            if (event.target.closest('a')) setMenu(false);
        });

        menu.addEventListener('pointerdown', function (event) {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            if (mTarget === 0 && mP === 0) return;   // closed: nothing to swipe
            mDragged = false;
            mGrab = { id: event.pointerId, x0: event.clientX, y0: event.clientY, on: false, w: menuWidth() };   // 7.4: width read once, not on every move
        });

        // a link dragged with a mouse would start the browser's own drag and cancel the swipe
        menu.addEventListener('dragstart', function (event) { event.preventDefault(); });

        menu.addEventListener('pointermove', function (event) {
            var g = mGrab;
            if (!g || event.pointerId !== g.id) return;
            var dx = event.clientX - g.x0;
            var dy = event.clientY - g.y0;
            var width = g.w;
            if (!g.on) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;   // direction not decided yet
                if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) { mGrab = null; return; }   // up, down or left: not ours
                g.on = true;
                mDragged = true;
                if (mSpring) { mP = mSpring.stop(); mSpring = null; }   // grab it where it is
                g.start = (1 - mP) * width;   // distance from the open place, px
                g.last = event.clientX;
                g.lastT = event.timeStamp;
                g.v = 0;
                try { menu.setPointerCapture(g.id); } catch (e) { /* the drag still works without it */ }
            }
            var off = g.start + dx;
            if (off < 0) off = -STW.motion.rubberband(-off, width);   // pulled back past the open place: soft edge
            if (off > width) off = width;
            mP = 1 - off / width;
            paintMenu(mP);
            var now = event.timeStamp;
            if (now > g.lastT) {
                var inst = (event.clientX - g.last) / ((now - g.lastT) / 1000);   // px/s, + = closing
                g.v = g.v * 0.5 + inst * 0.5;
            }
            g.last = event.clientX;
            g.lastT = now;
        });

        var endMenuGrab = function (event) {
            var g = mGrab;
            if (!g || event.pointerId !== g.id) return;
            mGrab = null;
            if (!g.on) return;
            var closing = g.v > 500 ? true : (g.v < -500 ? false : mP < 0.75);
            mTarget = closing ? 0 : 1;
            markMenu(!closing);
            aimMenu(-g.v / g.w);   // progress per second: + = opening
        };
        menu.addEventListener('pointerup', endMenuGrab);
        menu.addEventListener('pointercancel', endMenuGrab);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                burger.focus();
            }
        });

        var desktop = window.matchMedia('(min-width: 40rem)');
        desktop.addEventListener('change', function (event) {
            if (event.matches) setMenu(false);
        });
    }

    /* ---------- 2. Cookie consent + analytics ---------- */
    var banner = document.getElementById('consent');

    function readConsent() {
        try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    }

    function saveConsent(value) {
        try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* storage unavailable */ }
    }

    function loadAnalytics() {
        if (window.__gaLoaded) return;
        window.__gaLoaded = true;
        window['ga-disable-' + GA_ID] = false;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', GA_ID);

        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
        document.head.appendChild(script);
    }

    function removeAnalyticsCookies() {
        window['ga-disable-' + GA_ID] = true;
        var host = location.hostname;
        var domains = ['', '; domain=' + host, '; domain=.' + host];
        document.cookie.split(';').forEach(function (cookie) {
            var name = cookie.split('=')[0].trim();
            if (name === '_ga' || name === '_gid' || name === '_gat' || name.indexOf('_ga_') === 0) {
                domains.forEach(function (domain) {
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domain;
                });
            }
        });
    }

    function applyConsent(value) {
        saveConsent(value);
        if (value === 'granted') {
            loadAnalytics();
        } else {
            removeAnalyticsCookies();
        }
        hideBanner();
    }

    // The notice leaves the way it came (todo design 4.2): a short exit, then it is really hidden. The exit time is the
    // same as for every surface (--t-exit in css/main.css). Opening it again from the footer cancels a running exit.
    var bannerTimer = 0;

    function hideBanner() {
        if (!banner || banner.hidden) return;
        banner.classList.add('is-leaving');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(function () {
            banner.hidden = true;
            banner.classList.remove('is-leaving');
        }, STW.motion && STW.motion.reduced && STW.motion.reduced() ? 0 : 280);
    }

    var bannerShown = false;

    function showBanner() {
        if (!banner) return;
        bannerShown = true;
        clearTimeout(bannerTimer);
        banner.classList.remove('is-leaving');
        banner.hidden = false;
    }

    // todo design 5.6 (SKILL 16 responsibility): the notice does not jump over the first screen. It comes when the visitor has
    // started reading (scrolled half a screen) or after a calm pause, whichever is first. Analytics is off until "Accept",
    // so waiting costs nothing. "Cookie settings" in the footer shows it at once, and it is never shown twice by the wait.
    var CONSENT_WAIT = 8000;   // ms

    function armBanner() {
        var timer = 0;
        function onScroll() {
            if (window.pageYOffset > window.innerHeight * 0.5) go();
        }
        function go() {
            clearTimeout(timer);
            window.removeEventListener('scroll', onScroll);
            if (!bannerShown) showBanner();
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        timer = setTimeout(go, CONSENT_WAIT);
    }

    var stored = readConsent();
    if (stored === 'granted') {
        loadAnalytics();
    } else if (stored !== 'denied' && banner) {
        armBanner();
    }

    document.addEventListener('click', function (event) {
        var choice = event.target.closest('[data-consent]');
        if (choice) {
            applyConsent(choice.getAttribute('data-consent'));
            return;
        }
        if (event.target.closest('[data-consent-open]') && banner) {
            showBanner();
            var firstButton = banner.querySelector('button');
            if (firstButton) firstButton.focus();
        }
    });

    /* ---------- 3. Biography: one long page, the contents list in the left column ---------- */
    /* The biography stays one continuous text. Only the contents list is built here,
       from the big parts (h2), so the left column can jump to them. */
    var bioFlow = document.querySelector('[data-bio-flow]');
    var autoToc = document.querySelector('[data-toc-auto] .rail-list');

    if (bioFlow && autoToc) {
        var bioHeads = Array.prototype.slice.call(bioFlow.querySelectorAll('.bio__body h2, .faq__title, #refs-title'));
        bioHeads.forEach(function (heading, index) {
            if (!heading.id) heading.id = 'part-' + (index + 1);
            var item = document.createElement('li');
            var link = document.createElement('a');
            var name = document.createElement('span');
            link.className = 'rail-link';
            link.href = '#' + heading.id;
            name.className = 'rail-link__name';
            name.textContent = heading.textContent;
            link.appendChild(name);
            item.appendChild(link);
            autoToc.appendChild(item);
        });
    }

    /* ---------- 4. Highlight the current section in the left rail ---------- */
    var tocLinks = document.querySelectorAll('[data-toc] a[href^="#"]');
    if (tocLinks.length && 'IntersectionObserver' in window) {
        var linkById = {};
        var activeLink = null;
        tocLinks.forEach(function (link) {
            linkById[link.getAttribute('href').slice(1)] = link;
        });
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                if (activeLink) activeLink.removeAttribute('aria-current');
                activeLink = linkById[entry.target.id];
                activeLink.setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-15% 0px -70% 0px' });
        Object.keys(linkById).forEach(function (id) {
            var section = document.getElementById(id);
            if (section) observer.observe(section);
        });
    }

    /* ---------- 5. Photographs ---------- */
    /* 5a. Year tabs (todo design 3.5): only the chosen year is shown (without JavaScript all years are).
       One indicator travels behind the chosen tab (it moves, it does not blink). A year that comes from a
       tab on the right slides in from the right, from the left from the left; reduced motion = a short fade. */
    var yearSections = document.querySelectorAll('.gallery__year[data-year]');
    var yearTabs = document.querySelectorAll('[data-year-tabs] a, [data-year-links] a');
    var tabsRow = document.querySelector('[data-year-tabs]');
    var tabIndicator = null;
    var shownYear = '';

    if (tabsRow && yearTabs.length) {
        tabIndicator = document.createElement('span');
        tabIndicator.className = 'year-tabs__indicator';
        tabIndicator.setAttribute('aria-hidden', 'true');
        tabsRow.insertBefore(tabIndicator, tabsRow.firstChild);
        tabsRow.classList.add('has-indicator');
    }

    function placeIndicator(animate) {
        if (!tabIndicator) return;
        var active = tabsRow.querySelector('.year-tabs__link.is-active');
        if (!active) return;
        // 7.4: read all four numbers first, then write (a read after a write forces the browser to lay out again)
        var l = active.offsetLeft, t = active.offsetTop, w = active.offsetWidth, h = active.offsetHeight;
        // v9.6: with fluid.js the indicator travels on a spring (x, y and a stretch sx), and a tap during the move turns it round
        if (window.STW && window.STW.fluid) {
            window.STW.fluid.glide(tabIndicator, { left: l, top: t, width: w, height: h }, animate === true && tabsRow.classList.contains('is-ready'));
            return;
        }
        tabIndicator.style.left = l + 'px';
        tabIndicator.style.top = t + 'px';
        tabIndicator.style.width = w + 'px';
        tabIndicator.style.height = h + 'px';
    }

    function showYear(year, scroll) {
        var found = false;
        yearSections.forEach(function (section) {
            if (section.getAttribute('data-year') === year) found = true;
        });
        if (!found && yearSections.length) year = yearSections[0].getAttribute('data-year');

        // the order of the tabs decides the direction of the change
        var order = tabsRow ? Array.prototype.map.call(tabsRow.querySelectorAll('.year-tabs__link'), function (link) {
            return link.getAttribute('href').slice(2);
        }) : [];
        var step = order.indexOf(year) - order.indexOf(shownYear);

        yearSections.forEach(function (section) {
            var show = section.getAttribute('data-year') === year;
            if (show && shownYear && step) section.setAttribute('data-enter', step > 0 ? 'right' : 'left');
            else section.removeAttribute('data-enter');
            section.hidden = !show;
        });
        shownYear = year;

        yearTabs.forEach(function (link) {
            var active = link.getAttribute('href') === '#y' + year;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
        });
        placeIndicator(true);
        if (scroll) {
            var tabs = document.querySelector('[data-year-tabs]');
            if (tabs) tabs.scrollIntoView({ block: 'start' });
        }
    }

    function yearFromHash() {
        var match = /^#y(\d{4})$/.exec(location.hash);
        return match ? match[1] : '';
    }

    if (yearSections.length) {
        showYear(yearFromHash(), false);
        requestAnimationFrame(function () { if (tabsRow) tabsRow.classList.add('is-ready'); });   // the indicator moves only from now on
        var indicatorFrame = 0;   // 7.4: at most one placement per frame while the window is resized
        window.addEventListener('resize', function () {
            if (!indicatorFrame) indicatorFrame = requestAnimationFrame(function () { indicatorFrame = 0; placeIndicator(); });
        });
        window.addEventListener('load', function () { placeIndicator(); });   // the font can change the width of the tabs
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeIndicator(); });
        window.addEventListener('hashchange', function () {
            if (yearFromHash()) showYear(yearFromHash(), true);
        });
    }

    /* 5b. Picture viewer */
    var viewer = null;
    var viewerLinks = [];
    var viewerIndex = 0;
    var viewerOpener = null;
    var viewerClosing = false;   // the viewer is on its way out
    var viewerAnims = [];        // the running exit/return animations (backdrop + picture)
    var viewerToken = 0;
    var vDrag = null;            // the finger is on the picture
    var vSpring = null;          // the spring that carries the picture after a gesture
    var vSpringAxis = 'y';       // which way that spring moves the picture ('x' = sideways, 'y' = down)

    // The page behind goes back while the viewer is up (todo design 4.3, SKILL 12 "dim to focus"). Same class and CSS as the
    // release window (`sheet-back` on <html>, section 9); here only on / off, no 1:1 following of the finger (the dark
    // backdrop already follows it). Not with reduced motion (the CSS turns the scale off there).
    function viewerPageBack(on) {
        if (on) {
            Array.prototype.forEach.call(document.querySelectorAll('main#main, .site-footer'), function (n) {
                var r = n.getBoundingClientRect();   // scale around the middle of what the visitor sees
                n.style.transformOrigin = (window.innerWidth / 2 - r.left) + 'px ' + (window.innerHeight / 2 - r.top) + 'px';
            });
        }
        document.documentElement.classList.toggle('sheet-back', on);
    }

    function buildViewer() {
        viewer = document.createElement('div');
        viewer.className = 'lightbox';
        viewer.setAttribute('role', 'dialog');
        viewer.setAttribute('aria-modal', 'true');
        viewer.setAttribute('aria-label', 'Photograph');
        viewer.hidden = true;
        viewer.innerHTML =
            '<img class="lightbox__img" alt="">' +
            '<button class="lightbox__btn lightbox__btn--close" type="button" aria-label="Close">&times;</button>' +
            '<button class="lightbox__btn lightbox__btn--prev" type="button" aria-label="Previous photo">&lsaquo;</button>' +
            '<button class="lightbox__btn lightbox__btn--next" type="button" aria-label="Next photo">&rsaquo;</button>' +
            '<p class="lightbox__bar">&copy; SETTWOR &middot; <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener">CC BY 4.0</a> &middot; <a href="/license.html">How to give credit</a></p>';
        document.body.appendChild(viewer);
        var pic = viewer.querySelector('.lightbox__img');
        pic.draggable = false;
        pic.addEventListener('pointerdown', grabViewer);
        pic.addEventListener('pointermove', moveViewer);
        pic.addEventListener('pointerup', dropViewer);
        pic.addEventListener('pointercancel', dropViewer);
        viewer.addEventListener('click', function (event) {
            if (event.target.closest('.lightbox__btn--close') || event.target === viewer) closeViewer();
            else if (event.target.closest('.lightbox__btn--prev')) stepViewer(-1);
            else if (event.target.closest('.lightbox__btn--next')) stepViewer(1);
        });
    }

    function showViewerPhoto() {
        var link = viewerLinks[viewerIndex];
        var thumb = link.querySelector('img');
        var big = viewer.querySelector('.lightbox__img');
        big.src = link.getAttribute('href');
        big.alt = thumb ? thumb.alt : '';
        var many = viewerLinks.length > 1;
        viewer.querySelector('.lightbox__btn--prev').hidden = !many;
        viewer.querySelector('.lightbox__btn--next').hidden = !many;
    }

    function stepViewer(direction) {
        if (viewerClosing || vDrag) return;
        if (vSpring) { vSpring.stop(); vSpring = null; restViewer(); }   // a key takes over from a running swipe spring
        viewerIndex = (viewerIndex + direction + viewerLinks.length) % viewerLinks.length;
        showViewerPhoto();
    }

    // Exit = the entry played backwards (todo design 3.3, SKILL 7): the picture shrinks to 0.94 while it fades, the dark
    // backdrop fades with it; mirrored easing, shorter. It starts from the LIVE opacity/transform (SKILL 3), so a viewer that
    // is still arriving, or is opened again while leaving, never jumps. Reduced motion: only a short fade (SKILL 14).
    var VIEWER_EXIT = 'scale(0.94)';

    function animateViewer(closing) {
        var nodes = [viewer, viewer.querySelector('.lightbox__img')];
        var token = ++viewerToken;
        vDrag = null;   // a key or a button took over from the finger
        function done() {
            if (token !== viewerToken) return;
            viewerAnims.forEach(function (a) { a.cancel(); });
            viewerAnims = [];
            if (closing) finishViewerClose();
        }
        if (typeof nodes[0].animate !== 'function') { done(); return; }
        var live = nodes.map(function (n) { var cs = getComputedStyle(n); return { opacity: cs.opacity, transform: cs.transform }; });
        if (vSpring) { vSpring.stop(); vSpring = null; }
        viewerAnims.forEach(function (a) { a.cancel(); });
        nodes[1].style.transform = ''; viewer.style.background = '';   // values left by a gesture
        var reduced = STW.motion.reduced();
        var end = closing
            ? [{ opacity: 0, transform: 'none' }, { opacity: 0, transform: reduced ? 'none' : VIEWER_EXIT }]
            : [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: 'none' }];
        var timing = {
            duration: reduced ? 150 : (closing ? 280 : 300),
            easing: closing ? 'cubic-bezier(0.8, 0, 0.8, 0.2)' : 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'forwards'
        };
        viewerAnims = nodes.map(function (n, i) { return n.animate([live[i], end[i]], timing); });
        viewerAnims[1].onfinish = done;
    }

    function finishViewerClose() {
        viewer.hidden = true;
        viewerClosing = false;
        viewer.querySelector('.lightbox__img').removeAttribute('src');
        document.body.classList.remove('menu-open');
        viewerPageBack(false);   // safety: the page is never left pushed back
    }

    function closeViewer() {
        if (!viewer || viewer.hidden || viewerClosing) return;
        viewerClosing = true;
        viewerPageBack(false);   // the page comes forward while the picture leaves
        if (viewerOpener) viewerOpener.focus({ preventScroll: true });   // focus goes back at the start of the exit
        animateViewer(true);
    }

    /* ---- swipe the picture (todo design 3.3, SKILL 2, 3, 5, 6, 9). Same plan as the release window (section 9) ----
       Down = leave (4.1). Sideways = the next / previous photo (4.2); on the first and the last photo it stretches
       (rubber band) and comes back. The direction is chosen once, after a few pixels, and then kept until the finger lifts.
       The arrow keys and buttons stay as they were (they wrap round). */
    var SLOP = 6;   // px before the direction is chosen

    // 9.3: the strength of the viewer backdrop lives in one place, the css token --scrim-viewer; its alpha is read once here
    var viewerAlpha = null;
    function readViewerAlpha() {
        var m = /([\d.]+)\s*\)\s*$/.exec(getComputedStyle(document.documentElement).getPropertyValue('--scrim-viewer'));
        viewerAlpha = m ? parseFloat(m[1]) : 0.92;
    }

    // y = how far the picture is moved down, in px. The dark backdrop follows the picture.
    function setViewer(y) {
        viewer.querySelector('.lightbox__img').style.transform = 'translateY(' + y + 'px)';
        var scrim = Math.max(0, Math.min(1, 1 - y / (window.innerHeight * 0.5)));
        if (viewerAlpha === null) readViewerAlpha();
        viewer.style.background = 'rgba(0, 0, 0, ' + (viewerAlpha * scrim) + ')';
    }

    function setViewerX(x) {   // sideways: the backdrop stays as it is
        viewer.querySelector('.lightbox__img').style.transform = 'translateX(' + x + 'px)';
    }

    function resetViewer() {   // a fresh opening plays the entry animation again
        var pic = viewer.querySelector('.lightbox__img');
        pic.style.animation = ''; pic.style.transform = '';
        viewer.style.animation = ''; viewer.style.background = '';
    }

    function restViewer() {   // at rest again: drop the inline values (the CSS animation stays off)
        viewer.querySelector('.lightbox__img').style.transform = '';
        viewer.style.background = '';
    }

    function canStep(dir) {   // is there a photo on that side? (the swipe does not wrap round)
        return dir > 0 ? viewerIndex < viewerLinks.length - 1 : viewerIndex > 0;
    }

    function preloadNeighbours() {   // at the start of a sideways swipe, so the next picture is ready when it slides in
        [-1, 1].forEach(function (d) {
            var link = viewerLinks[viewerIndex + d];
            if (link) { var im = new Image(); im.src = link.getAttribute('href'); }
        });
    }

    function springViewer(axis, from, to, velocity, damping, response, done) {
        vSpringAxis = axis;
        vSpring = STW.motion.spring({
            from: from, to: to, velocity: velocity, damping: damping, response: response,
            onUpdate: axis === 'x' ? setViewerX : setViewer,
            onDone: function () { vSpring = null; if (done) done(); }
        });
    }

    function viewerSpeed(d) {   // px/s of the last ~100 ms of the finger, along the chosen direction
        var h = d.hist;
        var last = h[h.length - 1];
        var first = h[0];
        for (var i = 0; i < h.length; i++) { if (last.t - h[i].t <= 100) { first = h[i]; break; } }
        return last.t > first.t ? (last.p - first.p) / (last.t - first.t) * 1000 : 0;
    }

    function grabViewer(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        var pic = event.currentTarget;
        var x = 0;
        var y = 0;
        if (vSpring) {   // grabbed while a spring carries it
            var val = vSpring.stop();
            if (vSpringAxis === 'x') x = val; else y = val;
            vSpring = null;
        } else {
            var tf = getComputedStyle(pic).transform;   // the LIVE position, also in the middle of an exit
            if (tf && tf !== 'none') { var m = new DOMMatrixReadOnly(tf); x = m.m41; y = m.m42; }
        }
        viewerToken++;
        viewerAnims.forEach(function (a) { a.cancel(); });
        viewerAnims = [];
        pic.style.animation = 'none';
        viewer.style.animation = 'none';
        var wasLeaving = viewerClosing;
        if (viewerClosing) { viewerClosing = false; viewerPageBack(true); }   // grabbed during the exit: the page goes back again
        // a picture that is already moved keeps its direction; otherwise it is chosen after SLOP px
        var axis = Math.abs(y) > 1 ? 'y' : (Math.abs(x) > 1 ? 'x' : null);
        // the finger keeps the point where it grabbed the picture (no jump to the finger)
        vDrag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x0: x, y0: y, axis: axis,
                  hist: [{ t: event.timeStamp, p: axis === 'x' ? x : y }], wasLeaving: wasLeaving };
        pic.setPointerCapture(event.pointerId);
        if (axis === 'x') setViewerX(x); else setViewer(y);
        if (axis === 'x') preloadNeighbours();
        event.preventDefault();
    }

    function moveViewer(event) {
        if (!vDrag || event.pointerId !== vDrag.id) return;
        var d = vDrag;
        var dx = event.clientX - d.startX;
        var dy = event.clientY - d.startY;
        if (!d.axis) {
            if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
            d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            d.startX = event.clientX; d.startY = event.clientY;   // no jump at the moment the direction is chosen
            d.hist = [{ t: event.timeStamp, p: 0 }];
            dx = 0; dy = 0;
            if (d.axis === 'x') preloadNeighbours();
        }
        var p;
        if (d.axis === 'y') {
            var rawY = d.y0 + dy;
            p = rawY >= 0 ? rawY : -STW.motion.rubberband(-rawY, window.innerHeight);   // pulled up: more and more resistance
        } else {
            var rawX = d.x0 + dx;
            var blocked = (rawX > 0 && !canStep(-1)) || (rawX < 0 && !canStep(1));      // no photo on that side: stretch
            p = blocked ? (rawX > 0 ? 1 : -1) * STW.motion.rubberband(Math.abs(rawX), window.innerWidth) : rawX;
        }
        d.hist.push({ t: event.timeStamp, p: p });
        if (d.hist.length > 8) d.hist.shift();
        if (d.axis === 'y') setViewer(p); else setViewerX(p);
    }

    function dropViewer(event) {
        if (!vDrag || event.pointerId !== vDrag.id) return;
        var d = vDrag;
        vDrag = null;
        var cancelled = event.type === 'pointercancel';
        if (!d.axis) { restViewer(); return; }   // a tap: nothing moved
        var p = d.hist[d.hist.length - 1].p;
        var v = cancelled ? 0 : viewerSpeed(d);
        var thrown = Math.abs(v) > 500;
        var reduced = STW.motion.reduced();

        if (d.axis === 'y') {
            var h = window.innerHeight;
            // a throw decides by the SIGN of its speed; a slow release by the position
            var leave = cancelled ? false : (thrown ? v > 0 : p > h * 0.25);
            if (leave) {
                viewerClosing = true;
                viewerPageBack(false);   // the page comes forward while the picture leaves
                if (viewerOpener) viewerOpener.focus({ preventScroll: true });
                if (reduced) { animateViewer(true); return; }   // reduced motion: a short fade, no travel
                springViewer('y', p, h + 48, v, 1, 0.3, function () { finishViewerClose(); restViewer(); });
            } else {
                springViewer('y', p, 0, v, thrown ? 0.8 : 1, thrown ? 0.3 : 0.4, restViewer);   // a little bounce only after a throw
            }
            return;
        }

        // sideways: a throw to the left shows the next photo, to the right the previous one
        var W = window.innerWidth;
        var dir = cancelled ? 0 : (thrown ? (v < 0 ? 1 : -1) : (Math.abs(p) > W * 0.25 ? (p < 0 ? 1 : -1) : 0));
        if (dir && !canStep(dir)) dir = 0;   // first / last photo: it only stretches and comes back
        if (dir) {
            if (reduced) { viewerIndex += dir; showViewerPhoto(); restViewer(); return; }   // no travel, the photo just changes
            springViewer('x', p, -dir * (W + 48), v, 1, 0.25, function () {
                viewerIndex += dir;
                showViewerPhoto();
                springViewer('x', dir * (W + 48), 0, 0, 1, 0.35, restViewer);   // the next picture slides in from the other side
            });
        } else if (reduced) {
            restViewer();
        } else {
            springViewer('x', p, 0, v, thrown ? 0.8 : 1, thrown ? 0.3 : 0.4, restViewer);
        }
    }

    document.addEventListener('click', function (event) {
        var link = event.target.closest('a[data-lightbox]');
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        if (!viewer) buildViewer();
        var scope = link.closest('.gallery__year') || document;
        viewerLinks = Array.prototype.slice.call(scope.querySelectorAll('a[data-lightbox]'));
        viewerIndex = Math.max(0, viewerLinks.indexOf(link));
        viewerOpener = link;
        var wasClosing = viewerClosing;
        if (viewer.hidden) resetViewer();
        showViewerPhoto();
        viewer.hidden = false;
        document.body.classList.add('menu-open');
        viewerPageBack(true);
        if (wasClosing) {   // opened again while leaving: come back from where it is
            viewerClosing = false;
            animateViewer(false);
        }
        viewer.querySelector('.lightbox__btn--close').focus();
    });

    document.addEventListener('keydown', function (event) {
        if (!viewer || viewer.hidden) return;
        if (event.key === 'Escape') closeViewer();
        else if (event.key === 'ArrowLeft') stepViewer(-1);
        else if (event.key === 'ArrowRight') stepViewer(1);
    });

    /* 5c. If a small picture (images/small/...) is missing, use the big picture (images/...). */
    function useBigPicture(img) {
        if (img.getAttribute('data-fallback') || img.src.indexOf('/images/small/') === -1) return;
        img.setAttribute('data-fallback', '1');
        img.src = img.src.replace('/images/small/', '/images/');
    }
    document.addEventListener('error', function (event) {
        var img = event.target;
        if (!img || img.tagName !== 'IMG') return;
        // 5.5: when there is no other picture to try (the big one failed too), the frame stays clean (.is-failed in css/main.css)
        if (img.getAttribute('data-fallback') || img.src.indexOf('/images/small/') === -1) {
            img.classList.add('is-failed');
            return;
        }
        useBigPicture(img);
    }, true);
    document.querySelectorAll('.photo-grid img').forEach(function (img) {
        if (img.complete && img.naturalWidth === 0) useBigPicture(img);
    });

    /* ---------- 6. Footer year ---------- */
    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-current-year]').forEach(function (node) {
        node.textContent = year;
    });

    /* ---------- 8. Motion: header, progress line, reveal, buttons, tilt ---------- */
    window.__ready = true;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // todo design 4.5: a glass surface materializes (blur + scale) only without reduced motion AND reduced transparency
    var reduceTransparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var header = document.querySelector('.site-header');

    // thin line that shows how far the page is read + glass header after scrolling
    var bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    var lastRead = -1;     // 7.4: nothing is written when the value did not change
    var lastScrolled = null;

    function onScroll() {
        ticking = false;
        // reads first, writes after; only `transform` of the bar and one class change per frame
        var top = window.pageYOffset || document.documentElement.scrollTop;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var read = max > 0 ? Math.min(1, top / max) : 0;
        if (read !== lastRead) { lastRead = read; bar.style.transform = 'scaleX(' + read + ')'; }
        var scrolled = top > 24;
        if (header && scrolled !== lastScrolled) { lastScrolled = scrolled; header.classList.toggle('is-scrolled', scrolled); }
    }

    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    // things that fade in when they come into view: only cards and photos (7.1; same list as in main.css)
    var revealSelector = '[data-reveal], .news-card, .photo-grid li, .news-year__title';
    var revealItems = document.querySelectorAll(revealSelector);

    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealItems.forEach(function (item) { item.classList.add('is-in'); });
    } else {
        var queue = [];
        var queueTimer = 0;
        var flushQueue = function () {
            queueTimer = 0;
            var fluid = window.STW && window.STW.fluid;   // (not the bare name STW: this function has its own var STW further down)
            queue.forEach(function (item, index) {
                // v9.6: cards and photos come in on a spring (js/fluid.js: 12 px up, 0.5 s, index * 24 ms, at most 14 steps);
                // the old CSS delay stays as the fallback when fluid.js is not running
                if (fluid && item.matches('[data-reveal], .news-card, .photo-grid li')) fluid.appear(item, index);
                else item.style.setProperty('--d', Math.min(index, 5) * 0.04 + 's');   // 7.1: at most 0.2 s
                item.classList.add('is-in');
            });
            queue = [];
        };
        var revealer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                revealer.unobserve(entry.target);
                queue.push(entry.target);
            });
            // everything that appeared in the same moment comes in one after another
            if (queue.length && !queueTimer) queueTimer = setTimeout(flushQueue, 30);
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        revealItems.forEach(function (item) { revealer.observe(item); });
    }

    // the black fill of a button grows from the place where the pointer came in
    document.addEventListener('pointerover', function (event) {
        var el = event.target.closest && event.target.closest('.btn, .year-tabs__link, .langs__link, .rmodal__link');
        if (!el) return;
        var box = el.getBoundingClientRect();
        el.style.setProperty('--x', (event.clientX - box.left) + 'px');
        el.style.setProperty('--y', (event.clientY - box.top) + 'px');
    });

    // soft 3D tilt of covers (mouse only). The cover follows the pointer 1:1: no delay while the
    // pointer moves (class is-tilting switches the transform transition off), a soft spring back
    // when it leaves. The size of the cover is measured once at the start, because a tilted
    // cover has a different bounding box and would make the tilt jitter.
    var tiltFrame = 0;

    function tilt(el, event, strength) {
        if (!el.classList.contains('is-tilting')) {
            el.__tiltBox = el.getBoundingClientRect();
            el.classList.add('is-tilting');
        }
        var box = el.__tiltBox;
        var px = (event.clientX - box.left) / box.width - 0.5;
        var py = (event.clientY - box.top) / box.height - 0.5;
        px = Math.max(-0.5, Math.min(0.5, px));
        py = Math.max(-0.5, Math.min(0.5, py));
        if (tiltFrame) cancelAnimationFrame(tiltFrame);
        tiltFrame = requestAnimationFrame(function () {
            tiltFrame = 0;
            el.style.setProperty('--ry', (px * strength) + 'deg');
            el.style.setProperty('--rx', (-py * strength) + 'deg');
        });
    }

    function untilt(el) {
        if (tiltFrame) { cancelAnimationFrame(tiltFrame); tiltFrame = 0; }
        el.classList.remove('is-tilting');
        el.__tiltBox = null;
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
    }

    if (finePointer && !reduceMotion) {
        document.addEventListener('pointermove', function (event) {
            var cover = event.target.closest && event.target.closest('.release__cover, .rmodal__cover');
            if (cover) tilt(cover, event, cover.classList.contains('rmodal__cover') ? 10 : 14);
        });
        document.addEventListener('pointerout', function (event) {
            var cover = event.target.closest && event.target.closest('.release__cover, .rmodal__cover');
            if (cover && !cover.contains(event.relatedTarget)) untilt(cover);
        });
    }

    /* ---------- 10. Motion engine: springs for things the visitor touches ---------- */
    /* Two kinds of motion on this site (todo design 3.1):
       - background changes (a card appears, a tab changes): CSS, tokens --spring-default / --spring-momentum;
       - things the visitor grabs (release window, lightbox, mobile menu): a real spring in JS, below.
       A spring has no fixed time. When it is re-aimed or grabbed it keeps the CURRENT value and the CURRENT
       speed, so there is no jump. Own code (no library, no CDN): about 60 lines, nothing to download.
       Units are free (px, or 0..1); speed is units per second.
         var s = STW.motion.spring({ from: 0, to: 300, velocity: 0, damping: 1, response: 0.4,
                                     onUpdate: function (x, v) {}, onDone: function () {} });
         s.to(0, releaseSpeed);  // re-aim from where it is now, speed kept (or replaced by the release speed)
         s.stop();               // grab it; returns the value at that moment
         s.value(); s.velocity();
       damping 1 = no overshoot (default), about 0.8 = small bounce, only after a throw (SKILL 4).
       response = seconds to get there (not a duration). Apple's values: move 1.0 / 0.4, sheet 0.8 / 0.3. */
    var hapticLast = 0;
    var hapticEl = null;
    function hapticLabel() {
        if (hapticEl) return hapticEl;
        if (!document.body) return null;
        var label = document.createElement('label');
        label.setAttribute('aria-hidden', 'true');
        label.setAttribute('data-haptic', '');
        label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.setAttribute('switch', '');
        box.tabIndex = -1;
        label.appendChild(box);
        document.body.appendChild(label);
        hapticEl = label;
        return label;
    }

    var STW = window.STW = window.STW || {};
    STW.motion = {
        // with reduced motion a spring does not travel: it jumps to the end (the caller adds a short cross-fade in CSS)
        reduced: function () { return reduceMotion; },
        // 9.5 (v7.7): one short tick for every tap on a control (the owner wants it on every tap, iPhone too) and for the
        // moment the release window lands (8.2). Never with reduced motion, never twice within 80 ms.
        // Android browsers: navigator.vibrate. iPhone Safari has no vibrate(); there the tick comes from a hidden
        // <input type="checkbox" switch> that is toggled through its label inside the tap (works in iOS 17.4+; older
        // iOS and desktop do nothing).
        haptic: function () {
            try {
                if (reduceMotion || !window.matchMedia('(pointer: coarse)').matches) return;
                var now = Date.now();
                if (now - hapticLast < 80) return;
                hapticLast = now;
                if (navigator.vibrate) { navigator.vibrate(10); return; }
                var label = hapticLabel();
                if (label) label.click();
            } catch (e) { /* no vibration: nothing to do */ }
        },
        // the visitor asked for less transparency: surfaces must not animate their blur (todo design 4.5)
        reducedTransparency: function () { return reduceTransparencyQuery.matches; },

        // where a throw with this speed (units/s) would come to rest (SKILL 6; rate 0.998 = scroll feel)
        project: function (velocity, rate) {
            rate = rate || 0.998;
            return (velocity / 1000) * rate / (1 - rate);
        },

        // soft edge (SKILL 9): the further past the edge, the less it follows
        rubberband: function (overshoot, dimension, constant) {
            constant = constant || 0.55;
            return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
        },

        spring: function (o) {
            var damping = o.damping == null ? 1 : o.damping;
            var omega = 2 * Math.PI / (o.response || 0.4);
            var k = omega * omega;            // stiffness (mass 1)
            var c = 2 * damping * omega;      // friction
            var rest = o.rest || 0.05;        // "arrived" = closer than this and slower than rest * 10
            var x = o.from, v = o.velocity || 0, target = o.to;
            var frame = 0, last = 0;

            function finish() {
                x = target; v = 0; frame = 0;
                if (o.onUpdate) o.onUpdate(x, v);
                if (o.onDone) o.onDone();
            }
            function tick(now) {
                var dt = Math.max(0, Math.min((now - last) / 1000, 0.064));   // a stalled tab must not make a huge step
                last = now;
                var n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
                for (var i = 0; i < n; i++) {
                    v += (k * (target - x) - c * v) * h;
                    x += v * h;
                }
                if (Math.abs(target - x) < rest && Math.abs(v) < rest * 10) { finish(); return; }
                if (o.onUpdate) o.onUpdate(x, v);
                frame = requestAnimationFrame(tick);
            }
            function start() {
                if (frame) return;
                if (reduceMotion) { finish(); return; }
                last = performance.now();
                frame = requestAnimationFrame(tick);
            }
            start();
            return {
                to: function (next, speed) { target = next; if (speed != null) v = speed; start(); },
                stop: function () { if (frame) cancelAnimationFrame(frame); frame = 0; return x; },
                value: function () { return x; },
                velocity: function () { return v; }
            };
        }
    };

    /* ---------- 9. Releases: preview window with links and tracklist ---------- */
    var releaseCards = Array.prototype.slice.call(document.querySelectorAll('.release[data-slug]'));

    if (releaseCards.length) {
        var rModal = null;
        var rIndex = 0;
        var rOpener = null;
        var rClosing = false;   // the window is on its way out
        var rAnims = [];        // the running exit/return animations (panel + backdrop)
        var rToken = 0;
        var rDrag = null;       // the finger is on the grip
        var rSpring = null;     // the spring that carries the sheet after a gesture

        // a short name of the platform and its address; "search" links are made from the title
        var PLATFORMS = [
            ['spotify', 'Spotify'],
            ['apple', 'Apple Music'],
            ['youtube_music', 'YouTube Music'],
            ['youtube', 'YouTube'],
            ['deezer', 'Deezer'],
            ['tidal', 'TIDAL'],
            ['amazon', 'Amazon Music'],
            ['yandex', 'Yandex Music'],
            ['vk', 'VK Music'],
            ['bandcamp', 'Bandcamp']
        ];

        var SEARCH = {
            spotify: function (q) { return 'https://open.spotify.com/search/' + q; },
            apple: function (q) { return 'https://music.apple.com/search?term=' + q; },
            youtube_music: function (q) { return 'https://music.youtube.com/search?q=' + q; },
            deezer: function (q) { return 'https://www.deezer.com/search/' + q; }
        };

        function parseJson(text, fallback) {
            try { var value = JSON.parse(text); return value || fallback; } catch (e) { return fallback; }
        }

        // "Lyrics" buttons: pages of the folder "lyrics" are listed in #lyrics-map (lower-case track name -> address)
        var lyricsMap = {};
        var lyricsNode = document.getElementById('lyrics-map');
        if (lyricsNode) lyricsMap = parseJson(lyricsNode.textContent, {});

        // "(sped up)", "(slowed)", "[Bonus Track]" ... at the end of a name are versions of the same song
        var VERSION_TAIL = /\s*[\(\[][^\)\]]*(sped|speed|slow|reverb|nightcore|alternate mix|bonus track)[^\)\]]*[\)\]]\s*$/i;

        function findLyrics(name) {
            var key = String(name).toLowerCase().replace(/\s+/g, ' ').trim();
            if (lyricsMap[key]) return lyricsMap[key];
            while (VERSION_TAIL.test(key)) {
                key = key.replace(VERSION_TAIL, '').trim();
                if (lyricsMap[key]) return lyricsMap[key];
            }
            return '';
        }

        function readRelease(card) {
            var links = parseJson(card.getAttribute('data-links'), {});
            var spotify = card.getAttribute('data-spotify');
            if (spotify && !links.spotify) links.spotify = spotify;
            var kind = card.getAttribute('data-kind') || 'Single';
            var title = card.getAttribute('data-title');
            var tracks = parseJson(card.getAttribute('data-tracks'), []);
            if (!tracks.length && kind === 'Single') tracks = [title];
            return {
                slug: card.getAttribute('data-slug'),
                title: title,
                artist: card.getAttribute('data-artist'),
                date: card.getAttribute('data-date'),
                kind: kind,
                cover: card.getAttribute('data-cover'),
                details: card.getAttribute('data-details'),
                links: links,
                tracks: tracks
            };
        }

        function el(tag, className, text) {
            var node = document.createElement(tag);
            if (className) node.className = className;
            if (text) node.textContent = text;
            return node;
        }

        function buildModal() {
            rModal = el('div', 'rmodal');
            rModal.setAttribute('role', 'dialog');
            rModal.setAttribute('aria-modal', 'true');
            rModal.setAttribute('aria-labelledby', 'rmodal-title');
            rModal.hidden = true;
            rModal.innerHTML =
                '<div class="rmodal__backdrop" data-rclose></div>' +
                '<div class="rmodal__panel">' +
                '<img class="rmodal__bg" alt="">' +
                '<div class="rmodal__grip" aria-hidden="true"></div>' +
                '<button class="rmodal__btn rmodal__btn--close" type="button" aria-label="Close" data-rclose>&times;</button>' +
                '<div class="rmodal__art"><img class="rmodal__cover" alt=""></div>' +
                '<div class="rmodal__info"></div>' +
                '<div class="rmodal__nav">' +
                '<button class="rmodal__btn" type="button" aria-label="Previous release" data-rstep="-1">&lsaquo;</button>' +
                '<button class="rmodal__btn" type="button" aria-label="Next release" data-rstep="1">&rsaquo;</button>' +
                '</div></div>';
            document.body.appendChild(rModal);

            rModal.addEventListener('click', function (event) {
                if (event.target.closest('[data-rclose]')) closeRelease();
                var step = event.target.closest('[data-rstep]');
                if (step) stepRelease(Number(step.getAttribute('data-rstep')));
            });

            var grip = rModal.querySelector('.rmodal__grip');
            grip.addEventListener('pointerdown', grabSheet);
            grip.addEventListener('pointermove', moveSheet);
            grip.addEventListener('pointerup', dropSheet);
            grip.addEventListener('pointercancel', dropSheet);

            // swipe left / right on a phone
            var startX = null;
            rModal.addEventListener('touchstart', function (event) { startX = event.target.closest('.rmodal__grip') ? null : event.touches[0].clientX; }, { passive: true });
            rModal.addEventListener('touchend', function (event) {
                if (startX === null) return;
                var dx = event.changedTouches[0].clientX - startX;
                startX = null;
                if (Math.abs(dx) > 70) stepRelease(dx < 0 ? 1 : -1);
            }, { passive: true });
        }

        function fillRelease(data) {
            var cover = rModal.querySelector('.rmodal__cover');
            cover.src = data.cover;
            cover.alt = 'Cover of ' + data.title;
            rModal.querySelector('.rmodal__bg').src = data.cover;

            var info = rModal.querySelector('.rmodal__info');
            info.textContent = '';
            info.appendChild(el('p', 'rmodal__kind', data.kind + ' \u00b7 ' + data.date));
            var title = el('h2', 'rmodal__title', data.title);
            title.id = 'rmodal-title';
            info.appendChild(title);
            info.appendChild(el('p', 'rmodal__artist', data.artist));

            // 1) links we know, 2) search links for the main platforms that are still missing
            info.appendChild(el('h3', 'rmodal__h', 'Listen'));
            var list = el('ul', 'rmodal__links');
            var known = 0;
            var query = encodeURIComponent('SETTWOR ' + data.title);
            PLATFORMS.forEach(function (platform) {
                var url = data.links[platform[0]];
                if (!url) return;
                known++;
                var li = el('li');
                var a = el('a', 'rmodal__link', platform[1]);
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
                li.appendChild(a);
                list.appendChild(li);
            });
            var searched = 0;
            Object.keys(SEARCH).forEach(function (key) {
                if (data.links[key]) return;
                searched++;
                var name = PLATFORMS.filter(function (p) { return p[0] === key; })[0][1];
                var li = el('li');
                var a = el('a', 'rmodal__link rmodal__link--search', name);
                a.href = SEARCH[key](query);
                a.target = '_blank';
                a.rel = 'noopener';
                a.title = 'Search for this release on ' + name;
                li.appendChild(a);
                list.appendChild(li);
            });
            info.appendChild(list);
            if (searched) {
                info.appendChild(el('p', 'rmodal__note', 'Buttons with \u2315 open a search on that platform.'));
            }

            if (data.tracks.length) {
                info.appendChild(el('h3', 'rmodal__h', 'Tracklist'));
                var ol = el('ol', 'rmodal__tracks');
                ol.setAttribute('data-lens', '');   // v9.6: one highlight slides between the rows (js/fluid.js, section 5)
                data.tracks.forEach(function (name) {
                    var li = el('li');
                    li.appendChild(el('span', 'rmodal__trackname', name));
                    var lyricsUrl = findLyrics(name);
                    if (lyricsUrl) {
                        var lyr = el('a', 'rmodal__lyrics', 'Lyrics');
                        lyr.href = lyricsUrl;
                        lyr.title = 'Open the lyrics of ' + name;
                        lyr.setAttribute('aria-label', 'Open the lyrics of ' + name);
                        li.appendChild(lyr);
                    }
                    ol.appendChild(li);
                });
                info.appendChild(ol);
            } else if (data.details) {
                info.appendChild(el('h3', 'rmodal__h', 'Tracklist'));
                var more = el('p');
                var link = el('a', 'rmodal__link', 'Open the tracklist page');
                link.href = data.details;
                more.appendChild(link);
                info.appendChild(more);
            } else {
                // 5.5: no list and no page for it: say so plainly instead of leaving a gap
                info.appendChild(el('h3', 'rmodal__h', 'Tracklist'));
                info.appendChild(el('p', 'rmodal__note', 'The tracklist of this release is not added yet.'));
            }
        }

        function showRelease(index, direction) {
            rIndex = (index + releaseCards.length) % releaseCards.length;
            var data = readRelease(releaseCards[rIndex]);
            fillRelease(data);
            rModal.style.setProperty('--dir', (direction || 0) * 30 + 'px');
            rModal.classList.remove('is-switching');
            void rModal.offsetWidth; // restart the animation
            if (direction) rModal.classList.add('is-switching');
            try { history.replaceState(null, '', '#release-' + data.slug); } catch (e) { /* ignore */ }
            document.title = data.title + ' | SETTWOR';
        }

        var pageTitle = document.title;

        /* The page behind goes back while the sheet is up (SKILL 12 "dim to focus"). Only the content (`main`, footer) scales,
           not the fixed header. The class `sheet-back` on <html> + CSS does it with a spring-like transition;
           while the finger moves the sheet, the scale follows the scrim 1:1 (inline value, no transition). */
        var BACK_SCALE = 0.02;
        function backNodes() { return Array.prototype.slice.call(document.querySelectorAll('main#main, .site-footer')); }

        function pageBack(on) {
            if (on) {
                backNodes().forEach(function (n) {   // scale around the middle of what the visitor sees
                    var r = n.getBoundingClientRect();
                    n.style.transformOrigin = (window.innerWidth / 2 - r.left) + 'px ' + (window.innerHeight / 2 - r.top) + 'px';
                });
            }
            document.documentElement.classList.toggle('sheet-back', on);
        }

        function backFollows(scrim) {
            if (STW.motion.reduced()) return;
            backNodes().forEach(function (n) {
                n.style.transition = 'none';
                n.style.transform = 'scale(' + (1 - BACK_SCALE * scrim) + ')';
            });
        }

        function backFree() {   // give the page back to the CSS (no inline values)
            backNodes().forEach(function (n) { n.style.transition = ''; n.style.transform = ''; });
        }

        // Exit = the entry played backwards (todo design 3.2, SKILL 7): same path, mirrored easing (0.2,0.8,0.2,1 -> 0.8,0,0.8,0.2),
        // shorter. It starts from the LIVE opacity/transform (SKILL 3), so a window that is still arriving, or is grabbed
        // again while leaving, never jumps. Reduced motion: only a short fade, no movement (SKILL 14).
        var EXIT_DEFAULT = 'translateY(28px) scale(0.95)';   // no cover to go back to (an address with #release-...)
        var FROM_COVER = 0.82;                              // the window starts at this scale and grows from the cover
        var rExit = EXIT_DEFAULT;

        function animateModal(closing) {
            var nodes = [rModal.querySelector('.rmodal__panel'), rModal.querySelector('.rmodal__backdrop')];
            var token = ++rToken;
            rDrag = null;   // a key or a button took over from the finger
            function done() {
                if (token !== rToken) return;
                rAnims.forEach(function (a) { a.cancel(); });
                rAnims = [];
                if (closing) finishClose(); else STW.motion.haptic();   // 8.2: the window has landed
            }
            if (typeof nodes[0].animate !== 'function') { done(); return; }
            var glass = !STW.motion.reduced() && !STW.motion.reducedTransparency();   // 4.5: the scrim blur grows and shrinks with it
            var live = nodes.map(function (n, i) {
                var cs = getComputedStyle(n);
                var frame = { opacity: cs.opacity, transform: cs.transform };
                if (i === 1 && glass) { frame.backdropFilter = cs.backdropFilter; frame.webkitBackdropFilter = cs.backdropFilter; }
                return frame;
            });
            if (rSpring) { rSpring.stop(); rSpring = null; }
            rAnims.forEach(function (a) { a.cancel(); });
            nodes.forEach(function (n) { n.style.transform = ''; n.style.opacity = ''; });   // values left by a gesture
            backFree();
            var reduced = STW.motion.reduced();
            var end = closing
                ? [{ opacity: 0, transform: reduced ? 'none' : rExit }, { opacity: 0, transform: 'none' }]
                : [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: 'none' }];
            if (glass) {
                var blurOn = getComputedStyle(document.documentElement).getPropertyValue('--scrim-modal-blur').trim() || 'blur(10px)';
                var blurEnd = closing ? 'blur(0px)' : blurOn;
                end[1].backdropFilter = blurEnd;
                end[1].webkitBackdropFilter = blurEnd;
            }
            var timing = {
                duration: reduced ? 150 : (closing ? 280 : 300),
                easing: closing ? 'cubic-bezier(0.8, 0, 0.8, 0.2)' : 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                fill: 'forwards'
            };
            rAnims = nodes.map(function (n, i) { return n.animate([live[i], end[i]], timing); });
            rAnims[0].onfinish = done;
        }

        function finishClose() {
            rSpring = null;
            rModal.hidden = true;
            rModal.classList.remove('is-closing');
            rClosing = false;
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
        }

        /* Appearing from the source (todo design 3.2, SKILL 7): the window grows from the cover that was pressed and
           shrinks back into it. `transform-origin` of the panel is put at the middle of the cover (clamped to the panel,
           so a cover far away only gives a direction). Without a cover (an address with #release-...) it is the old
           entry from below. */
        function setOrigin(card) {
            var panel = rModal.querySelector('.rmodal__panel');
            var cover = card && card.querySelector('.release__cover');
            var r = cover ? cover.getBoundingClientRect() : null;
            if (!r || !r.width) {
                panel.style.removeProperty('--enter-y'); panel.style.removeProperty('--enter-scale');
                panel.style.transformOrigin = '';
                rExit = EXIT_DEFAULT;
                return;
            }
            // layout box (offset*), not getBoundingClientRect: the panel is scaled/moved by the animation at this moment
            var left = panel.offsetLeft, top = panel.offsetTop, w = panel.offsetWidth, h = panel.offsetHeight;
            var x = Math.max(0, Math.min(w, r.left + r.width / 2 - left));
            var y = Math.max(0, Math.min(h, r.top + r.height / 2 - top));
            panel.style.setProperty('--enter-y', '0px');
            panel.style.setProperty('--enter-scale', String(FROM_COVER));
            panel.style.transformOrigin = x + 'px ' + y + 'px';
            rExit = 'scale(' + FROM_COVER + ')';
        }

        var landOn = null;   // the one 'landed' listener (8.2)
        function openRelease(card, opener) {
            if (!rModal) buildModal();
            var wasClosing = rClosing;
            if (rModal.hidden) resetSheet();   // a fresh opening plays the entry animation again
            rOpener = opener || card.querySelector('a');
            showRelease(releaseCards.indexOf(card), 0);
            var fresh = rModal.hidden;
            rModal.hidden = false;
            if (fresh) setOrigin(opener ? card : null);   // before the first frame: grows from the pressed cover (an address gives no pressed cover)
            if (fresh) {   // 8.2: one quiet tick when the window has landed (the entry is the CSS animation `panel-in`)
                var landPanel = rModal.querySelector('.rmodal__panel');
                if (landOn) landPanel.removeEventListener('animationend', landOn);
                landOn = function (e) {
                    if (e.animationName !== 'panel-in') return;
                    landPanel.removeEventListener('animationend', landOn);
                    if (!rClosing && !rModal.hidden) STW.motion.haptic();
                };
                landPanel.addEventListener('animationend', landOn);
            }
            document.body.classList.add('modal-open');
            document.documentElement.classList.add('modal-open');
            pageBack(true);
            if (wasClosing) {              // grabbed again while leaving: come back from where it is
                rClosing = false;
                rModal.classList.remove('is-closing');
                animateModal(false);
            }
            rModal.querySelector('.rmodal__btn--close').focus();
        }

        function beginLeave() {
            setOrigin(releaseCards[rIndex]);   // back into the cover of the release that is shown now (arrows may have changed it)
            pageBack(false);
            rClosing = true;
            rModal.classList.add('is-closing');
            document.title = pageTitle;
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
            if (rOpener) rOpener.focus({ preventScroll: true });
        }

        function closeRelease() {
            if (!rModal || rModal.hidden || rClosing) return;
            beginLeave();
            animateModal(true);
        }

        /* ---- swipe the sheet down by the grip (phones). todo design 3.2, SKILL 2, 3, 5, 6, 9 ---- */
        // y = how far the sheet is moved down, in px. The scrim follows the sheet.
        var sheetH = 0;   // 7.4: height of the panel, read once per gesture (reading it after every transform write forced a style recalculation per frame)
        function setSheet(y) {
            var panel = rModal.querySelector('.rmodal__panel');
            if (!sheetH) sheetH = panel.offsetHeight;
            panel.style.transform = 'translateY(' + y + 'px)';
            var scrim = Math.max(0, Math.min(1, 1 - y / (sheetH || window.innerHeight)));
            rModal.querySelector('.rmodal__backdrop').style.opacity = String(scrim);
            backFollows(scrim);
        }

        function resetSheet() {
            sheetH = 0;
            var panel = rModal.querySelector('.rmodal__panel');
            var back = rModal.querySelector('.rmodal__backdrop');
            panel.style.animation = ''; panel.style.transform = '';
            back.style.animation = ''; back.style.opacity = '';
        }

        function restSheet() {   // at rest again: drop the inline values (the CSS animation stays off)
            sheetH = 0;
            rModal.querySelector('.rmodal__panel').style.transform = '';
            rModal.querySelector('.rmodal__backdrop').style.opacity = '';
            backFree();
        }

        function sheetSpeed() {   // px/s of the last ~100 ms of the finger
            var h = rDrag.hist;
            var last = h[h.length - 1];
            var first = h[0];
            for (var i = 0; i < h.length; i++) { if (last.t - h[i].t <= 100) { first = h[i]; break; } }
            return last.t > first.t ? (last.y - first.y) / (last.t - first.t) * 1000 : 0;
        }

        function grabSheet(event) {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            var panel = rModal.querySelector('.rmodal__panel');
            sheetH = panel.offsetHeight;   // measured before anything is written
            var y = 0;
            if (rSpring) { y = rSpring.stop(); rSpring = null; }      // grabbed while a spring carries it
            else {
                var tf = getComputedStyle(panel).transform;           // the LIVE position, also in the middle of an exit
                if (tf && tf !== 'none') y = new DOMMatrixReadOnly(tf).m42;
            }
            rToken++;
            rAnims.forEach(function (a) { a.cancel(); });
            rAnims = [];
            panel.style.animation = 'none';
            rModal.querySelector('.rmodal__backdrop').style.animation = 'none';
            var wasLeaving = rClosing;
            if (rClosing) { rClosing = false; rModal.classList.remove('is-closing'); }
            // the finger keeps the point where it grabbed the sheet (no jump to the finger)
            rDrag = { id: event.pointerId, startY: event.clientY, y0: y, hist: [{ t: event.timeStamp, y: y }], wasLeaving: wasLeaving };
            event.currentTarget.setPointerCapture(event.pointerId);
            setSheet(y);
            event.preventDefault();
        }

        function moveSheet(event) {
            if (!rDrag || event.pointerId !== rDrag.id) return;
            var h = sheetH || rModal.querySelector('.rmodal__panel').offsetHeight;
            var raw = rDrag.y0 + (event.clientY - rDrag.startY);
            var y = raw >= 0 ? raw : -STW.motion.rubberband(-raw, h);   // pulled up: more and more resistance
            rDrag.hist.push({ t: event.timeStamp, y: y });
            if (rDrag.hist.length > 8) rDrag.hist.shift();
            setSheet(y);
        }

        function dropSheet(event) {
            if (!rDrag || event.pointerId !== rDrag.id) return;
            var panel = rModal.querySelector('.rmodal__panel');
            var h = sheetH || panel.offsetHeight || window.innerHeight;
            var y = rDrag.hist[rDrag.hist.length - 1].y;
            var v = event.type === 'pointercancel' ? 0 : sheetSpeed();
            var wasLeaving = rDrag.wasLeaving;
            rDrag = null;
            var thrown = Math.abs(v) > 500;
            // a throw decides by the SIGN of its speed; a slow release by the position
            var leave = event.type === 'pointercancel' ? false : (thrown ? v > 0 : y > h * 0.4);
            if (leave) {
                if (!wasLeaving) beginLeave(); else { rClosing = true; rModal.classList.add('is-closing'); }
                if (STW.motion.reduced()) { animateModal(true); return; }   // reduced motion: a short fade, no travel
                rSpring = STW.motion.spring({
                    from: y, to: h + 48, velocity: v, damping: 1, response: 0.3,
                    onUpdate: setSheet,
                    onDone: function () { finishClose(); restSheet(); }
                });
            } else {
                if (wasLeaving) { showRelease(rIndex, 0); pageBack(true); }   // title, address and the page behind again
                rSpring = STW.motion.spring({
                    from: y, to: 0, velocity: v,
                    damping: thrown ? 0.8 : 1, response: thrown ? 0.3 : 0.4,   // a little bounce only after a throw
                    onUpdate: setSheet,
                    onDone: function () { rSpring = null; restSheet(); }
                });
            }
        }

        function stepRelease(direction) {
            if (rClosing) return;
            showRelease(rIndex + direction, direction);
        }

        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('[data-release]');
            if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            var card = trigger.closest('.release[data-slug]');
            if (!card) return;
            event.preventDefault();
            openRelease(card, trigger);
        });

        // a click on the name of a release opens it too
        document.addEventListener('click', function (event) {
            var name = event.target.closest('.release__name');
            if (!name) return;
            var card = name.closest('.release[data-slug]');
            if (card) openRelease(card, card.querySelector('a'));
        });

        document.addEventListener('keydown', function (event) {
            if (!rModal || rModal.hidden) return;
            if (event.key === 'Escape') { closeRelease(); return; }
            if (event.key === 'ArrowLeft') stepRelease(-1);
            else if (event.key === 'ArrowRight') stepRelease(1);
            else if (event.key === 'Tab') {
                // keep the focus inside the window
                var items = rModal.querySelectorAll('a[href], button');
                if (!items.length) return;
                var first = items[0];
                var last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });

        // an address like /releases.html#release-got-me-up opens that release at once
        var hashMatch = /^#release-(.+)$/.exec(location.hash);
        if (hashMatch) {
            var wanted = releaseCards.filter(function (card) { return card.getAttribute('data-slug') === decodeURIComponent(hashMatch[1]); })[0];
            if (wanted) openRelease(wanted, null);
        }
    }

    /* ---------- 7. Offline cache ---------- */
    /* sw.js keeps pictures, fonts, styles and visited pages on the device.
       It is off on localhost so that local checks always show the newest files. */
    var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !local && !window.__oneSignalOwnsWorker) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () { /* not available: the site works without it */ });
        });
    }
})();

/* iOS Safari shows :active (press feedback) only if some touch listener exists. */
document.addEventListener('touchstart', function () { }, { passive: true });

/* 9.5 (v7.7): one tick on every tap on a control (links, buttons, tabs, menu items, form controls). The shared helper is
   STW.motion.haptic(); it skips reduced motion, mouse and trackpad, and a second tick within 80 ms. */
document.addEventListener('click', function (event) {
    var t = event.target;
    if (!t || !t.closest || !window.STW || !STW.motion) return;
    var hit = t.closest('a[href], button, summary, select, input, label, [role="button"], [role="tab"], [role="menuitem"], .btn');
    if (!hit || hit.disabled || hit.getAttribute('aria-disabled') === 'true') return;
    if (hit.closest('[data-haptic]')) return;   // our own hidden switch
    STW.motion.haptic();
}, true);

/* 8.1 (v8.1): the manual theme switch in the footer (Auto / Light / Dark). "Auto" follows the system setting (no
   attribute on <html>). The choice is kept in this browser only (local storage, key settwor-theme) and is applied
   before the first paint by a small script in the head of _layouts/default.html. The two theme-color meta tags
   (the colour of the phone's browser bar) follow the choice too. */
(function () {
    'use strict';
    var KEY = 'settwor-theme';
    var root = document.documentElement;
    var group = document.querySelector('.theme-switch');
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    var COLORS = { light: '#f6f6f6', dark: '#1a1a1a' };   /* keep in step with --color-bg of the dark theme (css/main.css, section 6.4) */

    function read() {
        try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; }
    }
    function write(v) {
        try { if (v === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable: the choice lasts until the page closes */ }
    }
    function apply(v) {
        if (v === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', v);
        Array.prototype.forEach.call(metas, function (m) {
            if (!m.hasAttribute('data-auto-color')) m.setAttribute('data-auto-color', m.getAttribute('content'));
            m.setAttribute('content', v === 'auto' ? m.getAttribute('data-auto-color') : COLORS[v]);
        });
        if (group) {
            Array.prototype.forEach.call(group.querySelectorAll('[data-theme-set]'), function (b) {
                b.setAttribute('aria-pressed', b.getAttribute('data-theme-set') === v ? 'true' : 'false');
            });
        }
    }

    apply(read());
    if (group) {
        group.hidden = false;
        group.addEventListener('click', function (event) {
            var b = event.target.closest('[data-theme-set]');
            if (!b) return;
            var v = b.getAttribute('data-theme-set');
            write(v);
            apply(v);
        });
    }
    // another tab changed the choice
    window.addEventListener('storage', function (event) { if (event.key === KEY) apply(read()); });
})();


/* 11. Press layer: moved in v9.6 to js/fluid.js (section 2 there). It is the same layer, now on springs, and it also
   covers buttons, tabs and chips (they used CSS :active before). Do not add a press mechanism here. */
