// login.js (cliente)
document.addEventListener('DOMContentLoaded', () => {
    const formularioLogin = document.getElementById("formulario-login");
    const campoUsuario = document.getElementById("usuario");
    const campoClave = document.getElementById("clave");
    const mensajeError = document.getElementById("mensaje-error");

    function validarCampos(usuario, clave) {
        if (usuario.trim() === "" || clave.trim() === "") return false;
        const patronUsuario = /^[a-zA-Z0-9_]{3,15}$/;
        const patronClave = /^.{4,20}$/;
        return patronUsuario.test(usuario) && patronClave.test(clave);
    }

    formularioLogin.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const usuario = campoUsuario.value;
        const clave = campoClave.value;

        if (!validarCampos(usuario, clave)) {
            mensajeError.textContent = "⚠️ Datos inválidos. Verifica el formato.";
            mensajeError.classList.remove("error-oculto");
            return;
        }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_usuario: usuario, password: clave })
            });
            const j = await res.json();
            if (!res.ok) {
                mensajeError.textContent = j.error || 'Error al iniciar sesión';
                mensajeError.classList.remove("error-oculto");
                return;
            }
            // login ok -> redirigir a index
            window.location.href = '/index.html';
        } catch (err) {
            console.error(err);
            mensajeError.textContent = 'Error de conexión';
            mensajeError.classList.remove("error-oculto");
        }
    });
});
