// server.js (ESM)
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
const app = express();
import pg from 'pg';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// probar conexión (opcional)
pool.connect()
    .then(client => { client.release(); console.log('✅ Conectado a PostgreSQL'); })
    .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));

// Middlewares
app.use(cors());
app.use(express.json());

// Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'capi',
    resave: false,
    saveUninitialized: false,
    cookie: { /* no set maxAge: control por inactividad */ }
}));

// -
// Middleware: control de inactividad (60s)
// y protección de páginas HTML
// -
// 60 segundos = 60000 ms
const TIEMPO_INACTIVIDAD = 60_000;
// Middleware que actualiza lastActivity y expira sesión
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        const ahora = Date.now();
        if (req.session.lastActivity && (ahora - req.session.lastActivity) > TIEMPO_INACTIVIDAD) {
            // destruir sesión por inactividad
            req.session.destroy(() => { });
            // Si es petición API, devolver 401 JSON
            if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sesión expirada por inactividad' });
            // Sino redirigir a login
            return res.redirect('/login.html?expired=1');
        }
        // actualizar última actividad
        req.session.lastActivity = ahora;
    }
    next();
});

// Middleware para proteger páginas .html (excepto login y register y recursos estáticos)
// Si la petición es por un archivo .html y no existe sesión -> redirige a login.
// Si la petición es /api/* y no hay sesión -> 401 JSON.
app.use((req, res, next) => {
    const url = req.path;
    const noProtegerHtml = ['/login.html', '/register.html', '/contacto.html', '/', '/index.html']; // páginas abiertas
    const esHtml = url.endsWith('.html');

    // permitir assets (js, css, images, fonts...)
    const extPermitidas = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ico', '.map'];
    const ext = path.extname(url);
    if (extPermitidas.includes(ext)) return next();

    // APIs: proteger si no hay sesión
    if (url.startsWith('/api/')) {
        if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
        return next();
    }

    // HTML: si es html y no está en la lista pública -> revisar sesión
    if (esHtml && !noProtegerHtml.includes(url)) {
        if (!req.session.user) {
            return res.redirect('/login.html');
        }
    }

    next();
});

// Servir estáticos (public)
app.use(express.static(path.join(__dirname, 'public')));

/*    RUTAS DE AUTENTICACIÓN/API */

// Registro (guardar usuario en BD)
app.post('/api/register', async (req, res) => {
    const { nombre_usuario, password, email } = req.body;
    if (!nombre_usuario || !password) return res.status(400).json({ error: 'Faltan campos' });
    try {
        // validar si existe
        const r1 = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = $1', [nombre_usuario]);
        if (r1.rowCount > 0) return res.status(409).json({ error: 'Usuario ya existe' });

        const hash = await bcrypt.hash(password, 10);
        const q = `INSERT INTO usuarios (nombre_usuario, password, email, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre_usuario, email, rol`;
        const r = await pool.query(q, [nombre_usuario, hash, email || null, 'user']);
        const user = r.rows[0];

        // crear sesión
        req.session.user = { id: user.id, nombre_usuario: user.nombre_usuario, email: user.email, rol: user.rol };
        req.session.lastActivity = Date.now();

        res.json({ ok: true, user: req.session.user });
    } catch (err) {
        console.error('Error register:', err.message);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { nombre_usuario, password } = req.body;
    if (!nombre_usuario || !password) return res.status(400).json({ error: 'Faltan campos' });
    try {
        const r = await pool.query('SELECT id, nombre_usuario, password, email, rol FROM usuarios WHERE nombre_usuario = $1', [nombre_usuario]);
        if (r.rowCount === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
        const user = r.rows[0];
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

        req.session.user = { id: user.id, nombre_usuario: user.nombre_usuario, email: user.email, rol: user.rol };
        req.session.lastActivity = Date.now();
        res.json({ ok: true, user: req.session.user });
    } catch (err) {
        console.error('Error login:', err.message);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Error cerrando sesión' });
        res.json({ ok: true });
    });
});

// Chequear sesión
app.get('/api/session', (req, res) => {
    if (req.session && req.session.user) return res.json({ user: req.session.user });
    return res.status(401).json({ error: 'No hay sesión activa' });
});

/*    EJEMPLO: endpoint protegido (productos) */
app.get('/api/productos', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT id, nombre, precio, stock, img, COALESCE(NULLIF(rol, \'\'),\'\') as categoria FROM productos ORDER BY id');
        res.json(resultado.rows);
    } catch (err) {
        console.error('Error al obtener productos:', err.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/* INICIAR SERVIDOR */
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
