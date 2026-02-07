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
   🔐 DETECTAR ADMIN (UNA SOLA VEZ)
========================================================= */
let ES_ADMIN = false;

await new Promise(resolve => {
  onAuthStateChanged(auth, user => {
    ES_ADMIN = !!user;
    window.ES_ADMIN = ES_ADMIN; // 🔑 GLOBAL REAL

    console.log(
      ES_ADMIN
        ? "🛠️ Producto en modo ADMIN"
        : "👤 Producto en modo CLIENTE"
    );

    resolve();
  });
});

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

  if (!id) {
    console.warn("⛔ producto.html sin ?id=");
    cont.innerHTML = `
      <div class="text-center text-gray-500 py-10">
        Producto no válido
      </div>`;
    return;
  }

  /* ===== PRODUCTO BASE ===== */
  const { data: p, error } = await supabase
    .from("catalogo_productos")
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      categoria,
      permitir_compra,
      permitir_carrito,
      badges,
      activo,
      catalogo_multimedia(url, orden, tipo)
    `)
    .eq("id", id)
    .single();

  if (error || !p || !p.activo) {
    cont.innerHTML = `<p class="text-red-600">Producto no disponible</p>`;
    return;
  }

  /* ===== PRESENTACIONES ===== */
  const { data: presentaciones } = await supabase
    .from("catalogo_presentaciones")
    .select(`
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

  /* ===== MEDIA ===== */
  const media = (p.catalogo_multimedia || [])
    .filter(m => m.url)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const imgs = media.length
    ? media.map(m => m.url)
    : ["/img/placeholder.png"];

  /* ===== BLOQUES ===== */
  const bloquesProducto = await cargarBloquesProducto(p.id);

  /* =======================================================
     RENDER
  ======================================================= */
  cont.innerHTML = `
    ${renderBreadcrumb(p)}
    ${renderGaleria(imgs)}
    ${renderInfo(p, presentaciones)}
    ${renderBloquesProducto(bloquesProducto)}
    ${renderDescripcion(p)}
  `;

  activarZoom();
  activarBotones(p, imgs[0]);
  cargarRelacionados(p.categoria, p.id);

  /* =======================================================
     🔑 ACTIVAR CMS INLINE (ADMIN) — CLAVE
  ======================================================= */
  if (window.ES_ADMIN && typeof window.initAdminProducto === "function") {
    window.initAdminProducto();
  }
}

/* =========================================================
   RENDER BASE
========================================================= */

function renderBreadcrumb(p) {
  if (!p.categoria) return "";
  return `
    <div class="col-span-full mb-4 text-sm text-blue-600">
      <a href="/" class="hover:underline font-medium">← Volver</a>
      <span class="text-gray-400 mx-2">›</span>
      <span class="text-gray-500">${p.categoria}</span>
    </div>`;
}

function renderGaleria(imgs) {
  return `
    <div class="flex gap-4">
      <div class="flex flex-col gap-2">
        ${imgs.map(i => `
          <img src="${i}"
               onclick="_cambiarImg('${i}')"
               class="w-14 h-14 object-contain border rounded cursor-pointer
                      hover:border-blue-500 bg-white">`).join("")}
      </div>

      <div id="imgZoomWrap"
           class="relative bg-white border rounded-lg
                  flex items-center justify-center
                  w-[420px] h-[420px] overflow-hidden">
        <img id="imgPrincipal"
             src="${imgs[0]}"
             class="max-w-full max-h-full object-contain transition-transform duration-200">
      </div>
    </div>`;
}

function renderInfo(p, presentaciones = []) {
  return `
    <div class="flex flex-col gap-4">
      <h1 data-editable="true" data-field="nombre"
          class="text-2xl font-semibold">${p.nombre}</h1>

      ${renderBadges(p.badges)}

      <div data-editable="true" data-field="precio"
           class="text-4xl font-light">
        $${Number(p.precio).toLocaleString("es-MX")}
        <span class="text-base text-gray-500">MXN</span>
      </div>

      ${renderPresentaciones(presentaciones)}
      ${renderBotones(p)}
    </div>`;
}

function renderBadges(badges = []) {
  if (!Array.isArray(badges)) return "";
  const activos = badges.filter(b => b.activo);
  if (!activos.length) return "";
  return `
    <div class="flex flex-wrap gap-2 text-sm text-gray-600">
      ${activos.map(b => `<span>${b.texto}</span>`).join("")}
    </div>`;
}

function renderPresentaciones(presentaciones) {
  if (!presentaciones.length) return "";
  return `
    <div>
      <div class="text-sm font-semibold mb-2">Presentaciones</div>
      <div class="space-y-2">
        ${presentaciones.map(p => `
          <div class="flex justify-between items-center
                      border rounded-lg px-3 py-2 bg-gray-50">
            <div class="text-sm">
              ${p.nombre || ""}
              ${p.cantidad ? `${p.cantidad} ${p.unidad}` : ""}
              ${p.talla ? `· ${p.talla}` : ""}
            </div>
            <div class="font-semibold">
              ${
                p.en_oferta && p.precio_oferta
                  ? `<span class="line-through text-gray-400 mr-2">$${p.precio}</span>
                     <span class="text-red-600">$${p.precio_oferta}</span>`
                  : `$${p.precio}`
              }
            </div>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderBotones(p) {
  return `
    <div class="mt-4 flex flex-col gap-3">
      ${p.permitir_compra !== false ? `
        <button id="btnComprarAhora"
                class="bg-blue-600 hover:bg-blue-700
                       text-white py-3 rounded-md font-semibold text-lg">
          Comprar ahora
        </button>` : ""}

      ${p.permitir_carrito !== false ? `
        <button id="btnAgregar"
                class="border border-blue-600
                       text-blue-600 py-3 rounded-md
                       font-semibold hover:bg-blue-50">
          Agregar al carrito
        </button>` : ""}
    </div>`;
}

function renderDescripcion(p) {
  if (!p.descripcion) return "";
  return `
    <div class="col-span-full mt-10 border-t pt-6">
      <h2 class="font-semibold mb-2 text-lg">Descripción</h2>
      <div data-editable="true" data-field="descripcion"
           class="text-sm text-gray-700 leading-relaxed">
        ${p.descripcion}
      </div>
    </div>`;
}

/* =========================================================
   BLOQUES DINÁMICOS
========================================================= */

async function cargarBloquesProducto(productoId) {
  const { data } = await supabase
    .from("catalogo_bloques")
    .select("*")
    .eq("zona", "producto")
    .eq("producto_id", productoId)
    .eq("activo", true)
    .order("orden");

  return data || [];
}

function renderBloquesProducto(bloques = []) {
  if (!bloques.length) return "";
  return `
    <div class="col-span-full mt-8 grid grid-cols-4 gap-4">
      ${bloques.map(b => `
        <div class="rounded-xl overflow-hidden bg-white shadow"
             style="grid-column: span ${b.columnas || 4}; height:${b.alto || 200}px">
          ${
            b.tipo === "video"
              ? `<video src="${b.url}" autoplay muted loop class="w-full h-full object-cover"></video>`
              : `<img src="${b.url}" class="w-full h-full object-cover">`
          }
        </div>`).join("")}
    </div>`;
}

/* =========================================================
   ACCIONES
========================================================= */

function activarBotones(p, img) {
  const agregarFn = () =>
    agregarAlCarrito({ id: p.id, nombre: p.nombre, precio: p.precio, imagen: img });

  document.getElementById("btnAgregar")?.addEventListener("click", agregarFn);
  document.getElementById("btnComprarAhora")?.addEventListener("click", agregarFn);

  if (document.getElementById("btnStickyAgregar")) {
    document.getElementById("btnStickyAgregar").onclick = agregarFn;
    sticky?.classList.remove("hidden");
  }
}

/* =========================================================
   ZOOM
========================================================= */

function activarZoom() {
  const wrap = document.getElementById("imgZoomWrap");
  const img = document.getElementById("imgPrincipal");
  if (!wrap || !img) return;

  if (window.matchMedia("(hover: hover)").matches) {
    wrap.addEventListener("mousemove", e => {
      const r = wrap.getBoundingClientRect();
      img.style.transformOrigin =
        `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      img.style.transform = "scale(1.8)";
    });
    wrap.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1)";
      img.style.transformOrigin = "center";
    });
  }
}

window._cambiarImg = src => {
  const img = document.getElementById("imgPrincipal");
  if (img) img.src = src;
};

/* =========================================================
   RELACIONADOS
========================================================= */

async function cargarRelacionados(categoria, actualId) {
  if (!categoria || !relacionadosDiv) return;

  const { data } = await supabase
    .from("catalogo_productos")
    .select(`id,nombre,precio,catalogo_multimedia(url)`)
    .eq("categoria", categoria)
    .neq("id", actualId)
    .eq("activo", true)
    .limit(4);

  relacionadosDiv.innerHTML = (data || []).map(p => {
    const img = p.catalogo_multimedia?.[0]?.url || "/img/placeholder.png";
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
