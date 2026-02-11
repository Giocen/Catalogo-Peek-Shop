// ==================================
// producto.admin.js — ADMIN ESTABLE
// SOLO EDICIÓN DE CONTENIDO
// ==================================

import { supabase } from "./supabase.js";

/* =========================================================
   INIT GLOBAL
========================================================= */
window.initAdminProducto = function () {

  const params = new URLSearchParams(location.search);
  const productoId = params.get("id");

  if (!window.ES_ADMIN || !productoId) return;

  /* ================= CSS ADMIN ================= */
  if (!document.getElementById("admin-css")) {
    const link = document.createElement("link");
    link.id = "admin-css";
    link.rel = "stylesheet";
    link.href = "/styles/producto.admin.css";
    document.head.appendChild(link);
  }

  if (window.__ADMIN_PRODUCTO_INIT__) return;
  window.__ADMIN_PRODUCTO_INIT__ = true;

  activarCamposEditables();
  activarEditorImagenes(productoId);
  crearToolbar(productoId);

  console.log("🛠️ producto.admin.js ACTIVADO (modo estable)");
};

/* =========================================================
   CAMPOS EDITABLES INLINE
========================================================= */
function activarCamposEditables() {

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
        input.className = "w-full border rounded p-2 text-sm";

        if (type === "number") {
          input.type = "number";
          input.step = "0.01";
        } else {
          input.type = "text";
        }
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
}

/* =========================================================
   TOOLBAR SIMPLE (SIN LAYOUT)
========================================================= */
function crearToolbar(productoId) {

  const toolbar = document.createElement("div");
  toolbar.className = "admin-toolbar";
  toolbar.innerHTML = `
    <button id="adminGuardar" class="bg-blue-600 text-white">💾 Guardar</button>
    <button id="adminCancelar" class="bg-gray-200">✖ Cancelar</button>
  `;
  document.body.appendChild(toolbar);

  document.getElementById("adminCancelar").onclick = () => location.reload();

  document.getElementById("adminGuardar").onclick = async () => {

    const payload = {};

    document.querySelectorAll("[data-editable='true']").forEach(el => {
      if (!el.dataset.field) return;

      payload[el.dataset.field] =
        el.dataset.type === "number"
          ? parseFloat(el.innerText)
          : el.innerText.trim();
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
}

/* =========================================================
   EDITOR DE IMÁGENES
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
      <input id="imgNueva" class="w-full border rounded p-2"
        placeholder="Nueva URL">
      <div class="flex gap-2 mt-4">
        <button id="btnReemplazar"
          class="flex-1 bg-blue-600 text-white py-2 rounded">
          Reemplazar
        </button>
        <button id="btnEliminar"
          class="flex-1 bg-red-600 text-white py-2 rounded">
          Eliminar
        </button>
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

    const ok = await Swal.fire({
      title: "¿Eliminar imagen?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true
    });

    if (!ok.isConfirmed) return;

    await supabase
      .from("catalogo_multimedia")
      .delete()
      .eq("producto_id", productoId)
      .eq("url", urlActual);

    location.reload();
  };
}
