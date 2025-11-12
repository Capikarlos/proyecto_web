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