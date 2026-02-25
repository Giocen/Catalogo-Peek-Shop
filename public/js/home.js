import { supabase } from "./supabase.js";
import { abrirCarrito, agregarAlCarrito } from "./carrito.js";

const MODO_ADMIN = localStorage.getItem("modo_admin") === "1";

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
    let query = supabase
      .from("catalogo_banners")
      .select("*")
      .eq("zona", zona)
      .order("orden", { ascending: true });

    if (!MODO_ADMIN) {
      query = query.eq("activo", true);
    }

const { data, error } = await query;

    if (error) throw error;

    const cont = document.getElementById(`zona-${zona}`);
    if (!cont) return;

    if (!data?.length) {
      cont.innerHTML = "";
      return;
    }

    /* =========================================================
      RENDER ICONOS (SOLO ZONA SUPERIOR)
    ========================================================= */
    if (zona === "superior") {

            const params = new URLSearchParams(window.location.search);
            const catActiva = params.get("cat");
            const mascotaActiva = params.get("mascota");
                cont.innerHTML = `
                <div class="max-w-7xl mx-auto px-4 py-6 relative carrusel-wrapper">

                  <!-- Flecha izquierda -->
                  <button id="btnPrev"
                    class="absolute left-2 top-1/2 -translate-y-1/2 z-20
                          bg-white shadow-xl rounded-full p-2
                          hover:scale-110 transition flex">
                    <i data-lucide="chevron-left" class="w-5 h-5"></i>
                  </button>

                  <div id="carruselCategorias"
                      class="flex gap-6 overflow-x-auto scroll-smooth carrusel-peek">

                    ${data.map(b => {
                      const esAdmin = MODO_ADMIN;

                      return `
                        <div class="relative min-w-[200px] flex-shrink-0 group">

                          ${esAdmin ? `                           
                              <div class="absolute top-2 right-2 z-30 flex flex-col gap-1">

                                <!-- Activar / Desactivar -->
                                <button onclick="toggleActivo('${b.id}', ${b.activo})"
                                  class="bg-white/90 backdrop-blur px-2 py-1 rounded text-xs shadow hover:scale-105 transition">
                                  ${b.activo ? "🟢 Activo" : "⚫ Inactivo"}
                                </button>

                                <!-- Editar -->
                                <button onclick="editarBanner('${b.id}')"
                                  class="bg-blue-500 text-white px-2 py-1 rounded text-xs shadow hover:bg-blue-600 transition">
                                  ✏️ Editar
                                </button>

                                <!-- Eliminar -->
                                <button onclick="eliminarBanner('${b.id}')"
                                  class="bg-red-500 text-white px-2 py-1 rounded text-xs shadow hover:bg-red-600 transition">
                                  🗑 Eliminar
                                </button>

                              </div>
                            ` : ""}

                            <div draggable="${esAdmin}"
                                data-id="${b.id}"
                                class="categoria-card cursor-pointer
                                transition-all duration-500
                                hover:-translate-y-2 hover:shadow-2xl"
                                ${!esAdmin ? `data-link="${generarLinkCategoria(b.texto)}"` : ""}
                            >

                            <img src="${b.url}"
                                class="w-full h-48 object-cover rounded-2xl">

                            <div class="text-center mt-2 font-medium">
                              ${b.texto || ""}
                            </div>

                          </div>

                        </div>
                      `;
                    }).join("")}

                  </div>

                  <!-- Flecha derecha -->
                  <button id="btnNext"
                    class="absolute right-2 top-1/2 -translate-y-1/2 z-20
                          bg-white shadow-xl rounded-full p-2
                          hover:scale-110 transition flex">
                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                  </button>

                </div>
                `;

            if (MODO_ADMIN) {
              activarDragOrden();
            }
            setTimeout(() => {

              const carrusel = document.getElementById("carruselCategorias");
              const prev = document.getElementById("btnPrev");
              const next = document.getElementById("btnNext");

              if (!carrusel) return;

              const scrollAmount = 240;

              prev?.addEventListener("click", () => {
                carrusel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
              });

              next?.addEventListener("click", () => {
                carrusel.scrollBy({ left: scrollAmount, behavior: "smooth" });
              });

              // 🔥 AUTO SCROLL INFINITO
              function scrollCarrusel() {
                if (carrusel.scrollLeft + carrusel.clientWidth >= carrusel.scrollWidth - 5) {
                  carrusel.scrollTo({ left: 0, behavior: "smooth" });
                } else {
                  carrusel.scrollBy({ left: scrollAmount, behavior: "smooth" });
                }
              }

              let autoScroll = setInterval(scrollCarrusel, 4000);

              // Pausar cuando el usuario interactúa
              carrusel.addEventListener("mouseenter", () => {
                clearInterval(autoScroll);
              });

              carrusel.addEventListener("mouseleave", () => {
                clearInterval(autoScroll);
                autoScroll = setInterval(scrollCarrusel, 4000);
              });

              carrusel.addEventListener("touchstart", () => {
                clearInterval(autoScroll);
              });

              lucide.createIcons();

            }, 100);

            const carrusel = document.getElementById("carruselCategorias");
            if (!carrusel) return;

            carrusel.addEventListener("dragstart", e => {
              if (!MODO_ADMIN) e.preventDefault();
            });

          
          } else {

            /* =====================================================
              ZONAS NORMALES (IMAGEN / VIDEO)
            ====================================================== */

           cont.innerHTML = data
        .map(b => `
          <div
            class="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition"
            style="grid-column: span ${b.columnas || 4};
                  height:${b.alto || 180}px"
          >
            ${
              b.tipo === "video"
                ? `
                  <video
                    src="${b.url || ''}"
                    autoplay
                    muted
                    loop
                    playsinline
                    class="w-full h-full object-cover"
                  ></video>
                `
                : `
                  <img
                    src="${b.url || '/img/placeholder.png'}"
                    loading="lazy"
                    decoding="async"
                    class="w-full h-full object-cover"
                  />
                `
            }
          </div>
        `)
        .join("");
        }

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
let paginaActual = 1;
const productosPorPagina = 20;
let productosFiltradosGlobal = [];

let esMovil = window.innerWidth < 768;

window.addEventListener("resize", () => {
  const antes = esMovil;
  esMovil = window.innerWidth < 768;

  if (antes !== esMovil) {
    paginaActual = 1;
    renderPagina();
  }
});
/* =========================================================
   🔗 GENERAR LINK AUTOMÁTICO CARRUSEL
========================================================= */
function generarLinkCategoria(texto) {

  if (!texto || !productosCache.length) return "#";

  const existeCategoria = productosCache.some(
    p => p.categoria?.toLowerCase() === texto.toLowerCase()
  );

  const existeMascota = productosCache.some(
    p => p.tipo_mascota?.toLowerCase() === texto.toLowerCase()
  );

  if (existeCategoria) {
    return `/?cat=${encodeURIComponent(texto)}`;
  }

  if (existeMascota) {
    return `/?mascota=${encodeURIComponent(texto)}`;
  }

  return "#";
}

/* =========================================================
   🎯 FILTROS GLOBALES
========================================================= */
let filtrosActivos = {
  categoria: null,
  mascota: null,
  marca: [],
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

    if (
        filtrosActivos.marca.length > 0 &&
        !filtrosActivos.marca.includes(
          p.marca?.toLowerCase()
        )
      )
        return false;

    if (filtrosActivos.soloOfertas) {

      const tieneOfertaPresentacion =
        p.catalogo_presentaciones?.some(v => v.en_oferta);

      if (!p.es_oferta && !tieneOfertaPresentacion)
        return false;
    }

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

    if (filtrosActivos.precioMax !== null &&
        Number(p.precio) > filtrosActivos.precioMax)
      return false;

    return true;
  });

  const url = new URL(window.location);

    Object.entries(filtrosActivos).forEach(([key, value]) => {

      if (
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      value === false
    ) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(
        key,
        Array.isArray(value) ? value.join(",") : value
      );
    }

});

window.history.replaceState({}, "", url);

  productosFiltradosGlobal = resultado;
  paginaActual = 1;

  renderPagina();
  actualizarContador(resultado.length);
  renderChips();
  sincronizarChecksMarcas();
}


function renderChips() {

  const cont = document.getElementById("chipsFiltros");
  if (!cont) return;

  cont.innerHTML = "";

  Object.entries(filtrosActivos).forEach(([key, value]) => {

    if (!value || key === "busqueda") return;

    const chip = document.createElement("div");

    chip.className =
  "bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs px-3 py-1 rounded-full flex items-center gap-2 shadow-sm hover:bg-yellow-100 transition cursor-pointer";

    chip.innerHTML = `
      ${value}
      <span class="text-yellow-600 font-bold hover:text-red-500">✕</span>
    `;

    chip.onclick = () => {
      if (Array.isArray(filtrosActivos[key])) {
        filtrosActivos[key] = [];
      } else {
        filtrosActivos[key] = null;
      }
      aplicarFiltrosGlobales();
    };

    cont.appendChild(chip);

  });
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
          catalogo_multimedia:catalogo_multimedia!catalogo_multimedia_producto_id_fkey (
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
        .eq("activo", true)

        // 🔥 ORDEN E-COMMERCE
        .order("es_oferta", { ascending: false })   
        .order("categoria", { ascending: true })    
        .order("nombre", { ascending: true })      
        .limit(200);

    if (error) throw error;

    productosCache = data || [];

   const params = new URLSearchParams(location.search);
    const cat = params.get("cat");
    const mascota = params.get("mascota");
    const marcaParam = params.get("marca");
    const marca = marcaParam ? marcaParam.split(",") : null;

    renderCategorias(productosCache);
    renderFiltroMarcas(productosCache);

  if (marca) {
  filtrosActivos.marca = marca.map(m => m.toLowerCase());
    aplicarFiltrosGlobales();
    actualizarBreadcrumbMarca(marca);
  }

  else if (cat && mascota) {
      aplicarFiltro(cat, mascota);
    }
    else if (cat) {
      filtrarPorCategoria(cat);
    }
    else if (mascota) {

      const existeCategoria = productosCache.some(p => p.categoria === mascota);
      const existeMascota = productosCache.some(p => p.tipo_mascota === mascota);

      if (existeCategoria) {
        filtrosActivos.categoria = mascota;
        filtrosActivos.mascota = null;
        actualizarBreadcrumb(mascota, null);
      } 
      else if (existeMascota) {
        filtrosActivos.categoria = null;
        filtrosActivos.mascota = mascota;
        actualizarBreadcrumb(null, mascota);
      }

      aplicarFiltrosGlobales();
    }
    else {
      productosFiltradosGlobal = productosCache;
      paginaActual = 1;
      renderPagina();
      actualizarContador(productosCache.length);
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

          let multimedia = [];

          if (Array.isArray(p.catalogo_multimedia)) {
            multimedia = p.catalogo_multimedia;
          }
          else if (p.catalogo_multimedia && typeof p.catalogo_multimedia === "object") {
            multimedia = [p.catalogo_multimedia];
          }
          else {
            multimedia = [];
          }

      const imagenOrdenada = multimedia
        .filter(m => m.tipo === "imagen")
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

      const img = imagenOrdenada.length
        ? imagenOrdenada[0].url
        : "/img/placeholder.png";


      let precioMin = Number(p.precio);
      let precioMax = Number(p.precio);

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
            data-link="/producto.html?id=${p.id}">

          <img
            src="${img}"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            class="w-full h-full object-cover bg-white
                  transition-transform duration-300 group-hover:scale-105"
          >

        </div>

       <div class="p-2 sm:p-3 flex flex-col flex-1">
        <div 
            class="text-[14px] sm:text-[15px] font-normal leading-snug text-gray-800 line-clamp-2 tracking-tight cursor-pointer hover:text-blue-600 transition"
             data-link="/producto.html?id=${p.id}"
          >
            ${p.nombre}
          </div>

          <div class="text-base sm:text-[15px] font-semibold text-green-700 mt-1 tracking-tight">
              ${
                precioMin !== precioMax
                  ? `$${precioMin.toLocaleString("es-MX")} – $${precioMax.toLocaleString("es-MX")}`
                  : `$${precioMin.toLocaleString("es-MX")}`
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
              class="btn-agregar mt-auto
              bg-gradient-to-r from-blue-600 to-blue-700
              hover:from-blue-700 hover:to-blue-800
              text-white text-sm py-2.5 rounded-xl
              transition-all duration-300
              shadow-sm hover:shadow-md
              active:scale-95"
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
  
}

/* =========================================================
   PAGINACIÓN
========================================================= */

function renderPagina() {

  if (esMovil) {
    renderScrollInfinito();
    return;
  }

  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;

  const productosPagina = productosFiltradosGlobal.slice(inicio, fin);

  renderProductos(productosPagina);
  renderPaginacion();
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


let cargandoScroll = false;

function renderScrollInfinito() {

  const totalCargados = paginaActual * productosPorPagina;
  const productosMostrar = productosFiltradosGlobal.slice(0, totalCargados);

  renderProductos(productosMostrar);

  observerScroll();
}

let observer;

function observerScroll() {

  if (observer) observer.disconnect();

  
    const anterior = document.getElementById("scrollSentinel");
    if (anterior) anterior.remove();

    const sentinel = document.createElement("div");
    sentinel.id = "scrollSentinel";
    sentinel.className = "h-10";

    document.getElementById("productos").appendChild(sentinel);

  observer = new IntersectionObserver(entries => {

    if (entries[0].isIntersecting && !cargandoScroll) {

      const totalMostrados = paginaActual * productosPorPagina;

      if (totalMostrados >= productosFiltradosGlobal.length) return;

      cargandoScroll = true;

      paginaActual++;

      setTimeout(() => {
        renderScrollInfinito();
        cargandoScroll = false;
      }, 300);

    }

  }, {
    rootMargin: "200px"
  });

  observer.observe(sentinel);
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
    marca: [],
    precioMin: null,
    precioMax: null,
    soloOfertas: false,
    busqueda: ""
  };

  productosFiltradosGlobal = productosCache;
  paginaActual = 1;

  renderPagina();
  actualizarContador(productosCache.length);
    
    
  };

function actualizarBreadcrumb(cat, mascota) {

  const el = document.getElementById("breadcrumbCategoria");
  if (!el) return;

 if (!cat && !mascota) {
  el.innerHTML = `<span class="font-semibold text-yellow-600 text-sm">Todos</span>`;
  return;
}

if (!cat && mascota) {
  el.innerHTML = `
    <button onclick="mostrarTodos()"
      class="text-gray-600 hover:text-yellow-600 hover:underline text-sm">
      Todos
    </button>
    <span class="mx-1 text-gray-400">›</span>
    <span class="font-semibold text-yellow-600 text-sm">
      ${mascota}
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
  document.body.classList.add("overflow-hidden"); 

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
    document.body.classList.remove("overflow-hidden"); 
  }, 300);

};

// 🔥 Cerrar panel al tocar fuera
document.getElementById("panelCategoriasMobile")
  ?.addEventListener("click", e => {

  const contenido = document.getElementById("panelCategoriasContenido");

  if (!contenido) return;

  // Si el click NO fue dentro del panel
  if (!contenido.contains(e.target)) {
    cerrarPanelCategorias();
  }

});

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

          if (filtrosActivos.marca.length > 0 &&
            !filtrosActivos.marca.includes(
              p.marca?.toLowerCase()
            ))
          return false;

          if (filtrosActivos.busqueda) {
            const texto = (
              (p.nombre || "") +
              " " +
              (p.marca || "") +
              " " +
              (p.categoria || "")
            ).toLowerCase();

            if (!texto.includes(filtrosActivos.busqueda))
              return false;
          }

          return true;
        });

        if (e.target.value === "precio-asc") {
          const getPrecio = p => {
            if (p.catalogo_presentaciones?.length) {
              return Math.min(...p.catalogo_presentaciones.map(v => Number(v.precio)));
            }
            return Number(p.precio);
          };

          resultado.sort((a, b) => getPrecio(a) - getPrecio(b));
        }

        if (e.target.value === "precio-desc") {

            const getPrecio = p => {
              if (p.catalogo_presentaciones?.length) {
                return Math.min(...p.catalogo_presentaciones.map(v => Number(v.precio)));
              }
              return Number(p.precio);
            };

            resultado.sort((a, b) => getPrecio(b) - getPrecio(a));
          }
        productosFiltradosGlobal = resultado;
        paginaActual = 1;
        renderPagina();
        
      });

      function renderFiltroMarcas(productos) {

  const cont = document.getElementById("filtroMarcas");
  if (!cont) return;

  // 🔥 Normalizar nombres (Primera letra mayúscula)
  const normalizar = str =>
    str.toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());

  // 🔥 Quitar duplicados ignorando mayúsculas
  const marcasUnicas = [
    ...new Map(
      productos
        .filter(p => p.marca)
        .map(p => [p.marca.toLowerCase(), normalizar(p.marca)])
    ).values()
  ];

  // 🔥 Ordenar alfabéticamente
  const marcas = marcasUnicas.sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );

  cont.innerHTML = `
    <h4 class="font-semibold mb-2 text-sm">Marcas</h4>
    ${marcas.map(m => `
      <label class="flex items-center gap-2 text-sm mb-1 cursor-pointer hover:text-yellow-600 transition">
        <input 
          type="checkbox" 
          value="${m}" 
          class="marca-checkbox accent-yellow-500"
          ${filtrosActivos.marca.includes(m.toLowerCase()) ? "checked" : ""}
        >
        ${m}
      </label>
    `).join("")}
  `;

  // 🔥 Evento change (DESKTOP)
  cont.querySelectorAll(".marca-checkbox").forEach(cb => {

    cb.addEventListener("change", e => {

      const marca = e.target.value.toLowerCase();

      if (e.target.checked) {
        if (!filtrosActivos.marca.includes(marca)) {
          filtrosActivos.marca.push(marca);
        }
      } else {
        filtrosActivos.marca =
          filtrosActivos.marca.filter(m => m !== marca);
      }

      aplicarFiltrosGlobales();
      sincronizarChecksMarcas();

    });

  });

  // 🔥 Render móvil después de crear desktop
  renderFiltroMarcasMobile();
}

function renderFiltroMarcasMobile() {

  const desktop = document.getElementById("filtroMarcas");
  const mobile = document.getElementById("filtroMarcasMobile");

  if (!desktop || !mobile) return;

  mobile.innerHTML = desktop.innerHTML;

  mobile.querySelectorAll(".marca-checkbox").forEach(cb => {

    cb.addEventListener("change", e => {

      const marca = e.target.value.toLowerCase();

      if (e.target.checked) {
        if (!filtrosActivos.marca.includes(marca)) {
          filtrosActivos.marca.push(marca);
        }
      } else {
        filtrosActivos.marca =
          filtrosActivos.marca.filter(m => m !== marca);
      }

      aplicarFiltrosGlobales();
      sincronizarChecksMarcas();

    });

  });

}

function sincronizarChecksMarcas() {

  const todos = document.querySelectorAll(".marca-checkbox");

  todos.forEach(cb => {
    const marca = cb.value.toLowerCase();
    cb.checked = filtrosActivos.marca.includes(marca);
  });

}

      document.getElementById("soloOfertas")?.addEventListener("change", e => {
        filtrosActivos.soloOfertas = e.target.checked;
        aplicarFiltrosGlobales();
      });


window.eliminarBanner = async (id) => {

  if (!confirm("¿Eliminar categoría?")) return;

  await supabase
    .from("catalogo_banners")
    .delete()
    .eq("id", id);

  initZonas();
};

window.editarBanner = async (id) => {

  const { data } = await supabase
    .from("catalogo_banners")
    .select("*")
    .eq("id", id)
    .single();

  let nuevaImagen = null;

  await Swal.fire({
    title: "Editar categoría",
    width: 500,
    html: `
      <div class="space-y-4 text-left">

        <div>
          <label class="text-sm font-semibold">Imagen actual</label>
          <img src="${data.url}"
               class="w-full h-40 object-cover rounded-xl mt-2">
        </div>

        <div>
          <label class="text-sm font-semibold">Cambiar imagen</label>
          <input id="fileEdit"
                 type="file"
                 accept="image/*"
                 class="swal2-file">
        </div>

        <div>
          <label class="text-sm font-semibold">Texto</label>
          <input id="textoEdit"
                 class="swal2-input"
                 value="${data.texto || ""}">
        </div>

        <div>
          <label class="text-sm font-semibold">Link</label>
          <input id="linkEdit"
                 class="swal2-input"
                 value="${data.link || ""}">
        </div>

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Guardar",
    didOpen: () => {

      const input = document.getElementById("fileEdit");

      input.addEventListener("change", e => {
        if (e.target.files.length) {
          nuevaImagen = e.target.files[0];
        }
      });

    },
    preConfirm: async () => {

      let urlFinal = data.url;

      /* 🔥 SI CAMBIÓ IMAGEN */
      if (nuevaImagen) {

        const path = `banners/${Date.now()}_${nuevaImagen.name}`;

        const imagenOptimizada = await optimizarImagen(nuevaImagen);

        const { error: uploadError } = await supabase.storage
          .from("catalogo")
          .upload(path, imagenOptimizada, { upsert: true });

        if (uploadError) {
          Swal.showValidationMessage("Error subiendo imagen");
          return false;
        }

        const { data: publicUrlData } = supabase.storage
          .from("catalogo")
          .getPublicUrl(path);

        urlFinal = publicUrlData.publicUrl;
      }

      /* 🔥 ACTUALIZAR TABLA */
      const { error } = await supabase
        .from("catalogo_banners")
        .update({
          texto: document.getElementById("textoEdit").value,
          link: document.getElementById("linkEdit").value,
          url: urlFinal
        })
        .eq("id", id);

      if (error) {
        Swal.showValidationMessage("Error actualizando");
        return false;
      }

      initZonas();
      return true;
    }
  });
};

      function activarDragOrden() {

        const cont = document.querySelector("#carruselCategorias");
        if (!cont) return;

        let dragged = null;

        cont.querySelectorAll(".categoria-card").forEach(card => {

          const wrapper = card.closest(".relative");

          card.addEventListener("dragstart", e => {
            e.dataTransfer.effectAllowed = "move";
            dragged = wrapper;
            wrapper.classList.add("opacity-50");
          });

          card.addEventListener("dragend", () => {
            wrapper.classList.remove("opacity-50");
            actualizarOrden();
          });

          wrapper.addEventListener("dragover", e => {
            e.preventDefault();
          });

          wrapper.addEventListener("drop", e => {
            e.preventDefault();

            if (!dragged || dragged === wrapper) return;

            if (wrapper.parentNode === cont) {
              cont.insertBefore(dragged, wrapper);
            }
          });

        });
      }


async function actualizarOrden() {

  const cont = document.getElementById("carruselCategorias");
  const cards = cont.querySelectorAll(".categoria-card");

    await Promise.all(
    Array.from(cards).map((card, i) =>
      supabase
        .from("catalogo_banners")
        .update({ orden: i })
        .eq("id", card.dataset.id)
    )
  );
}

async function optimizarImagen(file) {

  return new Promise(resolve => {

    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target.result;
    };

    img.onload = () => {

      const canvas = document.createElement("canvas");
      const size = 600; // cuadrado premium

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");

      // recorte centrado
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;

      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      canvas.toBlob(blob => {
        resolve(blob);
      }, "image/webp", 0.85);

    };

    reader.readAsDataURL(file);
  });
}

window.crearNuevaCategoria = async () => {

  let imagenNueva = null;

  await Swal.fire({
    title: "Nueva categoría",
    width: 500,
    html: `
      <div class="space-y-4 text-left">

        <input id="fileNueva"
               type="file"
               accept="image/*"
               class="swal2-file">

        <input id="textoNueva"
               class="swal2-input"
               placeholder="Texto">

        <input id="linkNueva"
               class="swal2-input"
               placeholder="/?cat=Alimentos">

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Crear",
    didOpen: () => {
      document.getElementById("fileNueva")
        .addEventListener("change", e => {
          if (e.target.files.length) {
            imagenNueva = e.target.files[0];
          }
        });
    },
    preConfirm: async () => {

      if (!imagenNueva) {
        Swal.showValidationMessage("Debes subir imagen");
        return false;
      }

      const path = `banners/${Date.now()}_${imagenNueva.name}`;

      const imagenOptimizada = await optimizarImagen(imagenNueva);

      const { error: uploadError } = await supabase.storage
        .from("catalogo")
        .upload(path, imagenOptimizada, { upsert: true });

      if (uploadError) {
        Swal.showValidationMessage("Error subiendo imagen");
        return false;
      }
    
      const { data: publicUrlData } =
        supabase.storage.from("catalogo")
        .getPublicUrl(path);

      const { error } = await supabase
        .from("catalogo_banners")
        .insert({
          zona: "superior",
          tipo: "imagen",
          url: publicUrlData.publicUrl,
          texto: document.getElementById("textoNueva").value,
          link: document.getElementById("linkNueva").value,
          orden: Date.now(),
          activo: true
        });

      if (error) {
        Swal.showValidationMessage("Error guardando");
        return false;
      }

      initZonas();
      return true;
    }
  });
};

window.toggleActivo = async (id, estadoActual) => {

  await supabase
    .from("catalogo_banners")
    .update({ activo: !estadoActual })
    .eq("id", id);

  initZonas();
};

document.addEventListener("click", e => {

  if (
    e.target.closest("button") ||
    e.target.closest("input") ||
    e.target.closest("select") ||
    e.target.closest("label")
  ) return;

  const cardLink = e.target.closest("[data-link]");
  if (!cardLink) return;

  const url = cardLink.dataset.link;

  if (!url || url === "null" || url === "undefined" || url === "#") return;

  if (!url.startsWith("/")) return;

  e.stopPropagation();
  window.location.href = url;
});


document.getElementById("toggleMarcas")?.addEventListener("click", () => {

  const cont = document.getElementById("filtroMarcas");
  if (!cont) return;

  cont.classList.toggle("hidden");

  const icon = document.querySelector("#toggleMarcas i");
  icon?.classList.toggle("rotate-180");

});

document.getElementById("toggleMarcasMobile")?.addEventListener("click", () => {

  const cont = document.getElementById("filtroMarcasMobile");
  if (!cont) return;

  cont.classList.toggle("hidden");

  const icon = document.querySelector("#toggleMarcasMobile i");
  icon?.classList.toggle("rotate-180");

});


// Sincronizar desktop y móvil

const soloDesktop = document.getElementById("soloOfertas");
const soloMobile = document.getElementById("soloOfertasMobile");

soloDesktop?.addEventListener("change", e => {
  filtrosActivos.soloOfertas = e.target.checked;
  if (soloMobile) soloMobile.checked = e.target.checked;
  aplicarFiltrosGlobales();
});

soloMobile?.addEventListener("change", e => {
  filtrosActivos.soloOfertas = e.target.checked;
  if (soloDesktop) soloDesktop.checked = e.target.checked;
  aplicarFiltrosGlobales();
});


const ordenarDesktop = document.getElementById("ordenar");
const ordenarMobile = document.getElementById("ordenarMobile");

ordenarDesktop?.addEventListener("change", e => {
  if (ordenarMobile) ordenarMobile.value = e.target.value;
});

ordenarMobile?.addEventListener("change", e => {
  if (ordenarDesktop) ordenarDesktop.value = e.target.value;
  ordenarDesktop?.dispatchEvent(new Event("change"));
});

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {

  console.log("MODO_ADMIN:", MODO_ADMIN);

  if (MODO_ADMIN) {
    document.getElementById("btnNuevaCategoria")
      ?.classList.remove("hidden");
  }

  await cargarCatalogo();  // 🔥 primero productos
  initZonas();             // 🔥 luego carrusel

});

function renderPaginacion() {

  const cont = document.getElementById("paginacion");
  if (!cont) return;

  // 🔥 OCULTAR PAGINACIÓN EN MÓVIL
  if (esMovil) {
    cont.innerHTML = "";
    return;
  }

  const totalPaginas = Math.ceil(productosFiltradosGlobal.length / productosPorPagina);

  if (totalPaginas <= 1) {
    
    cont.innerHTML = "";
    return;
  }

  let html = `
    <div class="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-md">
  `;

  // Flecha anterior
  if (paginaActual > 1) {
    html += `
      <button
        onclick="cambiarPagina(${paginaActual - 1})"
        class="w-9 h-9 flex items-center justify-center rounded-xl
               bg-gray-100 hover:bg-yellow-100
               transition-all duration-200
               hover:scale-105 active:scale-95">
        ‹
      </button>
    `;
  }

  for (let i = 1; i <= totalPaginas; i++) {

    if (
      i === 1 ||
      i === totalPaginas ||
      (i >= paginaActual - 1 && i <= paginaActual + 1)
    ) {

      html += `
        <button
          onclick="cambiarPagina(${i})"
          class="min-w-[36px] h-9 px-3 text-sm font-medium
                 rounded-xl transition-all duration-200
                 ${i === paginaActual
                    ? "bg-yellow-500 text-white shadow-lg scale-105"
                    : "bg-gray-100 hover:bg-gray-200 hover:scale-105"}
          ">
          ${i}
        </button>
      `;
    }

    else if (
      i === paginaActual - 2 ||
      i === paginaActual + 2
    ) {
      html += `
        <span class="px-2 text-gray-400 select-none">
          ...
        </span>
      `;
    }
  }

  // Flecha siguiente
  if (paginaActual < totalPaginas) {
    html += `
      <button
        onclick="cambiarPagina(${paginaActual + 1})"
        class="w-9 h-9 flex items-center justify-center rounded-xl
               bg-gray-100 hover:bg-yellow-100
               transition-all duration-200
               hover:scale-105 active:scale-95">
        ›
      </button>
    `;
  }

  html += `</div>`;

  cont.innerHTML = html;
}

window.cambiarPagina = (num) => {

  paginaActual = num;
  renderPagina();

  window.scrollTo({
    top: document.getElementById("productos").offsetTop - 80,
    behavior: "smooth"
  });

};