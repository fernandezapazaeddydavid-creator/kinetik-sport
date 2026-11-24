/* =====================================================================
   KINETIC SPORT — js/favoritos.js
   Lista de favoritos (el corazón de las tarjetas).

   - Se guarda en LocalStorage como una lista de ids: [3, 11, 15]
   - Funciona en todas las páginas porque usa "delegación de eventos":
     un solo escuchador en el documento atiende TODOS los corazones,
     incluso los de tarjetas creadas después por JavaScript.
   - El contador del encabezado (#contador-favoritos) se actualiza solo.
   - Para VER los favoritos, el corazón del encabezado lleva a
     productos.html?favoritos=1 (el catálogo filtra solo tus favoritos).

   Se carga DESPUÉS de app.js.
   ===================================================================== */

(function () {
  'use strict';

  const CLAVE = KS.CLAVES.favoritos;

  // Lee la lista y se asegura de que solo tenga números (por si el
  // LocalStorage fue modificado a mano).
  function listar() {
    const datos = KS.leerLS(CLAVE, []);
    return Array.isArray(datos) ? datos.filter(function (id) { return Number.isInteger(id); }) : [];
  }

  function guardar(lista) {
    KS.guardarLS(CLAVE, lista);
    actualizarContador();
    // Avisa al resto de scripts (por ejemplo, al catálogo) que algo cambió
    document.dispatchEvent(new CustomEvent('ks:favoritos'));
  }

  function es(id) {
    return listar().indexOf(Number(id)) !== -1;
  }

  // Agrega el id si no está; lo quita si ya estaba. Devuelve true si quedó como favorito.
  function alternar(id) {
    id = Number(id);
    const lista = listar();
    const posicion = lista.indexOf(id);
    if (posicion === -1) {
      lista.push(id);
    } else {
      lista.splice(posicion, 1);
    }
    guardar(lista);
    return posicion === -1;
  }

  // Muestra la cantidad de favoritos en el globito del encabezado
  function actualizarContador() {
    const contador = document.getElementById('contador-favoritos');
    if (!contador) return;
    const cantidad = listar().length;
    contador.textContent = cantidad;
    contador.hidden = cantidad === 0;
  }

  // Pinta todos los corazones de la página según el estado actual
  function sincronizarCorazones() {
    const lista = listar();
    document.querySelectorAll('[data-accion="favorito"]').forEach(function (boton) {
      const activo = lista.indexOf(Number(boton.dataset.id)) !== -1;
      boton.classList.toggle('activo', activo);
      boton.setAttribute('aria-pressed', String(activo));
    });
  }

  // Un solo escuchador para todos los corazones de cualquier página
  document.addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-accion="favorito"]');
    if (!boton) return;
    evento.preventDefault();

    const quedoActivo = alternar(boton.dataset.id);
    sincronizarCorazones();
    const nombre = boton.dataset.nombre || 'Producto';
    KS.notificar(
      quedoActivo ? '«' + nombre + '» se agregó a favoritos' : '«' + nombre + '» se quitó de favoritos',
      quedoActivo ? 'exito' : 'info'
    );
  });

  // Sincronización entre pestañas: si cambia en otra pestaña, esta se actualiza
  window.addEventListener('storage', function (e) {
    if (e.key === CLAVE) {
      actualizarContador();
      sincronizarCorazones();
      document.dispatchEvent(new CustomEvent('ks:favoritos'));
    }
  });

  // Se publica para que otros archivos lo usen: KS.favoritos.es(3)
  KS.favoritos = {
    listar: listar,
    es: es,
    alternar: alternar,
    contar: function () { return listar().length; },
    sincronizar: sincronizarCorazones
  };

  actualizarContador();
})();