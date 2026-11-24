/* =====================================================================
   KINETIC SPORT — js/dashboard.js
   Dashboard de inventario (dashboard.html).

   Todo se CALCULA a partir de data/productos.json (leído con fetch):
     1. calcular(productos)  → devuelve un objeto con todos los números
     2. pintarIndicadores()  → escribe los 6 indicadores
     3. pintarGraficos()     → dibuja barras y círculo con Chart.js
                               (si Chart.js no está, usa Canvas nativo)
     4. pintarTabla()        → lista los productos con bajo stock
   Ningún número está escrito a mano en el HTML.
   ===================================================================== */

(function () {
  'use strict';

  if (!document.getElementById('kpi-total')) return;

  let datos = [];            // productos leídos del JSON
  let graficoBarras = null;  // instancias de Chart.js (para poder destruirlas)
  let graficoCirculo = null;

  /* ---------- 1. CÁLCULOS ---------- */
  function calcular(productos) {
    const resultado = {
      total: productos.length,
      porCategoria: {},      // { 'Fútbol': 4, ... }
      valor: 0,
      disponibles: 0,
      bajo: 0,
      agotados: 0,
      listaBajo: []
    };

    productos.forEach(function (p) {
      // Productos por categoría
      resultado.porCategoria[p.categoria] = (resultado.porCategoria[p.categoria] || 0) + 1;

      // Valor del inventario = precio de venta actual × unidades en stock
      resultado.valor += KS.precioFinal(p) * p.stock;

      // Estado según el stock (misma regla que usa todo el sitio)
      const estado = KS.estadoStock(p);
      if (estado === 'disponible') resultado.disponibles++;
      if (estado === 'bajo') { resultado.bajo++; resultado.listaBajo.push(p); }
      if (estado === 'agotado') { resultado.agotados++; resultado.listaBajo.push(p); }
    });

    // Los agotados primero, luego del menor al mayor stock
    resultado.listaBajo.sort(function (a, b) { return a.stock - b.stock || a.nombre.localeCompare(b.nombre); });
    resultado.categorias = Object.keys(resultado.porCategoria).length;
    return resultado;
  }

  /* ---------- 2. INDICADORES ---------- */
  function poner(id, texto) { document.getElementById(id).textContent = texto; }

  function pintarIndicadores(r) {
    poner('kpi-total', r.total);
    poner('kpi-categorias', r.categorias);
    poner('kpi-valor', KS.formatearBs(r.valor));
    poner('kpi-disponibles', r.disponibles);
    poner('kpi-bajo', r.bajo);
    poner('kpi-agotados', r.agotados);
  }

  /* ---------- 3. GRÁFICOS ---------- */

  // Colores según el tema (los gráficos no heredan el CSS automáticamente)
  function colores() {
    const oscuro = document.body.classList.contains('pagina-oscura') ||
                   document.documentElement.dataset.tema === 'oscuro';
    const claro = document.documentElement.dataset.tema === 'claro';
    const modoOscuro = claro ? false : oscuro;
    return {
      texto: modoOscuro ? '#C9CEC4' : '#3A3F3A',
      rejilla: modoOscuro ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      borde: modoOscuro ? '#161916' : '#FFFFFF'
    };
  }

  function pintarGraficos(r) {
    // Si Chart.js no cargó, se usan los gráficos de respaldo (Canvas nativo)
    if (typeof Chart === 'undefined') { pintarSinLibreria(r); return; }

    const c = colores();
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = c.texto;

    // Si ya existían (al actualizar o cambiar de tema), se destruyen antes de dibujar de nuevo
    if (graficoBarras) graficoBarras.destroy();
    if (graficoCirculo) graficoCirculo.destroy();

    // --- Barras: productos por categoría ---
    const nombres = Object.keys(r.porCategoria);
    graficoBarras = new Chart(document.getElementById('grafico-categorias'), {
      type: 'bar',
      data: {
        labels: nombres,
        datasets: [{
          label: 'Productos',
          data: nombres.map(function (n) { return r.porCategoria[n]; }),
          backgroundColor: '#C6FF00',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: c.texto } },
          y: { beginAtZero: true, ticks: { precision: 0, color: c.texto }, grid: { color: c.rejilla } }
        }
      }
    });

    // --- Círculo: distribución del stock ---
    graficoCirculo = new Chart(document.getElementById('grafico-stock'), {
      type: 'doughnut',
      data: {
        labels: ['Disponibles', 'Bajo stock', 'Agotados'],
        datasets: [{
          data: [r.disponibles, r.bajo, r.agotados],
          backgroundColor: ['#C6FF00', '#FFB020', '#E5384F'],
          borderColor: c.borde,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { color: c.texto, padding: 16 } } }
      }
    });
  }

  /* ---------- Gráficos de respaldo (Canvas nativo) ----------
     Si Chart.js no está disponible, los gráficos se dibujan con la API
     <canvas> del navegador. Así el dashboard nunca queda sin gráficos. */

  // Ajusta el canvas al tamaño de su caja (y a pantallas de alta resolución)
  function prepararCanvas(canvas) {
    const caja = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = caja.clientWidth;
    const h = caja.clientHeight;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  // Gráfico de barras: productos por categoría
  function dibujarBarras(canvas, etiquetas, valores, c) {
    const p = prepararCanvas(canvas);
    const ctx = p.ctx;
    const izq = 34, der = 10, arriba = 22, abajo = 32;
    const ancho = p.w - izq - der;
    const alto = p.h - arriba - abajo;
    const maximo = Math.max.apply(null, valores.concat([1]));
    const paso = Math.ceil(maximo / 5);              // separación entre líneas
    const tope = Math.ceil(maximo / paso) * paso;    // valor más alto del eje

    ctx.font = '12px Inter, system-ui, sans-serif';

    // Líneas horizontales y números del eje vertical
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= tope; v += paso) {
      const y = arriba + alto - (v / tope) * alto;
      ctx.strokeStyle = c.rejilla;
      ctx.beginPath();
      ctx.moveTo(izq, y);
      ctx.lineTo(izq + ancho, y);
      ctx.stroke();
      ctx.fillStyle = c.texto;
      ctx.fillText(v, izq - 8, y);
    }

    // Una barra por categoría
    const espacio = ancho / etiquetas.length;
    const anchoBarra = espacio * 0.55;
    etiquetas.forEach(function (nombre, i) {
      const x = izq + espacio * i + (espacio - anchoBarra) / 2;
      const alturaBarra = (valores[i] / tope) * alto;
      const y = arriba + alto - alturaBarra;

      ctx.fillStyle = '#C6FF00';
      ctx.fillRect(x, y, anchoBarra, alturaBarra);

      ctx.fillStyle = c.texto;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(valores[i], x + anchoBarra / 2, y - 4);         // valor sobre la barra
      ctx.textBaseline = 'top';
      ctx.fillText(nombre, x + anchoBarra / 2, arriba + alto + 8); // nombre debajo
    });
  }

  // Gráfico circular (dona): distribución del stock
  function dibujarCirculo(canvas, partes, c) {
    const p = prepararCanvas(canvas);
    const ctx = p.ctx;
    const total = partes.reduce(function (suma, x) { return suma + x.valor; }, 0);
    const alturaLeyenda = 34;
    const cx = p.w / 2;
    const cy = (p.h - alturaLeyenda) / 2;
    const radio = Math.min(p.w / 2, (p.h - alturaLeyenda) / 2) - 6;
    const grosor = radio * 0.38;

    // Cada porción es un arco grueso
    let angulo = -Math.PI / 2;
    partes.forEach(function (x) {
      if (!x.valor || !total) return;
      const fin = angulo + (x.valor / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radio - grosor / 2, angulo, fin);
      ctx.lineWidth = grosor;
      ctx.strokeStyle = x.color;
      ctx.stroke();
      angulo = fin;
    });

    // Total en el centro
    ctx.fillStyle = c.texto;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 26px Inter, system-ui, sans-serif';
    ctx.fillText(total, cx, cy - 6);
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('productos', cx, cy + 16);

    // Leyenda centrada abajo
    const textos = partes.map(function (x) { return x.nombre + ' ' + x.valor; });
    const anchos = textos.map(function (t) { return ctx.measureText(t).width + 22; });
    const anchoTotal = anchos.reduce(function (s, a) { return s + a; }, 0) + (partes.length - 1) * 10;
    let x0 = (p.w - anchoTotal) / 2;
    const yLeyenda = p.h - alturaLeyenda / 2;
    partes.forEach(function (x, i) {
      ctx.fillStyle = x.color;
      ctx.fillRect(x0, yLeyenda - 5, 10, 10);
      ctx.fillStyle = c.texto;
      ctx.textAlign = 'left';
      ctx.fillText(textos[i], x0 + 16, yLeyenda);
      x0 += anchos[i] + 10;
    });
  }

  function pintarSinLibreria(r) {
    const c = colores();
    const nombres = Object.keys(r.porCategoria);
    dibujarBarras(
      document.getElementById('grafico-categorias'),
      nombres,
      nombres.map(function (n) { return r.porCategoria[n]; }),
      c
    );
    dibujarCirculo(document.getElementById('grafico-stock'), [
      { nombre: 'Disponibles', valor: r.disponibles, color: '#C6FF00' },
      { nombre: 'Bajo stock', valor: r.bajo, color: '#FFB020' },
      { nombre: 'Agotados', valor: r.agotados, color: '#E5384F' }
    ], c);
  }

  // Si se cambia el tamaño de la ventana, se redibujan (solo en modo Canvas)
  window.addEventListener('resize', function () {
    if (typeof Chart === 'undefined' && datos.length) pintarSinLibreria(calcular(datos));
  });

  /* ---------- 4. TABLA DE BAJO STOCK ---------- */
  function pintarTabla(r) {
    const cuerpo = document.getElementById('tabla-bajo');
    if (r.listaBajo.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="4">¡Todo en orden! No hay productos con bajo inventario.</td></tr>';
      return;
    }
    cuerpo.innerHTML = r.listaBajo.map(function (p) {
      const agotado = KS.estadoStock(p) === 'agotado';
      return '<tr>' +
        '<td><a class="tabla__enlace" href="detalle.html?id=' + p.id + '">' + KS.escapar(p.nombre) + '</a></td>' +
        '<td>' + KS.escapar(p.categoria) + '</td>' +
        '<td class="tabla__num">' + p.stock + '</td>' +
        '<td><span class="estado estado--' + (agotado ? 'agotado' : 'bajo') + '">' + (agotado ? 'Agotado' : 'Bajo stock') + '</span></td>' +
      '</tr>';
    }).join('');
  }

  /* ---------- FECHA Y HORA DE ACTUALIZACIÓN ---------- */
  function ponerFecha() {
    const ahora = new Date();
    const elemento = document.getElementById('dash-fecha');
    elemento.dateTime = ahora.toISOString();
    elemento.textContent = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) +
      ' · ' + ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /* ---------- CARGA ---------- */
  function mostrar() {
    const r = calcular(datos);
    pintarIndicadores(r);
    pintarGraficos(r);
    pintarTabla(r);
    ponerFecha();
  }

  async function cargar() {
    const estado = document.getElementById('dash-estado');
    try {
      // Se pide el JSON de nuevo (sin caché) para que "Actualizar" traiga datos frescos
      const respuesta = await fetch(KS.CONFIG.RUTA_PRODUCTOS, { cache: 'no-store' });
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      datos = await respuesta.json();
      estado.innerHTML = '';
      mostrar();
    } catch (error) {
      KS.mostrarErrorCarga(estado, error);
    }
  }

  document.getElementById('dash-actualizar').addEventListener('click', async function () {
    await cargar();
    KS.notificar('Datos actualizados');
  });

  // Si cambia el tema, se redibujan los gráficos con los colores nuevos
  document.addEventListener('ks:tema', function () { if (datos.length) pintarGraficos(calcular(datos)); });

  cargar();
})();