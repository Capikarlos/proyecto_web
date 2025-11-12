// productos.js (Refactorizado)
document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("lista-productos");

    // --- Variables Globales ---
    let productosGlobal = []; // Lista de todos los productos
    let carritoGlobal = [];   // Copia local del carrito del SERVIDOR

    async function actualizarItemCarrito(productoId, nuevaCantidad) {
        try {
            const res = await fetch('/api/carrito/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    producto_id: productoId,
                    cantidad: nuevaCantidad
                })
            });

            if (res.status === 401) {
                alert('Tu sesión expiró. Serás redirigido al login.');
                window.location.href = '/login.html';
                return;
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al actualizar carrito');
            }

            // El servidor nos devuelve el carrito actualizado
            carritoGlobal = await res.json();

            // Re-renderizar tarjetas para reflejar el cambio
            renderizarTarjetas(productosGlobal);

            // ¡MAGIA! Notificar al menú que el carrito cambió
            window.dispatchEvent(new Event('carritoActualizado'));

        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
        }
    }


    /**
     * ¡MODIFICADO! Estas funciones ahora solo calculan la nueva cantidad
     * y llaman a la función principal 'actualizarItemCarrito'.
     */
    function agregarAlCarrito(producto) {
        const item = carritoGlobal.find((i) => i.id === producto.id) || { cantidad: 0 };
        const stock = Number(producto.stock);

        if (Number.isFinite(stock) && item.cantidad >= stock) {
            alert(`⚠️ Solo hay ${stock} unidades disponibles de "${producto.nombre}".`);
            return;
        }

        actualizarItemCarrito(producto.id, item.cantidad + 1);
    }

    function reducirEnCarrito(productoId) {
        const item = carritoGlobal.find((i) => i.id === productoId);
        if (!item) return; // No debería pasar
        actualizarItemCarrito(productoId, item.cantidad - 1); // El servidor lo borrará si llega a 0
    }

    function eliminarDelCarrito(productoId) {
        actualizarItemCarrito(productoId, 0); // Poner cantidad 0 elimina
    }

    // ¡MODIFICADO! Lee de nuestra variable global
    function cantidadEnCarrito(productoId) {
        const item = carritoGlobal.find((i) => i.id === productoId);
        return item ? item.cantidad : 0;
    }

    /**
     * ¡MODIFICADO! Ahora carga productos Y el carrito al iniciar.
     */
    async function cargarDatos() {
        try {
            // Cargar en paralelo productos y carrito
            const [respProd, respCart] = await Promise.all([
                fetch("/api/productos"),
                fetch("/api/carrito")
            ]);

            if (!respProd.ok) throw new Error("No se pudieron cargar productos");
            productosGlobal = await respProd.json();

            if (respCart.ok) { // Si el fetch del carrito está OK (logueado)
                carritoGlobal = await respCart.json();
            }
            // Si respCart no está OK (ej. 401 No logueado), carritoGlobal queda vacío []

            renderizarTarjetas(productosGlobal);

        } catch (err) {
            console.error(err);
            contenedor.innerHTML = "<p>Error cargando productos.</p>";
        }
    }

    // Render de tarjetas (Tu código aquí es perfecto, no necesita casi cambios)
    function renderizarTarjetas(productos) {
        contenedor.innerHTML = "";
        // ... (todo tu código de 'forEach' y creación de 'tarjeta' es igual) ...

        productos.forEach((prod) => {
            const tarjeta = document.createElement("article");
            // ... (tu innerHTML es igual) ...
            tarjeta.className = "tarjeta-producto";
            const imgUrl = prod.img;

            tarjeta.innerHTML = `
                <img class="imagen-producto" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(prod.nombre)}">
                <div class="info-producto">
                    <div class="nombre-producto">${escapeHtml(prod.nombre)}</div>
                    <div class="precio-producto">$${formatearPrecio(prod.precio)}</div>
                    <div class="categoria-producto">${escapeHtml(prod.categoria) || "N/A"}</div>
                    <div class="stock">Stock: ${prod.stock ?? "N/A"}</div>
                </div>
                <div class="controls" data-id="${prod.id}"></div>
            `;
            contenedor.appendChild(tarjeta);

            // --- ESTA PARTE ES LA ÚNICA QUE CAMBIA ---
            const controles = tarjeta.querySelector(".controls");
            const cantidadActual = cantidadEnCarrito(prod.id); // ¡Lee de carritoGlobal!

            if (cantidadActual === 0) {
                const btn = document.createElement("button");
                btn.className = "btn-agregar";
                btn.textContent = "Agregar";
                // ¡MODIFICADO! Llama a la nueva función
                btn.addEventListener("click", () => agregarAlCarrito(prod));
                controles.appendChild(btn);
            } else {
                // Crear los controles para cantidad > 0
                const cont = document.createElement("div");
                cont.className = "contador";

                const btnBasura = document.createElement("button");
                btnBasura.className = "btn-basura";
                btnBasura.title = "Eliminar del carrito";
                btnBasura.innerHTML = "🗑️";
                btnBasura.addEventListener("click", () => eliminarDelCarrito(prod.id));

                const btnMenos = document.createElement("button");
                btnMenos.className = "btn-menos";
                btnMenos.innerText = "−";
                btnMenos.addEventListener("click", () => reducirEnCarrito(prod.id));

                const spanCantidad = document.createElement("span");
                spanCantidad.className = "cantidad-mostrar";
                spanCantidad.innerText = cantidadActual;

                const btnMas = document.createElement("button");
                btnMas.className = "btn-mas";
                btnMas.innerText = "+";
                btnMas.addEventListener("click", () => agregarAlCarrito(prod));
                // (Opcional: deshabilita si stock >= cantidad)
                if (Number.isFinite(prod.stock) && cantidadActual >= Number(prod.stock)) {
                    btnMas.disabled = true;
                }

                cont.appendChild(btnBasura);
                cont.appendChild(btnMenos);
                cont.appendChild(spanCantidad);
                cont.appendChild(btnMas);
                controles.appendChild(cont);
            }
        });
    }

    // Utils
    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    // 
    function formatearPrecio(n) {
        return Number(n).toLocaleString("es-MX", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    }

    // Iniciar
    cargarDatos();
});