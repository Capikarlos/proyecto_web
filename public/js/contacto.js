// --- REFERENCIAS --- //
const formularioContacto = document.getElementById("formulario-contacto");
const campoCorreo = document.getElementById("correo");
const campoComentario = document.getElementById("comentario");
const mensajeConfirmacion = document.getElementById("mensaje-confirmacion");

// --- FUNCIÓN DE VALIDACIÓN --- //
function validarFormulario(correo, comentario) {
  const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return patronCorreo.test(correo) && comentario.trim().length >= 5;
}

// --- EVENTO ENVIAR --- //
formularioContacto.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const correo = campoCorreo.value;
  const comentario = campoComentario.value;

  if (!validarFormulario(correo, comentario)) {
    mensajeConfirmacion.textContent = "⚠️ Verifica tu correo o escribe un comentario más largo.";
    mensajeConfirmacion.classList.remove("mensaje-oculto");
    mensajeConfirmacion.style.color = "red";
    return;
  }

  // Simulación de envío (luego conectamos con backend)
  mensajeConfirmacion.textContent = "✅ Tu mensaje ha sido enviado correctamente.";
  mensajeConfirmacion.classList.remove("mensaje-oculto");
  mensajeConfirmacion.style.color = "green";

  // Reiniciar formulario después de 2 segundos
  setTimeout(() => {
    formularioContacto.reset();
    mensajeConfirmacion.classList.add("mensaje-oculto");
  }, 2000);
});
