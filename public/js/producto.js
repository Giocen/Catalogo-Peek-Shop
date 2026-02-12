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

/* =========================================================
   🧱 LAYOUT BASE GLOBAL (NO SE BORRA)
========================================================= */
const LAYOUT_BASE = [
  { componente: "image", zona: "left", orden: 1 },

  { componente: "brand", zona: "right", orden: 1 },
  { componente: "name", zona: "right", orden: 2 },
  { componente: "category", zona: "right", orden: 3 },

  { componente: "offer", zona: "right", orden: 4 },
  { componente: "price", zona: "right", orden: 5 },
  { componente: "color", zona: "right", orden: 6 },
  { componente: "variant", zona: "right", orden: 7 },

  { componente: "buttons", zona: "right", orden: 8 },
  
];
/* =========================================================
   🔐 DETECTAR ADMIN (NO BLOQUEANTE)
========================================================= */
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
    activo,
    es_oferta,
    precio_anterior,
    colores
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
const { data: media } = await supabase
  .from("catalogo_multimedia")
  .select("*")
  .eq("producto_id", p.id)
  .order("orden");

window._imagenesPorColor = {};

const imgs = [];

media?.forEach(m => {
  if (m.url) imgs.push(m.url);

  if (m.color && m.url) {
    window._imagenesPorColor[m.color] = m.url;
  }
});

if (!imgs.length) {
  imgs.push("/img/placeholder.png");
}

window._productoActualImgs = imgs;


  /* ================= PRESENTACIONES ================= */
  const { data: presentaciones } = await supabase
    .from("catalogo_presentaciones")
    .select("*")
    .eq("producto_id", p.id)
    .eq("activo", true)
    .order("precio");

    window._presentaciones = presentaciones || [];

  const ctx = { p, imgs, presentaciones };
  window._productoActual = p;
  // 🔹 Auto seleccionar primer color
    if (p.colores?.length) {
      window._colorSeleccionado = p.colores[0];
    }


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
          <div class="space-y-6">
            ${LAYOUT_BASE
              .filter(b => b.zona === "left")
              .sort((a,b)=>a.orden-b.orden)
              .map(b => renderComponente(b, ctx))
              .join("")}
          </div>

          <!-- DERECHA -->
          <div class="space-y-6">
            ${LAYOUT_BASE
              .filter(b => b.zona === "right")
              .sort((a,b)=>a.orden-b.orden)
              .map(b => renderComponente(b, ctx))
              .join("")}
          </div>

        </div>

<!-- ================= TABS PROFESIONALES ================= -->
  <div class="mt-12">

    <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">

      <!-- HEADER TABS -->
      <div class="flex border-b bg-gray-50">
        
        <button
          class="tab-btn flex-1 py-4 text-sm font-semibold
                text-blue-600 border-b-2 border-blue-600
                flex items-center justify-center gap-2 transition"
          data-tab="desc"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor"
            stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 11H5m14-4H5m14 8H5m14 4H5"/>
          </svg>
          Descripción
        </button>

        <button
          class="tab-btn flex-1 py-4 text-sm font-semibold
                text-gray-500 hover:text-gray-700
                flex items-center justify-center gap-2 transition"
          data-tab="info"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor"
            stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12l2 2l4-4m6 2a9 9 0 11-18 0a9 9 0 0118 0z"/>
          </svg>
          Información
        </button>

      </div>

      <!-- CONTENIDO -->
      <div class="p-8 tab-content">

        <!-- ================= DESCRIPCIÓN ================= -->
        <div data-tab-content="desc" class="animate-fadeIn">

          ${
            ctx.p.descripcion
              ? (() => {
                  const texto = ctx.p.descripcion;
                  const resumen = texto.length > 450
                    ? texto.substring(0, 450) + "..."
                    : texto;

                  return `
                    <div class="max-w-4xl mx-auto">

                      <div class="text-gray-700 text-[15px] leading-7 space-y-4">

                        <div id="descResumenTab" class="whitespace-pre-line">
                          ${resumen}
                        </div>

                        <div id="descCompletaTab"
                            class="hidden whitespace-pre-line">
                          ${texto}
                        </div>

                      </div>

                      ${
                        texto.length > 450
                          ? `
                          <div class="mt-6 text-center">
                            <button id="btnToggleDescTab"
                              class="inline-flex items-center gap-2
                                    text-blue-600 font-semibold
                                    hover:text-blue-700 transition">

                              <span id="txtToggleDesc">Ver más</span>

                              <svg id="iconToggleDesc"
                                class="w-4 h-4 transition-transform duration-300"
                                fill="none" stroke="currentColor"
                                stroke-width="2"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round"
                                      stroke-linejoin="round"
                                      d="M19 9l-7 7-7-7"/>
                              </svg>

                            </button>
                          </div>
                          `
                          : ""
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

        <!-- ================= INFORMACIÓN ================= -->
        <div data-tab-content="info" class="hidden animate-fadeIn">

          ${
            ctx.p.notas
              ? `
              <div class="grid md:grid-cols-2 gap-x-12 gap-y-4 text-sm text-gray-800">
                ${ctx.p.notas
                  .split("\n")
                  .filter(t => t.trim() !== "")
                  .map(t => `
                    <div class="flex items-start gap-3 hover:translate-x-1 transition duration-200">
                      <svg class="w-4 h-4 text-green-600 mt-[3px]" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414l2.793 2.793l6.793-6.793a1 1 0 011.414 0z"
                          clip-rule="evenodd"/>
                      </svg>
                      <span>${t}</span>
                    </div>
                  `)
                  .join("")}
              </div>
              `
              : `
              <div class="text-sm text-gray-400">
                Este producto no tiene información adicional registrada.
              </div>
              `
          }

        </div>

      </div>

    </div>

  </div>

`;

  activarZoom();  
  activarBotones(p, imgs[0]);
  cargarRelacionados(p.categoria, p.id);
  actualizarEnvio(ctx.p.precio);

  if (
  window._colorSeleccionado &&
  window._imagenesPorColor?.[window._colorSeleccionado]
) {
  const img = document.getElementById("imgPrincipal");
  if (img) {
    img.src = window._imagenesPorColor[window._colorSeleccionado];
  }
}

// 🔥 ACTIVAR ADMIN
if (window.ES_ADMIN && typeof window.initAdminProducto === "function") {
  window.initAdminProducto();
}

setTimeout(() => {

  const selectZona = document.getElementById("zonaEnvio");
  if (!selectZona) return;

  // 🔹 Cargar zona guardada
  const zonaGuardada = localStorage.getItem("zona_envio");
  if (zonaGuardada) {
    selectZona.value = zonaGuardada;
  }

  // 🔹 Evento cambio
  selectZona.addEventListener("change", e => {
    localStorage.setItem("zona_envio", e.target.value);

    const precioActual =
      window._presentacionSeleccionada?.precio || p.precio;

    actualizarEnvio(precioActual);
  });

}, 0);


  // 🔥 ACTIVAR ADMIN
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
      <a href="/" class="hover:underline">← Volver</a>
      <span class="mx-2">›</span>
      ${p.categoria}
    </div>`;
}
  
      function renderGaleria(imgs) {

        return `
          <div class="space-y-4">

            <!-- IMAGEN PRINCIPAL -->
            <div id="imgZoomWrap"
                class="relative overflow-hidden rounded-xl bg-gray-50 aspect-square">

              <img id="imgPrincipal"
                  src="${imgs[0]}"
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

                  <img src="${src}"
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
                <div class="font-bold mt-1">$${p.precio}</div>
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

    const producto = {
      id: p.id,
      presentacion_id: window._presentacionSeleccionada.id,
      nombre: p.nombre,
      precio: window._presentacionSeleccionada.precio,
      imagen: imgBase,
      presentacion: `${window._presentacionSeleccionada.cantidad || ""} ${window._presentacionSeleccionada.unidad || ""}`,
      color: window._colorSeleccionado || null,
      cantidad: 1
    };

    // 🟦 AGREGAR AL CARRITO NORMAL
    if (btnAgregar) {
      agregarAlCarrito(producto);
      return;
    }

    // 🟩 COMPRA DIRECTA
    if (btnComprar) {

        const productoCompra = {
          id: p.id,
          presentacion_id: window._presentacionSeleccionada.id,
          nombre: p.nombre,
          precio: window._presentacionSeleccionada.precio,
          imagen: imgBase,
          presentacion: `${window._presentacionSeleccionada.cantidad || ""} ${window._presentacionSeleccionada.unidad || ""}`,
          color: window._colorSeleccionado || null,
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
    .select("id,nombre,precio")
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
    const img = media
      ?.filter(m => m.producto_id === p.id)
      ?.sort((a,b)=>(a.orden ?? 0)-(b.orden ?? 0))[0]
      ?.url || "/img/placeholder.png";

    return `
      <div class="bg-white rounded-lg shadow hover:shadow-lg transition">
        <img src="${img}" class="h-40 w-full object-contain p-3">
        <div class="p-3">
          <div class="text-sm line-clamp-2">${p.nombre}</div>
          <div class="font-bold mt-1">$${p.precio}</div>
          <a href="/producto.html?id=${p.id}"
             class="text-green-600 text-sm mt-2 inline-block">
            Ver producto
          </a>
        </div>
      </div>`;
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

          return `
            <h1 class="${clase}">
              ${ctx.p.nombre}
            </h1>
          `;
      }
    /* ================= CATEGORÍA ================= */
    case "category":
          return "";

    /* ================= PRECIO ================= */
      case "price":

        const pres = window._presentacionSeleccionada;
        const precioActual = pres?.precio || ctx.p.precio;

        return `
          <div class="space-y-2">

            <div id="precioProducto"
                class="text-3xl md:text-4xl font-semibold text-gray-900">
              $${precioActual}
            </div>

            <div id="precioPorUnidad"
                class="text-sm text-gray-500">
              ${
                pres?.cantidad
                  ? `Precio por kg: $${(precioActual / pres.cantidad).toFixed(2)}`
                  : ""
              }
            </div>

            <!-- ENVÍO DINÁMICO -->
            <div id="bloqueEnvio"
                class="rounded-xl bg-gray-50 border p-4 text-sm transition space-y-3">

              <div>
                <select id="zonaEnvio"
                  class="w-full border rounded-lg p-2 text-xs">
                  <option value="Caucel">Ciudad Caucel</option>
                  <option value="Merida">Mérida (otra colonia)</option>
                </select>
              </div>

              <div class="flex items-center gap-2">
                <span id="iconoEnvio">📦</span>
                <span id="textoEnvio" class="font-medium text-gray-700">
                  Calculando envío...
                </span>
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

          </div>
        `;

    /* ================= OFERTA ================= */
    case "offer":
      return ctx.p.es_oferta
        ? `
          <div class="flex items-center gap-2 mt-1">
            <span class="precio-anterior">
              $${ctx.p.precio_anterior}
            </span>
            <span class="badge-oferta">OFERTA</span>
          </div>
        `
        : "";

    /* ================= COLORES ================= */
      case "color":
          return ctx.p.colores?.length
            ? `
              <div class="space-y-3">

                <div class="text-sm font-medium text-gray-700">
                  Color seleccionado:
                  <span id="colorSeleccionadoLabel"
                        class="font-semibold text-gray-900">
                    ${ctx.p.colores[0]}
                  </span>
                </div>

                <div class="flex gap-4 flex-wrap">

                  ${ctx.p.colores.map((c,i) => `
                    <div class="flex flex-col items-center gap-1">

                      <button
                        class="color-btn w-10 h-10 rounded-full border-2
                              transition-all duration-200 hover:scale-110
                              ${i === 0 ? 'ring-2 ring-blue-600 border-blue-600 scale-110' : 'border-gray-300'}"
                        data-color="${c}"
                        onclick="seleccionarColor('${c}')"
                        style="background:${c}">
                      </button>

                      <span class="text-xs text-gray-600">
                        ${c}
                      </span>

                    </div>
                  `).join("")}

                </div>

              </div>
            `
            : "";


            /* ================= VARIANTES ================= */
       case "variant":

        return ctx.presentaciones?.length
          ? `
            <div class="variantes grid gap-2"
                style="grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));">

              ${ctx.presentaciones.map(v => `
                <div
                  class="variante border rounded-lg px-3 py-2
                        text-center text-sm font-medium
                        hover:border-yellow-400
                        cursor-pointer transition-all duration-200"
                  data-id="${v.id}"
                  onclick="seleccionarPresentacion('${v.id}')">

                  ${v.talla}

                </div>
              `).join("")}

            </div>
          `
          : "";
    /* ================= BOTONES ================= */
    case "buttons":
      return `
        <div class="space-y-3 mt-4">
          <button id="btnComprarAhora"
            class="w-full bg-blue-600 text-white py-3 rounded-lg">
            Comprar ahora
          </button>
          <button id="btnAgregar"
            class="w-full border border-blue-600 text-blue-600 py-3 rounded-lg">
            Agregar al carrito
          </button>
        </div>
      `;

  
    }
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;

  const tab = btn.dataset.tab;

  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("text-blue-600", "border-blue-600", "border-b-2");
    b.classList.add("text-gray-500");
  });

  btn.classList.add("text-blue-600", "border-blue-600", "border-b-2");
  btn.classList.remove("text-gray-500");

  document.querySelectorAll("[data-tab-content]").forEach(c => {
    c.classList.toggle("hidden", c.dataset.tabContent !== tab);
  });
});


window.seleccionarPresentacion = id => {
  const pres = window._presentaciones.find(p => p.id === id);
  if (!pres) return;

  window._presentacionSeleccionada = pres;

  const precioEl = document.getElementById("precioProducto");
  if (precioEl) precioEl.textContent = `$${pres.precio}`;

  // 👇 NUEVO
  actualizarEnvio(pres.precio);

  document.querySelectorAll(".variante").forEach(b =>
    b.classList.remove("ring-2", "ring-blue-600", "bg-blue-50")
  );

  const btn = document.querySelector(`.variante[data-id="${id}"]`);
  if (btn) btn.classList.add("ring-2", "ring-yellow-400", "bg-yellow-50", "border-yellow-400");
};


function actualizarEnvio(precio) {

  const texto = document.getElementById("textoEnvio");
  const icono = document.getElementById("iconoEnvio");
  const barraWrap = document.getElementById("barraEnvioWrap");
  const barra = document.getElementById("barraEnvio");
  const mensajeExtra = document.getElementById("mensajeEnvioExtra");
  const bloque = document.getElementById("bloqueEnvio");

  if (!texto || !icono || !bloque) return;

  const zona = localStorage.getItem("zona_envio") || "Caucel";

  // 🔄 RESET VISUAL
  bloque.classList.remove("envio-gratis", "envio-animar");
  bloque.classList.remove("bg-green-50", "border-green-500");
  bloque.classList.add("bg-gray-50");

  // ================= CAUCEL =================
  if (zona === "Caucel") {

    const metaGratis = 400;

    if (precio >= metaGratis) {

      icono.textContent = "🛵";

      texto.innerHTML = `
        <span class="text-green-700 font-semibold">
          Envío GRATIS en Ciudad Caucel
        </span>
        <div class="text-xs text-gray-600">
          Recíbelo hoy mismo
        </div>
      `;

      // 🎉 Estilo visual premium
      bloque.classList.add("bg-green-50", "border-green-500");

      // 🎬 Animación suave
      bloque.classList.add("envio-animar");

      // ocultar barra
      if (barraWrap) barraWrap.classList.add("hidden");

      // limpiar mensaje
      if (mensajeExtra) mensajeExtra.innerHTML = "";

    } else {

      const faltan = metaGratis - precio;
      const progreso = Math.min((precio / metaGratis) * 100, 100);

      icono.textContent = "🛵";

      texto.innerHTML = `
        <span class="font-semibold text-gray-800">
          Envío $25 en Ciudad Caucel
        </span>
      `;

      // mostrar barra
      if (barraWrap) barraWrap.classList.remove("hidden");

      // animación suave de progreso
      if (barra) {
        barra.style.transition = "width 0.4s ease";
        barra.style.width = progreso + "%";
      }

      if (mensajeExtra) {

        const ahora = new Date();
        const hora = ahora.getHours();
        const dentroHorario = hora >= 9 && hora < 21;

        const mensajeHorario = dentroHorario
          ? `
            <div class="mt-2 px-3 py-2 rounded-lg
                        bg-green-100 text-green-800
                        text-xs font-semibold">
              🚀 Entrega estimada: Hoy antes de las 9 PM
            </div>
          `
          : `
            <div class="mt-2 px-3 py-2 rounded-lg
                        bg-red-100 text-red-700
                        text-xs font-semibold">
              🕘 Entrega estimada: Mañana a partir de las 9 AM
            </div>
          `;

        mensajeExtra.innerHTML = `
          Te faltan 
          <strong class="text-green-600">$${faltan.toFixed(0)}</strong>
          para envío gratis
          ${mensajeHorario}
        `;
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

  const mensaje = `
Hola, quiero cotizar envío para:
${nombreProducto} ${nombrePresentacion}

Precio: $${precioActual}
Zona: Mérida (fuera de Caucel)
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




window.seleccionarColor = color => {

  window._colorSeleccionado = color;

  const botones = document.querySelectorAll(".color-btn");
  const label = document.getElementById("colorSeleccionadoLabel");

  botones.forEach(b => {
    b.classList.remove("ring-2","ring-blue-600","scale-110","border-blue-600");
    b.classList.add("border-gray-300");
  });

  const btnActivo = document.querySelector(
    `.color-btn[data-color="${color}"]`
  );

  if (btnActivo) {
    btnActivo.classList.add(
      "ring-2","ring-blue-600","scale-110","border-blue-600"
    );
    btnActivo.classList.remove("border-gray-300");
  }

  if (label) label.textContent = color;

  // 🔹 Cambiar imagen
  if (window._imagenesPorColor?.[color]) {
    const img = document.getElementById("imgPrincipal");
    if (img) {
      img.style.opacity = "0";
      setTimeout(() => {
        img.src = window._imagenesPorColor[color];
        img.style.opacity = "1";
      }, 150);
    }
  }

  // 🔹 Cambiar precio por color (si existe presentación por color)
  const presPorColor = window._presentaciones
    ?.find(p => p.color === color);

  if (presPorColor) {
    const precioEl = document.getElementById("precioProducto");
    if (precioEl) {
      precioEl.textContent = `$${presPorColor.precio}`;
    }
    actualizarEnvio(presPorColor.precio);
  }
};

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

      abrirLightbox(index); // 👈 ESTA LÍNEA
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
  img.src = window._productoActualImgs[lbIndex];

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
      img.src = imgs[lbIndex];
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

  if (e.target.id === "lbClose" || e.target.id === "lightbox") {
    cerrarLightbox();
  }

  if (e.target.id === "lbPrev") {
    cambiarLightbox(-1);
  }

  if (e.target.id === "lbNext") {
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

  if (e.target.closest("#btnToggleDescTab")) {

    const resumen = document.getElementById("descResumenTab");
    const completa = document.getElementById("descCompletaTab");
    const txt = document.getElementById("txtToggleDesc");
    const icon = document.getElementById("iconToggleDesc");

    if (!resumen || !completa) return;

    const abierta = !completa.classList.contains("hidden");

    if (abierta) {
      completa.classList.add("hidden");
      resumen.classList.remove("hidden");
      if (txt) txt.textContent = "Ver más";
      if (icon) icon.classList.remove("rotate-180");
    } else {
      completa.classList.remove("hidden");
      resumen.classList.add("hidden");
      if (txt) txt.textContent = "Ver menos";
      if (icon) icon.classList.add("rotate-180");
    }
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