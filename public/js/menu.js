// public/js/menu.js
// Menú lateral hamburguesa: carga el HTML, controla abrir/cerrar, sesión y badge del carrito
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1) obtener el contenedor donde insertar el menú (si existe)
        let contenedorMenu = document.getElementById("menu-contenedor");
        let crearContenedor = false;
        if (!contenedorMenu) {
            // Si no existe, lo creamos y lo ponemos al inicio del body
            contenedorMenu = document.createElement("div");
            contenedorMenu.id = "menu-contenedor";
            document.body.prepend(contenedorMenu);
            crearContenedor = true;
        }

        // 2) cargar el HTML del menú desde el servidor
        const respuesta = await fetch("/componentes/menu.html");
        if (!respuesta.ok) throw new Error("No se pudo cargar el menú desde /componentes/menu.html");
        const htmlMenu = await respuesta.text();
        contenedorMenu.innerHTML = htmlMenu;

        // 3) Referencias a elementos recién insertados
        const botonMenu = document.getElementById("boton-menu");
        const fondoDifuminado = document.getElementById("fondo-difuminado");
        const menuLateral = document.getElementById("menu-lateral");
        const enlaceAcceso = document.getElementById("enlace-acceso");
        const nombreUsuarioMenu = document.getElementById("nombre-usuario-menu");
        const listaMenu = document.querySelector("#menu-lateral ul");

        // Aseguras que existan (evitar errores si el HTML del menú cambió)
        if (!botonMenu || !fondoDifuminado || !menuLateral) {
            console.warn("Menu: falta algún elemento (boton-menu / fondo-difuminado / menu-lateral). Revisa componentes/menu.html");
            return;
        }

        // 4) Funciones abrir / cerrar
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
        // cerrar con ESC
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarMenu(); });

        // 5) Insertar botón de carrito SOLO en la página productos.html
        const ruta = window.location.pathname;
        const nombreArchivo = ruta.substring(ruta.lastIndexOf("/") + 1) || "index.html";
        if (nombreArchivo === "productos.html") {
            // crear el botón carrito y añadirlo al encabezado del menu (o al final de la lista)
            const botonCarrito = document.createElement("button");
            botonCarrito.id = "btn-carrito";
            botonCarrito.className = "btn-carrito";
            botonCarrito.setAttribute("aria-label", "Ver carrito");
            botonCarrito.innerHTML = '🛒 <span id="contador-carrito" class="badge">0</span>';
            // si hay un lugar específico ponlo ahí, si no, lo añadimos al inicio de la lista
            if (listaMenu) {
                const li = document.createElement("li");
                li.appendChild(botonCarrito);
                listaMenu.insertBefore(li, listaMenu.firstChild);
            } else {
                menuLateral.appendChild(botonCarrito);
            }
            // click al carrito -> ir a cart.html
            botonCarrito.addEventListener("click", () => { window.location.href = "/cart.html"; });
        }

        // 6) Actualizar contador del carrito (lee localStorage 'carrito')
        function actualizarBadgeCarrito() {
            const contadorEl = document.getElementById("contador-carrito");
            if (!contadorEl) return;
            try {
                const carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
                const total = carrito.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
                contadorEl.textContent = total;
            } catch (err) {
                contadorEl.textContent = "0";
            }
        }
        // actualizar ahora y cuando la pestaña reciba foco (por si cambiaron carrito en otra pestaña)
        actualizarBadgeCarrito();
        window.addEventListener("focus", actualizarBadgeCarrito);

        // 7) Verificar sesión y adaptar enlace de acceso


        // 8) si el menú se creó dinámicamente y quieres que el primer script dependiente espere, nada más
        // (ya está todo listo)
    } catch (error) {
        console.error("Error cargando menu.js:", error);
    }
});
