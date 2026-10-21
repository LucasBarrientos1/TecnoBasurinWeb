// Panel de administración. La seguridad real está en el servidor (requireAdmin):
// si la cuenta no es admin, la API responde 403 y esta página no muestra nada.
if (sessionStorage.getItem('userLoggedIn') !== 'true') location.replace('login.html');

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dinero = n => '$' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
const fecha = t => new Date(t).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

function sinPermiso() {
    sessionStorage.setItem('rolUsuario', 'usuario'); // saca el link del menú si el rol ya no es admin
    alert('No tenés permiso para entrar a esta sección.');
    location.replace('index.html');
}

async function cargarVentas() {
    const { resumen, pedidos, estados } = await api('/admin/ventas', { auth: true });
    $('admin-resumen').innerHTML = [
        [resumen.cantidad, 'pedidos (sin cancelados)'], [dinero(resumen.total), 'ventas totales']
    ].map(([v, l]) => `<div class="card-item"><strong class="panel-stat">${esc(v)}</strong><span>${l}</span></div>`).join('');

    $('admin-pedidos').innerHTML = pedidos.map(p => `<tr>
        <td><strong>${esc(p.id)}</strong></td>
        <td>${fecha(p.creado)}</td>
        <td>${esc(p.nombre)}<br><small>${esc(p.email)} · ${esc(p.telefono)}<br>${esc(p.calle)}, ${esc(p.provincia)} (${esc(p.cp)})</small></td>
        <td>${p.items.map(i => `${esc(i.nombre)} x${esc(i.cantidad)}`).join('<br>')}</td>
        <td>${dinero(p.total)}</td>
        <td><select class="admin-select" data-pedido="${esc(p.id)}">${estados.map(e => `<option value="${e}"${e === p.estado ? ' selected' : ''}>${e}</option>`).join('')}</select></td>
    </tr>`).join('') || '<tr><td colspan="6" class="panel-empty">Todavía no hay pedidos.</td></tr>';
}

async function cargarUsuarios() {
    const { usuarios, yo } = await api('/admin/usuarios', { auth: true });
    $('admin-usuarios').innerHTML = usuarios.map(u => `<tr>
        <td>${esc(u.nombre)}${u.id === yo ? ' <small>(vos)</small>' : ''}</td>
        <td>${esc(u.email)}</td>
        <td>${fecha(u.creado)}</td>
        <td><select class="admin-select" data-usuario="${esc(u.id)}" ${u.id === yo ? 'disabled title="No podés cambiar tu propio rol"' : ''}>
            <option value="usuario"${u.rol === 'usuario' ? ' selected' : ''}>Usuario</option>
            <option value="admin"${u.rol === 'admin' ? ' selected' : ''}>Administrador</option>
        </select></td>
    </tr>`).join('');
}

document.addEventListener('change', async e => {
    const el = e.target;
    try {
        if (el.dataset.pedido) {
            await api('/admin/pedidos/' + encodeURIComponent(el.dataset.pedido) + '/estado', { method: 'PUT', auth: true, body: { estado: el.value } });
            await cargarVentas();
        } else if (el.dataset.usuario) {
            const nombre = el.closest('tr').children[0].textContent;
            if (el.value === 'admin' && !confirm('¿Dar permisos de administrador a ' + nombre + '?')) { await cargarUsuarios(); return; }
            await api('/admin/usuarios/' + encodeURIComponent(el.dataset.usuario) + '/rol', { method: 'PUT', auth: true, body: { rol: el.value } });
            await cargarUsuarios();
        }
    } catch (err) {
        alert(err.message);
        cargarVentas().catch(() => {}); cargarUsuarios().catch(() => {});
    }
});

document.querySelectorAll('.admin-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b === btn));
    $('tab-ventas').hidden = btn.dataset.tab !== 'ventas';
    $('tab-usuarios').hidden = btn.dataset.tab !== 'usuarios';
}));

// Primero ventas: si el servidor dice 403, no es admin.
cargarVentas().then(cargarUsuarios).catch(err => {
    if (/permiso/i.test(err.message)) sinPermiso(); else alert(err.message);
});
