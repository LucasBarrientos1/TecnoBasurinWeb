// Carrusel estilo Instagram: avanza solo, se desliza con el dedo, tiene flechas y puntitos.
document.querySelectorAll('.ig-carousel').forEach(c => {
    const track = c.querySelector('.ig-track');
    const slides = [...track.children];
    const dots = c.querySelector('.ig-dots');
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0, timer;

    slides.forEach((_, n) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'ig-dot';
        d.setAttribute('aria-label', 'Ir a la foto ' + (n + 1));
        d.addEventListener('click', () => { go(n); restart(); });
        dots.appendChild(d);
    });

    function mark() { [...dots.children].forEach((d, n) => d.classList.toggle('active', n === i)); }

    function go(n, instantaneo) {
        i = (n + slides.length) % slides.length;
        track.scrollTo({ left: i * track.clientWidth, behavior: instantaneo ? 'instant' : 'smooth' });
        mark();
    }

    // Mantiene los puntitos al día cuando la persona desliza con el dedo
    track.addEventListener('scroll', () => {
        const n = Math.round(track.scrollLeft / track.clientWidth);
        if (n !== i) { i = n; mark(); }
    });

    function avanzar() { go(i + 1, i === slides.length - 1); } // al llegar a la última vuelve a la primera sin "rebobinar"
    function start() { if (!reducir) timer = setInterval(avanzar, 3500); }
    function stop() { clearInterval(timer); }
    function restart() { stop(); start(); }

    c.querySelector('.ig-prev').addEventListener('click', () => { go(i - 1); restart(); });
    c.querySelector('.ig-next').addEventListener('click', () => { go(i + 1); restart(); });
    c.addEventListener('mouseenter', stop);
    c.addEventListener('mouseleave', start);
    c.addEventListener('touchstart', stop, { passive: true });
    c.addEventListener('touchend', restart, { passive: true });

    mark();
    start();
});
