import { supabase } from "./supabase.js";
import { abrirCarrito, agregarAlCarrito } from "./carrito.js";

/* =========================================================
   🔑 EXPONER FUNCIONES
========================================================= */
window.agregarAlCarrito = agregarAlCarrito;
window.abrirCarrito = abrirCarrito;

/* =========================================================
   CONFIG
========================================================= */
const ZONAS = ["superior", "lateral-izq", "lateral-der"];

/* =========================================================
   CARGAR ZONAS DINÁMICAS (catalogo_bloques)
========================================================= */
async function cargarZona(zona) {
  try {
    const { data, error } = await supabase
      .from("catalogo_bloques")
      .select("*")
      .eq("zona", zona)
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) throw error;

    const cont = document.getElementById(`zona-${zona}`);
    if (!cont) return;

    if (!data?.length) {
      cont.innerHTML = "";
      return;
    }

    cont.innerHTML = data
      .map(b => `
        <div
          class="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition"
          style="grid-column: span ${b.columnas || 4};
                 height:${b.alto || 180}px"
        >
          ${
            b.tipo === "video"
              ? `<video src="${b.url}" autoplay muted loop
                   class="w-full h-full object-cover"></video>`
              : `<img src="${b.url}"
                   class="w-full h-full object-cover">`
          }
        </div>
      `)
      .join("");

  } catch (err) {
    console.error("Error cargando zona:", zona, err);
  }
}

/* =========================================================
   INICIALIZAR ZONAS
========================================================= */
function initZonas() {
  ZONAS.forEach(zona => cargarZona(zona));
}

document.addEventListener("zona-actualizada", e => {
  cargarZona(e.detail);
});

/* =========================================================
   CATÁLOGO DE PRODUCTOS
========================================================= */
const contenedor = document.getElementById("productos");
const categoriasDiv = document.getElementById("categorias");
let productosCache = [];

/* ---------------------------------------------------------
   CARGAR CATÁLOGO
--------------------------------------------------------- */
async function cargarCatalogo() {
  try {
    const { data, error } = await supabase
      .from("catalogo_productos")
      .select(`
        id,
        nombre,
        precio,
        categoria,
        marca,
        catalogo_multimedia(url, tipo)
      `)
      .eq("activo", true);

    if (error) throw error;

    productosCache = data || [];

    const params = new URLSearchParams(location.search);
    const marcaFiltro = params.get("marca");

    if (marcaFiltro) {
      productosCache = productosCache.filter(p =>
        (p.marca || "").toLowerCase() === marcaFiltro.toLowerCase()
      );
    }

    renderCategorias(productosCache);
    renderProductos(productosCache);

  } catch (err) {
    console.error("Error cargando productos:", err);
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="col-span-full text-center text-red-600 py-10">
          Error cargando productos
        </div>
      `;
    }
  }
}

/* ---------------------------------------------------------
   RENDER PRODUCTOS
--------------------------------------------------------- */
function renderProductos(productos) {
  if (!contenedor) return;

  if (!productos.length) {
    contenedor.innerHTML = `
      <div class="col-span-full text-center text-gray-500 py-10">
        No hay productos disponibles
      </div>
    `;
    return;
  }

  contenedor.innerHTML = productos
    .map(p => {
      const img =
        p.catalogo_multimedia?.find(m => m.tipo === "imagen")?.url ||
        "/img/placeholder.png";

     return `
      <div class="bg-white rounded-2xl shadow hover:shadow-xl transition flex flex-col group">

        <div class="aspect-square bg-gray-100 overflow-hidden rounded-t-2xl relative cursor-pointer"
            onclick="location.href='/producto.html?id=${p.id}'">

          <img
            src="${img}"
            class="w-full h-full object-contain
                  transition-transform duration-300 group-hover:scale-105"
          >

        </div>

        <div class="p-3 flex flex-col flex-1">

          <div class="text-sm font-medium line-clamp-2 cursor-pointer"
              onclick="location.href='/producto.html?id=${p.id}'">
            ${p.nombre}
          </div>

          <div class="text-lg font-extrabold text-green-700 mt-2">
            $${p.precio}
          </div>

          <button
            class="mt-auto bg-blue-600 hover:bg-blue-700
                  text-white text-sm py-2 rounded-xl
                  transition transform active:scale-95"
            onclick='agregarAlCarrito(${JSON.stringify({
              id: p.id,
              nombre: p.nombre,
              precio: p.precio,
              imagen: img
            })}); animarAgregar(this)'
          >
            Agregar al carrito
          </button>

        </div>
      </div>
      `;
    })
    .join("");
}

/* =========================================================
   ANIMACIÓN
========================================================= */
window.animarAgregar = btn => {
  btn.classList.add("animate-pulse");
  setTimeout(() => btn.classList.remove("animate-pulse"), 350);
};

/* ---------------------------------------------------------
   CATEGORÍAS
--------------------------------------------------------- */
function renderCategorias(productos) {
  if (!categoriasDiv) return;

  const cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  categoriasDiv.innerHTML = `
    <button class="chip activo" data-cat="">Todo</button>
    ${cats.map(c => `
      <button class="chip" data-cat="${c}">${c}</button>
    `).join("")}
  `;

  categoriasDiv.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      categoriasDiv.querySelectorAll(".chip")
        .forEach(b => b.classList.remove("activo"));

      btn.classList.add("activo");

      const cat = btn.dataset.cat;

      renderProductos(
        cat
          ? productosCache.filter(p => p.categoria === cat)
          : productosCache
      );
    });
  });
}

/* =========================================================
   BOTÓN CARRITO
========================================================= */
const btnCarrito = document.getElementById("btnCarrito");
if (btnCarrito) btnCarrito.addEventListener("click", abrirCarrito);

/* =========================================================
   BUSCADOR
========================================================= */
const buscador = document.getElementById("buscador");
if (buscador) {
  buscador.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    renderProductos(
      productosCache.filter(p =>
        p.nombre.toLowerCase().includes(q)
      )
    );
  });
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initZonas();
  cargarCatalogo();
});
