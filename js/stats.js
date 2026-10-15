/* Counts the numbers up when the block comes into view. Without JavaScript the plain numbers stay. */
(function () {
    var items = document.querySelectorAll('[data-count]');
    if (!items.length) return;
    var fmt = new Intl.NumberFormat(document.documentElement.lang || 'en');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(el, n) { el.textContent = fmt.format(Math.round(n)); }
    items.forEach(function (el) { show(el, +el.getAttribute('data-count')); });
    if (calm || !('IntersectionObserver' in window)) return;
    function run(el) {
        var end = +el.getAttribute('data-count'), t0 = null, ms = 1600;
        function step(t) {
            if (t0 === null) t0 = t;
            var p = Math.min((t - t0) / ms, 1), e = 1 - Math.pow(1 - p, 3);
            show(el, end * e);
            if (p < 1) requestAnimationFrame(step);
        }
        show(el, 0);
        requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } });
    }, { threshold: 0.4 });
    items.forEach(function (el) { io.observe(el); });
})();
