const PRODUCTO_PRECIO = 140000;
const PRODUCTO_NOMBRE = "Contenedor Automatizado TecnoBasurin V1";
const CART_KEY = 'tecnobasurin_cart';
let cart = [];

const formatPrice = n => `$${Number(n).toLocaleString('es-AR')}`;
const getCart = () => cart;
const getCartTotal = () => cart.reduce((a, i) => a + i.precio * i.cantidad, 0);

function guardarCarrito() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function initCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY));
        cart = Array.isArray(saved) ? saved : [];
    } catch (e) {
        cart = [];
    }
    actualizarInterfazCarrito();
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (!sidebar || !overlay) return;
    const abierto = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', abierto);
    sidebar.style.right = abierto ? '0px' : '-400px';
    sidebar.style.zIndex = '99999';
    overlay.style.zIndex = '88888';
    overlay.style.display = abierto ? 'block' : 'none';
}

function agregarAlCarrito() {
    const existente = cart.find(i => i.nombre === PRODUCTO_NOMBRE);
    if (existente) existente.cantidad += 1;
    else cart.push({ nombre: PRODUCTO_NOMBRE, precio: PRODUCTO_PRECIO, cantidad: 1 });
    guardarCarrito();
    actualizarInterfazCarrito();
    toggleCart();
}

function cambiarCantidad(index, delta) {
    const item = cart[index];
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) cart.splice(index, 1);
    guardarCarrito();
    actualizarInterfazCarrito();
}

function eliminarDelCarrito(index) {
    cart.splice(index, 1);
    guardarCarrito();
    actualizarInterfazCarrito();
}

function vaciarCarrito() {
    cart = [];
    localStorage.removeItem(CART_KEY);
    actualizarInterfazCarrito();
}

function goToCheckout() {
    guardarCarrito();
    window.location.href = "checkout.html";
}

function actualizarInterfazCarrito() {
    const badge = document.getElementById('cart-badge');
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-amount');
    const btn = document.getElementById('btn-go-checkout');
    const totalItems = cart.reduce((a, i) => a + i.cantidad, 0);

    if (badge) badge.innerText = totalItems;
    if (totalEl) totalEl.innerText = formatPrice(getCartTotal());

    if (btn) {
        const activo = totalItems > 0;
        btn.disabled = !activo;
        btn.className = activo ? 'btn' : 'btn btn-checkout-disabled';
        btn.style.cssText = activo
            ? 'width:100%;background-color:var(--accent-green);color:#000;cursor:pointer;'
            : 'width:100%;background-color:#1e293b;color:#64748b;cursor:not-allowed;';
        btn.onclick = activo ? goToCheckout : null;
    }

    if (!container) return;
    if (!cart.length) {
        container.innerHTML = '<p class="empty-cart-msg" style="color:#94a3b8;text-align:center;margin-top:40px;">El carrito está vacío.</p>';
        return;
    }
    const qtyBtn = 'background:rgba(255,255,255,0.08);border:none;color:#fff;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:15px;';
    container.innerHTML = cart.map((item, i) => `
        <div style="margin-bottom:20px;padding-bottom:15px;border-bottom:1px solid rgba(255,255,255,0.05);">
            <h5 style="color:#fff;font-size:14px;margin-bottom:8px;">${item.nombre}</h5>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <button style="${qtyBtn}" onclick="cambiarCantidad(${i},-1)" aria-label="Restar una unidad">−</button>
                    <span style="color:#fff;min-width:18px;text-align:center;">${item.cantidad}</span>
                    <button style="${qtyBtn}" onclick="cambiarCantidad(${i},1)" aria-label="Sumar una unidad">+</button>
                    <span style="color:#94a3b8;font-size:13px;">${formatPrice(item.precio * item.cantidad)}</span>
                </div>
                <button onclick="eliminarDelCarrito(${i})" style="background:transparent;border:none;color:#ff4d4d;cursor:pointer;font-size:13px;font-weight:600;">Quitar</button>
            </div>
        </div>`).join('');
}
