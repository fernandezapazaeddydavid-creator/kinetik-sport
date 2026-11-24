/* =====================================================================
   KINETIC SPORT — js/productos.js
   Script SOLO del catálogo (productos.html).

   Cómo funciona (idea general):
     1. Se carga productos.json con KS.cargarProductos() (fetch).
     2. Hay un objeto "estado" que guarda lo que el usuario eligió
        (texto de búsqueda, categoría, precios, orden, etc.).
     3. Cada vez que algo cambia:  estado -> filtrar() -> ordenar() -> pintar.
     4. Los filtros se pueden COMBINAR: un producto se muestra solo si
        cumple TODAS las condiciones a la vez.
     5. El estado importante (q, categoria, favoritos) también se guarda en
        la dirección (?q=zapatillas&categoria=Running), así los enlaces de
        la portada, del buscador y de los favoritos funcionan.
   ===================================================================== */

(function () {
  'use strict';

  const porId = function (id) { return document.getElementById(id); };

  // Valores iniciales (también sirven para "Limpiar filtros")
  const POR_DEFECTO = {
    q: '',
    categoria: 'Todos',
    min: '',
    max: '',
    disponibilidad: 'todos',
    genero: 'todos',
    nivel: 'todos',
    orden: 'relevancia',
    favoritos: false
  };

  const estado = Object.assign({}, POR_DEFECTO);
  let productos = [];

  /* ---------- Utilidades ---------- */

  // Quita mayúsculas y tildes para que "futbol" encuentre "Fútbol"
  function normalizar(texto) {
    return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /* ---------- 1. FILTRAR ----------
     Devuelve solo los productos que cumplen todas las condiciones. */
  function filtrar(lista) {
    const texto = normalizar(estado.q.trim());

    // Rango de precios (sobre el precio FINAL, ya con descuento).
    // Si el usuario escribe el mínimo mayor que el máximo, se intercambian.
    let desde = estado.min === '' ? 0 : Number(estado.min);
    let hasta = estado.max === '' ? Infinity : Number(estado.max);
    if (desde > hasta) { const t = desde; desde = hasta; hasta = t; }

    return lista.filter(function (p) {
      const precio = KS.precioFinal(p);

      // Búsqueda por nombre (también mira la categoría)
      if (texto && normalizar(p.nombre + ' ' + p.categoria).indexOf(texto) === -1) return false;

      // Categoría
      if (estado.categoria !== 'Todos' && p.categoria !== estado.categoria) return false;

      // Rango de precio
      if (precio < desde || precio > hasta) return false;

      // Disponibilidad
      if (estado.disponibilidad === 'disponibles' && p.stock <= 0) return false;
      if (estado.disponibilidad === 'agotados' && p.stock > 0) return false;

      // Género: "Hombre" o "Mujer" también muestran los productos "Unisex"
      if (estado.genero !== 'todos' && p.genero !== estado.genero && p.genero !== 'Unisex') return false;

      // Nivel
      if (estado.nivel !== 'todos' && p.nivel !== estado.nivel) return false;

      // Solo favoritos
      if (estado.favoritos && !KS.favoritos.es(p.id)) return false;

      return true;
    });
  }

  /* ---------- 2. ORDENAR ---------- */
  function ordenar(lista) {
    const copia = lista.slice();   // copia: no se modifica la lista original
    if (estado.orden === 'precio-asc') {
      copia.sort(function (a, b) { return KS.precioFinal(a) - KS.precioFinal(b); });
    } else if (estado.orden === 'precio-desc') {
      copia.sort(function (a, b) { return KS.precioFinal(b) - KS.precioFinal(a); });
    } else {
      // "Relevancia": se mantiene el orden del JSON, pero los agotados van al final
      copia.sort(function (a, b) { return (a.stock <= 0) - (b.stock <= 0); });
    }
    return copia;
  }

  /* ---------- 3. PINTAR ---------- */

  function pintarResultados(lista) {
    const grilla = porId('catalogo-grid');
    const texto = porId('resultados-texto');

    if (!lista.length) {
      texto.textContent = 'Sin resultados';
      grilla.innerHTML =
        '<div class="estado-vacio">' +
          '<strong>No encontramos productos con esos filtros.</strong>' +
          '<p>Prueba con otra búsqueda o quita algunos filtros.</p>' +
          '<button class="btn btn--primario btn--sm" type="button" data-accion="limpiar">Limpiar filtros</button>' +
        '</div>';
      return;
    }

    texto.textContent = 'Mostrando ' + lista.length + ' de ' + productos.length + ' productos';
    grilla.innerHTML = lista.map(KS.crearTarjeta).join('');
  }

  // Marca el chip activo y escribe cuántos productos tiene cada categoría
  function pintarChips() {
    document.querySelectorAll('.chip').forEach(function (chip) {
      const categoria = chip.dataset.categoria;
      const cantidad = categoria === 'Todos'
        ? productos.length
        : productos.filter(function (p) { return p.categoria === categoria; }).length;
      chip.querySelector('.chip__n').textContent = cantidad;

      const activo = categoria === estado.categoria;
      chip.classList.toggle('activo', activo);
      chip.setAttribute('aria-pressed', String(activo));
    });
  }

  // Cuántos filtros del panel están activos (se muestra en el título "Filtros")
  function contarFiltrosActivos() {
    let n = 0;
    if (estado.min !== '') n++;
    if (estado.max !== '') n++;
    if (estado.disponibilidad !== 'todos') n++;
    if (estado.genero !== 'todos') n++;
    if (estado.nivel !== 'todos') n++;
    if (estado.favoritos) n++;
    return n;
  }

  function pintarContadorFiltros() {
    const insignia = porId('filtros-activos');
    const n = contarFiltrosActivos();
    insignia.textContent = n;
    insignia.hidden = n === 0;
  }

  /* ---------- Dirección (URL) ---------- */

  // Lee ?q=...&categoria=...&favoritos=1 al entrar a la página
  function leerURL() {
    const params = new URLSearchParams(location.search);
    estado.q = (params.get('q') || '').trim();

    const categoria = params.get('categoria');
    const validas = Array.prototype.map.call(
      document.querySelectorAll('.chip'),
      function (chip) { return chip.dataset.categoria; }
    );
    if (categoria && validas.indexOf(categoria) !== -1) estado.categoria = categoria;

    estado.favoritos = params.get('favoritos') === '1';
  }

  // Actualiza la dirección sin recargar la página
  function escribirURL() {
    const params = new URLSearchParams();
    if (estado.q) params.set('q', estado.q);
    if (estado.categoria !== 'Todos') params.set('categoria', estado.categoria);
    if (estado.favoritos) params.set('favoritos', '1');
    const url = location.pathname + (params.toString() ? '?' + params.toString() : '');
    try { history.replaceState(null, '', url); } catch (error) { /* sin servidor: se ignora */ }
  }

  /* ---------- Controles ---------- */

  // Copia el estado a los campos del formulario (por ejemplo, tras "Limpiar")
  function sincronizarControles() {
    porId('f-busqueda').value = estado.q;
    porId('f-orden').value = estado.orden;
    porId('f-min').value = estado.min;
    porId('f-max').value = estado.max;
    porId('f-disponibilidad').value = estado.disponibilidad;
    porId('f-genero').value = estado.genero;
    porId('f-nivel').value = estado.nivel;
    porId('f-favoritos').checked = estado.favoritos;
  }

  // Función principal: se llama cada vez que algo cambia
  function actualizar() {
    pintarChips();
    pintarResultados(ordenar(filtrar(productos)));
    pintarContadorFiltros();
    escribirURL();
  }

  function limpiar() {
    Object.assign(estado, POR_DEFECTO);
    sincronizarControles();
    actualizar();
  }

  function conectarEventos() {
    porId('f-busqueda').addEventListener('input', function (e) { estado.q = e.target.value; actualizar(); });
    porId('f-orden').addEventListener('change', function (e) { estado.orden = e.target.value; actualizar(); });
    porId('f-favoritos').addEventListener('change', function (e) { estado.favoritos = e.target.checked; actualizar(); });

    // Campos del panel de filtros: id -> [propiedad del estado, evento]
    const campos = {
      'f-min': ['min', 'input'],
      'f-max': ['max', 'input'],
      'f-disponibilidad': ['disponibilidad', 'change'],
      'f-genero': ['genero', 'change'],
      'f-nivel': ['nivel', 'change']
    };
    Object.keys(campos).forEach(function (id) {
      const clave = campos[id][0];
      const evento = campos[id][1];
      porId(id).addEventListener(evento, function (e) { estado[clave] = e.target.value; actualizar(); });
    });

    // Chips de categoría (un solo escuchador para todos)
    porId('chips').addEventListener('click', function (e) {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      estado.categoria = chip.dataset.categoria;
      actualizar();
    });

    // Botones "Limpiar filtros" (el de arriba y el del mensaje de "sin resultados")
    porId('btn-limpiar').addEventListener('click', limpiar);
    porId('catalogo-grid').addEventListener('click', function (e) {
      if (e.target.closest('[data-accion="limpiar"]')) limpiar();
    });

    // Si se quita un favorito mientras se ven solo favoritos, la lista se actualiza
    document.addEventListener('ks:favoritos', function () {
      if (estado.favoritos) actualizar();
    });
  }

  /* ---------- Arranque ---------- */
  async function iniciar() {
    leerURL();
    conectarEventos();

    try {
      productos = await KS.cargarProductos();   // fetch() a data/productos.json

      // Los textos de ejemplo de los campos de precio salen de los datos
      const precios = productos.map(KS.precioFinal);
      porId('f-min').placeholder = 'Desde ' + Math.floor(Math.min.apply(null, precios));
      porId('f-max').placeholder = 'Hasta ' + Math.ceil(Math.max.apply(null, precios));

      sincronizarControles();

      // El panel de filtros se abre solo en pantallas grandes o si hay filtros activos
      if (window.matchMedia('(min-width: 900px)').matches || contarFiltrosActivos() > 0) {
        porId('filtros').open = true;
      }

      actualizar();
    } catch (error) {
      porId('resultados-texto').textContent = 'No se pudo cargar el catálogo';
      KS.mostrarErrorCarga(porId('catalogo-grid'), error);
    }
  }

  iniciar();
})();