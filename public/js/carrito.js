// carrito.js
document.addEventListener('DOMContentLoaded', () => {
    const listaCarritoEl = document.getElementById('lista-carrito');
    const totalFinalEl = document.getElementById('total-final');
    const btnFinalizar = document.getElementById('btn-finalizar');
    const modalTerminos = document.getElementById('modal-terminos');
    const btnAceptarTerminos = document.getElementById('btn-aceptar-terminos');
    const btnRechazarTerminos = document.getElementById('btn-rechazar-terminos');

    let carritoGlobal = [];

    // Usamos localStorage SOLO para los términos, ¡eso está bien!
    let terminosAceptados = localStorage.getItem('terminosAceptados') === 'true';

// --- INICIA EL BLOQUE CORREGIDO ---
    /* MODAL TÉRMINOS */
    function verificarTerminos() {
        if (!terminosAceptados) {
            modalTerminos.classList.remove('ventana-oculta');
            modalTerminos.classList.add('ventana-visible');
            btnFinalizar.disabled = true;
        } else {
            modalTerminos.classList.remove('ventana-visible');
            modalTerminos.classList.add('ventana-oculta');
            // Usamos carritoGlobal que ya cargamos del servidor
            btnFinalizar.disabled = carritoGlobal.length === 0;
        }
    }
    btnAceptarTerminos.addEventListener('click', () => {
        terminosAceptados = true;
        // Está bien usar localStorage para esto, es una preferencia del NAVEGADOR
        localStorage.setItem('terminosAceptados', 'true');
        verificarTerminos();
    });
    btnRechazarTerminos.addEventListener('click', () => {
        terminosAceptados = false;
        localStorage.setItem('terminosAceptados', 'false');
        alert('No puedes finalizar la compra sin aceptar términos.');
        verificarTerminos(); // Re-evalúa por si acaso
    });
    /* MODAL TÉRMINOS */
    // --- TERMINA EL BLOQUE CORREGIDO ---



    /**
     * ¡NUEVO! Función genérica para actualizar el servidor
     * Esta es muy parecida a la de productos.js
     */
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
                window.location.href = '/login.html';
                return;
            }
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al actualizar');
            }

            carritoGlobal = await res.json(); // Actualizamos la data local
            actualizarVista(); // Re-renderizamos

            // ¡MAGIA! Notificar al menú que el carrito cambió
            window.dispatchEvent(new Event('carritoActualizado'));

        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    }


    /**
     * ¡MODIFICADO! Llaman a la nueva función de API
     */
    function modificarCantidad(id, delta) {
        const item = carritoGlobal.find(i => i.id === id);
        if (!item) return;
        // La lógica de stock ya la validamos en productos.js
        // pero podemos validarla aquí también por seguridad
        const stock = getStock(item);
        const nuevaCantidad = item.cantidad + delta;

        if (nuevaCantidad > stock) {
            alert('No hay más stock');
            return;
        }

        actualizarItemCarrito(id, nuevaCantidad);
    }

    function eliminarItem(id) {
        actualizarItemCarrito(id, 0); // Cantidad 0 elimina
    }


    function actualizarVista() {
        listaCarritoEl.innerHTML = '';
        let total = 0;

        if (!carritoGlobal.length) {
            listaCarritoEl.innerHTML = '<p>Tu carrito está vacío.</p>';
        } else {
            // --- INICIA EL BLOQUE CORREGIDO ---
            // (Faltaba la creación del 'div' y su contenido)
            carritoGlobal.forEach(prod => {
                const stock = getStock(prod);
                const atMax = Number.isFinite(stock) && prod.cantidad >= stock;
                const div = document.createElement('div');
                div.className = 'tarjeta-carrito';

                div.innerHTML = `
                <img class="imagen-carrito" src="${escapeHtml(prod.img)}" alt="${escapeHtml(prod.nombre)}">

                <div class="info-carrito">
                    <h3 class="nombre-producto">${escapeHtml(prod.nombre)}</h3>
                    <p class="categoria-producto">${escapeHtml(prod.categoria) || "Sin categoría"}</p>
                    <p class="precio-producto">Precio: $${formatearPrecio(prod.precio)}</p>
                    ${Number.isFinite(stock) ? `<p class="stock">Stock disponible: ${formatearPrecio(stock)}</p>` : ''}
                    <p class="cantidad">Cantidad: ${prod.cantidad}</p>
                </div>

                <div class="acciones-carrito">
                    <p class="subtotal">Subtotal: $${formatearPrecio(prod.cantidad * prod.precio)}</p>
                    <div class="botones-carrito">
                    <button class="btn-menos" data-id="${prod.id}" ${prod.cantidad <= 1 ? '' : ''}>−</button>
                    <button class="btn-mas" data-id="${prod.id}" ${atMax ? 'disabled title="Sin stock disponible"' : ''}>+</button>
                    <button class="btn-basura" data-id="${prod.id}" title="Eliminar del carrito">🗑️</button>
                    </div>
                </div>
                `;
                // --- FIN DEL BLOQUE INTERNO ---

                listaCarritoEl.appendChild(div);
                total += prod.cantidad * prod.precio;
            });
        }
        totalFinalEl.textContent = `Total: $${formatearPrecio(total)}`;
        btnFinalizar.disabled = !terminosAceptados || carritoGlobal.length === 0;

        // listeners (sin cambios, ya estaban bien)
        document.querySelectorAll('.btn-mas').forEach(b => {
            b.onclick = () => { modificarCantidad(Number(b.dataset.id), +1); };
        });
        document.querySelectorAll('.btn-menos').forEach(b => {
            b.onclick = () => { modificarCantidad(Number(b.dataset.id), -1); };
        });
        document.querySelectorAll('.btn-basura').forEach(b => {
            b.onclick = () => { eliminarItem(Number(b.dataset.id)); };
        });
    }

    /**
     * ¡MODIFICADO! Llama a la nueva API de finalizar
     */
    btnFinalizar.addEventListener('click', async () => {
        if (!terminosAceptados) return alert('Debes aceptar los términos para finalizar.');

        btnFinalizar.disabled = true;
        btnFinalizar.textContent = 'Procesando...';

        try {
            const res = await fetch('/api/compras/finalizar', { method: 'POST' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al finalizar');
            }

            // ¡Éxito!
            alert('Compra realizada. Gracias.');
            carritoGlobal = []; // Vaciamos el carrito local
            actualizarVista(); // Renderizamos el carrito vacío

            // ¡MAGIA! Notificar al menú que el carrito cambió (quedó en 0)
            window.dispatchEvent(new Event('carritoActualizado'));

        } catch (err) {
            alert(`Error: ${err.message}`);
            btnFinalizar.disabled = false;
            btnFinalizar.textContent = 'Finalizar Compra';
        }
    });

    /**
     * ¡NUEVO! Función para cargar el carrito del servidor al inicio
     */
    async function cargarCarritoServidor() {
        try {
            const res = await fetch('/api/carrito');
            if (res.status === 401) {
                window.location.href = '/login.html'; // Proteger página
                return;
            }
            if (!res.ok) throw new Error('No se pudo cargar el carrito');

            carritoGlobal = await res.json();
            actualizarVista();
            verificarTerminos();
        } catch (err) {
            console.error(err);
            listaCarritoEl.innerHTML = '<p>Error al cargar tu carrito.</p>';
        }
    }

    // ... (justo antes del último '});' en carrito.js)

    // --- INICIA EL BLOQUE CORREGIDO (FUNCIONES UTILS) ---
    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function formatearPrecio(n) {
        return Number(n).toLocaleString("es-MX", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    }

    function getStock(prod) {
        const n = Number(prod?.stock);
        return Number.isFinite(n) && n >= 0 ? n : Infinity;
    }
    // --- TERMINA EL BLOQUE CORREGIDO ---

    // iniciar
    cargarCarritoServidor();
});