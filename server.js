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
    .then(client => { client.release(); console.log('Conectado a PostgreSQL'); })
    .catch(err => console.error('Error conectando a PostgreSQL:', err.message));

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
// registrar nuevo usuario
app.post('/api/register', async (req, res) => {
    const { nombre_usuario, password, email, nombre_completo } = req.body;
    if (!nombre_usuario || !password || !email) {
        return res.status(400).json({ error: 'Faltan campos' });
    }
    try {
        // El insert
        const q = 'INSERT INTO usuarios (nombre_usuario, password, email, rol, nombre_completo) VALUES ($1,$2,$3,$4,$5) RETURNING id, nombre_usuario, email, nombre_completo';
        const valores = [nombre_usuario, password, email, 'user', nombre_completo || null];
        const r = await pool.query(q, valores);
        const usuario = r.rows[0];

        // MODIFICADO: Guardamos los nuevos datos en la sesión
        req.session.usuario = { 
            id: usuario.id, 
            nombre_usuario: usuario.nombre_usuario, 
            email: usuario.email,
            nombre_completo: usuario.nombre_completo
        };
        req.session.ultimaActividad = Date.now();
        req.session.carrito = []; // AÑADIDO: Buena práctica inicializar carrito aquí

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
        const q = 'SELECT * FROM usuarios WHERE nombre_usuario = $1';
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
            nombre_completo: usuarioDB.nombre_completo,
            biografia: usuarioDB.biografia
        };
        req.session.ultimaActividad = Date.now();
        req.session.carrito = [];

        return res.json({ ok: true, user: req.session.usuario });
    } catch (err) {
        console.error('Error en /api/login:', err.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
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

// --- PEGA EL CÓDIGO QUE FALTA AQUÍ ---
// Middleware para proteger rutas (esta es la función que faltaba)
function proteger(req, res, next) {
    if (req.session && req.session.usuario) {
        next(); // Tiene sesión, continuar
    } else {
        // No tiene sesión, rechazar
        res.status(401).json({ error: 'No autorizado, debes iniciar sesión' });
    }
}
// En server.js, después de tus otras rutas
// GET /api/carrito - (Ya la teníamos) Devuelve el carrito del usuario
app.get('/api/carrito', proteger, (req, res) => {
    if (!req.session.carrito) {
        req.session.carrito = [];
    }
    res.json(req.session.carrito);
});

/**
 * POST /api/carrito/set - Actualiza la cantidad de UN producto.
 * Esto reemplaza "agregar", "reducir" y "eliminar" en una sola ruta.
 * Body: { "producto_id": 123, "cantidad": 3 }
 * Si cantidad es 0, se elimina del carrito.
 */
app.post('/api/carrito/set', proteger, async (req, res) => {
    const { producto_id, cantidad } = req.body;
    const cant = Number(cantidad);

    if (!producto_id || !Number.isInteger(cant) || cant < 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    if (!req.session.carrito) {
        req.session.carrito = [];
    }

    // (Opcional pero RECOMENDADO) Verificar stock antes de añadir
    // const r = await pool.query('SELECT stock FROM productos WHERE id = $1', [producto_id]);
    // const stock = r.rows[0]?.stock;
    // if (Number.isFinite(stock) && cant > stock) {
    //    return res.status(409).json({ error: 'No hay suficiente stock' });
    // }

    const idx = req.session.carrito.findIndex(p => p.id === producto_id);

    if (cant === 0) {
        // Eliminar si la cantidad es 0
        if (idx > -1) req.session.carrito.splice(idx, 1);
    } else {
        // Añadir o Actualizar
        if (idx > -1) {
            // Actualizar cantidad
            req.session.carrito[idx].cantidad = cant;
        } else {
            // Producto nuevo, necesitamos sus datos
            // (Tu lógica anterior de 'agregar' solo guardaba id y cant.
            // Para un carrito real, DEBEMOS guardar precio, nombre, img)
            const r = await pool.query('SELECT id, nombre, precio, img, stock, categoria FROM productos WHERE id = $1', [producto_id]);
            if (r.rowCount === 0) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            
            const prod = r.rows[0];
            req.session.carrito.push({
                id: prod.id,
                nombre: prod.nombre,
                precio: Number(prod.precio),
                img: prod.img,
                stock: Number(prod.stock),
                categoria: prod.categoria,
                cantidad: cant // La cantidad que nos pidieron
            });
        }
    }
    
    // Devolvemos el carrito actualizado para que el frontend no tenga que pensar
    res.json(req.session.carrito);
});


/**
 * POST /api/compras/finalizar - El paso final.
 * Lee el carrito de la sesión, lo guarda en la tabla 'compras'
 * y limpia el carrito de la sesión.
 */
app.post('/api/compras/finalizar', proteger, async (req, res) => {
    const carrito = req.session.carrito;
    const usuarioId = req.session.usuario.id;

    if (!carrito || carrito.length === 0) {
        return res.status(400).json({ error: 'Tu carrito está vacío' });
    }

    // Usamos una transacción para asegurar que todas las inserciones
    // funcionen o fallen juntas.
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar transacción

        for (const item of carrito) {
            const totalItem = item.precio * item.cantidad;
            const q = `
                INSERT INTO compras (usuario_id, producto_id, cantidad, total, estado)
                VALUES ($1, $2, $3, $4, 'pendiente')
            `;
            await client.query(q, [usuarioId, item.id, item.cantidad, totalItem]);

            // (Opcional) Aquí también deberías descontar el stock de la tabla 'productos'
            // await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
        }
        
        await client.query('COMMIT'); // Confirmar transacción

        // Limpiar carrito de la sesión
        req.session.carrito = [];

        res.json({ ok: true, message: 'Compra realizada con éxito' });

    } catch (err) {
        await client.query('ROLLBACK'); // Revertir en caso de error
        console.error('Error al finalizar compra:', err);
        res.status(500).json({ error: 'Error al procesar la compra' });
    } finally {
        client.release(); // Liberar el cliente de la pool
    }
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

// GET /api/contacto/historial
// Devuelve los comentarios ANTERIORES del usuario logueado
app.get('/api/contacto/historial', proteger, async (req, res) => {
    const usuarioId = req.session.usuario.id;
    try {
        const q = 'SELECT comentario, fecha FROM contacto WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT 5';
        const r = await pool.query(q, [usuarioId]);
        res.json(r.rows);
    } catch (err) {
        console.error('Error en /api/contacto/historial:', err.message);
        res.status(500).json({ error: 'Error interno' });
    }
});

// POST /api/contacto
// Guarda un nuevo mensaje de contacto en la BD
app.post('/api/contacto', async (req, res) => {
    const { correo, comentario } = req.body;
    
    // Validación del lado del servidor (¡importante!)
    if (!correo || !comentario || comentario.length < 5) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    let usuarioId = null;
    let correoFinal = correo;

    if (req.session && req.session.usuario) {
        usuarioId = req.session.usuario.id;
        correoFinal = req.session.usuario.email;
    }

    try {
        const q = 'INSERT INTO contacto (correo, comentario, usuario_id) VALUES ($1, $2, $3)';
        await pool.query(q, [correoFinal, comentario, usuarioId]);
        res.status(201).json({ ok: true, message: 'Mensaje enviado' });

    } catch (err) {
        console.error('Error en /api/contacto:', err.message);
        res.status(500).json({ error: 'Error interno al guardar el mensaje' });
    }
});

// --- INICIA EL NUEVO BLOQUE "MIS COMPRAS" ---
// GET /api/compras/historial
// Devuelve todas las compras del usuario, uniendo con la tabla de productos
// GET /api/compras/historial
// Devuelve todas las compras del usuario, uniendo con la tabla de productos
app.get('/api/compras/historial', proteger, async (req, res) => {
    const usuarioId = req.session.usuario.id;
    try {
        // Consulta que une 'compras' con 'productos' para obtener el nombre y la imagen
        const q = `
            SELECT 
                c.id AS compra_id, -- <<< ¡AQUÍ ESTÁ LA CORRECCIÓN!
                c.cantidad, 
                c.total, 
                c.estado, 
                c.fecha,
                p.nombre, 
                p.img
            FROM compras c
            JOIN productos p ON c.producto_id = p.id
            WHERE c.usuario_id = $1
            ORDER BY c.fecha DESC;
        `;
        const r = await pool.query(q, [usuarioId]);
        res.json(r.rows);
    } catch (err) {
        console.error('Error en /api/compras/historial:', err.message);
        res.status(500).json({ error: 'Error interno' });
    }
});

// POST /api/compras/actualizar-estado
// Permite al usuario cambiar el estado de una compra (ej. a 'recibido')
app.post('/api/compras/actualizar-estado', proteger, async (req, res) => {
    const usuarioId = req.session.usuario.id;
    const { compra_id, nuevo_estado } = req.body;

    // Validación de seguridad
    if (!compra_id || !nuevo_estado) {
        return res.status(400).json({ error: 'Faltan datos' });
    }
    
    // Lista de estados permitidos
    const estadosPermitidos = ['recibido', 'devolucion_solicitada'];
    if (!estadosPermitidos.includes(nuevo_estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
    }

    try {
        // Actualiza el estado SOLO SI la compra pertenece al usuario logueado
        const q = `
            UPDATE compras
            SET estado = $1
            WHERE id = $2 AND usuario_id = $3;
        `;
        const r = await pool.query(q, [nuevo_estado, compra_id, usuarioId]);

        if (r.rowCount === 0) {
            // Si rowCount es 0, significa que la compra no existe O no pertenece al usuario
            return res.status(404).json({ error: 'Compra no encontrada o no autorizada' });
        }

        res.json({ ok: true, message: `Estado actualizado a ${nuevo_estado}` });
    } catch (err) {
        console.error('Error en /api/compras/actualizar-estado:', err.message);
        res.status(500).json({ error: 'Error interno' });
    }
});

// --- TERMINA EL NUEVO BLOQUE "MIS COMPRAS" ---

// iniciar
app.listen(PORT, () => console.log(`Servidor en http://${process.env.IP}:${PORT}`));