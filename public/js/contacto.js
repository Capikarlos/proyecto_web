// contacto.js
document.addEventListener("DOMContentLoaded", () => {
    //  ELEMENTOS DEL DOM
    const formularioContacto = document.getElementById("formulario-contacto");
    const campoCorreo = document.getElementById("correo");
    const campoComentario = document.getElementById("comentario");
    const mensajeConfirmacion = document.getElementById("mensaje-confirmacion");
    const btnEnviar = document.getElementById("btn-enviar");
    
    // Contenedores del Historial (Mejora)
    const historialContenedor = document.getElementById("historial-contenedor");
    const historialLista = document.getElementById("historial-lista");


    // --- FUNCIÓN DE VALIDACIÓN (sin cambios) --- //
    function validarFormulario(correo, comentario) {
        const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return patronCorreo.test(correo) && comentario.trim().length >= 5;
    }
    
    // --- MEJORA: Cargar datos del usuario al iniciar --- //
    async function cargarDatosIniciales() {
        // 1. Rellenar email si el usuario está logueado
        try {
            const resSesion = await fetch('/api/session');
            if (resSesion.ok) {
                const datos = await resSesion.json();
                if (datos.user && datos.user.email) {
                    campoCorreo.value = datos.user.email;
                }
            }
        } catch (err) {
            console.warn("No se pudo cargar la sesión para rellenar el email.");
        }

        // 2. Cargar historial de comentarios
        try {
            const resHistorial = await fetch('/api/contacto/historial');
            if (resHistorial.ok) {
                const comentarios = await resHistorial.json();
                if (comentarios.length > 0) {
                    historialLista.innerHTML = ''; // Limpiar
                    comentarios.forEach(item => {
                        const li = document.createElement('li');
                        const fecha = new Date(item.fecha).toLocaleDateString();
                        li.innerHTML = `<strong>${fecha}:</strong> ${escapeHtml(item.comentario)}`;
                        historialLista.appendChild(li);
                    });
                    historialContenedor.style.display = 'block'; // Mostrar
                }
            }
        } catch (err) {
             console.warn("No se pudo cargar el historial (probablemente no hay sesión).");
        }
    }


    // --- EVENTO ENVIAR (¡Actualizado con fetch!) --- //
    formularioContacto.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        
        btnEnviar.disabled = true; // Deshabilitar botón
        btnEnviar.textContent = "Enviando...";
        mensajeConfirmacion.classList.add("mensaje-oculto");

        const correo = campoCorreo.value;
        const comentario = campoComentario.value;

        if (!validarFormulario(correo, comentario)) {
            mostrarMensaje("Verifica tu correo o escribe un comentario más largo.", "error");
            btnEnviar.disabled = false;
            btnEnviar.textContent = "Enviar";
            return;
        }

        // --- Conexión real con el backend ---
        try {
            const res = await fetch('/api/contacto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, comentario })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error desconocido del servidor");
            }

            // ¡Éxito!
            mostrarMensaje("Tu mensaje ha sido enviado correctamente.", "exito");
            formularioContacto.reset(); // Limpia el formulario
            // Volvemos a cargar el email si el usuario estaba logueado
            cargarDatosIniciales(); 

        } catch (err) {
            console.error("Error al enviar formulario:", err);
            mostrarMensaje(`Error al enviar: ${err.message}`, "error");
        } finally {
            // Re-habilitar el botón
            btnEnviar.disabled = false;
            btnEnviar.textContent = "Enviar";
        }
    });

    // --- FUNCIÓN DE AYUDA: Mostrar mensaje ---
    function mostrarMensaje(mensaje, tipo = "exito") {
        mensajeConfirmacion.textContent = mensaje;
        mensajeConfirmacion.className = 'mensaje-visible'; // Quitar 'mensaje-oculto'
        
        if (tipo === "error") {
            mensajeConfirmacion.style.color = "#D9534F"; // Rojo
        } else {
            mensajeConfirmacion.style.color = "#5CB85C"; // Verde
        }
        
        // Ocultar mensaje después de 3 segundos
        setTimeout(() => {
            mensajeConfirmacion.classList.add("mensaje-oculto");
            mensajeConfirmacion.classList.remove("mensaje-visible");
        }, 3000);
    }
    
    // --- FUNCIÓN DE AYUDA: Escapar HTML ---
    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    // --- Iniciar ---
    cargarDatosIniciales();
});
