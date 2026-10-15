/* =============================================================
   SETTWOR — sw.js (service worker)
   Keeps the heavy parts of the site on the visitor's device:
     - pictures and fonts: kept, checked again only after a few days
     - styles and scripts: shown at once, updated quietly in the background
     - pages: always asked from the internet first, so that new news
       appear at once; the saved copy is used only when offline
   Other websites (Spotify, YouTube, Google Analytics) are never touched.
   To force everybody to download everything again, change VERSION.
   ============================================================= */
const VERSION = 'v2';
const STATIC_CACHE = 'settwor-static-' + VERSION;
const PAGE_CACHE = 'settwor-pages-' + VERSION;
const IMAGE_CACHE = 'settwor-images-' + VERSION;

const IMAGE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;   // pictures: 3 days
const FONT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;   // fonts: 30 days
const IMAGE_LIMIT = 250;                         // at most this many pictures are kept
const PAGE_LIMIT = 40;

const START_FILES = ['/css/main.css', '/js/main.js', '/fonts.css', '/images/favicon.png', '/images/SETTWOR%20vector.svg'];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(function (cache) { return cache.addAll(START_FILES); })
            .catch(function () { /* a missing file must not stop the installation */ })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (event) {
    var keep = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE];
    event.waitUntil(
        caches.keys()
            .then(function (names) {
                return Promise.all(names.filter(function (name) {
                    return name.indexOf('settwor-') === 0 && keep.indexOf(name) === -1;
                }).map(function (name) { return caches.delete(name); }));
            })
            .then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET' || request.headers.has('range')) return;
    var url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;

    if (request.mode === 'navigate') {
        event.respondWith(pageStrategy(request));
    } else if (/\.(?:png|jpe?g|webp|gif|svg|avif|ico)$/i.test(url.pathname)) {
        event.respondWith(keepStrategy(request, IMAGE_CACHE, IMAGE_MAX_AGE, IMAGE_LIMIT));
    } else if (/\.(?:woff2?|ttf|otf)$/i.test(url.pathname)) {
        event.respondWith(keepStrategy(request, STATIC_CACHE, FONT_MAX_AGE, 0));
    } else if (/\.(?:css|js)$/i.test(url.pathname)) {
        event.respondWith(quietUpdateStrategy(request));
    }
});

/* Pages: the internet first, the saved copy when offline. */
function pageStrategy(request) {
    return fetch(request).then(function (response) {
        if (response.ok) save(PAGE_CACHE, request, response.clone(), PAGE_LIMIT);
        return response;
    }).catch(function () {
        return caches.match(request, { ignoreSearch: true })
            .then(function (saved) { return saved || caches.match('/'); })
            .then(function (saved) {
                return saved || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
            });
    });
}

/* Pictures and fonts: the saved copy while it is fresh enough. */
function keepStrategy(request, cacheName, maxAge, limit) {
    return caches.open(cacheName).then(function (cache) {
        return cache.match(request).then(function (saved) {
            if (saved && age(saved) < maxAge) return saved;
            return fetch(request).then(function (response) {
                if (isStorable(response)) save(cacheName, request, response.clone(), limit);
                return response;
            }).catch(function () {
                return saved || Response.error();
            });
        });
    });
}

/* Styles and scripts: show the saved copy now, fetch a new one for the next visit. */
function quietUpdateStrategy(request) {
    return caches.open(STATIC_CACHE).then(function (cache) {
        return cache.match(request).then(function (saved) {
            var update = fetch(request).then(function (response) {
                if (isStorable(response)) cache.put(request, response.clone());
                return response;
            }).catch(function () { return saved || Response.error(); });
            return saved || update;
        });
    });
}

function isStorable(response) {
    return response && response.status === 200 && response.type === 'basic';
}

function age(response) {
    var date = response.headers.get('date');
    var time = date ? Date.parse(date) : NaN;
    return isNaN(time) ? Infinity : Date.now() - time;
}

function save(cacheName, request, response, limit) {
    return caches.open(cacheName).then(function (cache) {
        return cache.put(request, response).then(function () {
            if (!limit) return null;
            return cache.keys().then(function (keys) {
                var extra = keys.length - limit;
                return Promise.all(keys.slice(0, Math.max(0, extra)).map(function (key) { return cache.delete(key); }));
            });
        });
    }).catch(function () { /* storage full or unavailable: ignore */ });
}
