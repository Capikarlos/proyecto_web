// productos.js
document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("lista-productos");
    const btnCarrito = document.getElementById("btn-carrito");
    const contadorCarrito = document.getElementById("contador-carrito");

    // Cargar carrito desde localStorage
    const cargarCarritoLocal = () =>
        JSON.parse(localStorage.getItem("carrito") || "[]");
    const guardarCarritoLocal = (c) =>
        localStorage.setItem("carrito", JSON.stringify(c));

    // Actualizar badge carrito
    function actualizarBadge() {
        const carrito = cargarCarritoLocal();
        const totalItems = carrito.reduce((s, it) => s + it.cantidad, 0);
        contadorCarrito.textContent = totalItems;
    }

    // control de stock
    function agregarAlCarrito(producto) {
        const carrito = cargarCarritoLocal();
        const idx = carrito.findIndex((i) => i.id === producto.id);

        if (idx >= 0) {
            // ya existe -> verificar stock antes de aumentar
            if (carrito[idx].cantidad >= Number(producto.stock)) {
                alert(`⚠️ Solo hay ${producto.stock} unidades disponibles de "${producto.nombre}".`);
                return;
            }
            carrito[idx].cantidad += 1;
        } else {
            // nuevo producto al carrito
            carrito.push({
                id: producto.id,
                nombre: producto.nombre,
                precio: Number(producto.precio),
                img: producto.img || '',
                cantidad: 1,
                stock: Number(producto.stock) || 0, //guardamos el stock real
                categoria: producto.categoria || ''
            });
        }

        guardarCarritoLocal(carrito);
        actualizarBadge();
        renderizarTarjetas(productosGlobal);
    }

    // Reducir cantidad (si llega a 0, eliminar del carrito)
    function reducirEnCarrito(productoId) {
        let carrito = cargarCarritoLocal();
        const idx = carrito.findIndex((i) => i.id === productoId);
        if (idx >= 0) {
            carrito[idx].cantidad -= 1;
            if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1);
            guardarCarritoLocal(carrito);
            actualizarBadge();
            renderizarTarjetas(productosGlobal);
        }
    }

    // Eliminar totalmente
    function eliminarDelCarrito(productoId) {
        let carrito = cargarCarritoLocal();
        carrito = carrito.filter((i) => i.id !== productoId);
        guardarCarritoLocal(carrito);
        actualizarBadge();
        renderizarTarjetas(productosGlobal);
    }

    // Obtener cantidad en carrito
    function cantidadEnCarrito(productoId) {
        const carrito = cargarCarritoLocal();
        const item = carrito.find((i) => i.id === productoId);
        return item ? item.cantidad : 0;
    }

    // Productos cargados
    let productosGlobal = [];

    // Cargar productos desde API
    async function cargarProductos() {
        try {
            const resp = await fetch("/api/productos");
            if (!resp.ok) throw new Error("No se pudieron cargar productos");
            productosGlobal = await resp.json();
            renderizarTarjetas(productosGlobal);
            actualizarBadge();
        } catch (err) {
            console.error(err);
            contenedor.innerHTML = "<p>Error cargando productos.</p>";
        }
    }

    // Render de tarjetas
    function renderizarTarjetas(productos) {
        contenedor.innerHTML = "";
        if (!productos.length) {
            contenedor.innerHTML = "<p>No hay productos.</p>";
            return;
        }

        productos.forEach((prod) => {
            const tarjeta = document.createElement("article");
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

            const controles = tarjeta.querySelector(".controls");
            const cantidadActual = cantidadEnCarrito(prod.id);

            if (cantidadActual === 0) {
                const btn = document.createElement("button");
                btn.className = "btn-agregar";
                btn.textContent = "Agregar";
                btn.addEventListener("click", () => agregarAlCarrito(prod));
                controles.appendChild(btn);
            } else {
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

                cont.appendChild(btnBasura);
                cont.appendChild(btnMenos);
                cont.appendChild(spanCantidad);
                cont.appendChild(btnMas);
                controles.appendChild(cont);
            }
        });
    }

    // util: escapar html
    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    // util: formatear precio
    function formatearPrecio(n) {
        return Number(n).toLocaleString("es-MX", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    }

    // click en carrito -> ir a cart.html
    btnCarrito.addEventListener("click", () => {
        window.location.href = "cart.html";
    });

    cargarProductos();
});
