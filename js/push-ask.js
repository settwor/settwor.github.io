/* =============================================================
   SETTWOR — push-ask.js
   A friendly window that asks for permission to send notifications about new articles.
   The browser's own question (Allow / Block) is shown only after the visitor says "Yes",
   because a browser question can be shown once and a "Block" is hard to undo.

   When it is shown (all must be true):
     - OneSignal loaded (so it is not blocked by an ad blocker) and the visitor is not subscribed
     - the browser supports notifications and has not been asked or blocked yet
     - the visitor has been on the page for 20 seconds AND scrolled a third of it (a very long page: 1.2 screens)
       (a short page: 35 seconds)
     - the cookie banner is not on the screen
     - not asked before: after "Not now" we wait 7 days, then 30 days, then never again
   ============================================================= */
(function () {
    'use strict';

    var root = document.getElementById('push-ask');
    if (!root || !('Notification' in window) || Notification.permission !== 'default') return;

    var KEY = 'settwor-push-ask';
    var DAY = 24 * 60 * 60 * 1000;
    var SKIP_PAGES = /\/(privacy|license)(\.html)?\/?$/;
    if (SKIP_PAGES.test(location.pathname)) return;

    function read() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function write(value) {
        try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
    // without storage we could not remember "Not now", so we would ask on every page: do not ask at all
    if (!write(read())) return;

    var saved = read();
    if (saved.done || saved.n >= 3) return;
    if (saved.n && Date.now() - saved.t < (saved.n === 1 ? 7 : 30) * DAY) return;

    var views = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-push-view]'), function (el) {
        views[el.getAttribute('data-push-view')] = el;
    });
    var yes = root.querySelector('[data-push-yes]');
    var card = root.querySelector('.push-ask__card');
    var lastFocus = null;
    var open = false;
    var push = null;

    function show(name) {
        Object.keys(views).forEach(function (key) { views[key].hidden = key !== name; });
    }

    function close() {
        if (!open) return;
        open = false;
        root.classList.remove('is-open');
        document.removeEventListener('keydown', onKey, true);
        setTimeout(function () { root.hidden = true; }, 250);
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
    }

    function notNow() {
        var s = read();
        write({ n: (s.n || 0) + 1, t: Date.now() });
        close();
    }

    function onKey(event) {
        if (event.key === 'Escape') { event.preventDefault(); notNow(); return; }
        if (event.key !== 'Tab') return;
        var items = card.querySelectorAll('button:not([hidden])');
        var visible = Array.prototype.filter.call(items, function (b) { return b.offsetParent !== null; });
        if (!visible.length) return;
        var first = visible[0];
        var last = visible[visible.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    function openWindow() {
        if (open) return;
        open = true;
        lastFocus = document.activeElement;
        show('ask');
        root.hidden = false;
        document.addEventListener('keydown', onKey, true);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { root.classList.add('is-open'); });
        });
        setTimeout(function () { if (yes) yes.focus({ preventScroll: true }); }, 60);
    }

    function accept() {
        yes.disabled = true;
        push.Notifications.requestPermission().then(function () {
            var granted = window.Notification && Notification.permission === 'granted';
            if (granted) {
                write({ done: true });
                show('done');
                setTimeout(close, 2400);
            } else if (Notification.permission === 'denied') {
                show('blocked');
                var closeButton = root.querySelector('[data-push-close]');
                if (closeButton) closeButton.focus();
            } else {
                // the browser question was dismissed without an answer
                yes.disabled = false;
                notNow();
            }
        }).catch(function () {
            yes.disabled = false;
            notNow();
        });
    }

    root.addEventListener('click', function (event) {
        if (event.target.closest('[data-push-yes]')) { accept(); return; }
        if (event.target.closest('[data-push-no]')) { notNow(); return; }
        if (event.target.closest('[data-push-close]')) { close(); }
    });

    /* ---- when to ask: reading for a while, scrolled, no cookie banner ---- */
    function arm() {
        var seconds = 0;
        var scrolled = false;
        function progress() {
            var doc = document.documentElement;
            var room = doc.scrollHeight - window.innerHeight;
            if (room < window.innerHeight * 0.3) return false;      // a short page: only time counts
            // a third of the page, but on a very long page about one and a half screens is enough
            return window.pageYOffset >= Math.min(room * 0.33, window.innerHeight * 1.2);
        }
        function shortPage() {
            var doc = document.documentElement;
            return doc.scrollHeight - window.innerHeight < window.innerHeight * 0.3;
        }
        window.addEventListener('scroll', function () { if (!scrolled && progress()) scrolled = true; }, { passive: true });
        var timer = setInterval(function () {
            if (document.visibilityState !== 'visible') return;
            seconds += 1;
            var banner = document.getElementById('consent');
            if (banner && !banner.hidden) return;
            var ready = shortPage() ? seconds >= 35 : (seconds >= 20 && scrolled);
            if (ready) {
                clearInterval(timer);
                openWindow();
            }
        }, 1000);
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
        push = OneSignal;
        try {
            if (OneSignal.User.PushSubscription.optedIn) return;
        } catch (e) { /* unknown state: go on */ }
        arm();
    });
})();
