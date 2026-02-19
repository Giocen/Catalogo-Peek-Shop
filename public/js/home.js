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

  if (contenedor) {
    contenedor.innerHTML = `
      ${Array(8).fill(`
        <div class="card-producto p-3">
          <div class="skeleton h-36 mb-3"></div>
          <div class="skeleton h-4 w-3/4 mb-2"></div>
          <div class="skeleton h-4 w-1/2"></div>
        </div>
      `).join("")}
    `;
  }

  try {
      const { data, error } = await supabase
      .from("catalogo_productos")
      .select(`
        id,
        nombre,
        precio,
        es_oferta,
        precio_anterior,
        categoria,
        marca,
        catalogo_multimedia (
          id,
          url,
          tipo,
          orden
        ),
        catalogo_presentaciones(
          id,
          nombre,
          precio,
          precio_oferta,
          en_oferta
        )
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

      const imagenOrdenada =
        p.catalogo_multimedia
          ?.filter(m => m.tipo === "imagen")
          ?.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

      const img =
        imagenOrdenada?.[0]?.url ||
        "/img/placeholder.png";


      let precioMin = p.precio;
      let precioMax = p.precio;

      if (p.catalogo_presentaciones?.length) {
        const precios = p.catalogo_presentaciones.map(v => Number(v.precio));
        precioMin = Math.min(...precios);
        precioMax = Math.max(...precios);
      }

      const totalPresentaciones = p.catalogo_presentaciones?.length || 0;

      const tieneVariantes = totalPresentaciones > 1;

      const textoBoton = tieneVariantes
        ? "Ver opciones"
        : "Agregar al carrito";

        // 🔥 DETECTAR OFERTA
        let enOferta = false;

        const presOferta = p.catalogo_presentaciones?.find(v => v.en_oferta);

        if (presOferta && presOferta.precio_oferta) {
          enOferta = true;
        }
        else if (p.es_oferta) {
          enOferta = true;
        }


      return `
      <div class="card-producto group relative overflow-hidden">

            ${enOferta ? `
            <div class="badge-oferta-diagonal animate-oferta pointer-events-none">
              🔥 OFERTA
            </div>
          ` : ""}



        <div class="aspect-square bg-white overflow-hidden rounded-t-2xl relative cursor-pointer flex items-center justify-center"
            onclick="location.href='/producto.html?id=${p.id}'">

          <img
            src="${img}"
            loading="lazy"
            class="max-h-full max-w-full object-contain
                  transition-transform duration-300 group-hover:scale-105"
          >
        </div>

       <div class="p-2 sm:p-3 flex flex-col flex-1">
        <div class="text-xs sm:text-sm font-medium leading-tight line-clamp-2 cursor-pointer"
              onclick="location.href='/producto.html?id=${p.id}'">
            ${p.nombre}
          </div>

          <div class="text-base sm:text-lg font-bold text-green-700 mt-1">
              ${
                precioMin !== precioMax
                  ? `$${precioMin} – $${precioMax}`
                  : `$${precioMin}`
              }
            </div>

            ${
              tieneVariantes
                ? `<div class="text-[11px] sm:text-xs text-blue-600 font-medium mt-1">
                    Disponible en ${totalPresentaciones} presentaciones
                  </div>`
                : ""
            }

            <button
              class="btn-agregar mt-auto bg-blue-600 hover:bg-blue-700
                    text-white text-sm py-2 rounded-xl
                    transition transform active:scale-95"
              data-id="${p.id}"
              data-nombre="${p.nombre.replace(/"/g, '&quot;')}"
              data-precio="${precioMin}"
              data-imagen="${img}"
              data-variante="${tieneVariantes}"
            >
              ${textoBoton}
            </button>




        </div>
      </div>
      `;
    })
    .join("");

  

  setTimeout(() => {
    if (window.activarAnimacionProductos) {
      activarAnimacionProductos();
    }
  }, 50);
}


// 🔥 Activar animación al renderizar
setTimeout(() => {
  if (window.activarAnimacionProductos) {
    activarAnimacionProductos();
  }
}, 50);

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
   BOTONES CARRITO (MÓVIL + DESKTOP)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
const btnCarrito = document.getElementById("btnCarrito");
if (btnCarrito) {
  btnCarrito.addEventListener("click", abrirCarrito);
}

const btnCarritoDesktop = document.getElementById("btnCarritoDesktop");
if (btnCarritoDesktop) {
  btnCarritoDesktop.addEventListener("click", abrirCarrito);
}
});

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


// Delegación global para botones agregar
document.addEventListener("click", e => {

  const btn = e.target.closest(".btn-agregar");
  if (!btn) return;

  const id = btn.dataset.id;
  const nombre = btn.dataset.nombre;
  const precio = Number(btn.dataset.precio);
  const imagen = btn.dataset.imagen;

  const esVariante = btn.dataset.variante === "true";

  if (esVariante) {
    location.href = `/producto.html?id=${id}`;
    return;
  }

  agregarAlCarrito({
    id,
    nombre,
    precio,
    imagen
  });

  animarAgregar(btn);
});


/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initZonas();
  cargarCatalogo();
});


