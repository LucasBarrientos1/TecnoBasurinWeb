const form = document.getElementById('checkout-form');
const resumen = document.getElementById('checkout-summary');
const submitBtn = form.querySelector('button[type="submit"]');
const inputs = form.querySelectorAll('input');

function renderResumen() {
    const items = getCart();
    if (!items.length) {
        resumen.innerHTML = '<h3 style="color:#fff;margin-bottom:12px;">Tu carrito está vacío</h3><p style="color:var(--text-muted);margin-bottom:20px;">Agregá el contenedor para continuar con la reserva.</p><a href="producto.html" class="btn">Ver producto</a>';
        submitBtn.disabled = true;
        return;
    }
    const filas = items.map(i => `
        <div style="display:flex;justify-content:space-between;margin-bottom:15px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:15px;">
            <span style="color:var(--text-muted);">${i.nombre} x${i.cantidad}</span>
            <span style="color:#fff;font-weight:600;">${formatPrice(i.precio * i.cantidad)}</span>
        </div>`).join('');
    resumen.innerHTML = `
        <h3 style="color:#fff;margin-bottom:20px;">Resumen del Pedido</h3>${filas}
        <div style="display:flex;justify-content:space-between;margin-bottom:15px;color:var(--accent-green);"><span>Costo de Envío:</span><span>¡Gratis!</span></div>
        <div style="display:flex;justify-content:space-between;font-size:22px;font-weight:700;color:#fff;margin-top:20px;border-top:2px dashed rgba(0,255,127,0.3);padding-top:15px;">
            <span>Total Final:</span><span>${formatPrice(getCartTotal())} ARS</span>
        </div>`;
}

async function processReservation(event) {
    event.preventDefault();
    const items = getCart();
    if (!items.length) return;
    submitBtn.disabled = true;
    try {
        // Solo se envían nombre y cantidad: el precio y el total los calcula el servidor.
        // Los datos de tarjeta (inputs 8 a 11) intencionalmente NO se envían.
        const pedido = await api('/pedidos', { method: 'POST', body: {
            items: items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad })),
            solicitante: { nombre: inputs[0].value, documento: inputs[1].value, telefono: inputs[2].value, email: inputs[3].value },
            entrega: { calle: inputs[4].value, depto: inputs[5].value, provincia: inputs[6].value, cp: inputs[7].value }
        }});
        vaciarCarrito();
        alert(`¡Reserva ${pedido.id} confirmada! En breve nos pondremos en contacto por e-mail para coordinar la entrega.`);
        window.location.href = sessionStorage.getItem('userLoggedIn') === 'true' ? 'panel.html' : 'index.html';
    } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
    }
}
form.addEventListener('submit', processReservation);
form.removeAttribute('onsubmit');

// Prefill si hay sesión + formato de tarjeta
if (sessionStorage.getItem('userLoggedIn') === 'true') {
    inputs[0].value = sessionStorage.getItem('nombreUsuario') || '';
    inputs[3].value = sessionStorage.getItem('emailUsuario') || '';
}
inputs[9].addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim());
inputs[10].addEventListener('input', e => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; });
renderResumen();
