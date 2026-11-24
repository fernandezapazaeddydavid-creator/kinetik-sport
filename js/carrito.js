/* =====================================================================
   KINETIC SPORT — js/carrito.js
   Lógica del carrito de compras.

   - El carrito se guarda en LocalStorage (clave "ks_carrito") como lista:
       [ { id: 5, talla: "42", cantidad: 1 }, ... ]
   - Se valida contra el stock de productos.json (nunca se puede agregar
     más unidades de las que hay).
   - Escucha los botones [data-accion="agregar"] de TODAS las páginas.
   - Si el producto tiene varias tallas, abre una ventana para elegirla.
   - El contador del encabezado (#contador-carrito) se actualiza solo.

   La página carrito.html (que dibuja la lista y los totales) se agrega
   en una etapa posterior y usa las funciones de KS.carrito.

   Se carga DESPUÉS de app.js y favoritos.js.
   ===================================================================== */

(function () {
  'use strict';

  const CLAVE = KS.CLAVES.carrito;

  /* ---------- Lectura y escritura ---------- */

  // Devuelve el carrito limpio (descarta datos inválidos del LocalStorage)
  function obtener() {
    const datos = KS.leerLS(CLAVE, []);
    if (!Array.isArray(datos)) return [];
    return datos
      .filter(function (i) {
        return i && Number.isInteger(i.id) && Number.isInteger(i.cantidad) && i.cantidad > 0;
      })
      .map(function (i) {
        return { id: i.id, talla: String(i.talla || 'Única'), cantidad: i.cantidad };
      });
  }

  function guardar(items) {
    KS.guardarLS(CLAVE, items);
    actualizarContador(true);
    document.dispatchEvent(new CustomEvent('ks:carrito'));
  }

  // Total de unidades en el carrito (suma de todas las cantidades)
  function unidades() {
    return obtener().reduce(function (total, i) { return total + i.cantidad; }, 0);
  }

  // Unidades de UN producto (sumando todas sus tallas)
  function unidadesDe(id) {
    return obtener()
      .filter(function (i) { return i.id === id; })
      .reduce(function (total, i) { return total + i.cantidad; }, 0);
  }

  /* ---------- Acciones ---------- */

  // Agrega un producto. Devuelve true si se pudo agregar.
  async function agregar(id, talla, cantidad) {
    id = Number(id);
    cantidad = cantidad || 1;
    talla = talla || 'Única';

    try {
      const producto = await KS.buscarProducto(id);
      if (!producto) {
        KS.notificar('Ese producto ya no está disponible', 'error');
        return false;
      }
      if (producto.stock <= 0) {
        KS.notificar('«' + producto.nombre + '» está agotado', 'error');
        return false;
      }

      // No se puede superar el stock (contando lo que ya hay en el carrito)
      const yaTiene = unidadesDe(id);
      if (yaTiene + cantidad > producto.stock) {
        KS.notificar(
          'Solo hay ' + producto.stock + ' unidades de «' + producto.nombre + '»' +
          (yaTiene ? ' (ya tienes ' + yaTiene + ' en el carrito)' : ''),
          'error'
        );
        return false;
      }

      const items = obtener();
      const linea = items.find(function (i) { return i.id === id && i.talla === talla; });
      if (linea) {
        linea.cantidad += cantidad;            // mismo producto y talla: suma
      } else {
        items.push({ id: id, talla: talla, cantidad: cantidad });
      }
      guardar(items);
      KS.notificar('«' + producto.nombre + '» se agregó al carrito');
      return true;
    } catch (error) {
      console.error('[KINETIC SPORT]', error);
      KS.notificar('No se pudo agregar el producto. Abre el sitio con Live Server.', 'error');
      return false;
    }
  }

  function quitar(id, talla) {
    guardar(obtener().filter(function (i) { return !(i.id === id && i.talla === talla); }));
  }

  function vaciar() {
    guardar([]);
  }

  // Cambia la cantidad de una línea (respetando el stock). Con 0 o menos, la quita.
  async function cambiarCantidad(id, talla, nueva) {
    nueva = Math.floor(Number(nueva));
    if (!(nueva > 0)) { quitar(id, talla); return; }

    const producto = await KS.buscarProducto(id);
    if (!producto) { quitar(id, talla); return; }

    const items = obtener();
    const linea = items.find(function (i) { return i.id === id && i.talla === talla; });
    if (!linea) return;

    // Unidades del mismo producto en otras tallas
    const enOtras = items
      .filter(function (i) { return i.id === id && i !== linea; })
      .reduce(function (t, i) { return t + i.cantidad; }, 0);
    const maximo = producto.stock - enOtras;

    if (nueva > maximo) {
      nueva = maximo;
      KS.notificar('Solo hay ' + producto.stock + ' unidades disponibles', 'error');
    }
    if (nueva <= 0) { quitar(id, talla); return; }

    linea.cantidad = nueva;
    guardar(items);
  }

  /* ---------- Totales ---------- */

  function redondear(n) { return Math.round(n * 100) / 100; }

  // Calcula todo lo que necesita la página del carrito.
  // "productos" es la lista cargada desde productos.json.
  function totales(productos) {
    let subtotalLista = 0;   // lo que costaría sin descuentos
    let total = 0;           // lo que realmente se paga
    let cantidadTotal = 0;
    const lineas = [];

    obtener().forEach(function (item) {
      const producto = productos.find(function (p) { return p.id === item.id; });
      if (!producto) return;                       // producto eliminado del JSON
      const unitario = KS.precioFinal(producto);
      const subtotal = unitario * item.cantidad;
      lineas.push({ item: item, producto: producto, unitario: unitario, subtotal: redondear(subtotal) });
      subtotalLista += producto.precio * item.cantidad;
      total += subtotal;
      cantidadTotal += item.cantidad;
    });

    total = redondear(total);
    const minimo = KS.CONFIG.ENVIO_GRATIS_MIN;
    return {
      lineas: lineas,
      unidades: cantidadTotal,
      subtotalLista: redondear(subtotalLista),
      ahorro: redondear(subtotalLista - total),
      total: total,
      envioGratis: total >= minimo,
      falta: redondear(Math.max(0, minimo - total)),            // cuánto falta para envío gratis
      progreso: Math.min(100, Math.round((total / minimo) * 100)) // % para la barra
    };
  }

  /* ---------- Contador del encabezado ---------- */

  function actualizarContador(animar) {
    const contador = document.getElementById('contador-carrito');
    if (!contador) return;
    const antes = Number(contador.textContent) || 0;
    const ahora = unidades();
    contador.textContent = ahora;
    contador.hidden = ahora === 0;
    if (animar && ahora > antes) {                 // pequeño "rebote" al sumar
      contador.classList.remove('rebote');
      void contador.offsetWidth;                   // reinicia la animación
      contador.classList.add('rebote');
    }
  }

  /* ---------- Ventana para elegir talla ---------- */

  function abrirSelectorTalla(producto) {
    let dialogo = document.getElementById('dialogo-talla');
    if (!dialogo) {
      dialogo = document.createElement('dialog');   // <dialog>: ventana nativa del navegador
      dialogo.id = 'dialogo-talla';
      dialogo.className = 'modal';
      dialogo.setAttribute('aria-labelledby', 'talla-titulo');
      document.body.appendChild(dialogo);
    }

    const chips = producto.tallas.map(function (t) {
      return '<label class="chip-talla"><input type="radio" name="talla" value="' + KS.escapar(t) + '">' +
             '<span>' + KS.escapar(t) + '</span></label>';
    }).join('');

    dialogo.innerHTML =
      '<div class="modal__caja">' +
        '<button class="btn-icono modal__cerrar" type="button" data-cerrar aria-label="Cerrar">' + KS.icono('cerrar') + '</button>' +
        '<h3 class="modal__titulo" id="talla-titulo">Elige tu talla</h3>' +
        '<p class="modal__texto">' + KS.escapar(producto.nombre) + '</p>' +
        '<div class="tallas" role="radiogroup" aria-label="Tallas disponibles">' + chips + '</div>' +
        '<p class="modal__error" role="alert"></p>' +
        '<div class="modal__acciones">' +
          '<button class="btn btn--secundario" type="button" data-cerrar>Cancelar</button>' +
          '<button class="btn btn--primario" type="button" data-confirmar>Agregar al carrito</button>' +
        '</div>' +
      '</div>';

    dialogo.onclick = function (e) {
      // Clic en el fondo oscuro (el propio <dialog>) o en un botón de cerrar
      if (e.target === dialogo || e.target.closest('[data-cerrar]')) {
        dialogo.close();
        return;
      }
      if (e.target.closest('[data-confirmar]')) {
        const elegida = dialogo.querySelector('input[name="talla"]:checked');
        if (!elegida) {
          // El aviso va DENTRO de la ventana, porque una ventana modal tapa las notificaciones
          dialogo.querySelector('.modal__error').textContent = 'Elige una talla para continuar.';
          return;
        }
        const talla = elegida.value;
        dialogo.close();
        agregar(producto.id, talla, 1);
      }
    };

    dialogo.showModal();
  }

  /* ---------- Botones "Agregar" de cualquier página ---------- */

  document.addEventListener('click', async function (evento) {
    const boton = evento.target.closest('[data-accion="agregar"]');
    if (!boton) return;
    evento.preventDefault();

    try {
      const producto = await KS.buscarProducto(boton.dataset.id);
      if (!producto) {
        KS.notificar('Ese producto ya no está disponible', 'error');
        return;
      }
      if (producto.tallas.length > 1) {
        abrirSelectorTalla(producto);               // hay que elegir talla
      } else {
        agregar(producto.id, producto.tallas[0], 1); // talla única
      }
    } catch (error) {
      console.error('[KINETIC SPORT]', error);
      KS.notificar('No se pudo agregar el producto. Abre el sitio con Live Server.', 'error');
    }
  });

  // Sincronización entre pestañas
  window.addEventListener('storage', function (e) {
    if (e.key === CLAVE) {
      actualizarContador(false);
      document.dispatchEvent(new CustomEvent('ks:carrito'));
    }
  });

  // Se publica para que otros archivos lo usen: KS.carrito.agregar(...)
  KS.carrito = {
    obtener: obtener,
    unidades: unidades,
    unidadesDe: unidadesDe,
    agregar: agregar,
    quitar: quitar,
    vaciar: vaciar,
    cambiarCantidad: cambiarCantidad,
    totales: totales,
    abrirSelectorTalla: abrirSelectorTalla
  };

  actualizarContador(false);
})();