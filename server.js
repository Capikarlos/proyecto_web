// server.js 
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
const app = express();
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
// Necesario para __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
// Config DB
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
    user: process.env.DB_USER || 'carlos_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'proyecto_web',
    password: process.env.DB_PASSWORD || '12345',
    port: process.env.DB_PORT || 5432,
});
// probar conexión
pool.connect()
    .then(client => { client.release(); console.log('✅ Conectado a PostgreSQL'); })
    .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));

// middlewares
app.use(express.json());
app.use(cors()); // habilitar CORS para todas las rutas, esto permite peticiones desde otros orígenes

// sesión
app.use(session({
    secret: process.env.SESSION_SECRET || '12345',
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: false } // para dev en http
}));
// Middleware: expirar sesión por inactividad (60s) y proteger páginas .html
const TIEMPO_INACTIVIDAD = 60000;
app.use((req, res, next) => {
    // si hay sesión, comprobar inactividad
    if (req.session && req.session.usuario) {
        const ahora = Date.now();
        if (req.session.ultimaActividad && (ahora - req.session.ultimaActividad) > TIEMPO_INACTIVIDAD) {
            // destruir sesión por inactividad
            req.session.destroy(() => { });
            // si es API -> 401 JSON
            if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sesión expirada' });
            // si es petición normal -> redirigir a login
            return res.redirect('/login.html?expired=1');
        }
        // actualizar tiempo de actividad
        req.session.ultimaActividad = ahora;
    }
    next();
});
// Proteger archivos .html
app.use((req, res, next) => {
    const url = req.path;
    const paginasPublicas = ['/login.html', '/register.html', '/index.html', '/', '/componentes/menu.html'];
    if (url.endsWith('.html') && !paginasPublicas.includes(url)) {
        if (!req.session || !req.session.usuario) {
            return res.redirect('/login.html');
        }
    }

    // permitir assets (js, css, images, fonts...)
    const extPermitidas = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ico', '.map'];
    const ext = path.extname(url);
    if (extPermitidas.includes(ext)) return next();
    next();
});
// servir estáticos
app.use(express.static(path.join(__dirname, 'public')));


//RUTAS SIMPLES DE AUTENTICACIÓN
// POST /api/register para registrar nuevo usuario
app.post('/api/register', async (req, res) => {
    const { nombre_usuario, password, email } = req.body;
    if (!nombre_usuario || !password) {
        return res.status(400).json({ error: 'Faltan campos' });
    }
    try {
        const q = 'INSERT INTO usuarios (nombre_usuario, password, email, rol) VALUES ($1,$2,$3,$4) RETURNING id, nombre_usuario, email';
        const valores = [nombre_usuario, password, email || null, 'user'];
        const r = await pool.query(q, valores);
        const usuario = r.rows[0];

        // crear sesión
        req.session.usuario = { id: usuario.id, nombre_usuario: usuario.nombre_usuario, email: usuario.email };
        req.session.ultimaActividad = Date.now();

        return res.json({ ok: true, user: req.session.usuario });
    } catch (err) {
        // captura conflicto de unique (usuario duplicado)
        if (err.code === '23505') {
            return res.status(409).json({ error: 'El nombre de usuario ya existe' });
        }
        console.error('Error /api/register:', err.message);
        return res.status(500).json({ error: 'Error interno' });
    }
});
// POST /api/login
app.post('/api/login', async (req, res) => {
    const { nombre_usuario, password } = req.body;
    if (!nombre_usuario || !password) {
        return res.status(400).json({ error: 'Faltan campos.' });
    }

    try {
        const q = 'SELECT id, nombre_usuario, password, email FROM usuarios WHERE nombre_usuario = $1';
        const r = await pool.query(q, [nombre_usuario]);
        if (r.rowCount === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado.' });
        }

        const usuarioDB = r.rows[0];

        // Comparación simple (reemplaza luego por hash si quieres seguridad real)
        if (password !== usuarioDB.password) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }

        // Crear sesión
        req.session.usuario = {
            id: usuarioDB.id,
            nombre_usuario: usuarioDB.nombre_usuario,
            email: usuarioDB.email,
        };
        req.session.ultimaActividad = Date.now();

        return res.json({ ok: true, user: req.session.usuario });
    } catch (err) {
        console.error('Error en /api/login:', err.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


app.get('/api/tiempo-restante', (req, res) => {
    if (!req.session || !req.session.usuario || !req.session.ultimaActividad) {
        return res.status(401).json({ error: 'No hay sesión' });
    }
    const ahora = Date.now();
    const elapsed = ahora - req.session.ultimaActividad;
    const restanteMs = Math.max(0, TIEMPO_INACTIVIDAD - elapsed);
    return res.json({ segundos: Math.ceil(restanteMs / 1000) });
});
// POST
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'No se pudo cerrar sesión' });
        res.json({ ok: true });
    });
});
// GET
app.get('/api/session', (req, res) => {
    if (req.session && req.session.usuario) return res.json({ user: req.session.usuario });
    return res.status(401).json({ error: 'No hay sesión activa' });
});

// get
app.get('/api/productos', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM productos ORDER BY id');
        res.json(resultado.rows);
    } catch (err) {
        console.error('Error /api/productos:', err.message);
        res.status(500).json({ error: 'Error interno' });
    }
});

// iniciar
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
