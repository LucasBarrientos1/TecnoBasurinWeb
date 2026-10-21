require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { DATABASE_URL, JWT_SECRET, DB_SSL, PORT = 3000 } = process.env;
if (!DATABASE_URL || !JWT_SECRET) {
    console.error('Falta DATABASE_URL o JWT_SECRET en el archivo .env (mirá .env.example).');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
const wrap = fn => (req, res) => fn(req, res).catch(err => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
});
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function auth(required) {
    return (req, res, next) => {
        const h = req.headers.authorization || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : null;
        if (token) {
            try { req.user = jwt.verify(token, JWT_SECRET); } catch (e) { /* token inválido */ }
        }
        if (required && !req.user) return res.status(401).json({ error: 'Tu sesión expiró. Volvé a iniciar sesión.' });
        next();
    };
}

// Solo administradores. El rol se consulta en la base en CADA pedido (no se confía en el token ni en el navegador),
// así que quitarle el rol a alguien tiene efecto inmediato.
function requireAdmin(req, res, next) {
    auth(true)(req, res, async () => {
        try {
            const { rows } = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [req.user.id]);
            if (!rows[0] || rows[0].rol !== 'admin') return res.status(403).json({ error: 'No tenés permiso para esta sección.' });
            next();
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    });
}

// ---------- registro / login ----------
app.post('/api/registro', wrap(async (req, res) => {
    const nombre = str(req.body.nombre, 100);
    const email = str(req.body.email, 150).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!nombre || !emailOk(email)) return res.status(400).json({ error: 'Nombre o correo inválido.' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    const hash = await bcrypt.hash(password, 10);
    try {
        await pool.query('INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1,$2,$3)', [nombre, email, hash]);
    } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: 'Ese correo ya está registrado.' });
        throw e;
    }
    res.status(201).json({ ok: true });
}));

app.post('/api/login', wrap(async (req, res) => {
    const email = str(req.body.email, 150).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const { rows } = await pool.query('SELECT id, nombre, email, rol, password_hash FROM usuarios WHERE email = $1', [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }
    const token = jwt.sign({ id: u.id, nombre: u.nombre }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, nombre: u.nombre, email: u.email, rol: u.rol });
}));

// ---------- recuperar contraseña ----------
// Guarda la solicitud con un token de un solo uso (hasheado). El envío del mail queda pendiente (ver README).
app.post('/api/recuperar', wrap(async (req, res) => {
    const email = str(req.body.email, 150).toLowerCase();
    if (!emailOk(email)) return res.status(400).json({ error: 'Correo inválido.' });
    const { rows } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query(
        `INSERT INTO recuperaciones (usuario_id, email, token_hash, expira)
         VALUES ($1,$2,$3, now() + interval '1 hour')`,
        [rows[0] ? rows[0].id : null, email, tokenHash]
    );
    // TODO: enviar `token` por mail (nodemailer). Nunca devolverlo en la respuesta.
    res.json({ ok: true }); // misma respuesta exista o no el correo
}));

// ---------- contacto ----------
app.post('/api/contacto', wrap(async (req, res) => {
    const nombre = str(req.body.nombre, 100);
    const email = str(req.body.email, 150);
    const tema = str(req.body.tema, 150);
    const mensaje = str(req.body.mensaje, 2000);
    if (!nombre || !emailOk(email) || !mensaje) return res.status(400).json({ error: 'Completá nombre, email y mensaje.' });
    await pool.query('INSERT INTO contactos (nombre, email, tema, mensaje) VALUES ($1,$2,$3,$4)', [nombre, email, tema, mensaje]);
    res.status(201).json({ ok: true });
}));

// ---------- pedidos (checkout) ----------
// El precio y el total los calcula el servidor: nunca se confía en lo que manda el navegador.
// Los datos de tarjeta NO se reciben ni se guardan.
app.post('/api/pedidos', auth(false), wrap(async (req, res) => {
    const s = req.body.solicitante || {};
    const e = req.body.entrega || {};
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 20) : [];
    const datos = {
        nombre: str(s.nombre, 100), documento: str(s.documento, 30), telefono: str(s.telefono, 30), email: str(s.email, 150),
        calle: str(e.calle, 150), depto: str(e.depto, 30), provincia: str(e.provincia, 60), cp: str(e.cp, 10)
    };
    if (!datos.nombre || !datos.documento || !datos.telefono || !emailOk(datos.email) || !datos.calle || !datos.provincia || !datos.cp) {
        return res.status(400).json({ error: 'Faltan datos obligatorios del pedido.' });
    }
    if (!items.length) return res.status(400).json({ error: 'El carrito está vacío.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let total = 0;
        const lineas = [];
        for (const it of items) {
            const cantidad = parseInt(it.cantidad, 10);
            if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) throw Object.assign(new Error('Cantidad inválida.'), { status: 400 });
            const p = await client.query('SELECT nombre, precio FROM productos WHERE nombre = $1', [str(it.nombre, 150)]);
            if (!p.rows[0]) throw Object.assign(new Error('Producto inexistente.'), { status: 400 });
            const precio = Number(p.rows[0].precio);
            total += precio * cantidad;
            lineas.push({ nombre: p.rows[0].nombre, precio, cantidad });
        }
        const id = 'TB-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        await client.query(
            `INSERT INTO pedidos (id, usuario_id, nombre, documento, telefono, email, calle, depto, provincia, cp, total)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [id, req.user ? req.user.id : null, datos.nombre, datos.documento, datos.telefono, datos.email,
             datos.calle, datos.depto, datos.provincia, datos.cp, total]
        );
        for (const l of lineas) {
            await client.query('INSERT INTO pedido_items (pedido_id, nombre, precio, cantidad) VALUES ($1,$2,$3,$4)', [id, l.nombre, l.precio, l.cantidad]);
        }
        await client.query('COMMIT');
        res.status(201).json({ id, total });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.status) return res.status(err.status).json({ error: err.message });
        throw err;
    } finally {
        client.release();
    }
}));

// ---------- panel (estado del dispositivo por usuario) ----------
app.get('/api/panel', auth(true), wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT estado FROM panel_estado WHERE usuario_id = $1', [req.user.id]);
    res.json({ estado: rows[0] ? rows[0].estado : null });
}));

app.put('/api/panel', auth(true), wrap(async (req, res) => {
    const estado = req.body.estado;
    if (!estado || typeof estado !== 'object' || Array.isArray(estado)) return res.status(400).json({ error: 'Estado inválido.' });
    await pool.query(
        `INSERT INTO panel_estado (usuario_id, estado) VALUES ($1,$2)
         ON CONFLICT (usuario_id) DO UPDATE SET estado = EXCLUDED.estado, actualizado = now()`,
        [req.user.id, JSON.stringify(estado)]
    );
    res.json({ ok: true });
}));

// ---------- administración (solo rol admin) ----------
const ESTADOS_PEDIDO = ['reservado', 'confirmado', 'enviado', 'entregado', 'cancelado'];

// Devuelve el rol actual desde la base (el frontend lo usa para decidir si muestra el menú).
app.get('/api/me', auth(true), wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT nombre, email, rol FROM usuarios WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Tu sesión expiró. Volvé a iniciar sesión.' });
    res.json(rows[0]);
}));

app.get('/api/admin/usuarios', requireAdmin, wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT id, nombre, email, rol, creado FROM usuarios ORDER BY creado DESC');
    res.json({ usuarios: rows, yo: req.user.id });
}));

app.put('/api/admin/usuarios/:id/rol', requireAdmin, wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const rol = req.body.rol;
    if (!Number.isInteger(id) || !['usuario', 'admin'].includes(rol)) return res.status(400).json({ error: 'Datos inválidos.' });
    // Un admin no puede quitarse el rol a sí mismo: así siempre queda al menos uno.
    if (id === req.user.id && rol !== 'admin') return res.status(400).json({ error: 'No podés quitarte el rol de administrador a vos mismo.' });
    const r = await pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [rol, id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ ok: true });
}));

app.get('/api/admin/ventas', requireAdmin, wrap(async (req, res) => {
    const resumen = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE estado <> 'cancelado')::int AS cantidad,
                COALESCE(SUM(total) FILTER (WHERE estado <> 'cancelado'), 0) AS total
         FROM pedidos`);
    const { rows } = await pool.query(
        `SELECT p.id, p.nombre, p.email, p.telefono, p.calle, p.provincia, p.cp, p.total, p.estado, p.creado,
                COALESCE(json_agg(json_build_object('nombre', i.nombre, 'cantidad', i.cantidad, 'precio', i.precio))
                         FILTER (WHERE i.id IS NOT NULL), '[]') AS items
         FROM pedidos p LEFT JOIN pedido_items i ON i.pedido_id = p.id
         GROUP BY p.id ORDER BY p.creado DESC LIMIT 200`);
    res.json({ resumen: resumen.rows[0], pedidos: rows, estados: ESTADOS_PEDIDO });
}));

app.put('/api/admin/pedidos/:id/estado', requireAdmin, wrap(async (req, res) => {
    const estado = req.body.estado;
    if (!ESTADOS_PEDIDO.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
    const r = await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, str(req.params.id, 30)]);
    if (!r.rowCount) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json({ ok: true });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

if (require.main === module) {
    app.listen(PORT, () => console.log(`TecnoBasurin en http://localhost:${PORT}`));
}
module.exports = app;
