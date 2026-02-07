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

  console.log("🛠️ producto.admin.js ACTIVADO");

  /* =========================================================
     🎨 ESTILOS ADMIN
  ========================================================= */
  const style = document.createElement("style");
  style.textContent = `
    .admin-editable {
      outline: 2px dashed #3b82f6;
      padding: 4px;
      border-radius: 6px;
      cursor: text;
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
  `;
  document.head.appendChild(style);

  /* =========================================================
     ✏️ ACTIVAR CAMPOS EDITABLES
  ========================================================= */
  const editables = document.querySelectorAll("[data-editable='true']");

  editables.forEach(el => {
    el.classList.add("admin-editable");

    const type = el.dataset.type || "text";

    el.addEventListener("click", () => {
      if (el.dataset.editing === "1") return;
      el.dataset.editing = "1";

      const original = el.innerText.trim();

      let input;
      if (type === "textarea") {
        input = document.createElement("textarea");
        input.className =
          "w-full border rounded p-2 text-sm resize-none min-h-[80px]";
        input.value = original;
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className = "w-full border rounded p-2 text-sm";
        input.value = original;
      }

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
     💾 TOOLBAR ADMIN
  ========================================================= */
  const toolbar = document.createElement("div");
  toolbar.className = "admin-toolbar";
  toolbar.innerHTML = `
    <button id="adminGuardar" class="bg-blue-600 text-white">
      💾 Guardar cambios
    </button>
    <button id="adminCancelar" class="bg-gray-200">
      ✖ Cancelar
    </button>
  `;
  document.body.appendChild(toolbar);

  document.getElementById("adminCancelar").onclick = () => {
    location.reload();
  };

  /* =========================================================
     💾 GUARDAR EN SUPABASE
  ========================================================= */
  document.getElementById("adminGuardar").onclick = async () => {
    const payload = {};

    document.querySelectorAll("[data-editable='true']").forEach(el => {
      const campo = el.dataset.field;
      if (!campo) return;

      payload[campo] = el.innerText.trim();
    });

    console.log("📦 Guardando producto:", payload);

    try {
      const { error } = await supabase
        .from("catalogo_productos")
        .update(payload)
        .eq("id", productoId);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Producto actualizado",
        timer: 1200,
        showConfirmButton: false
      });

      setTimeout(() => location.reload(), 1200);

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo guardar el producto", "error");
    }
  };
};
