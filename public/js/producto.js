import { supabase } from "./supabase.js";
import { agregarAlCarrito } from "./carrito.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const cont = document.getElementById("producto");
const relacionadosDiv = document.getElementById("relacionados");
const sticky = document.getElementById("stickyBuy");

let presentacionSeleccionada = null;
let productoActual = null;
let imagenPrincipal = null;

/* =========================================================
   CARGAR PRODUCTO
========================================================= */
async function cargarProducto() {

  const { data: p, error } = await supabase
    .from("catalogo_productos")
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      categoria,
      catalogo_multimedia(url)
    `)
    .eq("id", id)
    .single();

  if (error || !p) {
    cont.innerHTML = `<p class="text-red-600">Producto no disponible</p>`;
    return;
  }

  productoActual = p;

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
      stock,
      sku,
      activo
    `)
    .eq("producto_id", p.id)
    .eq("activo", true)
    .order("precio");

  const imgs =
    p.catalogo_multimedia?.map(m => m.url) || ["/img/placeholder.png"];

  imagenPrincipal = imgs[0];

  cont.innerHTML = `
<div class="col-span-full mb-4">
  <div class="text-sm text-blue-600">
    <a href="/" class="hover:underline font-medium">← Volver al listado</a>
    <span class="mx-2 text-gray-400">›</span>
    <span class="text-gray-500">${p.categoria || "Productos"}</span>
  </div>
</div>

<!-- GALERÍA -->
<div class="flex gap-4">
  <div class="flex flex-col gap-2">
    ${imgs.map(i => `
      <img src="${i}" onclick="window._cambiarImg('${i}')"
           class="w-14 h-14 border rounded cursor-pointer hover:border-blue-500">
    `).join("")}
  </div>

  <div id="imgZoomWrap"
       class="relative bg-white border rounded-lg w-[420px] h-[420px]
              flex items-center justify-center overflow-hidden">
    <img id="imgPrincipal" src="${imgs[0]}"
         class="max-w-full max-h-full object-contain transition-transform">
  </div>
</div>

<!-- INFO -->
<div class="flex flex-col gap-4">

  <h1 class="text-2xl font-semibold">${p.nombre}</h1>

  <div id="precioPrincipal" class="text-4xl font-light">
    $${p.precio.toLocaleString("es-MX")}
    <span class="text-base text-gray-500">MXN</span>
  </div>

  <div class="text-xs text-gray-500">
    IVA incluido
  </div>

  <!-- PRESENTACIONES -->
  ${
    presentaciones?.length ? `
    <div class="mt-4">
      <div class="text-sm font-semibold mb-2">Presentaciones disponibles</div>

      <div id="listaPresentaciones" class="space-y-3">
        ${presentaciones.map(pr => {

          let desc = [];
          if (pr.cantidad) {
            desc.push(
              pr.unidad === "pieza"
                ? `${pr.cantidad} piezas`
                : `${pr.cantidad} ${pr.unidad}`
            );
          } else desc.push(pr.unidad);

          if (pr.talla) desc.push(`Talla ${pr.talla}`);

          const precioFinal = pr.en_oferta && pr.precio_oferta
            ? pr.precio_oferta
            : pr.precio;

          return `
          <div
            class="presentacion border rounded-xl p-4
                   flex justify-between items-center
                   cursor-pointer hover:border-blue-500"
            data-id="${pr.id}"
            data-precio="${precioFinal}"
            data-nombre="${pr.nombre}"
            data-desc="${desc.join(" · ")}"
            data-sku="${pr.sku}"
          >
            <div class="text-sm">
              <div class="font-medium">${pr.nombre}</div>
              <div class="text-xs text-gray-500">${desc.join(" · ")}</div>
              <div class="text-[11px] text-gray-400">SKU: ${pr.sku}</div>
            </div>

            <div class="text-right">
              ${
                pr.en_oferta && pr.precio_oferta
                  ? `
                    <div class="text-xs line-through text-gray-400">
                      $${Number(pr.precio).toLocaleString("es-MX")}
                    </div>
                    <div class="text-lg font-bold text-red-600">
                      $${Number(pr.precio_oferta).toLocaleString("es-MX")}
                    </div>
                  `
                  : `
                    <div class="text-lg font-semibold">
                      $${Number(pr.precio).toLocaleString("es-MX")}
                    </div>
                  `
              }
            </div>
          </div>
          `;
        }).join("")}
      </div>
    </div>
    ` : ""
  }

  <!-- BOTONES -->
  <div class="mt-4 flex flex-col gap-3">
    <button id="btnComprarAhora"
      class="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold">
      Comprar ahora
    </button>

    <button id="btnAgregar"
      class="border border-blue-600 text-blue-600 py-3 rounded-md font-semibold">
      Agregar al carrito
    </button>
  </div>
</div>
`;

  activarSeleccionPresentacion();
  activarZoom();
  cargarRelacionados(p.categoria, p.id);

  document.getElementById("btnAgregar").onclick = agregarSeleccionado;
  document.getElementById("btnComprarAhora").onclick = comprarAhora;
}

/* =========================================================
   PRESENTACIONES
========================================================= */
function activarSeleccionPresentacion() {
  document.querySelectorAll(".presentacion").forEach(card => {
    card.addEventListener("click", () => {

      document.querySelectorAll(".presentacion")
        .forEach(p => p.classList.remove("ring-2", "ring-blue-500"));

      card.classList.add("ring-2", "ring-blue-500");

      presentacionSeleccionada = {
        id: card.dataset.id,
        nombre: card.dataset.nombre,
        descripcion: card.dataset.desc,
        precio: Number(card.dataset.precio),
        sku: card.dataset.sku
      };

      document.getElementById("precioPrincipal").innerHTML = `
        $${presentacionSeleccionada.precio.toLocaleString("es-MX")}
        <span class="text-base text-gray-500">MXN</span>
      `;
    });
  });
}

/* =========================================================
   CARRITO
========================================================= */
function agregarSeleccionado() {
  const item = presentacionSeleccionada
    ? {
        id: presentacionSeleccionada.id,
        nombre: `${productoActual.nombre} · ${presentacionSeleccionada.nombre}`,
        precio: presentacionSeleccionada.precio,
        imagen: imagenPrincipal
      }
    : {
        id: productoActual.id,
        nombre: productoActual.nombre,
        precio: productoActual.precio,
        imagen: imagenPrincipal
      };

  agregarAlCarrito(item);
}

/* =========================================================
   COMPRAR AHORA
========================================================= */
function comprarAhora() {
  Swal.fire({
    title: "¿Cómo deseas recibir tu pedido?",
    showDenyButton: true,
    confirmButtonText: "🚚 Envío",
    denyButtonText: "🏪 Tienda"
  }).then(r => {
    if (r.isConfirmed) pedirDatosProducto("envio");
    else if (r.isDenied) pedirDatosProducto("tienda");
  });
}

/* =========================================================
   WHATSAPP
========================================================= */
function pedirDatosProducto(tipo) {
  Swal.fire({
    title: "Datos para tu pedido",
    html: `
      <input id="swal-nombre" class="swal2-input" placeholder="Nombre completo">
      ${tipo === "envio"
        ? `<textarea id="swal-direccion" class="swal2-textarea" placeholder="Dirección"></textarea>`
        : ""}
    `,
    confirmButtonText: "Enviar pedido",
    preConfirm: () => {
      const nombre = document.getElementById("swal-nombre").value.trim();
      const direccion =
        tipo === "envio"
          ? document.getElementById("swal-direccion").value.trim()
          : "";

      if (!nombre || (tipo === "envio" && !direccion)) {
        Swal.showValidationMessage("Completa los datos");
        return false;
      }

      return { nombre, direccion, tipo };
    }
  }).then(r => {
    if (!r.isConfirmed) return;

    let msg = `PEDIDO PEEKSHOP\n\n`;
    msg += `Producto: ${productoActual.nombre}\n`;

    if (presentacionSeleccionada) {
      msg += `Presentación: ${presentacionSeleccionada.nombre}\n`;
      msg += `Detalles: ${presentacionSeleccionada.descripcion}\n`;
      msg += `Precio: $${presentacionSeleccionada.precio}\n`;
    } else {
      msg += `Precio: $${productoActual.precio}\n`;
    }

    msg += `Cliente: ${r.value.nombre}\n`;
    if (r.value.tipo === "envio") {
      msg += `Entrega: Envío\nDirección: ${r.value.direccion}\n`;
    } else {
      msg += `Entrega: Recoger en tienda\n`;
    }

    window.open(
      `https://wa.me/529992328261?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  });
}

/* =========================================================
   ZOOM
========================================================= */
function activarZoom() {
  const wrap = document.getElementById("imgZoomWrap");
  const img = document.getElementById("imgPrincipal");
  if (!wrap || !img) return;

  wrap.addEventListener("mousemove", e => {
    const r = wrap.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = "scale(1.8)";
  });

  wrap.addEventListener("mouseleave", () => {
    img.style.transform = "scale(1)";
  });
}

/* CAMBIAR IMG */
window._cambiarImg = src => {
  document.getElementById("imgPrincipal").src = src;
};

/* =========================================================
   RELACIONADOS
========================================================= */
async function cargarRelacionados(categoria, actualId) {
  if (!categoria) return;

  const { data } = await supabase
    .from("catalogo_productos")
    .select(`id,nombre,precio,catalogo_multimedia(url)`)
    .eq("categoria", categoria)
    .neq("id", actualId)
    .limit(4);

  relacionadosDiv.innerHTML = (data || []).map(p => {
    const img = p.catalogo_multimedia?.[0]?.url || "/img/placeholder.png";
    return `
      <a href="/producto.html?id=${p.id}"
         class="block bg-white rounded-xl shadow hover:shadow-lg">
        <img src="${img}" class="h-40 w-full object-contain p-3">
        <div class="p-3">
          <div class="text-sm">${p.nombre}</div>
          <div class="font-bold mt-1">$${p.precio}</div>
        </div>
      </a>
    `;
  }).join("");
}

/* INIT */
cargarProducto();
