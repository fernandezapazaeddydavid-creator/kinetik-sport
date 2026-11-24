/* =====================================================================
   KINETIC SPORT — js/inicio.js
   Script SOLO de la portada (index.html).

   1. Lee los productos con KS.cargarProductos() (fetch a productos.json)
   2. Dibuja tres secciones SIN repetir productos entre ellas:
        - Destacados  -> productos con "destacado": true
        - Ofertas     -> productos con descuento, de mayor a menor descuento
        - Novedades   -> productos con "nuevo": true
   3. Calcula cuántos productos tiene cada categoría
   4. Mueve la cuenta regresiva de la oferta semanal
   ===================================================================== */

(function () {
  'use strict';

  const porId = function (id) { return document.getElementById(id); };

  /* ---------- Cantidad de productos por categoría ---------- */
  function pintarCantidades(productos) {
    document.querySelectorAll('[data-categoria]').forEach(function (el) {
      const cantidad = productos.filter(function (p) {
        return p.categoria === el.dataset.categoria;
      }).length;
      el.textContent = cantidad + (cantidad === 1 ? ' producto' : ' productos');
    });
  }

  /* ---------- Cuenta regresiva ----------
     Termina el próximo domingo a las 23:59:59 (hora del dispositivo).
     Cuando llega a cero, calcula el domingo siguiente: la oferta "se renueva". */
  function proximoFinDeSemana() {
    const ahora = new Date();
    const fin = new Date(ahora);
    const diasHastaDomingo = (7 - ahora.getDay()) % 7;   // domingo = 0
    fin.setDate(ahora.getDate() + diasHastaDomingo);
    fin.setHours(23, 59, 59, 0);
    if (fin <= ahora) fin.setDate(fin.getDate() + 7);
    return fin;
  }

  function iniciarCuentaRegresiva() {
    const dias = porId('cuenta-dias');
    if (!dias) return;
    const horas = porId('cuenta-horas');
    const minutos = porId('cuenta-minutos');
    const segundos = porId('cuenta-segundos');
    let fin = proximoFinDeSemana();

    const dos = function (n) { return String(n).padStart(2, '0'); };

    function actualizar() {
      let falta = fin - new Date();
      if (falta <= 0) {                  // terminó: empieza otra semana
        fin = proximoFinDeSemana();
        falta = fin - new Date();
      }
      const totalSeg = Math.floor(falta / 1000);
      dias.textContent = dos(Math.floor(totalSeg / 86400));
      horas.textContent = dos(Math.floor((totalSeg % 86400) / 3600));
      minutos.textContent = dos(Math.floor((totalSeg % 3600) / 60));
      segundos.textContent = dos(totalSeg % 60);
    }

    actualizar();
    setInterval(actualizar, 1000);       // se repite cada segundo
  }

  /* ---------- Arranque ---------- */
  async function iniciar() {
    iniciarCuentaRegresiva();

    try {
      const productos = await KS.cargarProductos();   // fetch() a data/productos.json

      pintarCantidades(productos);

      // Lista de productos que ya se mostraron: así ninguno se repite entre secciones
      const usados = new Set();

      // Toma hasta "cantidad" productos que todavía no se hayan mostrado
      function elegir(lista, cantidad) {
        const elegidos = lista
          .filter(function (p) { return !usados.has(p.id); })
          .slice(0, cantidad);
        elegidos.forEach(function (p) { usados.add(p.id); });
        return elegidos;
      }

      // 1. Destacados (primero, tienen prioridad)
      KS.pintarProductos(
        porId('destacados-grid'),
        elegir(productos.filter(function (p) { return p.destacado; }), 3)
      );

      // 2. Ofertas: de mayor a menor descuento, sin repetir los de arriba
      KS.pintarProductos(
        porId('promos-grid'),
        elegir(
          productos
            .filter(function (p) { return p.descuento > 0; })
            .sort(function (a, b) { return b.descuento - a.descuento; }),
          4
        ),
        'Por ahora no hay ofertas.'
      );

      // 3. Novedades: sin repetir los anteriores
      KS.pintarProductos(
        porId('novedades-grid'),
        elegir(productos.filter(function (p) { return p.nuevo; }), 4),
        'Pronto habrá novedades.'
      );
    } catch (error) {
      ['destacados-grid', 'promos-grid', 'novedades-grid'].forEach(function (id) {
        KS.mostrarErrorCarga(porId(id), error);
      });
    }
  }

  iniciar();
})();