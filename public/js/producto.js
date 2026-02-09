// ==================================
// producto.js — CMS por BLOQUES (v3)
// ==================================

import { supabase } from "./supabase.js";
import { agregarAlCarrito } from "./carrito.js";
import { auth } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================================================
   🔐 DETECTAR ADMIN (NO BLOQUEANTE)
========================================================= */
let ES_ADMIN = false;
window.ES_ADMIN = false;

onAuthStateChanged(auth, user => {
  ES_ADMIN = !!user;
  window.ES_ADMIN = ES_ADMIN;

  console.log(
    ES_ADMIN
      ? "🛠️ Producto en modo ADMIN"
      : "👤 Producto en modo CLIENTE"
  );

  mostrarBadgeAdmin();

});


/* =========================================================
   🛠️ BADGE MODO EDICIÓN (SOLO ADMIN)
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
    flex items-center gap-2
  `;

  badge.innerHTML = `
    🛠️ Modo edición
    <button id="adminVolver"
      class="ml-2 bg-white/20 px-2 rounded">
      📦
    </button>
  `;

  document.body.appendChild(badge);

  document.getElementById("adminVolver").onclick = () => {
    location.href = "/";
  };
}

/* =========================================================
   PARAMS + DOM
========================================================= */
const params = new URLSearchParams(location.search);
const id = params.get("id");

const cont = document.getElementById("producto");
const relacionadosDiv = document.getElementById("relacionados");
const sticky = document.getElementById("stickyBuy");

/* =========================================================
   INIT
========================================================= */
cargarProducto();

/* =========================================================
   CARGAR PRODUCTO
========================================================= */
async function cargarProducto() {

  if (!cont) {
    console.error("❌ No existe #producto en el DOM");
    return;
  }

 

  /* ================= PRODUCTO BASE ================= */
 const { data: p, error } = await supabase
  .from("catalogo_productos")
  .select(`
    id,
    nombre,
    descripcion,
    precio,
    categoria,
    activo,
    es_oferta,
    precio_anterior,
    imagen_principal,
    colores
  `)
  .eq("id", id)
  .single();


  if (error || !p || !p.activo) {
    cont.innerHTML = `<p class="text-red-600">Producto no disponible</p>`;
    return;
  }

  // Defaults cuando no existen columnas en DB
p.permitir_compra ??= true;
p.permitir_carrito ??= true;


  /* ================= MULTIMEDIA ================= */
  const { data: media } = await supabase
    .from("catalogo_multimedia")
    .select("url,orden,tipo")
    .eq("producto_id", p.id)
    .order("orden");

  p.catalogo_multimedia = media || [];

  /* ================= PRESENTACIONES ================= */
  const { data: presentaciones } = await supabase
  .from("catalogo_presentaciones")
  .select(`
    id,
    nombre,
    unidad,
    cantidad,
    talla,
    precio,
    precio_oferta,
    en_oferta,
    activo
  `)
  .eq("producto_id", p.id)
  .eq("activo", true)
  .order("precio");


  /* ================= MEDIA ORDENADA ================= */
  const mediaOrdenada = (p.catalogo_multimedia || [])
    .filter(m => m.url)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const imgs = mediaOrdenada.length
    ? mediaOrdenada.map(m => m.url)
    : ["/img/placeholder.png"];   

    /* ================= LAYOUT GLOBAL (TIPO SHOPIFY) ================= */
const layout = await cargarLayoutProducto();

if (!layout.length && window.ES_ADMIN) {

  // 👇 INICIALIZA EL CMS AUNQUE NO HAYA BLOQUES
  if (typeof window.initAdminProducto === "function") {
    window.initAdminProducto();
  }

  cont.innerHTML = `
    <div class="col-span-full text-center py-20 text-gray-400">
      <p class="text-lg font-semibold">🧱 Sin layout</p>
      <p class="mt-2">Usa “➕ Bloque layout” para empezar a diseñar este producto</p>
    </div>
  `;
  return;
}


  const ctx = {
    p,
    imgs,
    presentaciones
  };

  cont.innerHTML = `
    ${renderBreadcrumb(p)}

    <div class="grid grid-cols-4 gap-4">
      ${layout.map(b => `
        <div
          class="${window.ES_ADMIN ? "admin-layout-bloque" : ""}"
          data-layout-id="${b.id}"
          data-cols="${b.columnas || 4}"
          style="grid-column: span ${b.columnas || 4}"
        >
          ${window.ES_ADMIN ? `<div class="admin-layout-resize"></div>` : ""}
          ${renderComponente(b, ctx)}
        </div>
      `).join("")}
    </div>
  `;

  activarZoom();
  activarBotones(p, imgs[0]);
  cargarRelacionados(p.categoria, p.id);

  if (window.ES_ADMIN && typeof window.initAdminProducto === "function") {
    window.initAdminProducto();
  }
}
/* =========================================================
   RENDER HELPERS
========================================================= */

function renderBreadcrumb(p) {
  if (!p.categoria) return "";
  return `
    <div class="col-span-full mb-4 text-sm text-blue-600">
      <a href="/" class="hover:underline font-medium">← Volver</a>
      <span class="mx-2 text-gray-400">›</span>
      <span class="text-gray-500">${p.categoria}</span>
    </div>`;
}

function renderGaleria(imgs) {
  return `
    <div class="flex gap-4">
      <div class="flex flex-col gap-2">
        ${imgs.map(i => `
         <img src="${i}"
          data-img-url="${i}"
          class="w-14 h-14 object-contain border rounded cursor-pointer
            ${window.ES_ADMIN ? "admin-img-thumb" : ""}">
        `).join("")}
      </div>
      <div id="imgZoomWrap"
           class="relative bg-white border rounded-lg
                  flex items-center justify-center
                  w-[420px] h-[420px] overflow-hidden">
        <img id="imgPrincipal"
             src="${imgs[0]}"
             class="max-w-full max-h-full object-contain">
      </div>
    </div>`;
}

function renderPresentaciones(presentaciones) {
  if (!presentaciones.length) return "";

return `
  <div class="space-y-3">
    ${presentaciones.map(p => `
      <div class="border rounded-lg p-3 bg-gray-50
        ${window.ES_ADMIN ? "admin-presentacion" : ""}"
        data-presentacion-id="${p.id}">

        <div class="flex justify-between items-center mb-2">
          <div class="font-semibold">
            ${p.nombre || ""}
            ${p.cantidad ? `· ${p.cantidad} ${p.unidad}` : ""}
            ${p.talla ? `· ${p.talla}` : ""}
          </div>

          ${p.en_oferta
            ? `<span class="text-xs bg-red-600 text-white px-2 py-1 rounded">Oferta</span>`
            : ""
          }
        </div>

        <div class="flex justify-between items-center">
          <div class="font-bold text-lg">
            ${
              p.en_oferta && p.precio_oferta
                ? `<span class="line-through text-gray-400 mr-2">$${p.precio}</span>
                   <span class="text-red-600">$${p.precio_oferta}</span>`
                : `$${p.precio}`
            }
          </div>

          ${window.ES_ADMIN ? `
            <button class="text-blue-600 text-sm"
                    onclick="abrirEditorPresentacion('${p.id}')">
              Editar
            </button>
          ` : ""}
        </div>
      </div>
    `).join("")}
  </div>
`;

}

function renderBotones(p) {
  return `
    <div class="mt-4 space-y-3">
      ${p.permitir_compra !== false ? `
        <button id="btnComprarAhora"
          class="w-full bg-blue-600 text-white py-3 rounded">
          Comprar ahora
        </button>` : ""}

      ${p.permitir_carrito !== false ? `
        <button id="btnAgregar"
          class="w-full border border-blue-600 text-blue-600 py-3 rounded">
          Agregar al carrito
        </button>` : ""}
    </div>`;
}

function renderDescripcion(p) {
  if (!p.descripcion) return "";
  return `
    <div class="mt-10 border-t pt-6">
      <h2 class="font-semibold mb-2">Descripción</h2>
      <div
          data-editable="true"
          data-field="descripcion"
          data-type="textarea"
        >
          ${p.descripcion}
      </div>
    </div>`;
}


/* =========================================================
   ACCIONES + ZOOM
========================================================= */

function activarBotones(p, img) {
  const fn = () => agregarAlCarrito({
    id: p.id, nombre: p.nombre, precio: p.precio, imagen: img
  });

  document.getElementById("btnAgregar")?.addEventListener("click", fn);
  document.getElementById("btnComprarAhora")?.addEventListener("click", fn);
}

function activarZoom() {
  const wrap = document.getElementById("imgZoomWrap");
  const img = document.getElementById("imgPrincipal");
  if (!wrap || !img) return;

  wrap.addEventListener("mousemove", e => {
    const r = wrap.getBoundingClientRect();
    img.style.transformOrigin =
      `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    img.style.transform = "scale(1.8)";
  });

  wrap.addEventListener("mouseleave", () => {
    img.style.transform = "scale(1)";
  });
}

window._cambiarImg = src => {
  const img = document.getElementById("imgPrincipal");
  if (img) img.src = src;
};

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
      ?.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))[0]
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
      </div>
    `;
  }).join("");
}


async function cargarLayoutProducto() {
  const { data, error } = await supabase
    .from("catalogo_layout_producto")
    .select("*")
    .eq("activo", true)
    .order("orden");

  if (error) {
    console.error("❌ Error layout:", error);
    return [];
  }

  return data || [];
}


function renderComponente(b, ctx) {

  switch (b.componente) {

    case "image":
      return renderGaleria(ctx.imgs);

    case "price":
      return `
        <div>
          <div class="text-4xl font-light">
            $${Number(ctx.p.precio).toLocaleString("es-MX")}
          </div>
        </div>
      `;

    case "offer":
      return ctx.p.es_oferta
        ? `<div class="text-red-600 font-bold">🔥 OFERTA</div>`
        : "";

    case "presentations":
      return renderPresentaciones(ctx.presentaciones);

    case "description":
      return renderDescripcion(ctx.p);

    case "text":
      return `<div>${b.config?.contenido || ""}</div>`;

    case "image_ad":
      return `<img src="${b.config?.url}" class="rounded-lg w-full">`;

    case "video_ad":
      return `
        <video src="${b.config?.url}"
               autoplay muted loop
               class="rounded-lg w-full"></video>
      `;

    default:
      return "";
  }
}


