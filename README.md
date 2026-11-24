# KINETIC SPORT — Tienda virtual deportiva

Proyecto final de **Diseño y Programación Web** · Instituto Técnico Jesús María · Oruro, Bolivia

> **Muévete. Supérate.**

KINETIC SPORT es una tienda virtual multipágina de artículos deportivos (fútbol, básquetbol, voleibol, running, fitness y accesorios), desarrollada con **HTML5, CSS3, JavaScript, JSON, Fetch API y LocalStorage**, sin frameworks.

> Este README se irá completando a medida que avance el proyecto. Estado actual: **Etapa 1 — base del proyecto**.

---

## Cómo ejecutar el proyecto

El proyecto lee `data/productos.json` con `fetch()`. Los navegadores bloquean `fetch()` cuando abres un HTML con doble clic (protocolo `file://`), así que hay que abrirlo con un **servidor local**:

1. Abre la carpeta `KINETIC-SPORT` en **Visual Studio Code**.
2. Instala la extensión **Live Server** (si aún no la tienes).
3. Haz clic derecho sobre `index.html` → **Open with Live Server**.
4. Se abrirá el navegador en una dirección como `http://127.0.0.1:5500`.

## Estructura de carpetas

```
KINETIC-SPORT/
├── index.html · productos.html · detalle.html · nosotros.html
├── contacto.html · dashboard.html · carrito.html · compra.html · faq.html
├── data/productos.json        ← catálogo (21 productos)
├── css/estilos.css            ← todos los estilos del sitio
├── js/                        ← scripts (se agregan por etapas)
└── img/                       ← logo, banner, categorías, productos y nosotros
```

## Identidad visual

| Elemento | Valor |
|---|---|
| Colores | Negro `#0A0A0A` · Verde lima `#C6FF00` · Blanco `#FFFFFF` · Gris claro `#F4F5F2` |
| Títulos | Barlow Condensed (negrita cursiva) |
| Textos | Inter |
| Logotipo | Símbolo "K" + nombre, en `img/logo/` (SVG y PNG, versiones para fondo claro y oscuro) |

## Datos de demostración

La historia de la marca, los datos de contacto (dirección, teléfono, correo y redes) y los productos son **ficticios** y fueron creados únicamente para este proyecto académico.