import { supabase } from "./supabase.js";
import { agregarAlCarrito } from "./carrito.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const cont = document.getElementById("producto");
const relacionadosDiv = document.getElementById("relacionados");
const sticky = document.getElementById("stickyBuy");

/* =========================================================
   CARGAR PRODUCTO
========================================================= */
async function cargarProducto() {

  /* ===== PRODUCTO ===== */
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

  /* ===== PRESENTACIONES (SOLO LECTURA) ===== */
  const { data: presentaciones } = await supabase
    .from("catalogo_presentaciones")
    .select(`
      id,
      nombre,
      unidad,
      cantidad,
      talla,
      precio,
      activo
    `)
    .eq("producto_id", p.id)
    .eq("activo", true)
    .order("precio");

  const imgs =
    p.catalogo_multimedia?.map(m => m.url) || ["/img/placeholder.png"];

  const envioGratis = p.precio >= 500;

  cont.innerHTML = `
<!-- ================= BREADCRUMB ================= -->
<div class="col-span-full mb-4">
  <div class="text-sm text-blue-600">
    <a href="/" class="hover:underline font-medium">
      ← Volver al listado
    </a>
    <span class="text-gray-400 mx-2">›</span>
    <span class="text-gray-500">
      ${p.categoria || "Productos"}
    </span>
  </div>
</div>

<!-- ================= GALERÍA ================= -->
<div class="flex gap-4">

  <div class="flex flex-col gap-2">
    ${imgs.map(i => `
      <img
        src="${i}"
        onclick="window._cambiarImg('${i}')"
        class="w-14 h-14 object-contain border rounded cursor-pointer
               hover:border-blue-500 bg-white"
      >
    `).join("")}
  </div>

  <div
    id="imgZoomWrap"
    class="relative bg-white border rounded-lg
           flex items-center justify-center
           w-[420px] h-[420px] overflow-hidden"
  >
    ${envioGratis ? `
      <span class="absolute top-3 left-3 bg-green-600 text-white text-xs px-3 py-1 rounded-full">
        Envío gratis
      </span>` : ""
    }

    <img
      id="imgPrincipal"
      src="${imgs[0]}"
      class="max-w-full max-h-full object-contain transition-transform duration-200"
    >
  </div>
</div>

<!-- ================= INFO ================= -->
<div class="flex flex-col gap-4">

  <h1 class="text-2xl font-semibold">
    ${p.nombre}
  </h1>

  ${p.categoria ? `
    <div class="text-sm text-gray-500">
      Categoría: ${p.categoria}
    </div>` : ""
  }

  <!-- PRECIO BASE -->
  <div>
    <div class="text-4xl font-light">
      $${p.precio.toLocaleString("es-MX")}
      <span class="text-base text-gray-500">MXN</span>
    </div>
    <div class="text-xs text-gray-500 mt-1">IVA incluido</div>
  </div>

  <!-- ================= PRESENTACIONES ================= -->
  ${
    presentaciones?.length
      ? `
      <div class="mt-3">
        <div class="text-sm font-semibold mb-2">
          Presentaciones disponibles
        </div>

        <div class="space-y-2">
          ${presentaciones.map(pr => `
            <div class="flex justify-between items-center
                        border rounded-lg px-3 py-2 bg-gray-50">
              <div class="text-sm text-gray-700">
                ${pr.nombre || ""}
                ${pr.cantidad ? `${pr.cantidad} ${pr.unidad}` : ""}
                ${pr.talla ? `· ${pr.talla}` : ""}
              </div>

              <div class="font-semibold text-gray-900">
                $${Number(pr.precio).toLocaleString("es-MX")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
      `
      : ""
  }

  <!-- BOTONES -->
  <div class="mt-4 flex flex-col gap-3">
    <button
      id="btnComprarAhora"
      class="bg-blue-600 hover:bg-blue-700
             text-white py-3 rounded-md font-semibold text-lg">
      Comprar ahora
    </button>

    <button
      id="btnAgregar"
      class="border border-blue-600
             text-blue-600 py-3 rounded-md
             font-semibold hover:bg-blue-50">
      Agregar al carrito
    </button>
  </div>

  <!-- BENEFICIOS -->
  <div class="mt-6 text-sm text-gray-600 space-y-2">
    <div>🚚 Envíos a todo México</div>
    <div>🛡️ Compra protegida</div>
    <div>📦 Producto original</div>
  </div>
</div>

<!-- ================= DESCRIPCIÓN ================= -->
<div class="col-span-full mt-10 border-t pt-6">
  <h2 class="font-semibold mb-2 text-lg">Descripción</h2>
  <div class="text-sm text-gray-700 leading-relaxed">
    ${p.descripcion || "Sin descripción"}
  </div>
</div>
`;

  /* ===== CARRITO (SIN CAMBIOS) ===== */
  const agregarFn = () =>
    agregarAlCarrito({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      imagen: imgs[0]
    });

  document.getElementById("btnAgregar").onclick = agregarFn;

  document.getElementById("btnComprarAhora").onclick = () => {
    Swal.fire({
      title: "¿Cómo deseas recibir tu pedido?",
      icon: "question",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "🚚 Envío a domicilio",
      denyButtonText: "🏪 Recoger en tienda",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
      denyButtonColor: "#2563eb"
    }).then(r => {
      if (r.isConfirmed) pedirDatosProducto("envio");
      else if (r.isDenied) pedirDatosProducto("tienda");
    });
  };

  if (document.getElementById("btnStickyAgregar")) {
    document.getElementById("btnStickyAgregar").onclick = agregarFn;
    sticky.classList.remove("hidden");
  }

  activarZoom();
  cargarRelacionados(p.categoria, p.id);
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
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
      img.style.transform = "scale(1.8)";
    });

    wrap.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1)";
      img.style.transformOrigin = "center";
    });
  }
}

/* CAMBIAR IMAGEN */
window._cambiarImg = src => {
  const img = document.getElementById("imgPrincipal");
  img.src = src;
  img.style.transform = "scale(1)";
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

/* =========================================================
   PEDIDO DIRECTO
========================================================= */
function pedirDatosProducto(tipo) {
  Swal.fire({
    title: "Datos para tu pedido",
    html: `
      <input id="swal-nombre" class="swal2-input" placeholder="Nombre completo">
      ${tipo === "envio"
        ? `<textarea id="swal-direccion" class="swal2-textarea"
            placeholder="Dirección completa"></textarea>`
        : ""}
      <textarea id="swal-ref" class="swal2-textarea"
        placeholder="Referencia (opcional)"></textarea>
    `,
    confirmButtonText: "Enviar pedido",
    showCancelButton: true,
    confirmButtonColor: "#16a34a",
    preConfirm: () => {
      const nombre = document.getElementById("swal-nombre").value.trim();
      const direccion =
        tipo === "envio"
          ? document.getElementById("swal-direccion").value.trim()
          : "";

      if (!nombre || (tipo === "envio" && !direccion)) {
        Swal.showValidationMessage("Completa los datos requeridos");
        return false;
      }
      return { nombre, direccion, tipo };
    }
  }).then(r => {
    if (!r.isConfirmed) return;
    enviarWhatsProductoDirecto(r.value);
  });
}

/* =========================================================
   WHATSAPP
========================================================= */
function enviarWhatsProductoDirecto(data) {
  let msg = `PEDIDO PEEKSHOP\n\n`;
  msg += `Producto: ${document.querySelector("h1").innerText}\n`;
  msg += `Cliente: ${data.nombre}\n`;

  if (data.tipo === "envio") {
    msg += `Entrega: Envío a domicilio\n`;
    msg += `Dirección: ${data.direccion}\n`;
  } else {
    msg += `Entrega: Recoger en tienda\n`;
  }

  msg += `\nEscríbenos para confirmar tu pedido 🐾`;

  window.open(
    `https://wa.me/529992328261?text=${encodeURIComponent(msg)}`,
    "_blank"
  );
}

/* INIT */
cargarProducto();
