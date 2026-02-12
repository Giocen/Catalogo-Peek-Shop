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

  { componente: "brand", zona: "right", orden: 2 },
  { componente: "name", zona: "right", orden: 3 },
  { componente: "category", zona: "right", orden: 4 },

  { componente: "price", zona: "right", orden: 5 },
  { componente: "offer", zona: "right", orden: 6 },

  { componente: "color", zona: "right", orden: 7 },
  { componente: "variant", zona: "right", orden: 8 },
  

  { componente: "buttons", zona: "right", orden: 10 },
  { componente: "description", zona: "full", orden: 11 }
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

  <div class="max-w-6xl mx-auto px-4">
    <div class="grid md:grid-cols-2 gap-10">

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
              ? `
              <div class="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-4">
                ${ctx.p.descripcion
                  .split("\n\n")
                  .map(p => `<p>${p}</p>`)
                  .join("")}
              </div>
              `
              : `
              <div class="text-sm text-gray-400">
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
    <div class="flex flex-col items-center gap-4">

      <!-- Imagen principal -->
      <div id="imgZoomWrap"
        class="relative border rounded-xl bg-gray-50 
              w-full aspect-square flex items-center justify-center">
        <img id="imgPrincipal"
          src="${imgs[0]}"
          class="max-w-full max-h-full object-contain">
      </div>

      <!-- Thumbnails -->
      <div class="flex gap-2">
        ${imgs.map(i => `
          <img src="${i}"
            onclick="_cambiarImg('${i}')"
            class="w-14 h-14 border rounded cursor-pointer object-contain">
        `).join("")}
      </div>

    </div>`;
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
    if (
      e.target.id !== "btnAgregar" &&
      e.target.id !== "btnComprarAhora"
    ) return;

  if (!window._presentacionSeleccionada) {

  Swal.fire({
    icon: "warning",
    title: "Selecciona una presentación",
    text: "Elige una opción antes de continuar",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#16a34a",
    background: "#ffffff",
    backdrop: "rgba(0,0,0,0.45)",
    showClass: {
      popup: "animate__animated animate__bounceIn"
    },
    hideClass: {
      popup: "animate__animated animate__fadeOut"
    }
  });

  const variantes = document.querySelector(".variantes");

  if (variantes) {

    // 🔹 Scroll suave
    variantes.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    // 🔹 Micro animación visual
    variantes.classList.add("ring-2", "ring-red-400", "animate-pulse");

    setTimeout(() => {
      variantes.classList.remove("ring-2", "ring-red-400", "animate-pulse");
    }, 1200);
  }

  return;
}
    agregarAlCarrito({
      id: p.id,
      presentacion_id: window._presentacionSeleccionada.id,
      nombre: p.nombre,
      precio: window._presentacionSeleccionada.precio,
      imagen: imgBase,
      presentacion: `${window._presentacionSeleccionada.cantidad || ""} ${window._presentacionSeleccionada.unidad || ""}`,
      color: window._colorSeleccionado || null
    });
  });
}



/* =========================================================
   ZOOM
========================================================= */
function activarZoom() {
  if (window.innerWidth < 768) return; // ⛔ no zoom en móvil

  const wrap = document.getElementById("imgZoomWrap");
  const img = document.getElementById("imgPrincipal");
  if (!wrap || !img) return;

  wrap.onmousemove = e => {
    const r = wrap.getBoundingClientRect();
    img.style.transformOrigin =
      `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    img.style.transform = "scale(1.8)";
  };

  wrap.onmouseleave = () => {
    img.style.transform = "scale(1)";
  };
}


window._cambiarImg = src => {
  const img = document.getElementById("imgPrincipal");
  if (img) img.src = src;
};

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
    case "brand":
      return ctx.p.marca
        ? `<div class="text-sm uppercase text-gray-500">${ctx.p.marca}</div>`
        : "";

    /* ================= NOMBRE ================= */
    case "name":
      return `
        <h1 class="text-xl font-bold leading-tight">
          ${ctx.p.nombre}
        </h1>
      `;


    /* ================= CATEGORÍA ================= */
    case "category":
      return `<div class="text-sm text-gray-500">${ctx.p.categoria}</div>`;

    /* ================= PRECIO ================= */
      case "price":
        return `
          <div class="space-y-3">

            <div id="precioProducto"
                class="text-3xl font-bold text-green-600">
              $${ctx.p.precio}
            </div>

            <!-- ENVÍO DINÁMICO -->
            <div id="bloqueEnvio"
                class="rounded-xl bg-gray-50 border p-4 text-sm transition space-y-3">

              <!-- Selector Zona -->
              <div>
                <select id="zonaEnvio"
                  class="w-full border rounded-lg p-2 text-xs">
                  <option value="Caucel">Ciudad Caucel</option>
                  <option value="Merida">Mérida (otra colonia)</option>
                </select>
              </div>

              <!-- Info envío -->
              <div class="flex items-center gap-2">
                <span id="iconoEnvio">📦</span>
                <span id="textoEnvio" class="font-medium text-gray-700">
                  Calculando envío...
                </span>
              </div>

              <!-- Barra progreso -->
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
                  <div class="variantes">
                    ${ctx.presentaciones.map(v => `
                      <button
                        class="variante px-3 py-2 rounded-full border text-sm hover:bg-blue-50 transition"
                        data-id="${v.id}"
                        onclick="seleccionarPresentacion('${v.id}')">
                        ${v.cantidad || ""} ${v.unidad || ""}
                      </button>
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

    /* ================= DESCRIPCIÓN ================= */
   case "description":
      return `
        <div class="text-sm text-gray-700 leading-relaxed">
          ${ctx.p.descripcion || ""}
        </div>
      `;


    default:
      return "";
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
  if (btn) btn.classList.add("ring-2", "ring-blue-600", "bg-blue-50");
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
        mensajeExtra.innerHTML = `
          Te faltan 
          <strong class="text-green-600">$${faltan.toFixed(0)}</strong>
          para envío gratis
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

