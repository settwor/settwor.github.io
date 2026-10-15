/* =============================================================
   SETTWOR — main.js
   1. Mobile menu   2. Cookie consent + Google Analytics
   3. Contents list of a biography   4. Current section in the left rail
   5. Photographs: year tabs, picture viewer, fallback to the big picture
   6. Footer year   7. Offline cache (sw.js)
   8. Motion (header, reveal, buttons, tilt)   9. Releases: preview window
   Google Analytics is loaded ONLY after the visitor clicks "Accept".
   ============================================================= */
(function () {
    'use strict';

    var GA_ID = 'G-KG531WJ8DV';
    var STORAGE_KEY = 'settwor-analytics-consent'; // 'granted' | 'denied'

    /* ---------- 1. Mobile menu ---------- */
    var burger = document.getElementById('burger');
    var menu = document.getElementById('mobile-menu');

    function setMenu(open) {
        if (!burger || !menu) return;
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.classList.toggle('is-open', open);
        document.body.classList.toggle('menu-open', open);
    }

    if (burger && menu) {
        burger.addEventListener('click', function () {
            setMenu(burger.getAttribute('aria-expanded') !== 'true');
        });

        menu.addEventListener('click', function (event) {
            if (event.target.closest('a')) setMenu(false);
        });

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
        if (banner) banner.hidden = true;
    }

    var stored = readConsent();
    if (stored === 'granted') {
        loadAnalytics();
    } else if (stored !== 'denied' && banner) {
        banner.hidden = false;
    }

    document.addEventListener('click', function (event) {
        var choice = event.target.closest('[data-consent]');
        if (choice) {
            applyConsent(choice.getAttribute('data-consent'));
            return;
        }
        if (event.target.closest('[data-consent-open]') && banner) {
            banner.hidden = false;
            var firstButton = banner.querySelector('button');
            if (firstButton) firstButton.focus();
        }
    });

    /* ---------- 3. Contents list of a biography (made from its headings) ---------- */
    var autoToc = document.querySelector('[data-toc-auto] .rail-list');
    var bioHeadings = document.querySelectorAll('.bio__body h2');
    if (autoToc && bioHeadings.length) {
        bioHeadings.forEach(function (heading, index) {
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
    /* 5a. Year tabs: only the chosen year is shown (without JavaScript all years are). */
    var yearSections = document.querySelectorAll('.gallery__year[data-year]');
    var yearTabs = document.querySelectorAll('[data-year-tabs] a, [data-year-links] a');

    function showYear(year, scroll) {
        var found = false;
        yearSections.forEach(function (section) {
            if (section.getAttribute('data-year') === year) found = true;
        });
        if (!found && yearSections.length) year = yearSections[0].getAttribute('data-year');
        yearSections.forEach(function (section) {
            section.hidden = section.getAttribute('data-year') !== year;
        });
        yearTabs.forEach(function (link) {
            var active = link.getAttribute('href') === '#y' + year;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
        });
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
        window.addEventListener('hashchange', function () {
            if (yearFromHash()) showYear(yearFromHash(), true);
        });
    }

    /* 5b. Picture viewer */
    var viewer = null;
    var viewerLinks = [];
    var viewerIndex = 0;
    var viewerOpener = null;

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
        viewerIndex = (viewerIndex + direction + viewerLinks.length) % viewerLinks.length;
        showViewerPhoto();
    }

    function closeViewer() {
        if (!viewer || viewer.hidden) return;
        viewer.hidden = true;
        viewer.querySelector('.lightbox__img').removeAttribute('src');
        document.body.classList.remove('menu-open');
        if (viewerOpener) viewerOpener.focus();
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
        showViewerPhoto();
        viewer.hidden = false;
        document.body.classList.add('menu-open');
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
        if (event.target && event.target.tagName === 'IMG') useBigPicture(event.target);
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
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var header = document.querySelector('.site-header');

    // thin line that shows how far the page is read + glass header after scrolling
    var bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;

    function onScroll() {
        ticking = false;
        var top = window.pageYOffset || document.documentElement.scrollTop;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, top / max) : 0) + ')';
        if (header) header.classList.toggle('is-scrolled', top > 24);
    }

    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    // things that fade in when they come into view (same list as in main.css)
    var revealSelector = '[data-reveal], .news-card, .social li, .photo-grid li, .section-title, .news-year__title, .embed, .rail-block, .callout, .facts, .gallery__note';
    var revealItems = document.querySelectorAll(revealSelector);

    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealItems.forEach(function (item) { item.classList.add('is-in'); });
    } else {
        var queue = [];
        var queueTimer = 0;
        var flushQueue = function () {
            queueTimer = 0;
            queue.forEach(function (item, index) {
                item.style.setProperty('--d', Math.min(index, 8) * 0.06 + 's');
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

    // soft 3D tilt of covers (mouse only)
    function tilt(el, event, strength) {
        var box = el.getBoundingClientRect();
        var px = (event.clientX - box.left) / box.width - 0.5;
        var py = (event.clientY - box.top) / box.height - 0.5;
        el.style.setProperty('--ry', (px * strength) + 'deg');
        el.style.setProperty('--rx', (-py * strength) + 'deg');
    }

    function untilt(el) {
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

    /* ---------- 9. Releases: preview window with links and tracklist ---------- */
    var releaseCards = Array.prototype.slice.call(document.querySelectorAll('.release[data-slug]'));

    if (releaseCards.length) {
        var rModal = null;
        var rIndex = 0;
        var rOpener = null;

        // a short name of the platform and its address; "search" links are made from the title
        var PLATFORMS = [
            ['spotify', 'Spotify'],
            ['apple', 'Apple Music'],
            ['youtube_music', 'YouTube Music'],
            ['youtube', 'YouTube'],
            ['deezer', 'Deezer'],
            ['soundcloud', 'SoundCloud'],
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
            deezer: function (q) { return 'https://www.deezer.com/search/' + q; },
            soundcloud: function (q) { return 'https://soundcloud.com/search?q=' + q; }
        };

        function parseJson(text, fallback) {
            try { var value = JSON.parse(text); return value || fallback; } catch (e) { return fallback; }
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

            // swipe left / right on a phone
            var startX = null;
            rModal.addEventListener('touchstart', function (event) { startX = event.touches[0].clientX; }, { passive: true });
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
                data.tracks.forEach(function (name) { ol.appendChild(el('li', '', name)); });
                info.appendChild(ol);
            } else if (data.details) {
                info.appendChild(el('h3', 'rmodal__h', 'Tracklist'));
                var more = el('p');
                var link = el('a', 'rmodal__link', 'Open the tracklist page');
                link.href = data.details;
                more.appendChild(link);
                info.appendChild(more);
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

        function openRelease(card, opener) {
            if (!rModal) buildModal();
            rOpener = opener || card.querySelector('a');
            showRelease(releaseCards.indexOf(card), 0);
            rModal.hidden = false;
            document.body.classList.add('modal-open');
            document.documentElement.classList.add('modal-open');
            rModal.querySelector('.rmodal__btn--close').focus();
        }

        function closeRelease() {
            if (!rModal || rModal.hidden) return;
            rModal.hidden = true;
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
            document.title = pageTitle;
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
            if (rOpener) rOpener.focus();
        }

        function stepRelease(direction) {
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
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !local) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () { /* not available: the site works without it */ });
        });
    }
})();
