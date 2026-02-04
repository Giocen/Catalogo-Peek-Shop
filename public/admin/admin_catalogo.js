import { auth } from "../js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { supabase } from "../js/supabase.js";

/* 🔐 PROTECCIÓN + VISIBILIDAD */
let authChecked = false;

onAuthStateChanged(auth, async user => {
  if (authChecked) return;
  authChecked = true;

  if (!user) {
    location.replace("login.html");
    return;
  }

  document.body.classList.remove("hidden");
  await cargarCatalogo();
});

/* ================= DOM ================= */
const tablaProductos = document.getElementById("tablaProductos");
const buscador = document.getElementById("buscador");
const modalEditar = document.getElementById("modalEditar");
const tituloProducto = document.getElementById("tituloProducto");
const cardsPresentaciones = document.getElementById("cardsPresentaciones");

/* ================= ESTADO ================= */
let productos = [];
let productoActual = null;

/* ================= CARGAR CATÁLOGO ================= */
async function cargarCatalogo() {
    const { data, error } = await supabase
      .from("v_catalogo_completo")
      .select("*")
      .eq("producto_activo", true)
      .order("producto_nombre");
  
    if (error) {
      console.error("Error cargando catálogo", error);
      return;
    }
  
    // agrupar por producto
    const map = {};
    for (const row of data) {
      if (!map[row.producto_id]) {
        map[row.producto_id] = {
          id: row.producto_id,
          nombre: row.producto_nombre,
          categoria: row.categoria,
          activo: row.producto_activo,
          presentaciones: []
        };
      }
  
      map[row.producto_id].presentaciones.push(row);
    }
  
    productos = Object.values(map);
    renderTabla();
  }
  

/* ================= TABLA ================= */
function renderTabla() {
  const filtro = buscador.value?.toLowerCase() || "";

  tablaProductos.innerHTML = productos
    .filter(p => p.nombre.toLowerCase().includes(filtro))
    .map(p => {
      const precios = p.presentaciones.map(x => Number(x.precio_final));
      const margenes = p.presentaciones.map(x => Number(x.margen));
        

      const precioMin = precios.length ? Math.min(...precios) : 0;
      const precioMax = precios.length ? Math.max(...precios) : 0;
      const margenProm =
        margenes.length
          ? (margenes.reduce((a, b) => a + b, 0) / margenes.length).toFixed(1)
          : 0;

      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="p-3 font-medium">${p.nombre}</td>
          <td class="p-3">${p.categoria || ""}</td>
          <td class="p-3">
            <span class="${
              p.activo ? "text-green-600" : "text-red-600"
            }">
              ${p.activo ? "Activo" : "Inactivo"}
            </span>
          </td>
          <td class="p-3 text-center">${p.catalogo_presentaciones.length}</td>
          <td class="p-3">
            $${precioMin} – $${precioMax}
          </td>
          <td class="p-3">${margenProm}%</td>
          <td class="p-3 text-right">
            <button
              class="text-purple-600 hover:underline"
              onclick="abrirEditar('${p.id}')">
              Editar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

buscador.oninput = renderTabla;

/* ================= EDITAR ================= */
window.abrirEditar = id => {
  productoActual = productos.find(p => p.id === id);
  if (!productoActual) return;

  tituloProducto.textContent = productoActual.nombre;
  renderCardsPresentaciones();
  modalEditar.classList.remove("hidden");
};

window.cerrarModal = () => {
  modalEditar.classList.add("hidden");
  productoActual = null;
};

/* ================= CARDS PRESENTACIONES ================= */
function renderCardsPresentaciones() {
  cardsPresentaciones.innerHTML = productoActual.catalogo_presentaciones.map(p => `
    <div class="border rounded-lg p-4 space-y-2 bg-gray-50">

      <h3 class="font-semibold">${p.nombre}</h3>

      <div class="grid grid-cols-2 gap-2">
        <input type="number" class="input"
          value="${p.costo}"
          placeholder="Costo"
          onblur="actualizarPresentacion('${p.id}','costo',this.value)">

        <input type="number" class="input"
          value="${p.precio}"
          placeholder="Precio"
          onblur="actualizarPresentacion('${p.id}','precio',this.value)">
      </div>

      <div class="text-xs text-gray-600">
        Ganancia:
        <b>$${(Number(p.precio) - Number(p.costo)) || 0}</b> |
        Margen:
        <b>${p.margen || 0}%</b>
      </div>

      <div class="text-xs text-gray-600">
        Ganancia:
        <b>$${(Number(p.precio) - Number(p.costo)) || 0}</b> |
        Margen:
        <b>${p.margen || 0}%</b>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <input type="number" class="input"
          value="${p.stock}"
          placeholder="Stock"
          onblur="actualizarPresentacion('${p.id}','stock',this.value)">

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" ${p.activo ? "checked" : ""}
            onchange="actualizarPresentacion('${p.id}','activo',this.checked)">
          Activa
        </label>
      </div>

      <button class="text-green-600 text-sm"
        onclick="guardarPresentacion('${p.id}')">
        Guardar cambios
      </button>

    </div>
  `).join("");
}

/* ================= ACTUALIZAR PRESENTACIÓN ================= */
window.actualizarPresentacion = (id, campo, valor) => {
  const p = productoActual.catalogo_presentaciones.find(x => x.id === id);
  if (!p) return;

  p[campo] = campo === "activo" ? valor : Number(valor);

  if (campo === "costo" || campo === "precio") {
    if (p.costo > 0 && p.precio > 0) {
      p.margen = Number((((p.precio - p.costo) / p.costo) * 100).toFixed(2));
    } else {
      p.margen = 0;
    }
  }

  renderCardsPresentaciones();
};

/* ================= GUARDAR ================= */
window.guardarPresentacion = async id => {
  const p = productoActual.catalogo_presentaciones.find(x => x.id === id);
  if (!p) return;

  const { error } = await supabase
    .from("catalogo_presentaciones")
    .update({
      costo: p.costo,
      precio: p.precio,
      margen: p.margen,
      stock: p.stock,
      activo: p.activo
    })
    .eq("id", id);

  if (error) {
    alert("Error guardando cambios");
    console.error(error);
    return;
  }

  await cargarCatalogo();
  abrirEditar(productoActual.id);
};
