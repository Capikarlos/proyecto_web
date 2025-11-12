// public/js/perfil.js (NUEVO ARCHIVO)
// Este script se encarga de cargar los datos del perfil en index.html

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los nuevos elementos del HTML
    // const imgAvatar = document.getElementById('perfil-avatar'); // <- ELIMINADO
    const txtNombre = document.getElementById('perfil-nombre');
    const txtUsername = document.getElementById('perfil-username');
    const txtEmail = document.getElementById('perfil-email');
    const txtBio = document.getElementById('perfil-bio');

    async function cargarDatosPerfil() {
        try {
            const res = await fetch('/api/session');
            
            if (!res.ok) {
                // Si no hay sesión, no deberíamos estar aquí,
                // pero menu.js o el servidor ya deberían habernos redirigido.
                console.error('No hay sesión activa.');
                return;
            }

            const { user } = await res.json();

            if (user) {
                // Rellenamos la tarjeta de perfil con los datos de la sesión
                // imgAvatar.src = user.avatar_url || '...'; // <- ELIMINADO
                txtNombre.textContent = user.nombre_completo || 'Nombre no definido';
                txtUsername.textContent = user.nombre_usuario;
                txtEmail.textContent = user.email || 'Email no definido';
                txtBio.textContent = user.biografia || 'Sin biografía.';
            }

        } catch (err) {
            console.error('Error al cargar datos del perfil:', err);
        }
    }

    cargarDatosPerfil();
});