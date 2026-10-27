/* "SETTWOR in numbers" (home and Streams): counts the numbers up, grows the bars and fades the cards in.
   Every card is watched on its own and starts when IT comes into view. (Before 2.4 the whole block was watched
   as one piece; on the Streams page the block is thousands of pixels tall, so on a phone it never counted as
   "in view" and the cards stayed hidden / the page jerked.) Without JavaScript or with "reduce motion" the
   final numbers stay as they are. */
(function () {
    var box = document.getElementById('numbers');
    if (!box) return;
    var fmt = new Intl.NumberFormat('en-US');   // same commas as the page itself, whatever the browser language
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || !('IntersectionObserver' in window)) return;

    var targets = box.querySelectorAll('.numbers__hero, .plat, .yt, .trend');
    if (!targets.length) return;
    targets.forEach(function (el, i) { el.style.setProperty('--i', i % 4); });

    function show(el, n) { el.textContent = fmt.format(Math.round(n)); }

    function run(el) {
        var end = +el.getAttribute('data-count'), t0 = null, ms = 1200;
        // keep the size of the number while it counts, so nothing below it moves
        var h = el.getBoundingClientRect().height;
        if (h) el.style.minHeight = h + 'px';
        function step(t) {
            if (t0 === null) t0 = t;
            var p = Math.min((t - t0) / ms, 1), e = 1 - Math.pow(1 - p, 4);
            show(el, end * e);
            if (p < 1) requestAnimationFrame(step);
            else { show(el, end); el.style.minHeight = ''; }
        }
        show(el, 0);
        requestAnimationFrame(step);
    }

    box.classList.add('is-armed');
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            io.unobserve(el);
            el.classList.add('is-seen');
            el.querySelectorAll('[data-count]').forEach(run);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    targets.forEach(function (el) { io.observe(el); });

    // safety net: whatever is still hidden after a few seconds is shown
    setTimeout(function () { box.classList.remove('is-armed'); }, 8000);
})();
