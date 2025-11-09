document.addEventListener('DOMContentLoaded', () => {
    const listaCarritoEl = document.getElementById('lista-carrito');
    const totalFinalEl = document.getElementById('total-final');
    const btnFinalizar = document.getElementById('btn-finalizar');
    const modalTerminos = document.getElementById('modal-terminos');
    const btnAceptarTerminos = document.getElementById('btn-aceptar-terminos');
    const btnRechazarTerminos = document.getElementById('btn-rechazar-terminos');

    let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');
    let terminosAceptados = localStorage.getItem('terminosAceptados') === 'true';

    /* MODAL TÉRMINOS */
    function verificarTerminos() {
        if (!terminosAceptados) {
            modalTerminos.classList.remove('ventana-oculta');
            modalTerminos.classList.add('ventana-visible');
            btnFinalizar.disabled = true;
        } else {
            modalTerminos.classList.remove('ventana-visible');
            modalTerminos.classList.add('ventana-oculta');
            btnFinalizar.disabled = carrito.length === 0;
        }
    }
    btnAceptarTerminos.addEventListener('click', () => {
        terminosAceptados = true;
        localStorage.setItem('terminosAceptados', 'true');
        verificarTerminos();
    });
    btnRechazarTerminos.addEventListener('click', () => {
        terminosAceptados = false;
        localStorage.setItem('terminosAceptados', 'false');
        alert('No puedes finalizar la compra sin aceptar términos.');
    });
    /* MODAL TÉRMINOS */

    /* Limpiar Datos */
    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    }
    function formatearPrecio(n) { return Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
    /* Limpiar Datos */

    // Devuelve el stock numérico del producto; si no hay stock definido, es "ilimitado"
    function getStock(prod) {
        const n = Number(prod?.stock);
        return Number.isFinite(n) && n >= 0 ? n : Infinity;
    }

    // Asegura que ninguna cantidad supere el stock al iniciar
    function normalizarCarrito() {
        let cambiado = false;
        carrito.forEach(p => {
            const stock = getStock(p);
            if (Number.isFinite(stock) && p.cantidad > stock) {
                p.cantidad = stock;
                cambiado = true;
            }
        });
        // elimina items con cantidad <= 0
        const lenAntes = carrito.length;
        carrito = carrito.filter(p => p.cantidad > 0);
        if (cambiado || carrito.length !== lenAntes) {
            localStorage.setItem('carrito', JSON.stringify(carrito));
        }
    }

    function modificarCantidad(id, delta) {
        const item = carrito.find(i => i.id === id);
        if (!item) return;
        const stock = getStock(item);

        if (delta > 0) {
            // no permitir pasar del stock
            if (Number.isFinite(stock) && item.cantidad >= stock) return;
            item.cantidad += 1;
        } else if (delta < 0) {
            item.cantidad -= 1;
            if (item.cantidad <= 0) {
                carrito = carrito.filter(i => i.id !== id);
            }
        }
        // clamp defensivo
        if (Number.isFinite(stock) && item.cantidad > stock) {
            item.cantidad = stock;
        }
        guardarCarrito();
    }

    function eliminarItem(id) {
        carrito = carrito.filter(i => i.id !== id);
        guardarCarrito();
    }
    function guardarCarrito() {
        localStorage.setItem('carrito', JSON.stringify(carrito));
        actualizarVista();
    }

    function actualizarVista() {
        listaCarritoEl.innerHTML = '';
        let total = 0;
        if (!carrito.length) {
            listaCarritoEl.innerHTML = '<p>Tu carrito está vacío.</p>';
        } else {
            carrito.forEach(prod => {
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

                listaCarritoEl.appendChild(div);
                total += prod.cantidad * prod.precio;
            });
        }
        totalFinalEl.textContent = `Total: $${formatearPrecio(total)}`;
        btnFinalizar.disabled = !terminosAceptados || carrito.length === 0;

        // listeners botones
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

    // finalizar compra
    btnFinalizar.addEventListener('click', () => {
        if (!terminosAceptados) return alert('Debes aceptar los términos para finalizar.');
        // aquí puedes enviar al backend POST /api/orden para guardar compra real
        alert('Compra realizada. Gracias.');
        carrito = [];
        guardarCarrito();
    });

    // iniciar
    normalizarCarrito();
    actualizarVista();
    verificarTerminos();
});