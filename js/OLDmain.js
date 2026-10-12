/* =============================================================
   SETTWOR — main.js
   1. Mobile menu   2. Cookie consent + Google Analytics   3. Footer year
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

    /* ---------- 3. Footer year ---------- */
    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach(function (node) {
        node.textContent = year;
    });
})();
