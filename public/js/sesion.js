// sesion.js
document.addEventListener('DOMContentLoaded', () => {
    const pagina = location.pathname;

    // No ejecutar este script en login o registro
    if (pagina.endsWith('/login.html') || pagina.endsWith('/register.html')) {
        return;
    }

    const enlaceUsuario = document.getElementById('usuario-link');

    // Verifica la sesión actual y actualiza la interfaz
    async function actualizarUsuario() {
        try {
            // Preguntamos al servidor: "¿Quién soy?"
            const res = await fetch('/api/session');

            // Si el servidor responde con un error (401), significa que NO hay sesión
            if (!res.ok) {
                // Si no estamos en una página pública, nos vamos al login.
                // Tu servidor ya protege las páginas .html, esto es un doble seguro.
                if (!pagina.endsWith('/index.html') && !pagina.endsWith('/componentes/menu.html') && pagina !== '/') {
                    window.location.href = '/login.html';
                }
                return;
            }

            // Si la respuesta es OK (200), el servidor nos da los datos del usuario
            const datos = await res.json();
            if (datos.user && enlaceUsuario) {
                // Actualizamos la barra de navegación
                enlaceUsuario.textContent = `Hola, ${datos.user.nombre_usuario}`;
                enlaceUsuario.href = '#'; // O a una página de perfil
            }
        } catch (err) {
            console.error('Error verificando sesión:', err);
        }
    }

    // Ejecutar la verificación inicial solo UNA VEZ al cargar la página.
    actualizarUsuario();
});