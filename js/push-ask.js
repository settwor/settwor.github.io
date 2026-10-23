/* =============================================================
   SETTWOR — push-ask.js
   Asks for permission to send notifications about new articles, in two ways:
   1) the "Get notifications" buttons (data-push-open): the window opens at once
   2) on its own, after the visitor has been reading for a while
   The browser's own question (Allow / Block) is shown only after the visitor says "Yes",
   because a browser question can be shown once and a "Block" is hard to undo.

   When it opens on its own (all must be true):
     - OneSignal loaded (so it is not blocked by an ad blocker) and the visitor is not subscribed
     - the browser supports notifications and has not been asked or blocked yet
     - the visitor has been on the page for 20 seconds AND scrolled a third of it
       (a very long page: 1.2 screens; a short page: 35 seconds)
     - the cookie banner is not on the screen, and no window, photo viewer or menu is open (todo design 5.6: never on
       top of something the visitor is doing)
     - not asked before: after "Not now" we wait 7 days, then 30 days, then never again

   It is a parallel notice, not a modal task (todo design 4.3, 5.6): no focus trap and no aria-modal, the page behind
   stays usable. When it opens ON ITS OWN it does not take the focus; when the visitor opens it with a button it does.
   ============================================================= */
(function () {
    'use strict';

    var root = document.getElementById('push-ask');
    if (!root || !('Notification' in window)) return;     // no window, or a browser without notifications (iPhone Safari)

    var KEY = 'settwor-push-ask';
    var DAY = 24 * 60 * 60 * 1000;
    var SKIP_PAGES = /\/(privacy|license)(\.html)?\/?$/;

    function read() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function write(value) {
        try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch (e) { return false; }
    }

    var views = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-push-view]'), function (el) {
        views[el.getAttribute('data-push-view')] = el;
    });
    var yes = root.querySelector('[data-push-yes]');
    var card = root.querySelector('.push-ask__card');
    var openers = document.querySelectorAll('[data-push-open]');
    var lastFocus = null;
    var open = false;
    var manual = false;      // opened with a button: "Not now" is not counted
    var push = null;

    function show(name) {
        Object.keys(views).forEach(function (key) { views[key].hidden = key !== name; });
    }

    function close() {
        if (!open) return;
        open = false;
        root.classList.remove('is-open');
        document.removeEventListener('keydown', onKey, true);
        setTimeout(function () { root.hidden = true; }, 280);   // = --t-exit in css/main.css
        // the focus goes back only if it was inside the card (otherwise the visitor is somewhere else and stays there)
        if (card.contains(document.activeElement) && lastFocus && lastFocus.focus) {
            try { lastFocus.focus(); } catch (e) { /* ignore */ }
        }
    }

    function notNow() {
        if (!manual) {
            var s = read();
            write({ n: (s.n || 0) + 1, t: Date.now() });
        }
        close();
    }

    // something else the visitor is busy with: the release window or the photo viewer (the page is pushed back,
    // class `sheet-back` on <html>) or the open mobile menu
    function busy() {
        return document.documentElement.classList.contains('sheet-back') || !!document.querySelector('.mobile-menu.is-open');
    }

    // Esc says "Not now". No Tab trap: a parallel notice must not lock the page (the Esc of a window or a menu
    // that is open stays theirs).
    function onKey(event) {
        if (event.key !== 'Escape' || (busy() && !card.contains(document.activeElement))) return;
        event.preventDefault();
        notNow();
    }

    function openWindow(view, byButton) {
        if (open) return;
        open = true;
        manual = !!byButton;
        lastFocus = document.activeElement;
        show(view || 'ask');
        if (yes) yes.disabled = false;
        root.hidden = false;
        document.addEventListener('keydown', onKey, true);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { root.classList.add('is-open'); });
        });
        // the visitor asked for it with a button: the focus goes into the card. On its own it does not take the focus.
        if (byButton) {
            setTimeout(function () {
                var target = root.querySelector('[data-push-view]:not([hidden]) button');
                if (target) target.focus({ preventScroll: true });
            }, 60);
        }
    }

    function subscribed() {
        try { if (push && push.User.PushSubscription.optedIn) return true; } catch (e) { /* unknown */ }
        return Notification.permission === 'granted';
    }

    function accept() {
        yes.disabled = true;
        push.Notifications.requestPermission().then(function () {
            if (Notification.permission === 'granted') {
                write({ done: true });
                show('done');
                setTimeout(close, 2400);
            } else if (Notification.permission === 'denied') {
                show('blocked');
                var closeButton = root.querySelector('[data-push-view="blocked"] [data-push-close]');
                if (closeButton) closeButton.focus();
            } else {
                // the browser question was closed without an answer
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

    /* ---- the "Get notifications" buttons ---- */
    document.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('[data-push-open]');
        if (!button || !push) return;
        event.preventDefault();
        if (subscribed()) openWindow('already', true);
        else if (Notification.permission === 'denied') openWindow('blocked', true);
        else openWindow('ask', true);
    });

    /* ---- when to ask on its own: reading for a while, scrolled, no cookie banner ---- */
    function autoAllowed() {
        if (Notification.permission !== 'default' || SKIP_PAGES.test(location.pathname)) return false;
        // without storage we could not remember "Not now", so we would ask on every page: do not ask
        if (!write(read())) return false;
        var saved = read();
        if (saved.done || saved.n >= 3) return false;
        if (saved.n && Date.now() - saved.t < (saved.n === 1 ? 7 : 30) * DAY) return false;
        return !subscribed();
    }

    function arm() {
        var seconds = 0;
        var scrolled = false;
        function shortPage() {
            var doc = document.documentElement;
            return doc.scrollHeight - window.innerHeight < window.innerHeight * 0.3;
        }
        function progress() {
            var doc = document.documentElement;
            var room = doc.scrollHeight - window.innerHeight;
            // a third of the page, but on a very long page about one and a half screens is enough
            return window.pageYOffset >= Math.min(room * 0.33, window.innerHeight * 1.2);
        }
        window.addEventListener('scroll', function () { if (!scrolled && !shortPage() && progress()) scrolled = true; }, { passive: true });
        var timer = setInterval(function () {
            if (document.visibilityState !== 'visible') return;
            seconds += 1;
            var banner = document.getElementById('consent');
            if (banner && !banner.hidden) return;
            if (busy()) return;     // wait: the visitor is in a window or a menu
            var ready = shortPage() ? seconds >= 35 : (seconds >= 20 && scrolled);
            if (ready) {
                clearInterval(timer);
                if (!open && autoAllowed()) openWindow('ask', false);
            }
        }, 1000);
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
        push = OneSignal;
        // OneSignal is alive: now the buttons may be shown
        Array.prototype.forEach.call(openers, function (button) { button.hidden = false; });
        if (autoAllowed()) arm();
    });
})();
