document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario-register');
    const mensaje = document.getElementById('mensaje-register');

    function validar(usuario, pass) {
        const u = /^[a-zA-Z0-9_]{3,15}$/;
        const p = /^.{4,40}$/;
        return u.test(usuario) && p.test(pass);
    }

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensaje.classList.add('error-oculto');
        const nombre_usuario = document.getElementById('r-nombre').value.trim();
        const email = document.getElementById('r-email').value.trim();
        const password = document.getElementById('r-pass').value;

        if (!validar(nombre_usuario, password)) {
            mensaje.textContent = 'Formato inválido.';
            mensaje.classList.remove('error-oculto');
            return;
        }

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_usuario, password, email })
            });
            const j = await res.json();
            if (!res.ok) {
                mensaje.textContent = j.error || 'No se pudo registrar';
                mensaje.classList.remove('error-oculto');
                return;
            }
            // registro ok -> redirigir a index (sesión creada por server)
            window.location.href = '/index.html';
        } catch (err) {
            console.error(err);
            mensaje.textContent = 'Error de conexión';
            mensaje.classList.remove('error-oculto');
        }
    });
});
