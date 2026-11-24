/* =====================================================================
   KINETIC SPORT — js/carrito-pagina.js
   Página del carrito (carrito.html).

   - El carrito guardado en LocalStorage tiene solo [{id, talla, cantidad}].
   - Aquí se "une" con productos.json para mostrar foto, nombre y precio:
     KS.carrito.totales(productos) devuelve las líneas y los totales.
   - Cada cambio (cantidad, quitar, vaciar) guarda en LocalStorage y
     dispara el evento "ks:carrito", que vuelve a dibujar esta página.
   ===================================================================== */

(function () {
  'use strict';

  const lista = document.getElementById('c-lista');
  if (!lista) return;

  let productos = [];

  /* ---------- Dibujar ---------- */
  function dibujar() {
    const t = KS.carrito.totales(productos);
    const hayProductos = t.lineas.length > 0;

    document.getElementById('c-vacio').hidden = hayProductos;
    document.getElementById('c-contenido').hidden = !hayProductos;
    document.getElementById('c-envio').hidden = !hayProductos;
    if (!hayProductos) return;

    // Líneas del carrito
    lista.innerHTML = t.lineas.map(function (l) {
      const p = l.producto;
      const nombre = KS.escapar(p.nombre);
      const talla = KS.escapar(l.item.talla);
      return '' +
        '<li class="linea">' +
          '<a class="linea__foto" href="detalle.html?id=' + p.id + '">' +
            '<img src="' + KS.escapar(p.imagen) + '" alt="' + nombre + '" width="120" height="120" loading="lazy">' +
          '</a>' +
          '<div class="linea__datos">' +
            '<a class="linea__nombre" href="detalle.html?id=' + p.id + '">' + nombre + '</a>' +
            '<p class="linea__meta">' + KS.escapar(p.categoria) + ' · Talla: <b>' + talla + '</b></p>' +
            '<p class="linea__precio">' + KS.formatearBs(l.unitario) +
              (p.descuento > 0 ? ' <s class="precio__anterior">' + KS.formatearBs(p.precio) + '</s>' : '') +
            '</p>' +
          '</div>' +
          '<div class="cantidad" role="group" aria-label="Cantidad de ' + nombre + '">' +
            '<button type="button" data-cart="menos" data-id="' + p.id + '" data-talla="' + talla + '" aria-label="Quitar una unidad">−</button>' +
            '<output>' + l.item.cantidad + '</output>' +
            '<button type="button" data-cart="mas" data-id="' + p.id + '" data-talla="' + talla + '" aria-label="Agregar una unidad">+</button>' +
          '</div>' +
          '<p class="linea__subtotal">' + KS.formatearBs(l.subtotal) + '</p>' +
          '<button class="linea__quitar" type="button" data-cart="quitar" data-id="' + p.id + '" data-talla="' + talla + '" aria-label="Quitar ' + nombre + ' del carrito">' +
            KS.icono('cerrar') +
          '</button>' +
        '</li>';
    }).join('');

    // Resumen
    const costoEnvio = KS.CONFIG.COSTO_ENVIO || 20;
    const envio = t.envioGratis ? 0 : costoEnvio;

    document.getElementById('r-unidades').textContent = t.unidades;
    document.getElementById('r-subtotal').textContent = KS.formatearBs(t.subtotalLista);
    document.getElementById('r-fila-ahorro').hidden = t.ahorro <= 0;
    document.getElementById('r-ahorro').textContent = '− ' + KS.formatearBs(t.ahorro);
    document.getElementById('r-envio').textContent = t.envioGratis ? 'Gratis' : KS.formatearBs(envio);
    document.getElementById('r-total').textContent = KS.formatearBs(t.total + envio);

    // Barra de envío gratis
    const texto = document.getElementById('c-envio-texto');
    texto.innerHTML = t.envioGratis
      ? '🎉 ¡Genial! Tu compra tiene <b>envío gratis</b>.'
      : 'Te faltan <b>' + KS.formatearBs(t.falta) + '</b> para el envío gratis.';
    document.getElementById('c-envio-relleno').style.width = t.progreso + '%';
    document.getElementById('c-envio-barra').setAttribute('aria-valuenow', t.progreso);
    document.getElementById('c-envio').classList.toggle('envio--listo', t.envioGratis);
  }

  /* ---------- Clics en + / − / quitar (delegación de eventos) ---------- */
  lista.addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-cart]');
    if (!boton) return;

    const id = Number(boton.dataset.id);
    const talla = boton.dataset.talla;
    const accion = boton.dataset.cart;
    const linea = KS.carrito.obtener().find(function (i) { return i.id === id && i.talla === talla; });
    if (!linea) return;

    if (accion === 'mas') KS.carrito.cambiarCantidad(id, talla, linea.cantidad + 1);
    if (accion === 'menos') KS.carrito.cambiarCantidad(id, talla, linea.cantidad - 1);
    if (accion === 'quitar') {
      KS.carrito.quitar(id, talla);
      KS.notificar('Producto quitado del carrito', 'info');
    }
  });

  // Vaciar todo (con confirmación)
  document.getElementById('c-vaciar').addEventListener('click', function () {
    if (confirm('¿Quieres vaciar todo el carrito?')) {
      KS.carrito.vaciar();
      KS.notificar('Carrito vaciado', 'info');
    }
  });

  // Cada vez que el carrito cambia (aquí u otra pestaña) se redibuja
  document.addEventListener('ks:carrito', dibujar);
  window.addEventListener('storage', function (e) {
    if (e.key === KS.CLAVES.carrito) dibujar();
  });

  /* ---------- Arranque ---------- */
  KS.cargarProductos()
    .then(function (datos) { productos = datos; dibujar(); })
    .catch(function (error) { KS.mostrarErrorCarga(lista, error); document.getElementById('c-contenido').hidden = false; });
})();