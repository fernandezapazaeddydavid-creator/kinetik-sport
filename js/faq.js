/* =====================================================================
   KINETIC SPORT — js/faq.js
   Buscador de preguntas frecuentes (faq.html).

   El acordeón usa <details>/<summary> nativos: no necesita JavaScript
   para abrirse y cerrarse. Este archivo solo agrega la búsqueda:
     - Compara lo escrito con el texto de cada pregunta y su respuesta.
     - Oculta las que no coinciden y los grupos que quedan vacíos.
     - Ignora mayúsculas y tildes ("envio" encuentra "envío").
   ===================================================================== */

(function () {
  'use strict';

  const campo = document.getElementById('faq-q');
  if (!campo) return;

  const items = Array.from(document.querySelectorAll('.faq-item'));
  const grupos = Array.from(document.querySelectorAll('.faq-grupo'));
  const vacio = document.getElementById('faq-vacio');

  // Quita tildes y pasa a minúsculas para comparar sin problemas
  function normalizar(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Texto de cada pregunta preparado una sola vez
  const textos = items.map(function (item) { return normalizar(item.textContent); });

  function filtrar() {
    const busqueda = normalizar(campo.value.trim());
    let visibles = 0;

    items.forEach(function (item, i) {
      const coincide = busqueda === '' || textos[i].indexOf(busqueda) !== -1;
      item.hidden = !coincide;
      if (coincide) visibles++;
      // Al buscar, se abre la respuesta; al borrar, se cierran todas
      item.open = busqueda !== '' && coincide;
    });

    // Un grupo sin preguntas visibles se oculta completo
    grupos.forEach(function (grupo) {
      grupo.hidden = !grupo.querySelector('.faq-item:not([hidden])');
    });

    vacio.hidden = visibles > 0;
  }

  campo.addEventListener('input', filtrar);
})();