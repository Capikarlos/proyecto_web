// public/js/menu.js (Actualizado)
// Añadimos el monitor de inactividad del cliente

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // ... (Tu código para cargar el menú, refs, y abrir/cerrar va aquí - SIN CAMBIOS) ...
        // 1)
        let contenedorMenu = document.getElementById("menu-contenedor");
        if (!contenedorMenu) {
            contenedorMenu = document.createElement("div");
            contenedorMenu.id = "menu-contenedor";
            document.body.prepend(contenedorMenu);
        }
        // 2)
        const respuesta = await fetch("/componentes/menu.html");
        if (!respuesta.ok) throw new Error("No se pudo cargar el menú desde /componentes/menu.html");
        const htmlMenu = await respuesta.text();
        contenedorMenu.innerHTML = htmlMenu;
        // 3)
        const botonMenu = document.getElementById("boton-menu");
        const fondoDifuminado = document.getElementById("fondo-difuminado");
        const menuLateral = document.getElementById("menu-lateral");
        const listaMenu = document.querySelector("#menu-lateral ul");
        // 4)
        const enlaceAcceso = document.getElementById("enlace-acceso");
        const nombreUsuarioMenu = document.getElementById("nombre-usuario-menu");
        if (!botonMenu || !fondoDifuminado || !menuLateral || !enlaceAcceso) {
            console.warn("Menu: falta algún elemento esencial. Revisa componentes/menu.html");
            return;
        }
        // 5)
        function abrirMenu() {
            menuLateral.classList.add("mostrar");
            fondoDifuminado.classList.add("mostrar");
        }
        function cerrarMenu() {
            menuLateral.classList.remove("mostrar");
            fondoDifuminado.classList.remove("mostrar");
        }
        botonMenu.addEventListener("click", abrirMenu);
        fondoDifuminado.addEventListener("click", cerrarMenu);
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarMenu(); });

        // 6) ... (Tu código para insertar el botón del carrito va aquí - SIN CAMBIOS) ...
        const ruta = window.location.pathname;
        const nombreArchivo = ruta.substring(ruta.lastIndexOf("/") + 1) || "index.html";
        if (nombreArchivo === "productos.html" || nombreArchivo === "carrito.html") {
            const botonCarrito = document.createElement("button");
            botonCarrito.id = "btn-carrito";
            botonCarrito.className = "btn-carrito";
            botonCarrito.setAttribute("aria-label", "Ver carrito");
            botonCarrito.innerHTML = '🛒 <span id="contador-carrito" class="badge">0</span>';
            if (contenedorMenu.parentNode) {
                contenedorMenu.parentNode.insertBefore(botonCarrito, contenedorMenu.nextSibling);
            } else {
                document.body.appendChild(botonCarrito);
            }
            botonCarrito.addEventListener("click", () => {
                if (nombreArchivo !== "carrito.html") {
                    window.location.href = "/carrito.html";
                }
            });
        }


        // --- INICIA BLOQUE NUEVO (Monitor de Inactividad) ---
        let temporizadorInactividad;
        const TIEMPO_CLIENTE = 60000; // 60 segundos (debe coincidir con el servidor)

        function forzarLogoutPorInactividad() {
            // No necesitamos llamar a /api/logout, el servidor ya destruyó la sesión.
            // Simplemente redirigimos al usuario con el mensaje.
            console.log("Inactividad detectada. Redirigiendo al login.");
            window.location.href = '/login.html?expired=1';
        }

        function reiniciarTemporizadorInactividad() {
            clearTimeout(temporizadorInactividad);
            temporizadorInactividad = setTimeout(forzarLogoutPorInactividad, TIEMPO_CLIENTE);
        }

        function iniciarMonitorInactividad() {
            console.log("Iniciando monitor de inactividad del cliente...");
            // Reinicia el timer con cualquier de estas acciones
            document.addEventListener('mousemove', reiniciarTemporizadorInactividad);
            document.addEventListener('keypress', reiniciarTemporizadorInactividad);
            document.addEventListener('scroll', reiniciarTemporizadorInactividad);
            document.addEventListener('touchstart', reiniciarTemporizadorInactividad);
            // Inicia el primer temporizador
            reiniciarTemporizadorInactividad();
        }
        // --- TERMINA BLOQUE NUEVO ---


        // 7) ¡NUEVA FUNCIÓN! Actualiza el menú (nombre de usuario) Y el carrito
        async function actualizarInterfazUsuario() {
            // --- Parte A: Actualizar Sesión (lo que hacía sesion.js) ---
            try {
                const res = await fetch('/api/session');

                if (res.ok) { // ¡El usuario SÍ tiene sesión!
                    const datos = await res.json();

                    if (nombreUsuarioMenu) {
                        nombreUsuarioMenu.textContent = `Hola, ${datos.user.nombre_usuario}`;
                    }

                    enlaceAcceso.textContent = "Cerrar Sesión";
                    enlaceAcceso.href = "#";
                    enlaceAcceso.onclick = async (e) => {
                        e.preventDefault();
                        // Al cerrar sesión manualmente, limpiamos el timer
                        clearTimeout(temporizadorInactividad);
                        await fetch('/api/logout', { method: 'POST' });
                        window.location.href = '/login.html';
                    };

                    // --- ¡AQUÍ! ---
                    // Si el usuario tiene sesión, INICIAMOS el monitor de inactividad
                    iniciarMonitorInactividad();

                } else { // El usuario NO tiene sesión
                    if (nombreUsuarioMenu) nombreUsuarioMenu.textContent = '';
                    enlaceAcceso.textContent = "Acceder";
                    enlaceAcceso.href = "/login.html";
                    enlaceAcceso.onclick = null;
                }

            } catch (err) {
                console.error('Error verificando sesión:', err);
                if (nombreUsuarioMenu) nombreUsuarioMenu.textContent = '';
                enlaceAcceso.textContent = "Acceder";
                enlaceAcceso.href = "/login.html";
            }

            // ... (Tu código de la Parte B: Actualizar Badge del Carrito va aquí - SIN CAMBIOS) ...
            const contadorEl = document.getElementById("contador-carrito");
            if (!contadorEl) return;
            try {
                const res = await fetch('/api/carrito');
                if (!res.ok) {
                    contadorEl.textContent = "0";
                    return;
                }
                const carrito = await res.json();
                const total = carrito.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
                contadorEl.textContent = total;
            } catch (err) {
                contadorEl.textContent = "0";
            }
        }

        // 8) Ejecutar la función
        actualizarInterfazUsuario();

        // 9) (Opcional) Actualizar si se cambia de pestaña
        // (Nota: 'focus' también cuenta como actividad, así que reiniciará el timer)
        window.addEventListener("focus", () => {
            actualizarInterfazUsuario();
            // Si el usuario está logueado, 'focus' reiniciará el timer
            // gracias a los listeners que añadimos.
        });

        // 10) Escuchar el evento 'carritoActualizado' de productos.js y carrito.js
        window.addEventListener('carritoActualizado', () => {
            console.log('Evento "carritoActualizado" recibido. Actualizando UI del menú.');
            actualizarInterfazUsuario();
        });


    } catch (error) {
        console.error("Error cargando menu.js:", error);
    }
});