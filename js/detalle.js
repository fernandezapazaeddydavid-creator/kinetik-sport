/* =====================================================================
   KINETIC SPORT — js/detalle.js
   Página de detalle de producto (detalle.html?id=NUMERO).

   Flujo:
     1. Se lee el id de la URL con URLSearchParams.
     2. Se busca el producto en el JSON (KS.buscarProducto).
     3. Se dibuja la ficha (foto, precio, stock, tallas, cantidad).
     4. "Agregar al carrito" usa KS.carrito.agregar(id, talla, cantidad).
     5. Se muestran hasta 4 productos relacionados (misma categoría).
   ===================================================================== */

(function () {
  'use strict';

  const contenedor = document.getElementById('d-producto');
  if (!contenedor) return;

  let producto = null;       // producto que se está mostrando
  let tallaElegida = null;   // talla seleccionada
  let cantidad = 1;          // cantidad seleccionada

  /* ---------- Guías de tallas (orientativas) ---------- */
  const GUIAS = {
    ropa: {
      titulo: 'Ropa deportiva',
      cabeceras: ['Talla', 'Pecho (cm)', 'Cintura (cm)'],
      filas: [
        ['S', '88 – 94', '73 – 79'],
        ['M', '94 – 102', '79 – 87'],
        ['L', '102 – 110', '87 – 95'],
        ['XL', '110 – 118', '95 – 103']
      ]
    },
    calzado: {
      titulo: 'Calzado',
      cabeceras: ['Talla (EU)', 'Largo del pie (cm)'],
      filas: [
        ['38', '24.0'], ['39', '24.7'], ['40', '25.3'], ['41', '26.0'],
        ['42', '26.7'], ['43', '27.3'], ['44', '28.0']
      ]
    }
  };

  /* ---------- Arranque ---------- */
  async function iniciar() {
    const id = Number(new URLSearchParams(location.search).get('id'));
    try {
      const todos = await KS.cargarProductos();
      producto = todos.find(function (p) { return p.id === id; });

      if (!producto) {
        contenedor.innerHTML =
          '<div class="estado-vacio"><strong>No encontramos este producto.</strong>' +
          '<p><a class="enlace-flecha" href="productos.html">Volver al catálogo</a></p></div>';
        return;
      }

      document.title = producto.nombre + ' | KINETIC SPORT';
      tallaElegida = producto.tallas.length === 1 ? producto.tallas[0] : null;
      dibujar();
      pintarRelacionados(todos);
    } catch (error) {
      KS.mostrarErrorCarga(contenedor, error);
    }
  }

  /* ---------- Dibujar la ficha ---------- */
  function dibujar() {
    const p = producto;
    const final = KS.precioFinal(p);
    const estado = KS.estadoStock(p);
    const agotado = estado === 'agotado';
    const nombre = KS.escapar(p.nombre);
    const esFavorito = KS.favoritos.es(p.id);

    // Ruta de navegación (migas de pan)
    document.getElementById('d-ruta').innerHTML =
      '<a href="index.html">Inicio</a> / <a href="productos.html">Productos</a> / ' +
      '<a href="productos.html?categoria=' + encodeURIComponent(p.categoria) + '">' + KS.escapar(p.categoria) + '</a> / ' + nombre;

    // Etiquetas sobre la foto
    let etiquetas = '';
    if (agotado) etiquetas += '<span class="etiqueta etiqueta--agotado">Agotado</span>';
    if (p.descuento > 0) etiquetas += '<span class="etiqueta etiqueta--oferta">Oferta -' + p.descuento + '%</span>';
    if (p.nuevo) etiquetas += '<span class="etiqueta etiqueta--nuevo">Nuevo</span>';

    // Precio
    let precio = '<span class="precio__actual detalle__precio">' + KS.formatearBs(final) + '</span>';
    if (p.descuento > 0) {
      precio += '<s class="precio__anterior">' + KS.formatearBs(p.precio) + '</s>' +
                '<span class="detalle__ahorro">Ahorras ' + KS.formatearBs(p.precio - final) + '</span>';
    }

    const textosStock = {
      agotado: 'Sin stock',
      bajo: '¡Últimas ' + p.stock + ' unidades!',
      disponible: 'Disponible · ' + p.stock + ' en stock'
    };

    // Bloque de tallas (si el producto tiene más de una)
    let bloqueTallas = '';
    if (p.tallas.length > 1) {
      const guia = GUIAS[p.tipoTalla];
      bloqueTallas =
        '<fieldset class="tallas">' +
          '<legend>Talla' + (guia ? ' <button class="enlace-boton" type="button" id="d-abrir-guia">Guía de tallas</button>' : '') + '</legend>' +
          '<div class="tallas__lista">' +
          p.tallas.map(function (t) {
            return '<label class="talla"><input type="radio" name="talla" value="' + KS.escapar(t) + '"' + (agotado ? ' disabled' : '') + '>' +
                   '<span>' + KS.escapar(t) + '</span></label>';
          }).join('') +
          '</div>' +
          '<p class="campo__error" id="d-error-talla" role="alert"></p>' +
        '</fieldset>';
    } else {
      bloqueTallas = '<p class="detalle__dato"><b>Talla:</b> ' + KS.escapar(p.tallas[0] || 'Única') + '</p>';
    }

    // Características (lista)
    const caracteristicas = (p.caracteristicas || []).map(function (c) {
      return '<li>' + KS.escapar(c) + '</li>';
    }).join('');

    contenedor.innerHTML =
      '<div class="detalle">' +
        '<div class="detalle__foto">' +
          '<img src="' + KS.escapar(p.imagen) + '" alt="' + nombre + '" width="800" height="800">' +
          '<div class="tarjeta__etiquetas">' + etiquetas + '</div>' +
        '</div>' +

        '<div class="detalle__info">' +
          '<span class="tarjeta__categoria">' + KS.escapar(p.categoria) + '</span>' +
          '<h1 class="detalle__nombre">' + nombre + '</h1>' +
          '<p class="precio">' + precio + '</p>' +
          '<p class="stock stock--' + estado + '"><span class="stock__punto" aria-hidden="true"></span>' + textosStock[estado] + '</p>' +
          '<p class="detalle__descripcion">' + KS.escapar(p.descripcion) + '</p>' +

          bloqueTallas +

          '<div class="detalle__compra">' +
            '<div class="cantidad" role="group" aria-label="Cantidad">' +
              '<button type="button" id="d-menos" aria-label="Quitar una unidad">−</button>' +
              '<output id="d-cantidad" aria-live="polite">1</output>' +
              '<button type="button" id="d-mas" aria-label="Agregar una unidad">+</button>' +
            '</div>' +
            (agotado
              ? '<button class="btn btn--primario" type="button" disabled>Agotado</button>'
              : '<button class="btn btn--primario" type="button" id="d-agregar">' + KS.icono('carrito') + ' Agregar al carrito</button>') +
            '<button class="detalle__fav' + (esFavorito ? ' activo' : '') + '" type="button" data-accion="favorito" ' +
              'data-id="' + p.id + '" data-nombre="' + nombre + '" aria-pressed="' + esFavorito + '" aria-label="Favorito: ' + nombre + '">' +
              KS.icono('corazon') +
            '</button>' +
          '</div>' +
          '<p class="detalle__en-carrito" id="d-en-carrito" hidden></p>' +

          '<ul class="detalle__beneficios">' +
            '<li>' + KS.icono('camion') + ' Envío gratis desde ' + KS.formatearBs(KS.CONFIG.ENVIO_GRATIS_MIN) + '</li>' +
            '<li>' + KS.icono('devolver') + ' Cambios dentro de 7 días</li>' +
            '<li>' + KS.icono('escudo') + ' Compra segura</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +

      '<section class="detalle-ficha" aria-label="Ficha técnica">' +
        '<div>' +
          '<h2>Características</h2>' +
          '<ul class="valor__lista">' + caracteristicas + '</ul>' +
        '</div>' +
        '<div>' +
          '<h2>Ficha técnica</h2>' +
          '<dl class="ficha">' +
            '<div><dt>Categoría</dt><dd>' + KS.escapar(p.categoria) + '</dd></div>' +
            '<div><dt>Género</dt><dd>' + KS.escapar(p.genero) + '</dd></div>' +
            '<div><dt>Nivel</dt><dd>' + KS.escapar(p.nivel) + '</dd></div>' +
            '<div><dt>Material</dt><dd>' + KS.escapar(p.material) + '</dd></div>' +
            '<div><dt>Código</dt><dd>KS-' + String(p.id).padStart(3, '0') + '</dd></div>' +
          '</dl>' +
        '</div>' +
      '</section>';

    activarControles();
    actualizarCantidad();
    actualizarEnCarrito();
  }

  /* ---------- Controles: talla, cantidad, agregar ---------- */
  function activarControles() {
    // Talla
    contenedor.querySelectorAll('input[name="talla"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        tallaElegida = radio.value;
        document.getElementById('d-error-talla').textContent = '';
      });
    });

    // Guía de tallas
    const botonGuia = document.getElementById('d-abrir-guia');
    if (botonGuia) botonGuia.addEventListener('click', abrirGuia);

    // Cantidad
    document.getElementById('d-menos').addEventListener('click', function () { cambiarCantidad(-1); });
    document.getElementById('d-mas').addEventListener('click', function () { cambiarCantidad(1); });

    // Agregar al carrito
    const botonAgregar = document.getElementById('d-agregar');
    if (botonAgregar) botonAgregar.addEventListener('click', agregarAlCarrito);
  }

  // Máximo que aún se puede agregar (stock menos lo que ya hay en el carrito)
  function maximo() {
    return Math.max(producto.stock - KS.carrito.unidadesDe(producto.id), 0);
  }

  function cambiarCantidad(delta) {
    const nueva = cantidad + delta;
    if (nueva < 1) return;
    if (nueva > maximo()) {
      KS.notificar('No hay más unidades disponibles de este producto', 'info');
      return;
    }
    cantidad = nueva;
    actualizarCantidad();
  }

  function actualizarCantidad() {
    if (cantidad > Math.max(maximo(), 1)) cantidad = Math.max(maximo(), 1);
    document.getElementById('d-cantidad').textContent = cantidad;
  }

  async function agregarAlCarrito() {
    if (!tallaElegida) {
      document.getElementById('d-error-talla').textContent = 'Elige una talla antes de agregar.';
      return;
    }
    const ok = await KS.carrito.agregar(producto.id, tallaElegida, cantidad);
    if (ok) {
      cantidad = 1;
      actualizarCantidad();
      actualizarEnCarrito();
    }
  }

  // Aviso "Ya tienes N en el carrito"
  function actualizarEnCarrito() {
    const aviso = document.getElementById('d-en-carrito');
    if (!aviso) return;
    const n = KS.carrito.unidadesDe(producto.id);
    aviso.hidden = n === 0;
    aviso.innerHTML = 'Ya tienes <b>' + n + '</b> en tu carrito · <a class="enlace-flecha" href="carrito.html">Ver carrito</a>';
  }

  /* ---------- Guía de tallas ---------- */
  function abrirGuia() {
    const guia = GUIAS[producto.tipoTalla];
    if (!guia) return;
    document.getElementById('guia-titulo').textContent = 'Guía de tallas · ' + guia.titulo;
    document.getElementById('guia-cuerpo').innerHTML =
      '<div class="tabla-scroll"><table class="tabla"><thead><tr>' +
      guia.cabeceras.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      guia.filas.map(function (f) {
        return '<tr>' + f.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<p class="tabla-caja__sub">Medidas orientativas. Si estás entre dos tallas, elige la mayor.</p>';
    document.getElementById('guia-tallas').showModal();
  }

  const dialogo = document.getElementById('guia-tallas');
  document.getElementById('guia-cerrar').addEventListener('click', function () { dialogo.close(); });
  // Clic en el fondo oscuro (fuera de la ventana) también cierra
  dialogo.addEventListener('click', function (e) { if (e.target === dialogo) dialogo.close(); });

  /* ---------- Productos relacionados ---------- */
  function pintarRelacionados(todos) {
    const relacionados = todos
      .filter(function (p) { return p.categoria === producto.categoria && p.id !== producto.id; })
      .sort(function (a, b) { return (KS.estadoStock(a) === 'agotado') - (KS.estadoStock(b) === 'agotado'); })
      .slice(0, 4);
    if (!relacionados.length) return;
    KS.pintarProductos(document.getElementById('d-grid-relacionados'), relacionados);
    document.getElementById('d-relacionados').hidden = false;
  }

  // Si el carrito cambia (aquí u otra pestaña), se actualizan avisos y máximo
  document.addEventListener('ks:carrito', function () {
    if (!producto) return;
    actualizarCantidad();
    actualizarEnCarrito();
  });

  iniciar();
})();