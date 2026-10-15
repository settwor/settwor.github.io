/* Home, "SETTWOR in numbers": counts the numbers up, grows the bars and fades the cards in
   when the block comes into view. Without JavaScript (or with "reduce motion") the final numbers stay as they are. */
(function () {
    var box = document.getElementById('numbers');
    if (!box) return;
    var items = box.querySelectorAll('[data-count]');
    var fmt = new Intl.NumberFormat('en-US');   // same commas as the page itself, whatever the browser language
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(el, n) { el.textContent = fmt.format(Math.round(n)); }
    if (calm || !('IntersectionObserver' in window)) return;

    box.querySelectorAll('.plat, .yt').forEach(function (el, i) { el.style.setProperty('--i', i % 6); });
    box.classList.add('is-armed');

    function run(el) {
        var end = +el.getAttribute('data-count'), t0 = null, ms = 1700;
        function step(t) {
            if (t0 === null) t0 = t;
            var p = Math.min((t - t0) / ms, 1), e = 1 - Math.pow(1 - p, 4);
            show(el, end * e);
            if (p < 1) requestAnimationFrame(step); else show(el, end);
        }
        show(el, 0);
        requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        box.classList.add('is-in');
        items.forEach(run);
    }, { threshold: 0.2 });
    io.observe(box);
})();
