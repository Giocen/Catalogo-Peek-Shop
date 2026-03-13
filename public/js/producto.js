// ==================================
// producto.js — CMS por BLOQUES (v3)
// LAYOUT GLOBAL ESTABLE (MERCADO LIBRE STYLE)
// ==================================

import { supabase } from "./supabase.js";
import { agregarAlCarrito } from "./carrito.js";
import { auth } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { abrirCarrito } from "./carrito.js";
import { initUpsell } from "./upsell.js";
import {
  leerZonaCliente,
  detectarZonaCliente,
  construirLinkWhatsApp
} from "./envio-caucel.js"; 


document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("#btnCarrito, #btnCarritoDesktop")
    .forEach(btn => {
      btn.addEventListener("click", abrirCarrito);
    });
});

function optimizarImg(url, size = 900) {
  if (!url) return "/img/placeholder.png";

  if (url.includes("supabase")) {
    return `${url}?width=${size}&quality=70&format=webp`;
  }

  return url;
}

function formatearPrecio(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function safeAttr(val = "") {
  return String(val).replace(/"/g, '\\"');
}

function normalizarColor(c) {
  // 1) Si viene como arreglo real: ["#783e17"]
  if (Array.isArray(c)) c = c[0];

  // 2) Si viene como string JSON: '["#783e17"]'
  if (typeof c === "string") {
    const s = c.trim();

    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr) && arr.length) c = arr[0];
      } catch (_) {
        // si no parsea, seguimos normal
      }
    }
  }

  const v = String(c || "").trim().toLowerCase();

  const mapa = {
    negro: "#111827",
    blanco: "#ffffff",
    rojo: "#ef4444",
    azul: "#3b82f6",
    verde: "#22c55e",
    amarillo: "#facc15",
    naranja: "#fb923c",
    morado: "#a855f7",
    rosa: "#ec4899",
    gris: "#9ca3af",
    cafe: "#92400e",
    marron: "#92400e",
    café: "#92400e"
  };

  // ✅ hex directo
  if (/^#([0-9a-f]{3}){1,2}$/i.test(v)) return v;

  // ✅ nombre conocido
  if (mapa[v]) return mapa[v];

  // ✅ rgb/hsl
  if (/^(rgb|hsl)a?\(/i.test(v)) return v;

  // fallback
  return "#9ca3af";
}

function obtenerNombreVariante(variante) {
  // Prioridad de campos posibles (agrega aquí el real si lo sabes)
  const candidatos = [
    "nombre", "nombre_publico", "titulo", "titulo_publico",
    "nombre_variante", "nombre_presentacion", "nombre_detalle",
    "descripcion_corta", "detalle", "texto", "label"
  ];

  for (const k of candidatos) {
    const v = (variante?.[k] ?? "").toString().trim();
    if (v) return v;
  }

  return "";
}

// ✅ 1) Tu diccionario (empieza con los que uses más)
const HEX_A_NOMBRE = {
  "#134243": "Verde petróleo",
  // "#ff0000": "Rojo",
  // ...
};

function hexToRgb(hex) {
  const h = (hex || "").replace("#", "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

// ✅ Nombre “genérico” por Hue + saturación + luz
function nombreGenericoDesdeHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const { h, s, l } = rgbToHsl(rgb);

  // grisáceos
  if (s < 0.12) {
    if (l < 0.18) return "Negro";
    if (l < 0.35) return "Gris oscuro";
    if (l < 0.7)  return "Gris";
    return "Blanco";
  }

  let base = "Color";
  if (h < 15 || h >= 345) base = "Rojo";
  else if (h < 45) base = "Naranja";
  else if (h < 70) base = "Amarillo";
  else if (h < 160) base = "Verde";
  else if (h < 200) base = "Turquesa";
  else if (h < 255) base = "Azul";
  else if (h < 290) base = "Morado";
  else if (h < 345) base = "Rosa";

  const tono =
    l < 0.30 ? "oscuro" :
    l > 0.75 ? "claro" : "";

  return tono ? `${base} ${tono}` : base;
}

// ✅ función final: primero diccionario, si no, genérico
function nombreColorDesdeHex(hex) {
  const key = normalizarColor(hex).toLowerCase();
  if (HEX_A_NOMBRE[key]) return HEX_A_NOMBRE[key];
  return nombreGenericoDesdeHex(key);
}
/* =========================================================
   🧱 LAYOUT BASE GLOBAL (NO SE BORRA)
========================================================= */
const LAYOUT_BASE = [
  { componente: "image", zona: "left", orden: 1 },
  { componente: "comboBanner", zona: "left", orden: 2 },
  { componente: "brand", zona: "right", orden: 1 },
  { componente: "name", zona: "right", orden: 2 },
  { componente: "category", zona: "right", orden: 3 },  
  { componente: "offer", zona: "right", orden: 4 },

  { componente: "price", zona: "right", orden: 5 },     
  { componente: "variant", zona: "right", orden: 6 },   
  { componente: "envio", zona: "right", orden: 7 },      
  { componente: "buttons", zona: "right", orden: 8 }, 
  { componente: "upsell", zona: "right", orden: 9 },   
];
/* =========================================================
   🔐 DETECTAR ADMIN (NO BLOQUEANTE)
========================================================= */


const MANEJA_STOCK = false;

let ES_ADMIN = false;
window.ES_ADMIN = false;

onAuthStateChanged(auth, user => {
  ES_ADMIN = !!user && user.email?.endsWith("@tuempresa.com");
  window.ES_ADMIN = ES_ADMIN;
  mostrarBadgeAdmin();
});

/* =========================================================
   🛠️ BADGE ADMIN (SOLO VISUAL)
========================================================= */
function mostrarBadgeAdmin() {
  if (!window.ES_ADMIN) return;
  if (document.getElementById("badgeAdmin")) return;

  const badge = document.createElement("div");
  badge.id = "badgeAdmin";
  badge.className = `
    fixed top-24 right-4 z-[99999]
    bg-blue-600 text-white
    px-4 py-2 rounded-full
    shadow-lg text-sm font-semibold
  `;
  badge.textContent = "🛠️ Modo edición";
  document.body.appendChild(badge);
}

/* =========================================================
   PARAMS + DOM
========================================================= */
const params = new URLSearchParams(location.search);
const id = params.get("id");

const cont = document.getElementById("producto");
const relacionadosDiv = document.getElementById("relacionados");

/* =========================================================
   INIT
========================================================= */
window._presentacionSeleccionada = null;
window._colorSeleccionado = null;
cargarProducto();

/* =========================================================
   CARGAR PRODUCTO
========================================================= */
async function cargarProducto() {

  if (!cont || !id) return;

 const { data: p, error } = await supabase
  .from("catalogo_productos") 
  .select(`
    id,
    nombre,
    marca,
    descripcion,
    precio,
    categoria,
    tipo_mascota,
    activo,
    es_oferta,
    precio_anterior
  `)
  .eq("id", id)
  .eq("activo", true)
  .maybeSingle();


  if (error) {
  console.error(error);
  cont.innerHTML = `<p class="text-red-600">Error al cargar producto</p>`;
  return;
}

if (!p) {
  cont.innerHTML = `<p class="text-red-600">Producto no encontrado</p>`;
  return;
}

if (!p.activo) {
  cont.innerHTML = `<p class="text-red-600">Producto no disponible</p>`;
  return;
}

  p.permitir_compra ??= true;
  p.permitir_carrito ??= true;



  /* ================= MULTIMEDIA ================= */
  let imgs = [];

  const { data: media } = await supabase
  .from("catalogo_multimedia")
  .select("*")
  .eq("producto_id", p.id)
  .order("orden");

media?.forEach(m => {
  if (m.url) imgs.push(m.url);
});

if (!imgs.length) {
  imgs.push("/img/placeholder.png");
}

window._productoActualImgs = imgs;
window._productoImgsBase = [...imgs];


  /* ================= PRESENTACIONES ================= */
  const { data: presentaciones } = await supabase
    .from("catalogo_presentaciones")
    .select("*")
    .eq("producto_id", p.id)
    .eq("activo", true)
    .order("precio");

    window._presentaciones = presentaciones || [];
    console.log("🔎 Ejemplo presentacion:", window._presentaciones?.[0]);
    if (window._presentaciones.length) {

  const primeraDisponible = window._presentaciones.find(p => p.talla) || window._presentaciones[0];

  if (primeraDisponible) {
    window._tallaSeleccionada = primeraDisponible.talla;
  }

}

  const ctx = { p, imgs, presentaciones };
  window._productoActual = p;
  window._descripcionOriginal = p.descripcion || "";   

  /* ================= RENDER PRINCIPAL ================= */
cont.innerHTML = `
 ${renderBreadcrumb(p)}

      <!-- MARCA + NOMBRE SOLO MÓVIL -->
      <div class="md:hidden mb-4 space-y-1">
        ${renderComponente({ componente: "brand", mobileTop: true }, ctx)}
        ${renderComponente({ componente: "name", mobileTop: true }, ctx)}
      </div>
      <div class="max-w-6xl mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

          <!-- IZQUIERDA -->
          <div class="space-y-4">
            ${LAYOUT_BASE
              .filter(b => b.zona === "left")
              .sort((a,b)=>a.orden-b.orden)
              .map(b => renderComponente(b, ctx))
              .join("")}
          </div>

          <!-- DERECHA -->
          <div class="space-y-4">
            ${LAYOUT_BASE
              .filter(b => b.zona === "right")
              .sort((a,b)=>a.orden-b.orden)
              .map(b => renderComponente(b, ctx))
              .join("")}
          </div>

        </div>

<!-- ================= DESCRIPCIÓN ================= -->
        <div class="mt-12">

          <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">

            <!-- HEADER -->
            <div class="flex border-b bg-gray-50">
              <div class="w-full py-4 text-sm font-semibold
                          text-blue-600 border-b-2 border-blue-600
                          flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor"
                  stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19 11H5m14-4H5m14 8H5m14 4H5"/>
                </svg>
                Descripción
              </div>
            </div>

            <!-- CONTENIDO -->
            <div class="p-4 md:p-8">


        <!-- ================= DESCRIPCIÓN ================= -->
        <div class="animate-fadeIn">

         ${
          ctx.p.descripcion
            ? (() => {

                const texto = ctx.p.descripcion;

                const formatear = (contenido) => {
                  return contenido
                    .split("\n")
                    .filter(t => t.trim() !== "")
                    .map(t => {

                      const partes = t.split(":");

                      if (partes.length > 1) {

                       const titulo = escaparHTML(partes.shift().trim());
                      const resto = escaparHTML(partes.join(":").trim());     

                        return `
                          <div class="text-gray-700 text-[15px] leading-7">                            
                            <span>
                              <strong class="font-semibold text-gray-900">
                              ${escaparHTML(titulo)}:
                              </strong>
                              ${escaparHTML(resto)}
                            </span>
                          </div>
                        `;
                      }

                      return `
                        <div class="text-gray-700 text-sm md:text-[15px] leading-6 md:leading-7">                          
                          <span>${escaparHTML(t)}</span>
                        </div>
                      `;
                    })
                    .join("");
                };
                const resumenTexto =
                  texto.length > 450
                    ? texto.substring(0, texto.lastIndexOf(" ", 450)) + "..."
                    : texto;

                return `
                  <div class="w-full md:max-w-4xl md:mx-auto space-y-3 md:space-y-4 px-0">

                    <div id="descResumenTab"
                        class="text-sm md:text-[15px] leading-6 md:leading-7 
                                text-gray-700 line-clamp-6 md:line-clamp-none
                                w-full">
                      ${escaparHTML(resumenTexto).replace(/\n/g, "<br>")}
                    </div>

                    <div id="descCompletaTab" class="hidden">
                      ${formatear(texto)}
                    </div>

                    ${
                      (() => {
                        const lineas = (texto || "").split("\n").filter(x => x.trim() !== "");
                        const debeMostrar =
                          (texto || "").trim().length > 180 ||   
                          lineas.length >= 3;                   

                        return debeMostrar ? `
                          <div class="mt-6 text-center">
                            <button id="btnAbrirDetalle"
                              class="text-blue-600 font-semibold mt-3">
                              Ver detalle
                            </button>
                          </div>
                        ` : "";
                      })()
                    }

                  </div>
                `;
              })()
            : `
              <div class="text-sm text-gray-400 text-center">
                Este producto no tiene descripción registrada.
              </div>
            `
        }

        </div>

      </div>
      

    </div>

  </div>
  
 <!-- ================= MODAL DETALLE FULLSCREEN ================= -->
  <div id="modalDetalle"
     class="fixed inset-0 bg-white z-[999999] hidden flex-col transition duration-300 translate-y-full">

    <div class="flex items-center justify-between
                px-4 py-3 border-b">

      <h2 class="font-semibold text-lg">
        Detalle del producto
      </h2>

      <button id="cerrarDetalle"
              class="text-gray-600 text-xl">
        ✕
      </button>
    </div>

    <div class="p-6 overflow-y-auto flex-1">
      ${ctx.p.descripcion
        ? formatearDescripcion(ctx.p.descripcion)
        : ""}
    </div>

  </div>
`;


// ✅ AUTOSELECCIÓN AL CARGAR (precio correcto desde el inicio)
setTimeout(() => {
  const pres = window._presentaciones || [];
  if (!pres.length) return;

  const primera = pres.find(v => v.color || v.talla) || pres[0];
  if (!primera) return;

  // si hay talla, selecciona el grupo (esto ya elige color disponible y actualiza UI)
  const tieneTalla = pres.some(v => String(v.talla || "").trim() !== "");
  const tieneColor = pres.some(v => String(v.color || "").trim() !== "");

  if (tieneTalla && primera.talla) {
    window.seleccionarGrupo(primera.talla);
    return;
  }

  // si es SOLO color (sin talla), selecciona el primer color
  if (tieneColor && !tieneTalla && primera.color) {
    window.seleccionarColor(primera.color);
    return;
  }

  // si es simple
  window.seleccionarPresentacion(primera.id);
}, 0);


  activarZoom();  
  activarBotones(p, imgs[0]); 
  cargarRelacionados(p.categoria, p.id);
 await detectarZonaCliente();
 initUpsell(p);

// esperar a que exista la variante seleccionada
setTimeout(() => {

  const precioActual =
    window._presentacionSeleccionada?.precio ||
    window._productoActual?.precio ||
    0;

  actualizarEnvio(precioActual);

}, 50);


// 🔥 ACTIVAR ADMIN (UNA SOLA VEZ)
if (window.ES_ADMIN && typeof window.initAdminProducto === "function") {
  window.initAdminProducto();
}

}

/* =========================================================
   HELPERS
========================================================= */
    function renderBreadcrumb(p) {
          if (!p.categoria) return "";
          return `
            <div class="mb-4 text-sm text-blue-600">
              <a href="/?categoria=${encodeURIComponent(p.categoria)}"
              class="hover:underline">
              ← Volver
            </a>
              <span class="mx-2">›</span>
              ${p.categoria}
            </div>`;
        }

        /* ================= SEGURIDAD HTML ================= */
        function escaparHTML(str = "") {
          return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }

        function formatearDescripcion(contenido = "") {

            return contenido
              .split("\n")
              .filter(t => t.trim() !== "")
              .map(t => {

                const partes = t.split(":");

                if (partes.length > 1) {

                  const titulo = escaparHTML(partes.shift().trim());
                  const resto = escaparHTML(partes.join(":").trim());

                  return `
                    <div class="mb-3 text-gray-700 text-[15px] leading-7">
                      <strong class="font-semibold text-gray-900">
                        ${titulo}:
                      </strong>
                      ${resto}
                    </div>
                  `;
                }

                return `
                  <div class="mb-3 text-gray-700 text-[15px] leading-7">
                    ${escaparHTML(t)}
                  </div>
                `;
              })
              .join("");
          }

  
        function renderGaleria(imgs) {

          return `
            <div class="space-y-4">

              <!-- IMAGEN PRINCIPAL -->
              <div id="imgZoomWrap"
                  class="relative overflow-hidden rounded-xl bg-white shadow-sm aspect-square">

                <img id="imgPrincipal"
                    src="${optimizarImg(imgs[0])}"
                    fetchpriority="high"
                    onclick="abrirLightbox(0)"
                    class="cursor-zoom-in object-contain w-full h-full transition duration-300">

              </div>


            <!-- MINIATURAS -->
            <div class="flex gap-3 overflow-x-auto no-scrollbar">

              ${imgs.map((src,i)=>`
                <div
                  class="thumb border rounded-lg p-1 cursor-pointer
                        transition duration-200
                        ${i === 0 ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-300'}"
                  data-index="${i}"
                  style="min-width:70px"
                  onclick="irAImagen(${i})">

                  <img src="${optimizarImg(src)}"
                    loading="lazy"
                    class="h-16 w-full object-contain">

                </div>
              `).join("")}

            </div>

          </div>

          <!-- ================= LIGHTBOX ================= -->
          <div id="lightbox"
              class="fixed inset-0 bg-black/90 hidden items-center justify-center z-[999999]">

            <!-- Flecha izquierda -->
            <button id="lbPrev"
              class="absolute left-6 text-white text-4xl hover:scale-110 transition">
              ❮
            </button>

            <!-- Imagen grande -->
            <div class="relative flex items-center justify-center w-full h-full">

              <img id="lbImg"
                  class="max-h-[90vh] max-w-[90vw] object-contain transition duration-300">

              <div id="lbCounter"
                  class="absolute bottom-6 text-white text-sm bg-black/60 px-3 py-1 rounded-full">
              </div>

            </div>

            <!-- Flecha derecha -->
            <button id="lbNext"
              class="absolute right-6 text-white text-4xl hover:scale-110 transition">
              ❯
            </button>

            <!-- Cerrar -->
            <button id="lbClose"
              class="absolute top-6 right-6 text-white text-3xl">
              ✕
            </button>

          </div>
        `;
      }

      function renderPresentaciones(presentaciones) {
        if (!presentaciones?.length) return "";
        return `
          <div class="space-y-3">
            ${presentaciones.map(p => `
              <div class="border rounded p-3 bg-gray-50">
                <div class="font-semibold">
                  ${p.nombre || ""}
                  ${p.cantidad ? `· ${p.cantidad} ${p.unidad}` : ""}
                  ${p.talla ? `· ${p.talla}` : ""}
                </div>
                <div class="font-bold mt-1">$${formatearPrecio(p.precio)}</div>
              </div>
            `).join("")}
          </div>`;
      }

/* =========================================================
   BOTONES (CARRITO INTACTO)
========================================================= */
function activarBotones(p, imgBase) {
  
  document.addEventListener("click", e => {

    const btnAgregar = e.target.closest("#btnAgregar");
    const btnComprar = e.target.closest("#btnComprarAhora");

    if (!btnAgregar && !btnComprar) return;

    if (!window._presentacionSeleccionada) {

      Swal.fire({
        icon: "warning",
        title: "Selecciona una presentación",
        text: "Elige una opción antes de continuar",
        confirmButtonColor: "#16a34a"
      });

      const variantes = document.querySelector(".variantes");

      if (variantes) {
        variantes.scrollIntoView({ behavior: "smooth", block: "center" });
        variantes.classList.add("ring-2","ring-red-400","animate-pulse");

        setTimeout(() => {
          variantes.classList.remove("ring-2","ring-red-400","animate-pulse");
        }, 1200);
      }

      return;
    }

 const pres = window._presentacionSeleccionada;

const nombrePresentacion =
  (obtenerNombreVariante(pres) || pres?.nombre || pres?.talla || "").trim();

const producto = {
  id: p.id,
  presentacion_id: pres?.id || null,
  nombre: p.nombre, // aquí ya te llegará el nombre con color si tú lo guardas así
  precio: pres?.precio ?? p.precio,
  imagen: pres?.imagen ? pres.imagen : document.getElementById("imgPrincipal")?.src,
  presentacion: nombrePresentacion || null,
  cantidad: 1
};
    // 🟦 AGREGAR AL CARRITO NORMAL
    if (btnAgregar) {
      agregarAlCarrito(producto);
      return;
    }

    // 🟩 COMPRA DIRECTA
    if (btnComprar) {
      const zonaCliente = leerZonaCliente();

if (zonaCliente?.ok && zonaCliente?.calculo && !zonaCliente.calculo.dentroZona) {

  const pres = window._presentacionSeleccionada;

  const nombrePresentacion =
    (obtenerNombreVariante(pres) || pres?.nombre || pres?.talla || "").trim();

  const link = construirLinkWhatsApp({
    producto: `${p.nombre} ${nombrePresentacion}`,
    precio: pres?.precio ?? p.precio,
    zona: zonaCliente.calculo.zona,
    distancia: zonaCliente.calculo.distancia?.toFixed(2),
    lat: zonaCliente.lat,
    lng: zonaCliente.lng
  });

  Swal.fire({
    icon: "info",
    title: "Zona fuera de entrega automática",
    html: `
      Tu ubicación está fuera de la zona automática de envío.<br><br>
      Debes cotizar el envío por WhatsApp.
    `,
    confirmButtonText: "Cotizar por WhatsApp",
    confirmButtonColor: "#16a34a"
  }).then((r) => {
    if (r.isConfirmed) {
      window.open(link, "_blank");
    }
  });

  return;
}



        const pres = window._presentacionSeleccionada;

const nombrePresentacion =
  (obtenerNombreVariante(pres) || pres?.nombre || pres?.talla || "").trim();



const productoCompra = {
  id: p.id,
  presentacion_id: pres?.id || null,
  nombre: p.nombre,
  precio: pres?.precio ?? p.precio,
  imagen: pres?.imagen ? pres.imagen : document.getElementById("imgPrincipal")?.src,
  presentacion: nombrePresentacion || null,
  cantidad: 1
};


        // Ejecutar flujo directo pasando el producto
        if (typeof window.comprarAhoraDirecto === "function") {
          window.comprarAhoraDirecto(productoCompra);
        }

        return;
      }
  });

}

/* =========================================================
   ZOOM
========================================================= */
        function activarZoom() {

          const wrap = document.getElementById("imgZoomWrap");
          const img = document.getElementById("imgPrincipal");

          if (!wrap || !img) return;

          let scale = 1;
          let startX = 0;
          let startY = 0;
          let posX = 0;
          let posY = 0;
          let isDragging = false;

          /* ================= DESKTOP ================= */
          if (window.innerWidth >= 768) {

            wrap.onmousemove = e => {
              const r = wrap.getBoundingClientRect();
              img.style.transformOrigin =
                `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
              img.style.transform = "scale(1.8)";
            };

            wrap.onmouseleave = () => {
              img.style.transform = "scale(1)";
            };

            return;
          }

          /* ================= MÓVIL ================= */

          // Doble tap para activar zoom
          wrap.addEventListener("dblclick", () => {
            scale = scale === 1 ? 2 : 1;
            img.style.transition = "transform 0.3s ease";
            img.style.transform = `scale(${scale})`;
          });

          // Arrastre cuando está en zoom
          wrap.addEventListener("touchstart", e => {
            if (scale === 1) return;
            isDragging = true;
            startX = e.touches[0].clientX - posX;
            startY = e.touches[0].clientY - posY;
          });

          wrap.addEventListener("touchmove", e => {
            if (!isDragging) return;
            posX = e.touches[0].clientX - startX;
            posY = e.touches[0].clientY - startY;

            img.style.transform =
              `scale(${scale}) translate(${posX}px, ${posY}px)`;
          });

          wrap.addEventListener("touchend", () => {
            isDragging = false;
          });

        }
/* =========================================================
   PRODUCTOS RELACIONADOS
========================================================= */
async function cargarRelacionados(categoria, actualId) {
  if (!categoria || !relacionadosDiv) return;

  const { data: productos } = await supabase
    .from("catalogo_productos")
    .select(`
        id,
        nombre,
        precio,
        catalogo_presentaciones (
          id,
          precio
        )
      `)
    .eq("categoria", categoria)
    .neq("id", actualId)
    .eq("activo", true)
    .limit(4);

  if (!productos?.length) {
    relacionadosDiv.innerHTML = "";
    return;
  }

  const ids = productos.map(p => p.id);

  const { data: media } = await supabase
    .from("catalogo_multimedia")
    .select("producto_id,url,orden")
    .in("producto_id", ids);

 relacionadosDiv.innerHTML = productos.map(p => {

      const totalPresentaciones = p.catalogo_presentaciones?.length || 0;
      const tieneVariantes = totalPresentaciones > 1;

      const precios = p.catalogo_presentaciones?.map(v => Number(v.precio)) || [];
      const precioMin = precios.length ? Math.min(...precios) : p.precio;
      const precioMax = precios.length ? Math.max(...precios) : p.precio;

      const img = media
        ?.filter(m => m.producto_id === p.id)
        ?.sort((a,b)=>(a.orden ?? 0)-(b.orden ?? 0))[0]
        ?.url || "/img/placeholder.png";

      return `
        <a href="/producto.html?id=${p.id}"
          class="block bg-white rounded-lg shadow 
                  hover:shadow-lg transition group p-3">

          <img src="${optimizarImg(img)}"
              class="h-40 w-full object-contain
                      transition-transform duration-300
                      group-hover:scale-105">

          <div class="mt-2">

            <div class="text-sm line-clamp-2">
              ${p.nombre}
            </div>

            <div class="font-bold mt-1 text-green-700">
              ${
                precioMin !== precioMax
                  ? `$${formatearPrecio(precioMin)} – $${formatearPrecio(precioMax)}`
                  : `$${formatearPrecio(precioMin)}`
              }
            </div>

            ${
              tieneVariantes
                ? `<div class="text-xs text-blue-600 mt-1">
                    Disponible en ${totalPresentaciones} presentaciones
                  </div>`
                : ""
            }

            ${
              tieneVariantes
                ? `<div class="mt-2 bg-blue-600 text-white text-xs py-2 rounded-lg text-center">
                    Ver opciones
                  </div>`
                : ""
            }

          </div>
        </a>
      `;
    }).join("");

    }

/* =========================================================
   RENDER COMPONENTES
========================================================= */
function renderComponente(b, ctx) {
  switch (b.componente) {

    /* ================= IMAGEN ================= */
    case "image":
      return renderGaleria(ctx.imgs);

      case "comboBanner":
        return `
          <div class="pt-2">
            <div id="comboBox"></div>
          </div>
        `;

    /* ================= MARCA ================= */
      case "brand": {
        if (!ctx.p.marca) return "";

        const esMobileTop = b && b.mobileTop;

        const clase = esMobileTop
          ? "block md:hidden text-xs uppercase tracking-wide text-blue-600 hover:underline cursor-pointer"
          : "hidden md:block text-sm uppercase text-blue-600 hover:underline cursor-pointer";

        return `
          <a href="/?marca=${encodeURIComponent(ctx.p.marca)}"
            class="${clase}">
            ${ctx.p.marca}
          </a>
        `;
    }
    /* ================= NOMBRE ================= */
        case "name": {

        const esMobileTop = b && b.mobileTop;

        const clase = esMobileTop
          ? "block md:hidden text-xl font-semibold leading-snug text-gray-900"
          : "hidden md:block text-xl md:text-2xl font-semibold leading-snug text-gray-900";

        const pres = window._presentacionSeleccionada;

       const nombreFinal = pres
        ? (obtenerNombreVariante(pres) ||
          `${ctx.p.nombre}${pres.talla ? ` - ${pres.talla}` : ""}${pres.color ? ` - ${pres.color}` : ""}`)
        : ctx.p.nombre;

        return `
          <h1 id="nombreProducto" class="${clase}">
            ${nombreFinal}
          </h1>
        `;
      }
    /* ================= CATEGORÍA ================= */
    case "category":
          return "";

/* ================= Offer ================= */
        case "offer": {

        const pres = window._presentacionSeleccionada;

        if (!pres?.en_oferta) return "";

        return `
          <div class="inline-flex items-center gap-2 
                      bg-red-600 text-white 
                      text-xs font-semibold 
                      px-3 py-1 rounded-full shadow-sm">
            🔥 Oferta especial
          </div>
        `;
      }
    /* ================= PRECIO ================= */
        case "price": {

          const pres = window._presentacionSeleccionada;

          let precioNormal = pres?.precio || ctx.p.precio;
          let precioOferta = pres?.precio_oferta || null;
          let enOferta = pres?.en_oferta === true;

          let htmlPrecio = "";

          if (enOferta && precioOferta) {

            const descuento = Math.round(
              ((precioNormal - precioOferta) / precioNormal) * 100
            );

            htmlPrecio = `
              <div class="space-y-1">

                <div class="flex items-center gap-3">

                  <div class="text-3xl md:text-4xl font-extrabold text-green-700">
                    $${formatearPrecio(precioOferta)}
                  </div>

                  <span class="text-sm bg-red-600 text-white px-2 py-1 rounded">
                    -${descuento}%
                  </span>

                </div>

                <div class="text-sm text-gray-500 line-through">
                  $${formatearPrecio(precioNormal)}
                </div>

              </div>
            `;

          } else {

            htmlPrecio = `
              <div class="text-3xl md:text-4xl font-extrabold text-green-700">
                $${formatearPrecio(precioNormal)}
              </div>
            `;
          }

          return `
            <div id="bloquePrecio">
              ${htmlPrecio}
            </div>
          `;
        }

     
 /* ================= ENVIO================= */
    case "envio":

      return `
        <div id="bloqueEnvio"
            class="rounded-xl bg-gray-50 border p-4 text-sm transition space-y-3">

          <div class="text-xs text-gray-500">
            La zona de entrega se calcula automáticamente según tu ubicación.
          </div>

          <div class="flex items-center gap-2">
            <span id="iconoEnvio">📦</span>
            <span id="textoEnvio" class="font-medium text-gray-700">
              Calculando envío...
            </span>
          </div>

          <div class="text-xs">
            <button id="btnRecalcularZona"
              class="text-blue-600 hover:underline">
              Actualizar ubicación
            </button>
          </div>

          <div id="barraEnvioWrap" class="hidden">
            <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div id="barraEnvio"
                  class="h-full bg-green-500 transition-all duration-500"
                  style="width:0%"></div>
            </div>
            <div id="mensajeEnvioExtra"
                class="text-xs mt-1 text-gray-600"></div>
          </div>

        </div>
      `;
          /* ================= VARIANTES ================= */
 case "variant": {

  if (!ctx.presentaciones?.length) return "";

  const tieneColores = ctx.presentaciones.some(p => String(p.color || "").trim() !== "");
  const tieneTalla   = ctx.presentaciones.some(p => String(p.talla || "").trim() !== "");

  // ============================
  // 🟢 PRESENTACIÓN SIMPLE (sin talla, sin color)
  // ============================
  if (!tieneColores && !tieneTalla) {
    return `
      <div class="mt-4 variantes">

        <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Presentación
        </div>

        <div class="flex gap-2 flex-wrap">
          ${ctx.presentaciones.map(p => `
            <button
              class="btn-presentacion px-3 py-2 text-xs rounded-md border bg-white border-gray-300"
              data-id="${p.id}"
              onclick="seleccionarPresentacion('${p.id}')">
              ${p.nombre}
            </button>
          `).join("")}
        </div>

      </div>
    `;
  }

  // ============================
  // 🟣 SOLO COLOR (sin talla)
  // ============================
  if (tieneColores && !tieneTalla) {

    const coloresUnicos = [
      ...new Set(ctx.presentaciones.map(p => p.color).filter(Boolean))
    ];

    return `
      <div class="mt-4 variantes">

        <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Color
        </div>

        <div class="flex gap-3 flex-wrap">
          ${coloresUnicos.map(color => {
            const variante = ctx.presentaciones.find(v => v.color === color);
            const sinStock = MANEJA_STOCK ? (Number(variante?.stock ?? 0) <= 0) : false;
            const activa = normalizarColor(color) === (window._colorSeleccionadoHex || "");

            return `
              <button
                class="btn-color w-7 h-7 rounded-full border
                  ${activa ? "ring-2 ring-white ring-offset-2 ring-offset-gray-700 border-gray-300" : "border-gray-300"}"
                data-color="${normalizarColor(color)}"
                ${sinStock ? "disabled" : ""}
                onclick='seleccionarColor(${JSON.stringify(color)})'
               style="
                background:${normalizarColor(color)} !important;
                background-image:none !important;
                filter:none !important;
                opacity:1 !important;
                -webkit-appearance:none;
                appearance:none;
                cursor:pointer;
              ">
              </button>
            `;
          }).join("")}
        </div>

      </div>
    `;
  }

  // ============================
  // 🔵 CON TALLA (y puede tener o no color)
  // ============================
  if (tieneTalla) {

    const gruposUnicos = [
      ...new Set(ctx.presentaciones.map(p => p.talla).filter(Boolean))
    ];

    return `
      <div class="mt-4 variantes">

        <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Presentación
        </div>

        <div class="flex gap-2 flex-wrap">
          ${gruposUnicos.map(g => `
            <button
              class="btn-grupo px-3 py-2 text-xs rounded-md border bg-white border-gray-300"
              data-grupo="${String(g).replace(/"/g,'&quot;')}"
              onclick='seleccionarGrupo(${JSON.stringify(g)})'>
              ${g}
            </button>
          `).join("")}
        </div>

        <div id="bloqueColor" class="mt-4"></div>

      </div>
    `;
  }

  return "";
}

case "buttons": {

  // Si está bloqueado por flags del producto
  const permitirCarrito = ctx.p.permitir_carrito !== false;
  const permitirCompra  = ctx.p.permitir_compra !== false;

  if (!permitirCarrito && !permitirCompra) return "";

  return `
    <div class="space-y-3 pt-2">

      ${permitirCarrito ? `
        <button id="btnAgregar"
          class="w-full bg-black hover:bg-neutral-900 text-white
          py-3 rounded-xl font-semibold
          transition active:scale-[.99]">
          Agregar al carrito
        </button>
      ` : ""}

      ${permitirCompra ? `
        <button id="btnComprarAhora"
          class="w-full bg-black hover:bg-neutral-900 text-white
            py-3 rounded-xl font-semibold
            transition active:scale-[.99]">
          Comprar ahora
        </button>
      ` : ""}

      <p class="text-xs text-gray-500">
        *Selecciona una presentación antes de continuar
      </p>

    </div>
  `;
    }

    case "upsell":
  return `
    <div class="pt-2">
      <div id="upsellBox"></div>
    </div>
  `;

    }

    
  }


function actualizarEnvio(precio) {
    precio = Number(precio) || 0;

  const texto = document.getElementById("textoEnvio");
  const icono = document.getElementById("iconoEnvio");
  const barraWrap = document.getElementById("barraEnvioWrap");
  const barra = document.getElementById("barraEnvio");
  const mensajeExtra = document.getElementById("mensajeEnvioExtra");
  const bloque = document.getElementById("bloqueEnvio");

  if (!texto || !icono || !bloque) return;

  const zonaCliente = leerZonaCliente();

    if (!zonaCliente || !zonaCliente.calculo) {

      icono.textContent = "📍";

      texto.innerHTML = `
        <span class="text-gray-600">
          No se pudo detectar tu ubicación
        </span>

        <div class="text-xs text-gray-500 mt-1">
          Pulsa "Actualizar ubicación"
        </div>
      `;

      return;
    }

const calculo = zonaCliente.calculo;

  // 🔄 RESET VISUAL
  bloque.classList.remove("envio-gratis", "envio-animar");
  bloque.classList.remove("bg-green-50", "border-green-500");
  bloque.classList.add("bg-gray-50");

  // ================= CAUCEL =================
if (calculo.dentroZona) {

  const metaGratis = 400;
  const costoEnvio = calculo.envio ?? 0;

  icono.textContent = "🛵";

  /* ================= SI LA ZONA YA ES GRATIS ================= */

  if (costoEnvio === 0) {

    texto.innerHTML = `
      <span class="text-green-700 font-semibold">
        Envío GRATIS en tu zona
      </span>
      <div class="text-xs text-gray-600">
        Entrega rápida en Ciudad Caucel
      </div>
    `;

    bloque.classList.add("bg-green-50", "border-green-500");

    if (barraWrap) barraWrap.classList.add("hidden");
    if (mensajeExtra) mensajeExtra.innerHTML = "";

    return;
  }

  /* ================= ENVÍO NORMAL ================= */

  texto.innerHTML = `
  <div class="space-y-1">

    <div class="text-xs text-gray-500">
      Zona detectada: ${calculo.zona}
    </div>

    <div class="font-semibold text-gray-800">
      Envío $${formatearPrecio(costoEnvio)}
    </div>

  </div>
  `;

  /* ================= ENVÍO GRATIS POR COMPRA ================= */

  if (precio >= metaGratis) {

    texto.innerHTML = `
      <span class="text-green-700 font-semibold">
        Envío GRATIS en Ciudad Caucel
      </span>
      <div class="text-xs text-gray-600">
        Recíbelo hoy mismo
      </div>
    `;

    bloque.classList.add("bg-green-50", "border-green-500");
    bloque.classList.add("envio-animar");

    if (barraWrap) barraWrap.classList.add("hidden");
    if (mensajeExtra) mensajeExtra.innerHTML = "";

  } else {

    const faltan = metaGratis - precio;
    const progreso = Math.min((precio / metaGratis) * 100, 100);

    if (barraWrap) barraWrap.classList.remove("hidden");

    if (barra) {
      barra.style.transition = "width 0.4s ease";
      barra.style.width = progreso + "%";
    }

    /* ================= MENSAJE HORARIO ================= */

    const ahora = new Date();
    const hora = ahora.getHours();

    const horaApertura = 9;
    const horaCierre = 21;

    let mensajeHorario = "";

    if (hora >= horaApertura && hora < horaCierre) {

      mensajeHorario = `
        <div class="mt-2 px-3 py-2 rounded-lg
                    bg-green-100 text-green-800
                    text-xs font-semibold
                    flex items-center gap-2">
          
          <i data-lucide="truck" class="w-4 h-4"></i>
          Entrega estimada: Hoy antes de las 9 PM
        </div>
      `;

    } else if (hora < horaApertura) {

      mensajeHorario = `
        <div class="mt-2 px-3 py-2 rounded-lg
                    bg-amber-100 text-amber-800
                    text-xs font-semibold
                    flex items-center gap-2">
          
          <i data-lucide="clock" class="w-4 h-4"></i>
          Entrega estimada: Hoy a partir de las 9 AM
        </div>
      `;

    } else {

      mensajeHorario = `
        <div class="mt-2 px-3 py-2 rounded-lg
                    bg-red-100 text-red-700
                    text-xs font-semibold
                    flex items-center gap-2">
          
          <i data-lucide="moon" class="w-4 h-4"></i>
          Entrega estimada: Mañana a partir de las 9 AM
        </div>
      `;
    }

    if (mensajeExtra) {

      mensajeExtra.innerHTML = `
        Te faltan 
        <strong class="text-green-600">$${formatearPrecio(faltan)}</strong>
        para envío gratis
        ${mensajeHorario}
      `;

      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }
}

  // ================= MÉRIDA =================
 else {

  const producto = window._productoActual;
  const presentacion = window._presentacionSeleccionada;

  const nombreProducto = producto?.nombre || "";
  const nombrePresentacion = presentacion
    ? `${presentacion.cantidad || ""} ${presentacion.unidad || ""}`
    : "";

  const precioActual = presentacion?.precio || precio;

    const zonaCliente = leerZonaCliente();

    const mensaje = `
    Hola, quiero cotizar envío para:

    ${nombreProducto} ${nombrePresentacion}

    Precio: $${precioActual}

    Ubicación:
    https://www.google.com/maps?q=${zonaCliente?.lat},${zonaCliente?.lng}
    `.trim();

  const mensajeEncoded = encodeURIComponent(mensaje);

  const numeroWhatsApp = "5219991494268"; // 👈 CAMBIA ESTE NÚMERO

  icono.innerHTML = `
    <svg class="w-5 h-5 text-green-600" fill="currentColor"
      viewBox="0 0 24 24">
      <path d="M20.52 3.48A11.94 11.94 0 0012.05 0C5.42 0 .02 5.4.02 12.03c0 2.12.55 4.18 1.6 6.01L0 24l6.12-1.6a12.03 12.03 0 005.93 1.51h.01c6.63 0 12.03-5.4 12.03-12.03 0-3.21-1.25-6.23-3.57-8.4z"/>
    </svg>
  `;

  texto.innerHTML = `
    <div class="space-y-2">

      <div class="text-orange-600 font-semibold">
        Envío en Mérida (fuera de Ciudad Caucel)
      </div>

      <a href="https://wa.me/${numeroWhatsApp}?text=${mensajeEncoded}"
         target="_blank"
         class="inline-flex items-center gap-2
                bg-green-600 hover:bg-green-700
                text-white text-xs font-medium
                px-3 py-2 rounded-lg
                transition duration-200
                hover:scale-105">

        <svg class="w-4 h-4" fill="currentColor"
          viewBox="0 0 24 24">
          <path d="M20.52 3.48A11.94 11.94 0 0012.05 0C5.42 0 .02 5.4.02 12.03c0 2.12.55 4.18 1.6 6.01L0 24l6.12-1.6a12.03 12.03 0 005.93 1.51h.01c6.63 0 12.03-5.4 12.03-12.03 0-3.21-1.25-6.23-3.57-8.4z"/>
        </svg>

        Cotizar envío por WhatsApp
      </a>

    </div>
  `;

  if (barraWrap) barraWrap.classList.add("hidden");
  if (mensajeExtra) mensajeExtra.innerHTML = "";
}



  // 🔄 Reset animación
  setTimeout(() => {
    bloque.classList.remove("envio-animar");
  }, 400);
}

    /* =========================================
      RECALCULAR UBICACIÓN
    ========================================= */

   document.addEventListener("click", async e => {

  const btn = e.target.closest("#btnRecalcularZona");
  if (!btn) return;

  const texto = document.getElementById("textoEnvio");
  const icono = document.getElementById("iconoEnvio");

  // evitar múltiples clics
  btn.disabled = true;

  // 🔄 Estado cargando
  if (icono) {
    icono.innerHTML = `
      <svg class="w-4 h-4 animate-spin text-blue-600"
        fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z">
        </path>
      </svg>
    `;
  }

  if (texto) {
    texto.innerHTML = `
      <span class="text-gray-700 font-medium">
        Detectando ubicación...
      </span>
      <div class="text-xs text-gray-500 mt-1">
        Esto puede tardar unos segundos
      </div>
    `;
  }

  try {

    await detectarZonaCliente();

    const precio =
      window._presentacionSeleccionada?.precio ||
      window._productoActual?.precio ||
      0;

    // ✔️ confirmación visual
    if (icono) icono.textContent = "✅";

    if (texto) {
      texto.innerHTML = `
        <span class="text-green-700 font-semibold">
          Ubicación actualizada
        </span>
        <div class="text-xs text-gray-500 mt-1">
          Calculando envío...
        </div>
      `;
    }

    setTimeout(() => {
      actualizarEnvio(precio);
    }, 600);

  } catch (error) {

    console.error("Error detectando ubicación:", error);

    if (icono) icono.textContent = "⚠️";

    if (texto) {
      texto.innerHTML = `
        <span class="text-red-600 font-semibold">
          No se pudo detectar tu ubicación
        </span>
        <div class="text-xs text-gray-500 mt-1">
          Intenta nuevamente
        </div>
      `;
    }

  } finally {

    // desbloquear botón
    btn.disabled = false;

  }

});

    function activarCarrusel() {
      // Ya no usamos carrusel scroll.
      // Las miniaturas manejan la navegación.
    return;

  const actualizarDots = () => {
    const index = Math.round(
      scroll.scrollLeft / scroll.clientWidth
    );

    dots.forEach(d =>
      d.classList.remove("bg-yellow-400", "scale-110")
    );

    if (dots[index]) {
      dots[index].classList.add("bg-yellow-400", "scale-110");
    }
  };

  scroll.addEventListener("scroll", actualizarDots);

  actualizarDots();
}

   window.irAImagen = index => {

      const imgs = window._productoActualImgs || [];
      const img = document.getElementById("imgPrincipal");

      if (!img || !imgs[index]) return;

      img.style.opacity = "0";

      setTimeout(() => {
        img.src = imgs[index];
        img.style.opacity = "1";
      }, 150);

      document.querySelectorAll(".thumb").forEach(t =>
        t.classList.remove("border-yellow-400","ring-2","ring-yellow-400")
      );

      const activa = document.querySelector(`.thumb[data-index="${index}"]`);
      if (activa) {
        activa.classList.add("border-yellow-400","ring-2","ring-yellow-400");
      }

    };
/* =========================================================
   LIGHTBOX PRO
========================================================= */

let lbIndex = 0;
let touchStartX = 0;

window.abrirLightbox = index => {

  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lbImg");
  const counter = document.getElementById("lbCounter");

  if (!lightbox || !img) return;

  lbIndex = index;
  img.src = optimizarImg(window._productoActualImgs[lbIndex]);

  actualizarContador();

  lightbox.classList.remove("hidden");
  lightbox.classList.add("flex");
};

function cerrarLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.classList.add("hidden");
  lightbox.classList.remove("flex");
}

function cambiarLightbox(dir) {

  const imgs = window._productoActualImgs || [];
  if (!imgs.length) return;

  lbIndex += dir;

  if (lbIndex < 0) lbIndex = imgs.length - 1;
  if (lbIndex >= imgs.length) lbIndex = 0;

  const img = document.getElementById("lbImg");

  if (img) {
    img.style.opacity = "0";
    setTimeout(() => {
      img.src = optimizarImg(imgs[lbIndex]);
      img.style.opacity = "1";
    }, 150);
  }

  actualizarContador();
}

function actualizarContador() {
  const counter = document.getElementById("lbCounter");
  const total = window._productoActualImgs?.length || 0;
  if (counter) {
    counter.textContent = `${lbIndex + 1} / ${total}`;
  }
}

/* ================= EVENTOS ================= */

document.addEventListener("click", e => {

  const btnPrev = e.target.closest("#lbPrev");
  const btnNext = e.target.closest("#lbNext");
  const btnClose = e.target.closest("#lbClose");

  if (btnClose || e.target.id === "lightbox") {
    cerrarLightbox();
  }

  if (btnPrev) {
    cambiarLightbox(-1);
  }

  if (btnNext) {
    cambiarLightbox(1);
  }

});


/* ================= TECLADO ================= */

document.addEventListener("keydown", e => {

  const lightbox = document.getElementById("lightbox");
  if (!lightbox || lightbox.classList.contains("hidden")) return;

  if (e.key === "ArrowLeft") cambiarLightbox(-1);
  if (e.key === "ArrowRight") cambiarLightbox(1);
  if (e.key === "Escape") cerrarLightbox();

});

/* ================= SWIPE MÓVIL ================= */

document.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", e => {

  const lightbox = document.getElementById("lightbox");
  if (!lightbox || lightbox.classList.contains("hidden")) return;

  const diff = e.changedTouches[0].screenX - touchStartX;

  if (diff > 50) cambiarLightbox(-1);
  if (diff < -50) cambiarLightbox(1);

});

/* =========================================================
   DESCRIPCIÓN COLAPSABLE (TAB)
========================================================= */
      document.addEventListener("click", e => {

        const btn = e.target.closest("#btnToggleDescTab");
        if (!btn) return;

        const resumen = document.getElementById("descResumenTab");
        const completa = document.getElementById("descCompletaTab");

        if (!resumen || !completa) return;

        const abierta = !completa.classList.contains("hidden");

        if (abierta) {
          completa.classList.add("hidden");
          resumen.classList.remove("hidden");
          btn.textContent = "Ver más";
        } else {
          completa.classList.remove("hidden");
          resumen.classList.add("hidden");
          btn.textContent = "Ver menos";
        }

      });


document.addEventListener("click", e => {

  if (e.target.id === "btnToggleDesc") {

    const resumen = document.getElementById("descResumen");
    const completa = document.getElementById("descCompleta");
    const btn = document.getElementById("btnToggleDesc");

    if (!resumen || !completa || !btn) return;

    const abierta = !completa.classList.contains("hidden");

    if (abierta) {
      completa.classList.add("hidden");
      resumen.classList.remove("hidden");
      btn.textContent = "Más información";
    } else {
      completa.classList.remove("hidden");
      resumen.classList.add("hidden");
      btn.textContent = "Ver menos";
    }
  }

});

/* =========================================================
   MODAL DETALLE FULLSCREEN
========================================================= */

document.addEventListener("click", e => {

  const modal = document.getElementById("modalDetalle");
  if (!modal) return;

  /* ================= ABRIR ================= */
 if (e.target.id === "btnAbrirDetalle") {

  const modal = document.getElementById("modalDetalle");
  if (!modal) return;

  // 👉 Agregar estado al historial
  history.pushState({ modalDetalle: true }, "");

  modal.classList.remove("hidden");

  setTimeout(() => {
    modal.classList.remove("translate-y-full");
    modal.classList.add("flex");
  }, 10);

  document.body.classList.add("overflow-hidden");
}

  /* ================= CERRAR ================= */
  if (e.target.id === "cerrarDetalle") {

    modal.classList.add("translate-y-full");

    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 300);

    document.body.classList.remove("overflow-hidden");
  }

});

/* =========================================================
   HISTORIAL PARA MODAL DETALLE (MÓVIL BACK FIX)
========================================================= */

window.addEventListener("popstate", event => {

  const modal = document.getElementById("modalDetalle");
  if (!modal) return;

  if (!modal.classList.contains("hidden")) {

    modal.classList.add("translate-y-full");

    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 300);

    document.body.classList.remove("overflow-hidden");
  }

});


window._tallaSeleccionada = null;


/* =========================================================
   🔥 ACTUALIZAR UI VARIANTE
========================================================= */
function actualizarUI(variante) {

  window._presentacionSeleccionada = variante;

  // ✅ Guardar el COLOR como TEXTO (lo que eligió el cliente)
  window._colorSeleccionadoLabel = variante.color || window._colorSeleccionadoLabel || null;

  // ✅ Guardar el HEX solo para UI (pintar bolita)
  window._colorSeleccionadoHex = window._colorSeleccionadoLabel
    ? normalizarColor(window._colorSeleccionadoLabel)
    : null;

  // ✅ Talla / grupo
  window._tallaSeleccionada = variante.talla || window._tallaSeleccionada || null;

  /* ===== PRECIO ===== */

  const bloquePrecio = document.getElementById("bloquePrecio");

  if (bloquePrecio) {

    let precioNormal = variante.precio;
    let precioOferta = variante.precio_oferta;
    let enOferta = variante.en_oferta === true;

    if (enOferta && precioOferta) {

      const descuento = Math.round(
        ((precioNormal - precioOferta) / precioNormal) * 100
      );

      bloquePrecio.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <div class="text-3xl md:text-4xl font-extrabold text-green-700">
              $${formatearPrecio(precioOferta)}
            </div>
            <span class="text-sm bg-red-600 text-white px-2 py-1 rounded">
              -${descuento}%
            </span>
          </div>
          <div class="text-sm text-gray-500 line-through">
            $${formatearPrecio(precioNormal)}
          </div>
        </div>
      `;

    } else {

      bloquePrecio.innerHTML = `
        <div class="text-3xl md:text-4xl font-extrabold text-green-700">
          $${formatearPrecio(precioNormal)}
        </div>
      `;
    }
  }

  /* ===== NOMBRE ===== */

 const nombreEls = document.querySelectorAll("#nombreProducto");

if (nombreEls.length) {
  const nombreBase = window._productoActual?.nombre || "";
  const nombreVariante = obtenerNombreVariante(variante);

  const textoFinal = nombreVariante
    ? nombreVariante
    : `${nombreBase}${variante.talla ? ` - ${variante.talla}` : ""}${variante.color ? ` - ${variante.color}` : ""}`;

  nombreEls.forEach(el => (el.textContent = textoFinal));
}

  /* ===== IMAGEN ===== */

  if (variante.imagen) {

    const img = document.getElementById("imgPrincipal");

    if (img) {
      img.style.opacity = "0";

      setTimeout(() => {
        img.src = optimizarImg(variante.imagen);
        img.style.opacity = "1";
      }, 150);
    }

    window._productoActualImgs = [
      variante.imagen,
      ...window._productoImgsBase
    ];
  }

  /* ===== ENVÍO ===== */

  const precioActual =
  variante?.precio_oferta && variante?.en_oferta
    ? variante.precio_oferta
    : variante?.precio || window._productoActual?.precio;

actualizarEnvio(precioActual);

  /* ===== DESCRIPCIÓN ===== */

  const descResumen = document.getElementById("descResumenTab");
  const descCompleta = document.getElementById("descCompletaTab");

  if (descResumen && descCompleta) {

    const texto =
      variante.detalle || window._descripcionOriginal;

    descResumen.innerHTML = formatearDescripcion(texto);
    descCompleta.innerHTML = formatearDescripcion(texto);
  }
}


window.seleccionarPresentacion = id => {

  const variante = window._presentaciones.find(p => p.id === id);
  if (!variante) return;

  // reset color seleccionado si cambia la presentación
  window._colorSeleccionadoLabel = variante.color || null;
  window._colorSeleccionadoHex = window._colorSeleccionadoLabel ? normalizarColor(window._colorSeleccionadoLabel) : null;

  document.querySelectorAll(".btn-presentacion").forEach(b => {
    b.classList.remove("bg-black","text-white","border-black");
    b.classList.add("bg-white","border-gray-300");
  });

  const btn = document.querySelector(`[data-id="${id}"]`);
  if (btn) btn.classList.add("bg-black","text-white","border-black");

  actualizarUI(variante);
};

window.seleccionarGrupo = grupo => {

  window._tallaSeleccionada = grupo;

  const variantesGrupo = (window._presentaciones || []).filter(p =>
    String(p.talla || "") === String(grupo || "")
  );
  if (!variantesGrupo.length) return;

  // UI: marcar talla activa
  document.querySelectorAll(".btn-grupo").forEach(b => {
    b.classList.remove("bg-black","text-white","border-black");
    b.classList.add("bg-white","border-gray-300");
  });

  const btn = document.querySelector(`[data-grupo="${String(grupo).replace(/"/g,'&quot;')}"]`);
  if (btn) btn.classList.add("bg-black","text-white","border-black");

  const bloqueColor = document.getElementById("bloqueColor");
  if (!bloqueColor) return;

  // ✅ Colores únicos NORMALIZADOS (hex)
  const coloresUnicos = [
    ...new Set(
      variantesGrupo
        .map(v => normalizarColor(v.color))
        .filter(c => c && c !== "#9ca3af") // opcional: evita “gris fallback” si viniera basura
    )
  ];

  // ✅ Si esa talla NO tiene colores, selecciona la primera variante y oculta bloqueColor
  if (!coloresUnicos.length) {
    window._colorSeleccionado = null;
    actualizarUI(variantesGrupo[0]);
    bloqueColor.innerHTML = "";
    return;
  }

  // ✅ Autoselección: si ya hay color seleccionado, úsalo; si no, usa el primero
    const seleccionado =
      window._colorSeleccionadoHex && window._colorSeleccionadoHex !== "#9ca3af"
        ? window._colorSeleccionadoHex
        : coloresUnicos[0];

    const varianteElegida =
      variantesGrupo.find(v => normalizarColor(v.color) === seleccionado) || variantesGrupo[0];

    window._colorSeleccionadoLabel = varianteElegida.color || null;
    window._colorSeleccionadoHex = window._colorSeleccionadoLabel ? normalizarColor(window._colorSeleccionadoLabel) : null;

    actualizarUI(varianteElegida);

  // Pintar botones de color
  bloqueColor.innerHTML = `
    <div class="text-xs uppercase tracking-wide text-gray-500 mb-2">
      Color
    </div>

    <div class="flex gap-3 flex-wrap">
      ${coloresUnicos.map(colorHex => {
        const activa = normalizarColor(colorHex) === (window._colorSeleccionadoHex || "");

        return `
          <button
            class="btn-color w-7 h-7 rounded-full border border-gray-300
              ${activa ? "ring-2 ring-white ring-offset-2 ring-offset-gray-700" : ""}"
            data-color="${colorHex}"
            onclick='seleccionarColor(${JSON.stringify(grupo)}, ${JSON.stringify(colorHex)})'
            style="
              background:${colorHex} !important;
              background-image:none !important;
              filter:none !important;
              opacity:1 !important;
              -webkit-appearance:none;
              appearance:none;
              cursor:pointer;
            ">
          </button>
        `;
      }).join("")}
    </div>
  `;
};

window.seleccionarColor = (a, b) => {

  let grupo = null;
  let color = null;

  if (typeof b === "undefined") {
    // SOLO COLOR
    color = a;
  } else {
    // TALLA + COLOR
    grupo = a;
    color = b;
  }

  const colorNorm = normalizarColor(color);

  let variante = null;

  if (grupo) {
    variante = (window._presentaciones || []).find(p =>
      String(p.talla || "") === String(grupo || "") &&
      normalizarColor(p.color) === colorNorm
    );
  } else {
    variante = (window._presentaciones || []).find(p =>
      normalizarColor(p.color) === colorNorm
    );
  }

  if (!variante) return;

  window._colorSeleccionadoHex = colorNorm;
  window._colorSeleccionadoLabel = variante.color || null;
  window._colorSeleccionado = colorNorm;

  // UI: limpiar todos
  document.querySelectorAll(".btn-color").forEach(btn => {
    btn.classList.remove("ring-2","ring-white","ring-offset-2","ring-offset-gray-700");
  });

  // UI: activar el correcto (usa data-color normalizado)
  const btnActivo = [...document.querySelectorAll(".btn-color")]
    .find(el => (el.dataset.color || "") === colorNorm);

  if (btnActivo) {
    btnActivo.classList.add("ring-2","ring-white","ring-offset-2","ring-offset-gray-700");
  }

 
  actualizarUI(variante);
};