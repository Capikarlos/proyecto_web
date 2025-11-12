// login.js (Actualizado)
// Añadimos la lógica para mostrar el mensaje de "sesión expirada"

document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario-login');
    const campoUsuario = document.getElementById('usuario');
    const campoClave = document.getElementById('clave');
    const mensajeError = document.getElementById('mensaje-error');

    // --- INICIA BLOQUE NUEVO ---
    // Revisar si la URL tiene el parámetro "expired=1"
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
        mensajeError.textContent = 'Tu sesión expiró por inactividad. Por favor, ingresa de nuevo.';
        mensajeError.classList.remove('error-oculto');
    }
    // --- TERMINA BLOQUE NUEVO ---

    // ✅ Validar formato
    function validarCampos(usuario, clave) {
        // ... (tu función de validación va aquí - sin cambios) ...
        const patronUsuario = /^[a-zA-Z0-9_]{3,15}$/;
        const patronClave = /^.{4,40}$/;
        if (!usuario || !clave) return 'Ambos campos son obligatorios.';
        if (!patronUsuario.test(usuario)) return 'Usuario inválido (solo letras, números o _).';
        if (!patronClave.test(clave)) return 'Contraseña debe tener entre 4 y 40 caracteres.';
        return null;
    }

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensajeError.classList.add('error-oculto');
        mensajeError.textContent = '';

        const nombre_usuario = campoUsuario.value.trim();
        const password = campoClave.value;

        const error = validarCampos(nombre_usuario, password);
        if (error) {
            mensajeError.textContent = error;
            mensajeError.classList.remove('error-oculto');
            return;
        }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_usuario, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                mensajeError.textContent = data.error || '❌ Credenciales inválidas.';
                mensajeError.classList.remove('error-oculto');
                return;
            }

            window.location.href = '/index.html';
        } catch (err) {
            console.error('Error en login:', err);
            mensajeError.textContent = '🚨 Error de conexión con el servidor.';
            mensajeError.classList.remove('error-oculto');
        }
    });
});