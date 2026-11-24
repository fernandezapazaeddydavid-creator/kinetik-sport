/* =====================================================================
   KINETIC SPORT — js/compra.js
   Compra simulada (compra.html).

   1. Dibuja el resumen del pedido con KS.carrito.totales().
   2. Valida los datos del comprador (igual que el formulario de contacto).
   3. Al confirmar: guarda una "foto" del pedido, vacía el carrito y
      muestra la confirmación con un número de pedido.
   No se envía nada a ningún servidor ni se piden datos de tarjeta.
   ===================================================================== */

(function () {
  'use strict';

  const formulario = document.getElementById('form-compra');
  if (!formulario) return;

  let productos = [];
  let confirmado = false;   // evita que el carrito vacío reemplace la confirmación

  /* ---------- Validaciones ---------- */
  function validarNombre(v) {
    v = v.trim().replace(/\s+/g, ' ');
    if (!v) return 'Escribe tu nombre completo.';
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(v)) return 'Usa solo letras (sin números ni símbolos).';
    if (v.split(' ').filter(function (p) { return p.length >= 2; }).length < 2) return 'Escribe al menos tu nombre y un apellido.';
    return '';
  }
  function validarCorreo(v) {
    v = v.trim();
    if (!v) return 'Escribe tu correo electrónico.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    return '';
  }
  function validarCelular(v) {
    if (!v.trim()) return 'Escribe tu número de celular.';
    const d = v.replace(/[\s\-().]/g, '').replace(/^\+?591/, '');
    if (!/^\d+$/.test(d)) return 'El celular solo debe tener números.';
    if (!/^[67]\d{7}$/.test(d)) return 'Ingresa 8 dígitos que empiecen con 6 o 7 (ej: 71234567).';
    return '';
  }
  function validarDepartamento(v) { return v ? '' : 'Selecciona tu departamento.'; }
  function validarDireccion(v) {
    v = v.trim();
    if (!v) return 'Escribe tu dirección de entrega.';
    if (v.length < 8) return 'La dirección debe tener al menos 8 caracteres.';
    return '';
  }

  const campos = {
    nombre:       { input: document.getElementById('k-nombre'),       validar: validarNombre },
    correo:       { input: document.getElementById('k-correo'),       validar: validarCorreo },
    celular:      { input: document.getElementById('k-celular'),      validar: validarCelular },
    departamento: { input: document.getElementById('k-departamento'), validar: validarDepartamento },
    direccion:    { input: document.getElementById('k-direccion'),    validar: validarDireccion }
  };

  function validarCampo(nombre) {
    const mensaje = campos[nombre].validar(campos[nombre].input.value);
    const input = campos[nombre].input;
    document.getElementById('e-' + nombre).textContent = mensaje;
    input.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
    input.classList.toggle('valido', mensaje === '');
    return mensaje === '';
  }

  Object.keys(campos).forEach(function (nombre) {
    const input = campos[nombre].input;
    input.addEventListener('blur', function () { validarCampo(nombre); });
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') validarCampo(nombre);
    });
    input.addEventListener('change', function () { validarCampo(nombre); });
  });

  /* ---------- Resumen del pedido ---------- */

  // Lista corta de productos (foto, nombre, talla, cantidad y subtotal)
  function htmlLineas(t) {
    return t.lineas.map(function (l) {
      return '<li class="mini__linea">' +
        '<img src="' + KS.escapar(l.producto.imagen) + '" alt="" width="52" height="52">' +
        '<div><b>' + KS.escapar(l.producto.nombre) + '</b>' +
        '<small>Talla ' + KS.escapar(l.item.talla) + ' · x' + l.item.cantidad + '</small></div>' +
        '<span>' + KS.formatearBs(l.subtotal) + '</span></li>';
    }).join('');
  }

  function costoEnvio(t) { return t.envioGratis ? 0 : (KS.CONFIG.COSTO_ENVIO || 20); }

  function dibujar() {
    if (confirmado) return;
    const t = KS.carrito.totales(productos);
    const hay = t.lineas.length > 0;
    document.getElementById('k-vacio').hidden = hay;
    document.getElementById('k-contenido').hidden = !hay;
    if (!hay) return;

    const envio = costoEnvio(t);
    document.getElementById('k-lineas').innerHTML = htmlLineas(t);
    document.getElementById('k-unidades').textContent = t.unidades;
    document.getElementById('k-subtotal').textContent = KS.formatearBs(t.subtotalLista);
    document.getElementById('k-fila-ahorro').hidden = t.ahorro <= 0;
    document.getElementById('k-ahorro').textContent = '− ' + KS.formatearBs(t.ahorro);
    document.getElementById('k-envio').textContent = t.envioGratis ? 'Gratis' : KS.formatearBs(envio);
    document.getElementById('k-total').textContent = KS.formatearBs(t.total + envio);
  }

  /* ---------- Confirmar pedido ---------- */
  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();

    let primerError = null;
    Object.keys(campos).forEach(function (nombre) {
      if (!validarCampo(nombre) && !primerError) primerError = campos[nombre].input;
    });
    if (primerError) {
      primerError.focus();
      KS.notificar('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    const t = KS.carrito.totales(productos);
    if (!t.lineas.length) { dibujar(); return; }

    const boton = document.getElementById('k-confirmar');
    boton.disabled = true;
    boton.textContent = 'Procesando…';

    // Pequeña espera para simular el procesamiento
    setTimeout(function () { finalizar(t); }, 1200);
  });

  function finalizar(t) {
    const envio = costoEnvio(t);
    const pago = formulario.querySelector('input[name="pago"]:checked').value;
    const codigo = 'KS-' + new Date().getFullYear() + '-' + Date.now().toString(36).toUpperCase().slice(-6);

    // Se rellena la confirmación ANTES de vaciar el carrito
    document.getElementById('conf-nombre').textContent = campos.nombre.input.value.trim().split(/\s+/)[0];
    document.getElementById('conf-correo').textContent = campos.correo.input.value.trim();
    document.getElementById('conf-codigo').textContent = codigo;
    document.getElementById('conf-lineas').innerHTML = htmlLineas(t);
    document.getElementById('conf-destino').textContent = campos.direccion.input.value.trim() + ', ' + campos.departamento.input.value;
    document.getElementById('conf-pago').textContent = pago;
    document.getElementById('conf-envio').textContent = t.envioGratis ? 'Gratis' : KS.formatearBs(envio);
    document.getElementById('conf-total').textContent = KS.formatearBs(t.total + envio);

    confirmado = true;
    KS.carrito.vaciar();                       // el carrito queda en cero
    document.getElementById('k-contenido').hidden = true;
    document.getElementById('k-vacio').hidden = true;
    const panel = document.getElementById('k-confirmacion');
    panel.hidden = false;
    panel.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    KS.notificar('¡Pedido confirmado!');
  }

  /* ---------- Arranque ---------- */
  document.addEventListener('ks:carrito', dibujar);
  KS.cargarProductos()
    .then(function (datos) { productos = datos; dibujar(); })
    .catch(function (error) { KS.mostrarErrorCarga(document.getElementById('k-lineas'), error); document.getElementById('k-contenido').hidden = false; });
})();