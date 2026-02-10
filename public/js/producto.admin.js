// ==================================
// producto.admin.js — CMS INLINE
// ==================================

import { supabase } from "./supabase.js";

/* =========================================================
   🔑 FUNCIÓN GLOBAL (LLAMADA DESDE producto.js)
========================================================= */
window.initAdminProducto = function () {

  const params = new URLSearchParams(location.search);
const productoId = params.get("id");

if (!window.ES_ADMIN || !productoId) {
  console.log("👤 producto.admin.js no activado");
  return;
}

// 🔒 Protección contra doble init (AQUÍ es donde va)
if (window.__ADMIN_PRODUCTO_INIT__) return;
window.__ADMIN_PRODUCTO_INIT__ = true;

setTimeout(() => {
  activarDragLibre();
  activarClickEditarLayout();
  ajustarAlturaLayout(); // 👈 AQUÍ
}, 0);

console.log("🛠️ producto.admin.js ACTIVADO");


  /* =========================================================
     🎨 ESTILOS ADMIN
  ========================================================= */
  const style = document.createElement("style");
  style.textContent = `
    .admin-editable {
      position: relative;
      outline: 2px dashed #3b82f6;
      outline-offset: 4px;
      border-radius: 6px;
      cursor: text;
    }

    .admin-editable:hover {
      background: rgba(59,130,246,0.06);
    }

    .admin-editable[data-editing="1"] {
      outline-style: solid;
      background: white;
    }

    .admin-editable::after {
      content: "Editar";
      position: absolute;
      top: -10px;
      right: 8px;
      background: #2563eb;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      opacity: 0;
    }

    .admin-editable:hover::after {
      opacity: 1;
    }

    .admin-toolbar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border-radius: 999px;
      padding: 10px 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,.15);
      display: flex;
      gap: 12px;
      z-index: 999999;
    }

    .admin-toolbar button {
      padding: 8px 14px;
      border-radius: 999px;
      font-weight: 600;
    }

    .admin-img-thumb {
      position: relative;
    }

    .admin-img-thumb:hover {
      outline: 2px dashed #22c55e;
      outline-offset: 3px;
    }

    .admin-img-thumb::after {
      content: "Editar";
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: #22c55e;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      opacity: 0;
    }

    .admin-img-thumb:hover::after {
      opacity: 1;
    }

    .admin-presentacion {
      position: relative;
      outline: 2px dashed #a855f7;
      outline-offset: 4px;
    }

    .admin-presentacion::after {
      content: "Presentación";
      position: absolute;
      top: -10px;
      left: 10px;
      background: #a855f7;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
    }


.admin-layout-bloque::before {
  content: "⇅";
  position: absolute;
  top: 6px;
  right: 6px;
  background: #22c55e;
  color: white;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 6px;
  opacity: 0;
}

.admin-layout-bloque:hover::before {
  opacity: 1;
}

.admin-layout-bloque.dragging {
  opacity: 0.4;
}

.admin-layout-bloque {
  position: absolute;
  outline: 2px dashed #f59e0b;
  background: white;
}

.admin-layout-bloque::after {
  content: "Layout";
  position: absolute;
  top: -10px;
  left: 10px;
  background: #f59e0b;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
}


.admin-layout-zone {
  min-height: 80px;
  border: 2px dashed transparent;
  padding: 6px;
}

.admin-layout-zone {
  transition: height 0.2s ease;
}


.admin-layout-zone:hover {
  border-color: #22c55e;
  background: rgba(34,197,94,0.05);
}

.admin-layout-zone::before {
  content: "Suelta aquí";
  display: block;
  text-align: center;
  font-size: 11px;
  color: #22c55e;
  opacity: 0;
  padding: 6px 0;
}

.admin-layout-zone:hover::before {
  opacity: 1;
}

.zone-drop {
  background:
    repeating-linear-gradient(
      45deg,
      #f8fafc,
      #f8fafc 10px,
      #f1f5f9 10px,
      #f1f5f9 20px
    );
  border: 2px dashed #cbd5f5;
  border-radius: 12px;
}

.zone-drop::before {
  content: "Suelta aquí";
  color: #64748b;
  font-size: 12px;
}

.admin-layout-resize-y {
  position: absolute;
  bottom: -6px;
  left: 0;
  width: 100%;
  height: 12px;
  cursor: ns-resize;
  z-index: 20;
}

.admin-layout-resize-y::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 2px;
  width: 40px;
  height: 6px;
  background: #22c55e;
  border-radius: 6px;
  transform: translateX(-50%);
}


  `;
  document.head.appendChild(style);

  /* =========================================================
     ✏️ CAMPOS EDITABLES
  ========================================================= */
  document.querySelectorAll("[data-editable='true']").forEach(el => {
    el.classList.add("admin-editable");

    const type = el.dataset.type || "text";

    el.addEventListener("click", () => {
      if (el.dataset.editing === "1") return;
      el.dataset.editing = "1";

      const original = el.innerText.trim();
      let input;

      if (type === "textarea") {
        input = document.createElement("textarea");
        input.className = "w-full border rounded p-2 text-sm min-h-[80px]";
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className = "w-full border rounded p-2 text-sm";
      }

      input.value = original;
      el.innerHTML = "";
      el.appendChild(input);
      input.focus();

      input.onblur = () => {
        el.dataset.editing = "0";
        el.innerText = input.value.trim() || "—";
      };
    });
  });

  /* =========================================================
     🧰 TOOLBAR
  ========================================================= */
  const toolbar = document.createElement("div");
  toolbar.className = "admin-toolbar";
  toolbar.innerHTML = `
    <button id="adminGuardar" class="bg-blue-600 text-white">💾 Guardar</button>
    <button id="adminCancelar" class="bg-gray-200">✖ Cancelar</button>
  `;
  document.body.appendChild(toolbar);

  const btnAgregarLayout = document.createElement("button");
btnAgregarLayout.textContent = "➕ Bloque layout";
btnAgregarLayout.className = "bg-green-600 text-white";
toolbar.appendChild(btnAgregarLayout);

btnAgregarLayout.onclick = () => abrirModalLayout();

  document.getElementById("adminCancelar").onclick = () => location.reload();

  /* =========================================================
     💾 GUARDAR PRODUCTO
  ========================================================= */
  document.getElementById("adminGuardar").onclick = async () => {
    const payload = {};

    document.querySelectorAll("[data-editable='true']").forEach(el => {
      if (el.dataset.field) {
        payload[el.dataset.field] = el.innerText.trim();
      }
    });

    const { error } = await supabase
      .from("catalogo_productos")
      .update(payload)
      .eq("id", productoId);

    if (error) {
      Swal.fire("Error", "No se pudo guardar", "error");
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Producto actualizado",
      timer: 1200,
      showConfirmButton: false
    });

    setTimeout(() => location.reload(), 1200);
  };

  setTimeout(() => activarEditorImagenes(productoId), 0);
};

/* =========================================================
   🖼️ EDITOR DE IMÁGENES
========================================================= */
function activarEditorImagenes(productoId) {
  document.querySelectorAll(".admin-img-thumb").forEach(img => {
    img.addEventListener("click", () => {
      abrirModalImagen(productoId, img.dataset.imgUrl);
    });
  });
}

function abrirModalImagen(productoId, urlActual) {
  Swal.fire({
    title: "Editar imagen",
    html: `
      <img src="${urlActual}" class="w-full rounded mb-4">
      <input id="imgNueva" class="w-full border rounded p-2" placeholder="Nueva URL">
      <div class="flex gap-2 mt-4">
        <button id="btnReemplazar" class="flex-1 bg-blue-600 text-white py-2 rounded">Reemplazar</button>
        <button id="btnEliminar" class="flex-1 bg-red-600 text-white py-2 rounded">Eliminar</button>
      </div>
    `,
    showConfirmButton: false
  });

  document.getElementById("btnReemplazar").onclick = async () => {
    const nueva = document.getElementById("imgNueva").value.trim();
    if (!nueva) return;

    await supabase
      .from("catalogo_multimedia")
      .update({ url: nueva })
      .eq("producto_id", productoId)
      .eq("url", urlActual);

    location.reload();
  };

  document.getElementById("btnEliminar").onclick = async () => {
    await supabase
      .from("catalogo_multimedia")
      .delete()
      .eq("producto_id", productoId)
      .eq("url", urlActual);

    location.reload();
  };
}

/* =========================================================
   💰 EDITOR PRESENTACIONES
========================================================= */
window.abrirEditorPresentacion = async function (id) {
  const { data: p } = await supabase
    .from("catalogo_presentaciones")
    .select("*")
    .eq("id", id)
    .single();

  if (!p) return;

  Swal.fire({
    title: "Editar presentación",
    html: `
      <input id="pPrecio" type="number" value="${p.precio}" class="w-full border p-2 mb-2">
      <input id="pPrecioOferta" type="number" value="${p.precio_oferta ?? ""}" class="w-full border p-2 mb-2">
      <label><input id="pOferta" type="checkbox" ${p.en_oferta ? "checked" : ""}> En oferta</label>
    `,
    showCancelButton: true
  }).then(async r => {
    if (!r.isConfirmed) return;

    await supabase
      .from("catalogo_presentaciones")
      .update({
        precio: Number(document.getElementById("pPrecio").value),
        precio_oferta: Number(document.getElementById("pPrecioOferta").value) || null,
        en_oferta: document.getElementById("pOferta").checked
      })
      .eq("id", id);

    location.reload();
  });
};

function abrirModalLayout() {
  Swal.fire({
    title: "Agregar bloque al layout",
    html: `
      <div class="space-y-3 text-left">

        <label class="font-semibold text-sm">Zona</label>
            <select id="lZona" class="w-full border rounded p-2">
            <option value="left">Izquierda</option>
            <option value="right">Derecha</option>
            <option value="full">Ancho completo</option>
            </select>


        <label class="font-semibold text-sm">Tipo de bloque</label>
        <select id="lTipo" class="w-full border rounded p-2">
        <option value="image">Imagen producto</option>
        <option value="name">Nombre del producto</option>
        <option value="brand">Marca</option>
        <option value="category">Categoría</option>
        <option value="price">Precio</option>
        <option value="offer">Oferta</option>
        <option value="short_description">Detalle corto</option>
        <option value="presentations">Presentaciones</option>
        <option value="variant">Unidad / Variante</option>
        <option value="color">Color</option>
        <option value="description">Descripción</option>
        <option value="text">Texto libre</option>
        <option value="image_ad">Imagen publicitaria</option>
        <option value="video_ad">Video publicitario</option>
        </select>


        <label class="font-semibold text-sm">Contenido / URL (opcional)</label>
        <input id="lContent"
               placeholder="Texto o URL"
               class="w-full border rounded p-2">

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Agregar",
    preConfirm: () => ({
    componente: document.getElementById("lTipo").value,    
    zona: document.getElementById("lZona").value,
    contenido: document.getElementById("lContent").value.trim()
    })

  }).then(res => {
    if (!res.isConfirmed) return;
    guardarBloqueLayout(res.value);
  });
}

async function guardarBloqueLayout({ componente, zona, contenido }) {



  const { data: ultimo } = await supabase
    .from("catalogo_layout_producto")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const orden = (ultimo?.orden ?? 0) + 1;

 const yBase = orden * 140;

const payload = {
  componente,
  orden,
  activo: true,
  x: 40,
  y: yBase, // 👈 AQUÍ
  w: 320,
  h: 120,
  config: {}
};


  if (contenido) {
    payload.config = componente === "text"
      ? { contenido }
      : { url: contenido };
  }

  const { error } = await supabase
    .from("catalogo_layout_producto")
    .insert(payload);

  if (error) {
    console.error(error);
    Swal.fire("Error", "No se pudo agregar el bloque", "error");
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Bloque agregado",
    timer: 900,
    showConfirmButton: false
  });

  setTimeout(() => location.reload(), 900);
}

function activarClickEditarLayout() {
  document.querySelectorAll(".admin-layout-bloque").forEach(bloque => {
    bloque.addEventListener("dblclick", () => {
      const id = bloque.dataset.layoutId;
      abrirModalEditarLayout(id);
    });
  });
}

async function abrirModalEditarLayout(id) {
  const { data: b } = await supabase
    .from("catalogo_layout_producto")
    .select("*")
    .eq("id", id)
    .single();

  if (!b) return;

  Swal.fire({
    title: "Editar bloque layout",
    html: `     

      <label class="flex items-center gap-2 text-sm mb-2">
        <input id="lActivo" type="checkbox" ${b.activo ? "checked" : ""}>
        Bloque activo
      </label>

      <label class="block text-sm font-semibold">Contenido / URL</label>
      <input id="lContent"
        value="${b.config?.contenido || b.config?.url || ""}"
        class="w-full border rounded p-2 mb-3">

      <button id="btnEliminarLayout"
        class="w-full bg-red-600 text-white py-2 rounded">
        🗑️ Eliminar bloque
      </button>

      <button id="btnDuplicarLayout"
        class="w-full bg-indigo-600 text-white py-2 rounded mt-2">
        📄 Duplicar bloque
      </button>
    `,
    showCancelButton: true,
    confirmButtonText: "Guardar",
    didOpen: () => {
      // 👇 AQUÍ VAN LOS LISTENERS
      document.getElementById("btnEliminarLayout").onclick = async () => {
        await supabase
          .from("catalogo_layout_producto")
          .update({ activo: false })
          .eq("id", id);

        location.reload();
      };

      document.getElementById("btnDuplicarLayout").onclick = async () => {
        const { data: ultimo } = await supabase
          .from("catalogo_layout_producto")
          .select("orden")
          .order("orden", { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabase
        .from("catalogo_layout_producto")
        .insert({
          componente: b.componente,
          orden: (ultimo?.orden ?? 0) + 1,
          activo: true,
          x: b.x ?? 40,
          y: b.y ?? 40,
          w: b.w ?? 320,
          h: b.h ?? 120,
          config: b.config || {}
        });

        location.reload();
      };
    }
  }).then(async r => {
    if (!r.isConfirmed) return;    
    const activo = document.getElementById("lActivo").checked;
    const contenido = document.getElementById("lContent").value.trim();

    const config = contenido
      ? (b.componente === "text" ? { contenido } : { url: contenido })
      : {};

    await supabase
      .from("catalogo_layout_producto")
      .update({ activo, config })
      .eq("id", id);

    location.reload();
  });
}

function activarDragLibre() {
  document.querySelectorAll(".admin-layout-bloque").forEach(bloque => {
    let startX, startY, origX, origY;

    bloque.addEventListener("mousedown", e => {

      // ❌ No arrastrar si:
      if (e.button !== 0) return; // solo click izquierdo
      if (e.detail > 1) return; // evita doble click (para editar)
      if (e.target.closest("input, textarea, button")) return;
      if (e.target.classList.contains("admin-layout-resize-y")) return;

      // ✅ Solo permitir drag desde el bloque
      if (!e.target.closest(".admin-layout-bloque")) return;

      e.preventDefault();

      const parent = bloque.parentElement;
      if (!parent) return;

      startX = e.clientX;
      startY = e.clientY;
      origX = bloque.offsetLeft;
      origY = bloque.offsetTop;

      const maxX = parent.clientWidth - bloque.offsetWidth;
      const maxY = parent.clientHeight - bloque.offsetHeight;

      bloque.classList.add("dragging");

      document.onmousemove = ev => {
        let newX = origX + (ev.clientX - startX);
        let newY = origY + (ev.clientY - startY);

        // 🧲 límites dentro del contenedor
        newX = Math.max(0, Math.min(maxX, newX));
        newY = Math.max(0, Math.min(maxY, newY));

        bloque.style.left = newX + "px";
        bloque.style.top  = newY + "px";
      };

      document.onmouseup = () => {
        document.onmousemove = null;
        document.onmouseup = null;
        bloque.classList.remove("dragging");

        // 🎨 Ajuste visual inmediato
        ajustarAlturaLayout();

        // 💾 Guardado en segundo plano
        supabase
          .from("catalogo_layout_producto")
          .update({
            x: bloque.offsetLeft,
            y: bloque.offsetTop
          })
          .eq("id", bloque.dataset.layoutId);
      };

    });
  });
}


function ajustarAlturaLayout() {
  const zone = document.querySelector(".admin-layout-zone");
  if (!zone) return;

  let maxBottom = 0;

  zone.querySelectorAll(".admin-layout-bloque").forEach(b => {
    const bottom = b.offsetTop + b.offsetHeight;
    if (bottom > maxBottom) maxBottom = bottom;
  });

  // Altura mínima + crecimiento automático
  zone.style.height = Math.max(maxBottom + 40, 600) + "px";
}
