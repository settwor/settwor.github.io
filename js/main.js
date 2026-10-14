/* =============================================================
   SETTWOR — main.js
   1. Mobile menu   2. Cookie consent + Google Analytics
   3. Contents list of a biography   4. Current section in the left rail
   5. Photographs: year tabs, picture viewer, fallback to the big picture
   6. Footer year   7. Offline cache (sw.js)
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
