/* =====================================================================
   KINETIC SPORT — js/contacto.js
   Validación del formulario de contacto (contacto.html).

   Cómo funciona:
     - Cada campo tiene una función "validar" que devuelve un mensaje de
       error, o texto vacío ("") si el valor es correcto.
     - Se valida al SALIR de cada campo (blur) y al ENVIAR el formulario.
     - Si un campo ya tenía error, se vuelve a validar mientras se escribe,
       así el mensaje desaparece apenas se corrige.
     - Si todo está bien, se SIMULA el envío (no se manda nada a ningún
       servidor) y se muestra un mensaje de confirmación.
   ===================================================================== */

(function () {
  'use strict';

  const formulario = document.getElementById('form-contacto');
  if (!formulario) return;

  const PANEL_EXITO = document.getElementById('contacto-exito');

  /* ---------- Reglas de validación ---------- */

  // Nombre completo: solo letras y mínimo dos palabras (nombre y apellido)
  function validarNombre(valor) {
    valor = valor.trim().replace(/\s+/g, ' ');
    if (!valor) return 'Escribe tu nombre completo.';
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(valor)) return 'Usa solo letras (sin números ni símbolos).';
    const palabras = valor.split(' ').filter(function (p) { return p.length >= 2; });
    if (palabras.length < 2) return 'Escribe al menos tu nombre y un apellido.';
    return '';
  }

  // Correo: formato básico  algo@dominio.ext
  function validarCorreo(valor) {
    valor = valor.trim();
    if (!valor) return 'Escribe tu correo electrónico.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    return '';
  }

  // Celular de Bolivia: 8 dígitos que empiezan con 6 o 7.
  // Se acepta con espacios, guiones o con el prefijo +591.
  function validarCelular(valor) {
    if (!valor.trim()) return 'Escribe tu número de celular.';
    const digitos = valor.replace(/[\s\-().]/g, '').replace(/^\+?591/, '');
    if (!/^\d+$/.test(digitos)) return 'El celular solo debe tener números.';
    if (!/^[67]\d{7}$/.test(digitos)) return 'Ingresa 8 dígitos que empiecen con 6 o 7 (ej: 71234567).';
    return '';
  }

  function validarAsunto(valor) {
    valor = valor.trim();
    if (!valor) return 'Escribe el asunto de tu mensaje.';
    if (valor.length < 5) return 'El asunto debe tener al menos 5 caracteres.';
    return '';
  }

  function validarMensaje(valor) {
    valor = valor.trim();
    if (!valor) return 'Escribe tu mensaje.';
    if (valor.length < 10) return 'El mensaje debe tener al menos 10 caracteres.';
    return '';
  }

  // Cada campo: su <input> y su función de validación
  const campos = {
    nombre:  { input: document.getElementById('c-nombre'),  validar: validarNombre },
    correo:  { input: document.getElementById('c-correo'),  validar: validarCorreo },
    celular: { input: document.getElementById('c-celular'), validar: validarCelular },
    asunto:  { input: document.getElementById('c-asunto'),  validar: validarAsunto },
    mensaje: { input: document.getElementById('c-mensaje'), validar: validarMensaje }
  };

  /* ---------- Mostrar errores ---------- */

  // Escribe (o borra) el mensaje de error de un campo y marca su estado
  function mostrarEstado(nombre, mensaje) {
    const input = campos[nombre].input;
    document.getElementById('e-' + nombre).textContent = mensaje;
    input.setAttribute('aria-invalid', mensaje ? 'true' : 'false');   // lo leen los lectores de pantalla
    input.classList.toggle('valido', mensaje === '');
  }

  // Valida un campo y devuelve true si está correcto
  function validarCampo(nombre) {
    const mensaje = campos[nombre].validar(campos[nombre].input.value);
    mostrarEstado(nombre, mensaje);
    return mensaje === '';
  }

  /* ---------- Eventos de cada campo ---------- */
  Object.keys(campos).forEach(function (nombre) {
    const input = campos[nombre].input;

    // Al salir del campo, se valida
    input.addEventListener('blur', function () { validarCampo(nombre); });

    // Si ya tenía error, se revalida mientras se escribe
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') validarCampo(nombre);
    });
  });

  // Contador de caracteres del mensaje
  const contador = document.getElementById('c-contador');
  function actualizarContador() {
    contador.textContent = campos.mensaje.input.value.length + ' / ' + campos.mensaje.input.maxLength;
  }
  campos.mensaje.input.addEventListener('input', actualizarContador);

  /* ---------- Envío (simulado) ---------- */
  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();               // evita que el navegador recargue la página

    // Se validan TODOS los campos y se guarda el primero que falle
    let primerError = null;
    Object.keys(campos).forEach(function (nombre) {
      if (!validarCampo(nombre) && !primerError) primerError = campos[nombre].input;
    });

    if (primerError) {
      primerError.focus();
      KS.notificar('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    enviarSimulado();
  });

  function enviarSimulado() {
    const boton = formulario.querySelector('button[type="submit"]');
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Enviando…';

    // Se espera un momento para que parezca un envío real
    setTimeout(function () {
      const primerNombre = campos.nombre.input.value.trim().split(/\s+/)[0];
      document.getElementById('exito-nombre').textContent = primerNombre;                     // textContent: seguro
      document.getElementById('exito-correo').textContent = campos.correo.input.value.trim();

      formulario.hidden = true;
      PANEL_EXITO.hidden = false;
      PANEL_EXITO.focus();
      KS.notificar('¡Mensaje enviado correctamente!');

      boton.disabled = false;
      boton.textContent = textoOriginal;
    }, 1200);
  }

  // "Enviar otro mensaje": limpia todo y vuelve a mostrar el formulario
  document.getElementById('btn-otro').addEventListener('click', function () {
    formulario.reset();
    Object.keys(campos).forEach(function (nombre) {
      mostrarEstado(nombre, '');
      campos[nombre].input.classList.remove('valido');
      campos[nombre].input.removeAttribute('aria-invalid');
    });
    actualizarContador();
    PANEL_EXITO.hidden = true;
    formulario.hidden = false;
    campos.nombre.input.focus();
  });

  actualizarContador();
})();