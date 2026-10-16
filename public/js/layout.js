// Header, footer y carrito compartidos. Se inyectan en todas las páginas.
(function () {
    const logueado = sessionStorage.getItem('userLoggedIn') === 'true';
    const pagina = location.pathname.split('/').pop() || 'index.html';
    const links = [
        ['index.html', 'Inicio'], ['producto.html', 'Producto'], ['comofunciona.html', 'Cómo Funciona'],
        ['nosotros.html', 'Sobre Nosotros'], ['contacto.html', 'Contactos']
    ];
    if (logueado) links.push(['panel.html', 'Mi Panel']);
    const nav = links.map(([h, t]) => `<li><a href="${h}"${h === pagina ? ' class="active"' : ''}>${t}</a></li>`).join('');

    const header = document.getElementById('site-header');
    if (header) {
        header.innerHTML = `
        <div class="container header-flex">
            <div class="logo"><a href="index.html"><img src="Imagen/tecnobasurinlogo.png" alt="TecnoBasurin" class="nav-logo-img"></a></div>
            <nav><ul>${nav}</ul></nav>
            <div class="header-action-group">
                <button class="cart-toggle-btn" onclick="toggleCart()" aria-label="Abrir carrito">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <span id="cart-badge" class="cart-badge">0</span>
                </button>
                <div class="header-action" id="auth-container"></div>
            </div>
        </div>`;
        const auth = document.getElementById('auth-container');
        if (logueado) {
            const saludo = document.createElement('span');
            saludo.className = 'user-welcome';
            saludo.textContent = 'Hola, ' + (sessionStorage.getItem('nombreUsuario') || 'usuario'); // textContent: evita inyección de HTML
            const salir = document.createElement('button');
            salir.className = 'btn btn-nav-login';
            salir.style.marginLeft = '10px';
            salir.textContent = 'Cerrar sesión';
            salir.addEventListener('click', () => { sessionStorage.clear(); location.href = 'index.html'; });
            auth.append(saludo, salir);
        } else {
            auth.innerHTML = '<a href="login.html" class="btn btn-nav-login">Iniciar sesión</a>';
        }
    }

    const footer = document.getElementById('site-footer');
    if (footer) {
        footer.innerHTML = `
        <div class="container footer-grid">
            <div class="footer-col footer-about">
                <img src="Imagen/tecnobasurinlogo.png" alt="TecnoBasurin Logo" class="footer-logo">
                <p class="footer-tagline">Gestión automatizada y sustentable de residuos tecnológicos.</p>
            </div>
            <div class="footer-col"><h4>Contacto</h4><ul class="footer-info-list">
                <li><strong>Correo:</strong> contacto@tecnobasurin.com</li>
                <li><strong>Teléfono:</strong> +54 381 529-4612</li>
                <li><strong>Dirección:</strong> Virgen de la Merced 232, San Miguel de Tucumán</li></ul></div>
            <div class="footer-col"><h4>Seguinos</h4><div class="footer-socials">
                <a href="#" class="social-link">Instagram</a><a href="#" class="social-link">LinkedIn</a><a href="#" class="social-link">GitHub</a></div></div>
            <div class="footer-col"><h4>Ayuda y Soporte</h4><div class="footer-help-links">
                <a href="index.html#faq-section" class="help-link-highlight">Preguntas frecuentes</a>
                <a href="contacto.html" class="social-link">Soporte Técnico</a></div></div>
            <div class="footer-col"><h4>Desarrolladores</h4><ul class="footer-team-list">
                <li>Barrientos Lucas</li><li>Pereyra Dario</li><li>Sandoval Thiago</li><li>Zelaya Alexis</li></ul></div>
        </div>
        <div class="footer-bottom"><div class="container footer-bottom-flex">
            <p>&copy; 2026 TecnoBasurin. Todos los derechos reservados.</p>
            <p class="academic-credit">Proyecto Académico &bull; IES Alfredo Coviello &bull; Tecnicatura Superior en Desarrollo de Software</p>
        </div></div>`;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="cart-sidebar" class="cart-sidebar">
            <div class="cart-sidebar-header"><h3>Tu Carrito</h3><button class="close-cart-btn" onclick="toggleCart()" aria-label="Cerrar carrito">✕</button></div>
            <div id="cart-items-container" class="cart-items-container"></div>
            <div class="cart-sidebar-footer">
                <div class="cart-total-row"><span>Total:</span><span id="cart-total-amount">$0</span></div>
                <button id="btn-go-checkout" class="btn btn-checkout-disabled" disabled>Proceder a la Reserva</button>
            </div>
        </div>
        <div id="cart-overlay" class="cart-overlay" onclick="toggleCart()"></div>`);

    initCart();
})();
