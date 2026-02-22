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
let productosCache = [];

/* =========================================================
   🎯 FILTROS GLOBALES
========================================================= */
let filtrosActivos = {
  categoria: null,
  mascota: null,
  marca: null,
  precioMin: null,
  precioMax: null,
  soloOfertas: false,
  busqueda: ""
};

function aplicarFiltrosGlobales() {

  let resultado = productosCache.filter(p => {

    if (filtrosActivos.categoria &&
        p.categoria !== filtrosActivos.categoria)
      return false;

    if (filtrosActivos.mascota &&
        p.tipo_mascota !== filtrosActivos.mascota)
      return false;

    if (filtrosActivos.marca &&
        p.marca !== filtrosActivos.marca)
      return false;

    if (filtrosActivos.soloOfertas &&
        !p.es_oferta)
      return false;

    if (filtrosActivos.busqueda) {
      const texto = `
        ${p.nombre || ""}
        ${p.marca || ""}
        ${p.categoria || ""}
      `.toLowerCase();

      if (!texto.includes(filtrosActivos.busqueda))
        return false;
    }

    if (filtrosActivos.precioMin !== null &&
    Number(p.precio) < filtrosActivos.precioMin)
      return false;

    if (filtrosActivos.precioMax &&
        Number(p.precio) > filtrosActivos.precioMax)
      return false;

    return true;
  });

  renderProductos(resultado);
  actualizarContador(resultado.length);
}


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
        tipo_mascota,
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
    const cat = params.get("cat");
    const mascota = params.get("mascota");
    const marca = params.get("marca"); 

    renderCategorias(productosCache);

  if (marca) {
    filtrosActivos.marca = marca;
    aplicarFiltrosGlobales();
    actualizarBreadcrumbMarca(marca);
  }
else if (cat && mascota) {

  aplicarFiltro(cat, mascota);

}
else {

  renderProductos(productosCache);
  actualizarBreadcrumb(null, null);

}



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

      actualizarContador(0);

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
            class="w-full h-full object-cover bg-white
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

  
  actualizarContador(productos.length);
  setTimeout(() => {
    if (window.activarAnimacionProductos) {
      activarAnimacionProductos();
    }
  }, 50);
}

function actualizarContador(total) {
  const el = document.getElementById("contadorResultados");
  if (!el) return;

  el.textContent = `${total} productos encontrados`;
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

  const contDesktop = document.getElementById("menuCategorias");
  const contMobile = document.getElementById("menuCategoriasMobile");

  if (!contDesktop || !contMobile) return;

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  const estructura = categorias.map(cat => {

    const sub = productos.filter(p => p.categoria === cat);

    const mascotas = [
      ...new Set(sub.map(p => p.tipo_mascota).filter(Boolean))
    ];

    return {
      categoria: cat,
      total: sub.length,
      mascotas
    };
  });



    const botonTodos = `
      <div class="border-b pb-2">

        <button
          class="w-full flex justify-between items-center
                font-medium px-3 py-3
                rounded-lg
                hover:bg-gray-100
                active:scale-[0.98]
                transition
                min-h-[48px]"
          onclick="mostrarTodos()">

          <span>Todos los productos</span>
          <span class="text-xs text-gray-400">${productos.length}</span>

        </button>

      </div>
    `;

  const html = botonTodos + estructura.map(c => `
    <div class="border-b pb-2">

      <button class="w-full flex justify-between items-center
               font-medium px-3 py-3
               rounded-lg
               hover:bg-gray-50
               active:scale-[0.98]
               transition
               min-h-[48px]
               categoria-toggle"
              data-cat="${c.categoria}">
        <span>${c.categoria}</span>
        <span class="text-xs text-gray-400">${c.total}</span>
      </button>

      <div class="ml-6 mt-1 space-y-1 hidden subcategoria border-l-2 border-yellow-200 pl-2">


        ${c.mascotas.map(m => {

          const count = productos.filter(p =>
            p.categoria === c.categoria &&
            p.tipo_mascota === m
          ).length;

         return `
            <button
              class="w-full flex justify-between items-center
                    text-sm px-3 py-3
                    rounded-lg
                    hover:bg-yellow-50
                    active:scale-[0.98]
                    transition
                    min-h-[44px]"
              data-cat="${c.categoria}"
              data-mascota="${m}">
              <span>${m}</span>
              <span class="text-xs text-gray-400">${count}</span>
            </button>
          `;
        }).join("")}

      </div>

    </div>
  `).join("");

  contDesktop.innerHTML = html;
  contMobile.innerHTML = html;

  activarMenuCategorias();
}

function activarMenuCategorias() {

  document.querySelectorAll(".categoria-toggle").forEach(btn => {

    btn.addEventListener("click", () => {

      const sub = btn.parentElement.querySelector(".subcategoria");
      sub.classList.toggle("hidden");

      btn.classList.toggle("text-yellow-600");
      btn.classList.toggle("font-semibold");


    });

  });

  document.querySelectorAll("[data-mascota]").forEach(btn => {

    btn.addEventListener("click", () => {

      const cat = btn.dataset.cat;
      const mascota = btn.dataset.mascota;

      aplicarFiltro(cat, mascota);

      cerrarPanelCategorias();

    });

  });

}

window.mostrarTodos = () => {

  filtrosActivos = {
    categoria: null,
    mascota: null,
    marca: null,
    precioMin: null,
    precioMax: null,
    soloOfertas: false,
    busqueda: ""
  };

  renderProductos(productosCache);
  actualizarBreadcrumb(null, null);
  actualizarContador(productosCache.length);
};

function actualizarBreadcrumb(cat, mascota) {

  const el = document.getElementById("breadcrumbCategoria");
  if (!el) return;

  // Si no hay filtros
  if (!cat && !mascota) {
    el.innerHTML = `
      <span class="font-semibold text-yellow-600 text-sm">
        Todos
      </span>
    `;
    return;
  }

  el.innerHTML = `
    <button
      onclick="mostrarTodos()"
      class="text-gray-600 hover:text-yellow-600 hover:underline text-sm">
      Todos
    </button>

    <span class="mx-1 text-gray-400">›</span>

    <button
      onclick="filtrarPorCategoria('${cat}')"
      class="text-gray-700 hover:text-yellow-600 hover:underline text-sm">
      ${cat}
    </button>

    ${mascota ? `
      <span class="mx-1 text-gray-400">›</span>
      <span class="font-semibold text-yellow-600 text-sm">
        ${mascota}
      </span>
    ` : ""}
  `;
}


function aplicarFiltro(cat, mascota) {

  filtrosActivos.categoria = cat;
  filtrosActivos.mascota = mascota;

  aplicarFiltrosGlobales();
  actualizarBreadcrumb(cat, mascota);

}

window.filtrarPorCategoria = (cat) => {

  filtrosActivos.categoria = cat;
  filtrosActivos.mascota = null;

  aplicarFiltrosGlobales();
  actualizarBreadcrumb(cat, null);

};

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

    filtrosActivos.busqueda = e.target.value.toLowerCase();
    aplicarFiltrosGlobales();

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


window.abrirPanelCategorias = () => {

  const panel = document.getElementById("panelCategoriasMobile");
  const contenido = document.getElementById("panelCategoriasContenido");

  panel.classList.remove("hidden");

  setTimeout(() => {
    contenido.classList.remove("-translate-x-full");
  }, 10);

};

window.cerrarPanelCategorias = () => {

  const panel = document.getElementById("panelCategoriasMobile");
  const contenido = document.getElementById("panelCategoriasContenido");

  contenido.classList.add("-translate-x-full");

  setTimeout(() => {
    panel.classList.add("hidden");
  }, 300);

};

function actualizarBreadcrumbMarca(marca) {

  const el = document.getElementById("breadcrumbCategoria");
  if (!el) return;

  el.innerHTML = `
    <button
      onclick="mostrarTodos()"
      class="text-gray-600 hover:text-yellow-600 hover:underline text-sm">
      Todos
    </button>

    <span class="mx-1 text-gray-400">›</span>

    <span class="font-semibold text-yellow-600 text-sm">
      Marca: ${marca}
    </span>
  `;
}

  document.getElementById("precioMin")?.addEventListener("input", e => {
    filtrosActivos.precioMin = Number(e.target.value) || null;
    aplicarFiltrosGlobales();
  });

  document.getElementById("precioMax")?.addEventListener("input", e => {
    filtrosActivos.precioMax = Number(e.target.value) || null;
    aplicarFiltrosGlobales();
  });


    document.getElementById("ordenar")?.addEventListener("change", e => {

        let resultado = productosCache.filter(p => {

          if (filtrosActivos.categoria &&
              p.categoria !== filtrosActivos.categoria)
            return false;

          if (filtrosActivos.mascota &&
              p.tipo_mascota !== filtrosActivos.mascota)
            return false;

          if (filtrosActivos.marca &&
              p.marca !== filtrosActivos.marca)
            return false;

          if (filtrosActivos.busqueda) {
            const texto = `
              ${p.nombre || ""}
              ${p.marca || ""}
              ${p.categoria || ""}
            `.toLowerCase();

            if (!texto.includes(filtrosActivos.busqueda))
              return false;
          }

          return true;
        });

        if (e.target.value === "precio-asc") {
          resultado.sort((a, b) => a.precio - b.precio);
        }

        if (e.target.value === "precio-desc") {
          resultado.sort((a, b) => b.precio - a.precio);
        }

        renderProductos(resultado);
      });
/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initZonas();
  cargarCatalogo();
});


