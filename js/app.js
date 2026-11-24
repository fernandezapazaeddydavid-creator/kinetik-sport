/* =====================================================================
   KINETIC SPORT — js/app.js
   Código COMÚN a todas las páginas. Se carga primero en cada HTML.

   Qué contiene:
     1. Configuración y claves de LocalStorage
     2. Funciones de ayuda (guardar/leer, formato de precios, etc.)
     3. fetch(): lectura de data/productos.json (una sola vez)
     4. Tema claro/oscuro
     5. Menú móvil, menú activo y buscador del encabezado
     6. Notificaciones (toasts)
     7. Tarjeta de producto (la usan la portada y el catálogo)

   Todo se guarda dentro del objeto global "KS" (KINETIC SPORT) para que los
   demás archivos (carrito.js, favoritos.js, productos.js...) puedan usarlo:
       KS.cargarProductos(), KS.notificar(), KS.crearTarjeta(), etc.
   ===================================================================== */

(function () {
  'use strict';

  const KS = (window.KS = window.KS || {});

  /* -------------------------------------------------------------------
     1. CONFIGURACIÓN
     Aquí se cambian los valores "de negocio" en un solo lugar.
     ------------------------------------------------------------------- */
  KS.CONFIG = {
    ENVIO_GRATIS_MIN: 300,                 // Bs a partir de los cuales el envío es gratis
    UMBRAL_BAJO_STOCK: 5,                  // 1 a 5 unidades = "bajo stock"
    RUTA_PRODUCTOS: 'data/productos.json',
    IMG_RESPALDO: 'img/placeholder.svg'    // se muestra si una foto no existe
  };

  // Nombres de las claves que usamos en LocalStorage
  KS.CLAVES = {
    tema: 'ks_tema',
    carrito: 'ks_carrito',
    favoritos: 'ks_favoritos',
    comparador: 'ks_comparador'
  };

  /* -------------------------------------------------------------------
     2. FUNCIONES DE AYUDA
     ------------------------------------------------------------------- */

  // Lee un valor de LocalStorage (convertido de texto JSON a objeto).
  // Si no existe o hay un error, devuelve "porDefecto".
  KS.leerLS = function (clave, porDefecto) {
    try {
      const texto = localStorage.getItem(clave);
      return texto === null ? porDefecto : JSON.parse(texto);
    } catch (error) {
      return porDefecto;
    }
  };

  // Guarda un valor en LocalStorage (convertido a texto JSON).
  KS.guardarLS = function (clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (error) {
      return false; // por ejemplo: modo privado o almacenamiento lleno
    }
  };

  // Formatea un número como precio en bolivianos: 408 -> "Bs 408"
  KS.formatearBs = function (numero) {
    const n = Number(numero) || 0;
    return 'Bs ' + n.toLocaleString('es-BO', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  // Precio final de un producto, ya con el descuento aplicado
  KS.precioFinal = function (producto) {
    const descuento = producto.descuento || 0;
    return Math.round(producto.precio * (1 - descuento / 100) * 100) / 100;
  };

  // Estado del stock: 'agotado' | 'bajo' | 'disponible'
  KS.estadoStock = function (producto) {
    if (producto.stock <= 0) return 'agotado';
    if (producto.stock <= KS.CONFIG.UMBRAL_BAJO_STOCK) return 'bajo';
    return 'disponible';
  };

  // Evita que un texto se interprete como HTML (seguridad básica)
  KS.escapar = function (texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Devuelve el HTML de un ícono del archivo img/iconos.svg
  KS.icono = function (nombre, clase) {
    return '<svg class="' + (clase || 'icono') + '" aria-hidden="true" focusable="false">' +
           '<use href="img/iconos.svg#' + nombre + '"/></svg>';
  };

  // Si una imagen no se encuentra, se reemplaza por img/placeholder.svg.
  // El evento "error" no "sube" por el DOM, por eso se escucha en la fase de captura (true).
  document.addEventListener('error', function (evento) {
    const img = evento.target;
    if (img && img.tagName === 'IMG' && !img.dataset.respaldo) {
      img.dataset.respaldo = '1';          // evita un bucle infinito
      img.src = KS.CONFIG.IMG_RESPALDO;
    }
  }, true);

  /* -------------------------------------------------------------------
     3. LECTURA DE productos.json CON fetch()
     La promesa se guarda en KS._promesa: aunque 5 scripts pidan los
     productos, el archivo se descarga UNA sola vez.
     ------------------------------------------------------------------- */
  KS.cargarProductos = function () {
    if (!KS._promesa) {
      KS._promesa = fetch(KS.CONFIG.RUTA_PRODUCTOS)
        .then(function (respuesta) {
          if (!respuesta.ok) {
            throw new Error('No se pudo leer productos.json (HTTP ' + respuesta.status + ')');
          }
          return respuesta.json();
        })
        .then(function (datos) {
          if (!Array.isArray(datos)) {
            throw new Error('productos.json no tiene el formato esperado (debe ser una lista)');
          }
          return datos;
        })
        .catch(function (error) {
          KS._promesa = null; // permite reintentar
          throw error;
        });
    }
    return KS._promesa;
  };

  // Busca un producto por su id
  KS.buscarProducto = async function (id) {
    const productos = await KS.cargarProductos();
    return productos.find(function (p) { return p.id === Number(id); });
  };

  // Muestra un mensaje amable dentro de un contenedor si falla la carga
  KS.mostrarErrorCarga = function (contenedor, error) {
    console.error('[KINETIC SPORT]', error);
    if (!contenedor) return;
    contenedor.innerHTML =
      '<div class="estado-vacio">' +
        '<strong>No pudimos cargar los productos.</strong>' +
        '<p>Si abriste la página con doble clic, ábrela con <b>Live Server</b> ' +
        '(clic derecho en <code>index.html</code> → <em>Open with Live Server</em>).</p>' +
      '</div>';
  };

  /* -------------------------------------------------------------------
     4. TEMA CLARO / OSCURO
     El tema elegido se guarda en LocalStorage y se aplica como
     <html data-tema="claro|oscuro">. El CSS cambia las variables de color.
     (Un pequeño script en el <head> de cada HTML lo aplica antes de pintar
     la página, para evitar un parpadeo.)
     ------------------------------------------------------------------- */
  function temaPorDefecto() {
    return document.body.classList.contains('pagina-oscura') ? 'oscuro' : 'claro';
  }

  KS.temaActual = function () {
    return document.documentElement.dataset.tema || temaPorDefecto();
  };

  function actualizarBotonTema() {
    const boton = document.getElementById('btn-tema');
    if (!boton) return;
    const esOscuro = KS.temaActual() === 'oscuro';
    // En modo oscuro se muestra el sol (para pasar a claro) y viceversa
    const uso = boton.querySelector('use');
    if (uso) uso.setAttribute('href', 'img/iconos.svg#' + (esOscuro ? 'sol' : 'luna'));
    boton.setAttribute('aria-label', esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    boton.setAttribute('title', esOscuro ? 'Modo claro' : 'Modo oscuro');
  }

  KS.aplicarTema = function (tema) {
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem(KS.CLAVES.tema, tema); } catch (error) { /* sin almacenamiento */ }
    actualizarBotonTema();
    document.dispatchEvent(new CustomEvent('ks:tema', { detail: tema }));
  };

  function iniciarTema() {
    const boton = document.getElementById('btn-tema');
    if (!boton) return;
    boton.addEventListener('click', function () {
      KS.aplicarTema(KS.temaActual() === 'oscuro' ? 'claro' : 'oscuro');
    });
    actualizarBotonTema();
    // Si el tema cambia en otra pestaña, esta pestaña lo copia
    window.addEventListener('storage', function (e) {
      if (e.key === KS.CLAVES.tema && (e.newValue === 'claro' || e.newValue === 'oscuro')) {
        document.documentElement.dataset.tema = e.newValue;
        actualizarBotonTema();
      }
    });
  }

  /* -------------------------------------------------------------------
     5. MENÚ MÓVIL, MENÚ ACTIVO Y BUSCADOR DEL ENCABEZADO
     ------------------------------------------------------------------- */
  function iniciarMenu() {
    const boton = document.getElementById('btn-menu');
    const menu = document.getElementById('menu');
    if (!boton || !menu) return;

    function cambiar(abrir) {
      menu.classList.toggle('abierto', abrir);
      boton.setAttribute('aria-expanded', String(abrir));
      boton.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
      const uso = boton.querySelector('use');
      if (uso) uso.setAttribute('href', 'img/iconos.svg#' + (abrir ? 'cerrar' : 'menu'));
    }

    boton.addEventListener('click', function () {
      cambiar(!menu.classList.contains('abierto'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) cambiar(false);   // al elegir una opción, se cierra
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cambiar(false);
    });
  }

  // Marca con la clase "activo" el enlace de la página actual
  function marcarMenuActivo() {
    const actual = location.pathname.split('/').pop() || 'index.html';
    // Páginas "hijas" que resaltan a su página "madre"
    const grupos = { 'detalle.html': 'productos.html' };
    const objetivo = grupos[actual] || actual;
    document.querySelectorAll('#menu a').forEach(function (enlace) {
      if (enlace.getAttribute('href') === objetivo) {
        enlace.classList.add('activo');
        enlace.setAttribute('aria-current', 'page');
      }
    });
  }

  // Al enviar el buscador del encabezado, se va al catálogo con la búsqueda.
  // (buscador.js agrega después las sugerencias mientras se escribe.)
  function iniciarBuscadorEncabezado() {
    const formulario = document.getElementById('form-buscador');
    if (!formulario) return;
    formulario.addEventListener('submit', function (e) {
      e.preventDefault();
      const q = formulario.querySelector('input').value.trim();
      location.href = 'productos.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }

  /* -------------------------------------------------------------------
     6. NOTIFICACIONES (TOASTS)
     Uso:  KS.notificar('Producto agregado', 'exito');
     Tipos: 'exito' (por defecto) · 'error' · 'info'
     ------------------------------------------------------------------- */
  KS.notificar = function (texto, tipo, duracion) {
    tipo = tipo || 'exito';
    duracion = duracion || 3200;

    let contenedor = document.getElementById('notificaciones');
    if (!contenedor) {                              // si la página no lo trae, se crea
      contenedor = document.createElement('div');
      contenedor.id = 'notificaciones';
      contenedor.className = 'notificaciones';
      contenedor.setAttribute('aria-live', 'polite');
      document.body.appendChild(contenedor);
    }

    const iconos = { exito: 'check', error: 'alerta', info: 'info' };
    const aviso = document.createElement('div');
    aviso.className = 'toast toast--' + tipo;
    aviso.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    aviso.innerHTML = KS.icono(iconos[tipo] || 'info') + '<span></span>';
    aviso.querySelector('span').textContent = texto;   // textContent: seguro
    contenedor.appendChild(aviso);

    // Máximo 4 avisos a la vez
    while (contenedor.children.length > 4) contenedor.firstElementChild.remove();

    setTimeout(function () { aviso.classList.add('saliendo'); }, duracion);
    setTimeout(function () { aviso.remove(); }, duracion + 500);
  };

  /* -------------------------------------------------------------------
     7. TARJETA DE PRODUCTO
     Genera el HTML de una tarjeta a partir de un producto del JSON.
     Las etiquetas, el precio y el stock SALEN DE LOS DATOS:
       - "Agotado"  -> stock = 0
       - "Oferta"   -> descuento > 0
       - "Nuevo"    -> nuevo = true
     Los botones usan data-accion: carrito.js y favoritos.js escuchan los clics.
     ------------------------------------------------------------------- */
  KS.crearTarjeta = function (p) {
    const final = KS.precioFinal(p);
    const estado = KS.estadoStock(p);
    const esFavorito = !!(KS.favoritos && KS.favoritos.es(p.id));
    const nombre = KS.escapar(p.nombre);

    // Etiquetas
    let etiquetas = '';
    if (estado === 'agotado') etiquetas += '<span class="etiqueta etiqueta--agotado">Agotado</span>';
    if (p.descuento > 0) etiquetas += '<span class="etiqueta etiqueta--oferta">Oferta -' + p.descuento + '%</span>';
    if (p.nuevo) etiquetas += '<span class="etiqueta etiqueta--nuevo">Nuevo</span>';

    // Precio (con el precio anterior tachado si hay descuento)
    let precio = '<span class="precio__actual">' + KS.formatearBs(final) + '</span>';
    if (p.descuento > 0) precio += '<s class="precio__anterior">' + KS.formatearBs(p.precio) + '</s>';

    // Texto del indicador de stock
    const textosStock = {
      agotado: 'Sin stock',
      bajo: '¡Últimas ' + p.stock + ' unidades!',
      disponible: 'Disponible · ' + p.stock + ' en stock'
    };

    // Botón de agregar (deshabilitado si está agotado)
    const botonAgregar = estado === 'agotado'
      ? '<button class="btn btn--primario btn--sm" type="button" disabled>Agotado</button>'
      : '<button class="btn btn--primario btn--sm" type="button" data-accion="agregar" data-id="' + p.id + '">' +
          KS.icono('carrito') + ' Agregar</button>';

    return '' +
      '<article class="tarjeta' + (estado === 'agotado' ? ' tarjeta--agotada' : '') + '" data-id="' + p.id + '">' +
        '<div class="tarjeta__media">' +
          '<div class="tarjeta__imagen">' +
            '<a href="detalle.html?id=' + p.id + '" tabindex="-1" aria-hidden="true">' +
              '<img src="' + KS.escapar(p.imagen) + '" alt="" loading="lazy" width="400" height="400">' +
            '</a>' +
            '<div class="tarjeta__etiquetas">' + etiquetas + '</div>' +
            '<button class="tarjeta__fav' + (esFavorito ? ' activo' : '') + '" type="button" ' +
              'data-accion="favorito" data-id="' + p.id + '" data-nombre="' + nombre + '" ' +
              'aria-pressed="' + esFavorito + '" aria-label="Favorito: ' + nombre + '">' +
              KS.icono('corazon') +
            '</button>' +
          '</div>' +
          '<div class="tarjeta__acciones">' +
            '<a class="btn btn--secundario btn--sm" href="detalle.html?id=' + p.id + '">Ver detalles</a>' +
            botonAgregar +
          '</div>' +
        '</div>' +
        '<div class="tarjeta__cuerpo">' +
          '<span class="tarjeta__categoria">' + KS.escapar(p.categoria) + '</span>' +
          '<h3 class="tarjeta__nombre"><a href="detalle.html?id=' + p.id + '">' + nombre + '</a></h3>' +
          '<p class="tarjeta__descripcion">' + KS.escapar(p.descripcion) + '</p>' +
          '<p class="precio">' + precio + '</p>' +
          '<p class="stock stock--' + estado + '"><span class="stock__punto" aria-hidden="true"></span>' + textosStock[estado] + '</p>' +
        '</div>' +
      '</article>';
  };

  // Pinta una lista de productos dentro de un contenedor
  KS.pintarProductos = function (contenedor, lista, mensajeVacio) {
    if (!contenedor) return;
    if (!lista.length) {
      contenedor.innerHTML = '<p class="estado-vacio">' + (mensajeVacio || 'No hay productos para mostrar.') + '</p>';
      return;
    }
    contenedor.innerHTML = lista.map(KS.crearTarjeta).join('');
  };

  /* -------------------------------------------------------------------
     ARRANQUE: se ejecuta cuando el HTML ya está listo
     ------------------------------------------------------------------- */
  iniciarTema();
  iniciarMenu();
  marcarMenuActivo();
  iniciarBuscadorEncabezado();

  // Textos que dependen de la configuración (así se cambian en un solo lugar)
  document.querySelectorAll('[data-envio-min]').forEach(function (el) {
    el.textContent = KS.formatearBs(KS.CONFIG.ENVIO_GRATIS_MIN);
  });
  document.querySelectorAll('[data-anio]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();