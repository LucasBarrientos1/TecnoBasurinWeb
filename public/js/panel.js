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
