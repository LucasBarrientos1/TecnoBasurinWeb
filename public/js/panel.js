if (sessionStorage.getItem('userLoggedIn') !== 'true') location.replace('login.html');

const COMPARTIMIENTOS = [
    { id: 'cables', nombre: 'Cables y cargadores', residuos: ['Cable USB', 'Cargador', 'Cable HDMI'] },
    { id: 'pilas', nombre: 'Pilas y baterías', residuos: ['Pila AA', 'Batería de celular', 'Pila AAA'] },
    { id: 'perifericos', nombre: 'Controles y periféricos', residuos: ['Control remoto', 'Mouse', 'Teclado'] },
    { id: 'placas', nombre: 'Placas y otros', residuos: ['Placa de módem', 'Placa de PC', 'Memoria RAM'] }
];
const KEY = 'tecnobasurin_panel';
const estadoInicial = () => ({ niveles: { cables: 42, pilas: 18, perifericos: 67, placas: 81 }, eventos: [], total: 0, kg: 0, recolecciones: 0 });
let estado = estadoInicial();

async function cargarEstado() {
    try { const r = await api('/panel', { auth: true }); return r.estado || estadoInicial(); }
    catch (e) { return estadoInicial(); }
}
let guardadoPendiente = null;
const guardar = () => {
    clearTimeout(guardadoPendiente); // agrupa guardados seguidos (simulación automática)
    guardadoPendiente = setTimeout(() => api('/panel', { method: 'PUT', auth: true, body: { estado } }).catch(console.error), 300);
};
const claseNivel = n => n >= 90 ? 'lleno' : n >= 70 ? 'alto' : 'ok';
const hora = t => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const $ = id => document.getElementById(id);

function simularResiduo() {
    const c = COMPARTIMIENTOS[Math.floor(Math.random() * COMPARTIMIENTOS.length)];
    if (estado.niveles[c.id] >= 100) return;
    const peso = Math.round((Math.random() * 0.4 + 0.05) * 100) / 100;
    estado.niveles[c.id] = Math.min(100, estado.niveles[c.id] + Math.floor(Math.random() * 5) + 2);
    estado.eventos.unshift({ t: Date.now(), tipo: c.residuos[Math.floor(Math.random() * c.residuos.length)], peso, destino: c.nombre });
    estado.eventos = estado.eventos.slice(0, 8);
    estado.total++;
    estado.kg += peso;
    guardar(); render();
}

function vaciar(id) {
    estado.niveles[id] = 0;
    estado.recolecciones++;
    guardar(); render();
}

function render() {
    $('panel-title').textContent = 'Panel de ' + (sessionStorage.getItem('nombreUsuario') || 'usuario');

    $('panel-stats').innerHTML = [
        [estado.total, 'residuos clasificados'], [estado.kg.toFixed(2) + ' kg', 'peso total'], [estado.recolecciones, 'recolecciones']
    ].map(([v, l]) => `<div class="card-item"><strong class="panel-stat">${v}</strong><span>${l}</span></div>`).join('');

    $('panel-compartments').innerHTML = COMPARTIMIENTOS.map(c => {
        const n = estado.niveles[c.id];
        return `<div class="card-item panel-comp ${claseNivel(n)}">
            <div class="panel-comp-head"><h4>${c.nombre}</h4><strong>${n}%</strong></div>
            <div class="panel-bar" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="100"><div style="width:${n}%"></div></div>
            <button class="panel-btn-ghost btn" onclick="vaciar('${c.id}')" ${n === 0 ? 'disabled' : ''}>Marcar como vaciado</button>
        </div>`;
    }).join('');

    const alertas = COMPARTIMIENTOS.filter(c => estado.niveles[c.id] >= 80).map(c => {
        const n = estado.niveles[c.id];
        return `<div class="panel-alert ${claseNivel(n)}"><strong>${c.nombre} al ${n}%.</strong> ${n >= 90 ? 'Casi lleno: coordiná la recolección.' : 'Conviene programar un retiro pronto.'}</div>`;
    });
    $('panel-alerts').innerHTML = alertas.join('') || '<p class="panel-empty">Sin alertas. Todos los compartimientos tienen espacio.</p>';

    $('panel-log').innerHTML = estado.eventos.map(e => `<tr><td>${hora(e.t)}</td><td>${e.tipo}</td><td>${e.peso} kg</td><td>${e.destino}</td></tr>`).join('')
        || '<tr><td colspan="4" class="panel-empty">Todavía no hay residuos. Probá "Simular residuo".</td></tr>';
}

let timer = null;
$('btn-sim').addEventListener('click', simularResiduo);
$('btn-reset').addEventListener('click', () => { estado = estadoInicial(); guardar(); render(); });
$('chk-auto').addEventListener('change', e => { clearInterval(timer); timer = e.target.checked ? setInterval(simularResiduo, 3000) : null; });
cargarEstado().then(e => { estado = e; render(); });


// ---------- pestañas, foto de perfil (avatares predeterminados) y comunidad ----------
const AVATARES = [['hoja', 'Hoja'], ['pila', 'Pila'], ['chip', 'Chip'], ['rayo', 'Rayo'], ['planeta', 'Planeta'], ['robot', 'Robot'], ['contenedor', 'Contenedor'], ['monitor', 'Monitor']];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avatarSrc = id => 'Imagen/avatares/' + (AVATARES.some(a => a[0] === id) ? id : 'hoja') + '.svg';
let avatarActual = sessionStorage.getItem('avatarUsuario') || 'hoja';

function pintarAvatar() {
    document.querySelectorAll('.user-avatar, #avatar-actual').forEach(img => { img.src = avatarSrc(avatarActual); });
    $('avatar-nombre').textContent = (AVATARES.find(a => a[0] === avatarActual) || AVATARES[0])[1];
    $('avatar-grid').innerHTML = AVATARES.map(([id, n]) => `<button type="button" class="avatar-opt${id === avatarActual ? ' activo' : ''}" data-avatar="${id}" aria-pressed="${id === avatarActual}">
        <img src="${avatarSrc(id)}" alt=""><span>${n}</span></button>`).join('');
}

$('avatar-grid').addEventListener('click', async e => {
    const b = e.target.closest('[data-avatar]');
    if (!b || b.dataset.avatar === avatarActual) return;
    const anterior = avatarActual;
    avatarActual = b.dataset.avatar;
    sessionStorage.setItem('avatarUsuario', avatarActual);
    pintarAvatar();
    try {
        await api('/perfil/avatar', { method: 'PUT', auth: true, body: { avatar: avatarActual } });
    } catch (err) {
        avatarActual = anterior;
        sessionStorage.setItem('avatarUsuario', anterior);
        pintarAvatar();
        alert(err.message);
    }
});

async function cargarComunidad() {
    try {
        const c = await api('/comunidad', { auth: true });
        $('com-stats').innerHTML = [
            [c.miembros, 'miembros'], [c.totales.residuos, 'residuos clasificados entre todos'], [c.totales.kg.toFixed(2) + ' kg', 'reciclados por la comunidad']
        ].map(([v, l]) => `<div class="card-item"><strong class="panel-stat">${esc(v)}</strong><span>${l}</span></div>`).join('');
        $('com-ranking').innerHTML = c.ranking.map(m => `<tr class="${m.soyYo ? 'rank-yo' : ''}">
            <td>${m.posicion}</td>
            <td><span class="com-miembro"><img class="com-avatar" src="${avatarSrc(m.avatar)}" alt=""> ${esc(m.nombre)}${m.soyYo ? ' <small>(vos)</small>' : ''}</span></td>
            <td>${m.residuos}</td><td>${m.kg.toFixed(2)} kg</td></tr>`).join('')
            || '<tr><td colspan="4" class="panel-empty">Todavía no hay miembros.</td></tr>';
        $('com-posicion').textContent = c.miPosicion ? 'Estás en el puesto ' + c.miPosicion + ' de ' + c.miembros + '.' : '';
        $('com-nuevos').innerHTML = c.nuevos.map(m => `<div class="com-nuevo${m.soyYo ? ' rank-yo' : ''}"><img class="com-avatar grande" src="${avatarSrc(m.avatar)}" alt=""><span>${esc(m.nombre)}</span></div>`).join('');
    } catch (err) {
        $('com-ranking').innerHTML = '<tr><td colspan="4" class="panel-empty">No se pudo cargar la comunidad.</td></tr>';
    }
}

document.querySelectorAll('.panel-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.panel-tab').forEach(b => b.classList.toggle('active', b === btn));
    ['contenedor', 'comunidad', 'perfil'].forEach(t => { $('tab-' + t).hidden = btn.dataset.tab !== t; });
    if (btn.dataset.tab === 'comunidad') cargarComunidad();
}));

pintarAvatar();
// Sincroniza con el servidor (por si la sesión se abrió antes de existir los avatares o se cambió desde otro dispositivo)
api('/me', { auth: true }).then(m => {
    if (m && m.avatar) { avatarActual = m.avatar; sessionStorage.setItem('avatarUsuario', m.avatar); pintarAvatar(); }
}).catch(() => {});
