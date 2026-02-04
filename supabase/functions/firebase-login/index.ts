import { auth } from "../js/firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { supabase } from "../js/supabase.js";

/* 🔐 PROTECCIÓN */
let authChecked = false;

onAuthStateChanged(auth, u => {
  if (authChecked) return;
  authChecked = true;

  if (!u) {
    location.replace("login.html");
  } else {
    document.body.classList.remove("hidden");
  }
});

/* ================= DOM ================= */
const lista = document.getElementById("lista");
const modal = document.getElementById("modal");
const btnNuevo = document.getElementById("btnNuevo");
const btnGuardar = document.getElementById("btnGuardar");
const dropZone = document.getElementById("dropZone");
const fileInputMedia = document.getElementById("fileInputMedia");
const btnAdjuntarMedia = document.getElementById("btnAdjuntarMedia");

/* ================= PEGADO GLOBAL DE IMÁGENES ================= */
document.addEventListener("paste", e => {
  if (modal.classList.contains("hidden")) return;

  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith("image") || item.type.startsWith("video")) {
      e.preventDefault();
      procesarArchivoMedia(item.getAsFile());
    }
  }
});

btnAdjuntarMedia.onclick = () => fileInputMedia.click();

fileInputMedia.onchange = () => {
  for (const file of fileInputMedia.files) {
    procesarArchivoMedia(file);
  }
  fileInputMedia.value = "";
};

/* ================= PRODUCTO BASE ================= */
const nombre = document.getElementById("nombre");
const descripcion = document.getElementById("descripcion");
const es_oferta = document.getElementById("es_oferta");
const activo = document.getElementById("activo");
const notas = document.getElementById("notas");

/* ================= CATEGORÍA ================= */
const categoria = document.getElementById("categoria");
const categoriaNueva = document.getElementById("categoriaNueva");

/* ================= MULTIMEDIA ================= */
const mediaLista = document.getElementById("mediaLista");

/* ================= COLORES ================= */
const colorPicker = document.getElementById("colorPicker");
const stockDiv = document.getElementById("stockPorColor");
const colorLibre = document.getElementById("colorLibre");
const btnAgregarColorLibre = document.getElementById("btnAgregarColorLibre");

/* ================= PRESENTACIONES ================= */
const presentacionesDiv = document.getElementById("presentaciones");
const btnAgregarPresentacion = document.getElementById("btnAgregarPresentacion");

/* ================= ESTADO ================= */
let productoActual = null;
let colores = [];
let stockColor = {};
let media = [];
let principalIndex = 0;

/* ================= MEDIA ================= */
function procesarArchivoMedia(file) {
  if (!file) return;

  const reader = new FileReader();
  const tipo = file.type.startsWith("video") ? "video" : "image";

  reader.onload = () => {
    media.push({ url: reader.result, tipo });
    renderMedia();
  };

  reader.readAsDataURL(file);
}

/*
presentaciones:
{
  nombre,
  unidad,
  cantidad,
  talla,
  costo,
  precio,
  precio_oferta,
  en_oferta,
  margen,
  stock,
  activo,
  sku
}
*/
let presentaciones = [];

/* ================= COLORES BASE ================= */
const baseColors = [
  { nombre: "Rojo", hex: "#ef4444" },
  { nombre: "Azul", hex: "#3b82f6" },
  { nombre: "Verde", hex: "#22c55e" },
  { nombre: "Amarillo", hex: "#eab308" },
  { nombre: "Negro", hex: "#000000" },
  { nombre: "Blanco", hex: "#ffffff" }
];

/* ================= COLORES ================= */
function renderColores() {
  colorPicker.innerHTML = [...baseColors, ...colores].map(c => {
    const activo = colores.find(x => x.nombre === c.nombre);
    return `
      <div class="relative">
        <div class="w-8 h-8 rounded-full border cursor-pointer"
          style="background:${c.hex}"
          onclick="toggleColor('${c.nombre}','${c.hex}')"></div>
        ${activo ? `
          <button onclick="quitarColor('${c.nombre}')"
            class="absolute -top-1 -right-1 bg-red-600 text-white
                   w-4 h-4 text-xs rounded">×</button>` : ""}
      </div>
    `;
  }).join("");
}

window.toggleColor = (n, h) => {
  if (colores.find(c => c.nombre === n)) {
    colores = colores.filter(c => c.nombre !== n);
    delete stockColor[n];
  } else {
    colores.push({ nombre: n, hex: h });
    stockColor[n] = 0;
  }
  renderColores();
  renderStock();
};

window.quitarColor = (n) => {
  colores = colores.filter(c => c.nombre !== n);
  delete stockColor[n];
  renderColores();
  renderStock();
};

btnAgregarColorLibre.onclick = () => {
  const hex = colorLibre.value;
  const name = hex.toUpperCase();
  if (colores.find(c => c.nombre === name)) return;
  colores.push({ nombre: name, hex });
  stockColor[name] = 0;
  renderColores();
  renderStock();
};

/* ================= STOCK POR COLOR ================= */
function renderStock() {
  stockDiv.innerHTML = colores.map(c => `
    <div class="flex gap-2 items-center">
      <span class="w-28">${c.nombre}</span>
      <input type="number" min="0" class="input w-24"
        value="${stockColor[c.nombre] || 0}"
        onchange="stockColor['${c.nombre}']=parseInt(this.value)||0">
    </div>
  `).join("");
}

/* ================= MEDIA RENDER ================= */
function renderMedia() {
  mediaLista.innerHTML = media.map((m, i) => `
    <div class="relative border rounded p-1 bg-white cursor-move"
      draggable="true"
      data-index="${i}"
      ondragstart="dragStart(event)"
      ondragover="dragOver(event)"
      ondrop="dropMedia(event)">
      <img src="${m.url}" class="h-24 w-full object-cover rounded">
      <button onclick="setPrincipal(${i})"
        class="absolute top-1 left-1 bg-yellow-400 px-1 text-xs rounded">
        ${i === principalIndex ? "⭐" : "☆"}
      </button>
      <button onclick="removeMedia(${i})"
        class="absolute top-1 right-1 bg-red-600 text-white px-1 text-xs rounded">
        ×
      </button>
    </div>
  `).join("");
}

window.setPrincipal = i => principalIndex = i;

window.removeMedia = i => {
  media.splice(i, 1);
  if (principalIndex >= media.length) principalIndex = 0;
  renderMedia();
};
/* ================= PRESENTACIONES ================= */
btnAgregarPresentacion.onclick = () => {
  presentaciones.push(crearPresentacionBase());
  renderPresentaciones();
};

function crearPresentacionBase() {
  return {
    nombre: "",
    unidad: "pieza",
    cantidad: 1,
    talla: "",
    costo: "",
    precio: "",
    precio_oferta: "",
    en_oferta: false,
    margen: 0,
    stock: 0,
    activo: true,
    sku: ""
  };
}

/* 🔧 SOLO CORRECCIÓN DE TIPO */
function calcularMargen(p) {
  const costo = Number(p.costo);
  const precio = Number(p.precio);

  if (costo > 0 && precio > 0) {
    p.margen = Number((((precio - costo) / costo) * 100).toFixed(2));
  } else {
    p.margen = 0;
  }
}

function renderPresentaciones() {

  if (!presentaciones.length) {
    presentacionesDiv.innerHTML = `
      <div class="text-sm text-slate-400 italic">
        Este producto aún no tiene presentaciones.
        Agrega al menos una para poder venderlo.
      </div>
    `;
    return;
  }

  presentacionesDiv.innerHTML = presentaciones.map((p, i) => {


    // ✅ SOLUCIÓN CLAVE: recalcular SIEMPRE al renderizar
    calcularMargen(p);

    return `
      <div class="border rounded p-4 space-y-2 bg-gray-50">

        <input class="input" placeholder="Nombre (Collar, Bulto 20kg)"
          value="${p.nombre}"
          onchange="presentaciones[${i}].nombre=this.value">

       <div class="grid grid-cols-2 gap-2">

          <div>
            <label class="text-xs text-slate-500">Unidad</label>
            <select class="input"
              onchange="window.actualizarCampoPresentacion(this,'unidad')"
              data-index="${i}">
              <option ${p.unidad==="pieza"?"selected":""}>pieza</option>
              <option ${p.unidad==="kilo"?"selected":""}>kilo</option>
              <option ${p.unidad==="bulto"?"selected":""}>bulto</option>
            </select>
          </div>

          <div>
            <label class="text-xs text-slate-500">
              Variante / Tamaño
            </label>
            <input
              class="input"
              placeholder="Ej. 5 kg, Grande"
              value="${p.talla}"
              onchange="window.actualizarCampoPresentacion(this,'talla')"
              data-index="${i}">
          </div>

        </div>


        <div class="grid grid-cols-2 gap-2">
          <input type="number" class="input" placeholder="Costo"
            value="${p.costo}"
            data-index="${i}"
            onblur="actualizarCampoPresentacion(this,'costo')">

          <input type="number" class="input" placeholder="Precio venta"
            value="${p.precio}"
            data-index="${i}"
            onblur="actualizarCampoPresentacion(this,'precio')">
        </div>

        <div class="text-xs text-gray-600">
          Ganancia:
          <b>$${((Number(p.precio) - Number(p.costo)) || 0)}</b> |
          Margen:
          <b>${p.margen}%</b>
        </div>

      <div class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          ${p.en_oferta ? "checked" : ""}
          onchange="window.actualizarCampoPresentacion(this,'en_oferta')"
          data-index="${i}"
        >

        <span
          class="cursor-help"
          title="Activa un precio especial para esta presentación"
        >
          En oferta
        </span>
      </div>


        ${p.en_oferta ? `
          <input type="number" class="input" placeholder="Precio oferta"
            value="${p.precio_oferta}"
            onchange="presentaciones[${i}].precio_oferta=this.value">
        ` : ""}

        <div class="grid grid-cols-2 gap-2">
          <input type="number" class="input" placeholder="Stock"
            value="${p.stock}"
            onchange="presentaciones[${i}].stock=parseInt(this.value)||0">

          <div class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              ${p.activo ? "checked" : ""}
              onchange="window.actualizarCampoPresentacion(this,'activo')"
              data-index="${i}"
            >
            <span
              class="cursor-help"
              title="Si se desactiva, esta presentación no se vende"
            >
              Activa
            </span>
          </div>


        <button onclick="eliminarPresentacion(${i})"
          class="text-red-600 text-sm">Eliminar</button>
      </div>
    `;    
  }).join("");
}

window.eliminarPresentacion = i => {
  presentaciones.splice(i, 1);
  renderPresentaciones();
};

/* ================= VALIDACIONES ================= */
function validar() {
  if (!nombre.value.trim()) {
    alert("Nombre obligatorio");
    return false;
  }

  for (const p of presentaciones) {
    if (!p.precio || !p.costo || Number(p.precio) <= Number(p.costo)) {
      alert("Revisa costo y precio en presentaciones");
      return false;
    }
  }
  return true;
}

/* ================= SKU ================= */
function generarSKU(p) {
  const cat = (categoriaNueva.value || categoria.value || "GEN").toUpperCase();
  const talla = p.talla ? `-${p.talla.toUpperCase()}` : "";
  return `PEEK-${cat}-${p.unidad.toUpperCase()}${talla}`;
}

function obtenerPrecioBase() {
  let min = null;

  for (const p of presentaciones) {
    const precio = Number(p.precio);
    if (!precio || precio <= 0) continue;
    if (min === null || precio < min) min = precio;
  }
  return min;
}

/* ================= GUARDAR ================= */
btnGuardar.onclick = async () => {
  if (!validar()) return;

  const precioBase = obtenerPrecioBase();
  if (precioBase === null) {
    alert("Debes capturar al menos un precio válido");
    return;
  }

  const payload = {
    nombre: nombre.value.trim(),
    descripcion: descripcion.value.trim(),
    categoria: categoriaNueva.value || categoria.value,
    precio: Number(precioBase),
    es_oferta: es_oferta.checked,
    activo: activo.checked,
    notas: notas.value
  };

  let productoId = productoActual;

  // 🔁 EDITAR
  if (productoActual) {
    const { error } = await supabase
      .from("catalogo_productos")
      .update(payload)
      .eq("id", productoActual);

    if (error) {
      alert(error.message);
      return;
    }

    // 🧹 borrar presentaciones viejas
    await supabase
      .from("catalogo_presentaciones")
      .delete()
      .eq("producto_id", productoActual);

  } 
  // ➕ NUEVO
  else {
    const { data, error } = await supabase
      .from("catalogo_productos")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    productoId = data.id;
  }

  // 🔽 guardar presentaciones
  for (const p of presentaciones) {
    await supabase.from("catalogo_presentaciones").insert({
      producto_id: productoId,
      nombre: p.nombre,
      unidad: p.unidad,
      cantidad: p.cantidad,
      talla: p.talla || null,
      costo: Number(p.costo),
      precio: Number(p.precio),
      precio_oferta: p.en_oferta ? Number(p.precio_oferta) : null,
      en_oferta: p.en_oferta,
      margen: p.margen,
      stock: p.stock,
      activo: p.activo,
      sku: generarSKU(p)
    });
  }

  cerrar();
  cargar();
};

/* ================= UI ================= */
btnNuevo.onclick = () => {
  productoActual = null;
  colores = [];
  stockColor = {};
  media = [];
  principalIndex = 0;

  document.getElementById("tituloModal").textContent =
  "🧾 Nuevo producto";


  presentaciones = [{
    ...crearPresentacionBase(),
    nombre: "General"
  }];

  renderColores();
  renderStock();
  renderMedia();
  renderPresentaciones();

  modal.classList.remove("hidden");

  setTimeout(() => dropZone.focus(), 100);
};

window.cerrar = () => modal.classList.add("hidden");

/* ================= LISTA ================= */
async function cargar() {
  const { data } = await supabase
    .from("catalogo_productos")
    .select("*")
    .order("es_oferta", { ascending: false })
    .order("nombre");

  lista.innerHTML = (data || []).map(p => {

    const badgeOferta = p.es_oferta ? `
      <span class="px-2 py-0.5 rounded text-xs font-semibold
        bg-gradient-to-r from-red-500 to-pink-500
        text-white shadow animate-pulse">
        🔥 OFERTA
      </span>` : "";

    let descuentoHTML = "";
    if (p.es_oferta && p.precio_anterior && p.precio_anterior > p.precio) {
      const descuento = Math.round(
        ((p.precio_anterior - p.precio) / p.precio_anterior) * 100
      );
      descuentoHTML = `
        <span class="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-semibold">
          -${descuento}%
        </span>`;
    }

    const precioHTML = p.es_oferta && p.precio_anterior
      ? `
        <div class="text-sm flex items-center gap-2">
          <span class="line-through text-slate-400">$${p.precio_anterior}</span>
          <span class="font-semibold text-red-600">$${p.precio}</span>
        </div>`
      : `
        <div class="text-sm font-semibold text-purple-600">
          $${p.precio}
        </div>`;

        return `
  <div
    onclick="editarProducto('${p.id}')"
    class="group cursor-pointer bg-white rounded-2xl shadow-md
           hover:shadow-xl transition overflow-hidden
           w-full max-w-sm"
  >

    <!-- IMAGEN -->
    <div class="relative h-40 bg-gradient-to-br from-slate-200 to-slate-100 overflow-hidden">
      <img
        src="/img/placeholder-producto.png"
        class="w-full h-full object-cover group-hover:scale-105 transition"
      />



      ${p.es_oferta ? `
        <span class="absolute top-2 left-2 px-2 py-1 text-xs font-bold
                     bg-red-600 text-white rounded-full shadow animate-pulse">
          🔥 OFERTA
        </span>
      ` : ""}
    </div>

    <!-- CONTENIDO -->
    <div class="p-4 space-y-1">

      <h3 class="font-semibold text-slate-800 truncate">
        ${p.nombre}
      </h3>

      <p class="text-xs text-slate-500">
        ${p.categoria || "Sin categoría"}
      </p>

      <!-- PRECIO -->
      <div class="mt-1">
        ${
          p.es_oferta && p.precio_anterior
            ? `
              <div class="flex items-center gap-2">
                <span class="line-through text-slate-400 text-sm">
                  $${p.precio_anterior}
                </span>
                <span class="text-lg font-bold text-red-600">
                  $${p.precio}
                </span>
              </div>
            `
            : `
              <span class="text-lg font-bold text-purple-600">
                $${p.precio}
              </span>
            `
        }
      </div>

      <!-- INFO EXTRA -->
      <div class="flex items-center justify-between text-xs mt-2">

        <span class="text-slate-400 italic">
          Click para editar
        </span>

        <span
          class="px-2 py-0.5 rounded-full ${
            p.activo
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }"
        >
          ${p.activo ? "Activo" : "Inactivo"}
        </span>

      </div>

    </div>
  </div>
`;
     
  }).join("");
}

/* ================= DRAG & DROP MEDIA ================= */
let dragIndex = null;

window.dragStart = e => {
  dragIndex = Number(e.currentTarget.dataset.index);
};

window.dragOver = e => e.preventDefault();

window.dropMedia = e => {
  e.preventDefault();
  const dropIndex = Number(e.currentTarget.dataset.index);
  if (dragIndex === null || dragIndex === dropIndex) return;

  const item = media.splice(dragIndex, 1)[0];
  media.splice(dropIndex, 0, item);

  if (principalIndex === dragIndex) principalIndex = dropIndex;
  else if (dragIndex < principalIndex && dropIndex >= principalIndex) principalIndex--;
  else if (dragIndex > principalIndex && dropIndex <= principalIndex) principalIndex++;

  dragIndex = null;
  renderMedia();
};

/* 🔑 EXPONER FUNCIÓN PARA HTML */
window.actualizarCampoPresentacion = (el, campo) => {
  const i = Number(el.dataset.index);
  if (!presentaciones[i]) return;

  presentaciones[i][campo] = el.type === "checkbox" ? el.checked : el.value;

  if (campo === "costo" || campo === "precio") {
    calcularMargen(presentaciones[i]);
  }
  renderPresentaciones();
};

window.editarProducto = async (id) => {
  console.log("Editar producto:", id);

  productoActual = id;

  const { data: producto } = await supabase
    .from("catalogo_productos")
    .select("*")
    .eq("id", id)
    .single();

    document.getElementById("tituloModal").textContent =
  "✏️ Editando producto: " + producto.nombre;

  nombre.value = producto.nombre || "";
  descripcion.value = producto.descripcion || "";
  categoria.value = producto.categoria || "";
  categoriaNueva.value = "";
  es_oferta.checked = producto.es_oferta;
  activo.checked = producto.activo;
  notas.value = producto.notas || "";

  const { data: pres } = await supabase
    .from("catalogo_presentaciones")
    .select("*")
    .eq("producto_id", id);

  presentaciones = (pres || []).map(p => ({
    nombre: p.nombre || "",
    unidad: p.unidad,
    cantidad: p.cantidad,
    talla: p.talla || "",
    costo: p.costo,
    precio: p.precio,
    precio_oferta: p.precio_oferta,
    en_oferta: p.en_oferta,
    margen: p.margen,
    stock: p.stock,
    activo: p.activo,
    sku: p.sku
  }));

  renderPresentaciones();
  modal.classList.remove("hidden");
};

cargar();
