// --- VARIABLES GLOBALES --- //
const botonOferta = document.getElementById("btn-oferta");
const ventanaOferta = document.getElementById("ventana-oferta");
const cerrarVentana = document.getElementById("cerrar-ventana");
const enlaceUsuario = document.getElementById("usuario-link");
const elementosMenu = document.querySelectorAll(".menu li");

// --- MENÚ DESPLEGABLE --- //
elementosMenu.forEach(elemento => {
    elemento.addEventListener("mouseenter", () => {
        elemento.classList.add("activo");
    });
    elemento.addEventListener("mouseleave", () => {
        elemento.classList.remove("activo");
    });
});


// --- SESIÓN DEL USUARIO --- //
// Aquí simulamos que el usuario está logueado
// (más adelante lo haremos real con backend y sesiones)
const usuarioGuardado = sessionStorage.getItem("usuario");
if (usuarioGuardado) {
    enlaceUsuario.textContent = `${usuarioGuardado}`;
    enlaceUsuario.href = "#";
} else {
    enlaceUsuario.textContent = "Acceder";
    enlaceUsuario.href = "login.html";
}


/* pop up*/
// Mostrar ventana modal automáticamente al cargar la página
let cookies = localStorage.getItem('cookies') === 'true';
if (!cookies) {
document.addEventListener("DOMContentLoaded", () => {
    const ventana = document.getElementById("ventana-oferta");
    const botonCerrar = document.getElementById("cerrar-ventana");

    // Mostrar automáticamente al cargar la página
    setTimeout(() => {
        ventana.classList.remove("ventana-oculta");
        ventana.classList.add("ventana-visible");
    }, 1000); // 1 segundo después de cargar

    // Cerrar si hace clic fuera del contenido
    ventana.addEventListener("click", (e) => {
        if (e.target === ventana) {
            ventana.classList.remove("ventana-visible");
            ventana.classList.add("ventana-oculta");
        }
    });

    // Cerrar cuando se haga clic en el botón
    botonCerrar.addEventListener("click", () => {
        ventana.classList.remove("ventana-visible");
        ventana.classList.add("ventana-oculta");
        localStorage.setItem('cookies', 'true');
    });
});
}

