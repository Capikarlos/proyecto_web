// sesion.js — maneja la sesión activa del usuario
document.addEventListener('DOMContentLoaded', () => {
    const pagina = location.pathname;

    // No ejecutar este script en login o registro
    if (pagina.endsWith('/login.html') || pagina.endsWith('/register.html')) {
        return;
    }

    const enlaceUsuario = document.getElementById('usuario-link');

    // 🔹 Verifica la sesión actual y actualiza la interfaz
    async function actualizarUsuario() {
        try {
            const res = await fetch('/api/session');
            if (!res.ok) {
                // Redirigir solo si estamos en páginas protegidas
                if (!pagina.endsWith('/index.html') && !pagina.endsWith('/componentes/menu.html')) {
                    window.location.href = '/login.html';
                }
                return;
            }

            const datos = await res.json();
            if (datos.user && enlaceUsuario) {
                enlaceUsuario.textContent = `Hola, ${datos.user.nombre_usuario}`;
                enlaceUsuario.href = '#';
            }
        } catch (err) {
            console.error('Error verificando sesión:', err);
        }
    }

    // 🔹 Ping al servidor cada 15s para detectar expiración
    setInterval(async () => {
        try {
            const res = await fetch('/api/session');
            if (!res.ok) {
                window.location.href = '/login.html';
            }
        } catch (err) {
            console.error('Ping sesión falló:', err);
        }
    }, 15000);

    // 🔹 Ejecutar la verificación inicial
    actualizarUsuario();
});
