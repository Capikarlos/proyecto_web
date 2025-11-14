document.addEventListener("DOMContentLoaded", () => {
    // Contenedor principal para las compras
    const listaComprasEl = document.getElementById("lista-compras");

    // --- Función Principal: Cargar el historial de compras ---
    async function cargarHistorial() {
        // Mostrar un mensaje de carga
        listaComprasEl.innerHTML = "<p>Cargando historial...</p>";

        try {
            const res = await fetch('/api/compras/historial');

            // Si la sesión expiró o no está logueado, redirigir
            if (res.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            if (!res.ok) {
                throw new Error('No se pudo cargar el historial');
            }

            const compras = await res.json();
            renderizarCompras(compras);

        } catch (err) {
            console.error(err);
            listaComprasEl.innerHTML = `<p class="error-mensaje">Error al cargar tu historial: ${err.message}</p>`;
        }
    }

    // --- Función: Renderizar (dibujar) las compras en la página ---
    function renderizarCompras(compras) {
        // Limpiar el contenedor
        listaComprasEl.innerHTML = "";

        if (compras.length === 0) {
            listaComprasEl.innerHTML = "<p>Aún no has realizado ninguna compra.</p>";
            return;
        }

        // Crear una tarjeta por cada compra
        compras.forEach(item => {
            const div = document.createElement('div');
            div.className = 'compra-item';

            // Clase CSS basada en el estado (ej. 'estado-pendiente', 'estado-recibido')
            div.classList.add(`estado-${item.estado.toLowerCase().replace('_', '-')}`);

            const fechaCompra = new Date(item.fecha).toLocaleDateString();

            // Rellenar la tarjeta con los datos
            div.innerHTML = `
                <img class="compra-img" src="${escapeHtml(item.img)}" alt="${escapeHtml(item.nombre)}">
                <div class="compra-info">
                    <h3 class="compra-nombre">${escapeHtml(item.nombre)}</h3>
                    <p>Comprado el: ${fechaCompra}</p>
                    <p>Cantidad: ${item.cantidad} | Total: $${formatearPrecio(item.total)}</p>
                    <div class="compra-estado">
                        Estado: <span class="estado-badge">${item.estado.replace('_', ' ')}</span>
                    </div>
                </div>
                <div class="compra-acciones">
                    <!-- Los botones se añadirán aquí abajo -->
                </div>
            `;

            // --- Lógica de botones (según el estado) ---
            const accionesEl = div.querySelector('.compra-acciones');

            if (item.estado === 'pendiente') {
                // Si está pendiente, puede confirmar que lo recibió
                const btnRecibido = document.createElement('button');
                btnRecibido.className = 'btn-recibido';
                btnRecibido.textContent = 'Confirmar Recibido';
                btnRecibido.onclick = () => {
                    // --- CORREGIDO a item.compra_id ---
                    actualizarEstado(item.compra_id, 'recibido', btnRecibido);
                };
                accionesEl.appendChild(btnRecibido);
            } else if (item.estado === 'recibido') {
                // Si ya lo recibió, puede solicitar una devolución
                const btnDevolucion = document.createElement('button');
                btnDevolucion.className = 'btn-devolucion';
                btnDevolucion.textContent = 'Solicitar Devolución';
                btnDevolucion.onclick = () => {
                    // --- CORREGIDO a item.compra_id ---
                    actualizarEstado(item.compra_id, 'devolucion_solicitada', btnDevolucion);
                };
                accionesEl.appendChild(btnDevolucion);
            } else if (item.estado === 'devolucion_solicitada') {
                // Si ya pidió devolución, mostramos un texto
                accionesEl.innerHTML = '<p>Devolución en proceso...</p>';
            }

            listaComprasEl.appendChild(div);
        });
    }

    // --- Función: Actualizar el estado de una compra ---
    async function actualizarEstado(compraId, nuevoEstado, boton) {
        // Deshabilitar el botón para evitar doble clic
        boton.disabled = true;
        boton.textContent = 'Actualizando...';

        try {
            const res = await fetch('/api/compras/actualizar-estado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    compra_id: compraId,
                    nuevo_estado: nuevoEstado
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'No se pudo actualizar');
            }

            // ¡Éxito! Volvemos a cargar todo el historial para reflejar el cambio
            cargarHistorial();

        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
            // Si falla, volvemos a habilitar el botón
            boton.disabled = false;
            if (nuevoEstado === 'recibido') {
                boton.textContent = 'Confirmar Recibido';
            } else if (nuevoEstado === 'devolucion_solicitada') {
                boton.textContent = 'Solicitar Devolución';
            }
        }
    }

    // --- Funciones de Ayuda (Utils) ---
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
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    // --- Iniciar la carga al entrar a la página ---
    cargarHistorial();
});