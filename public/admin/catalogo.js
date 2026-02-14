import { auth } from "../js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { supabase } from "../js/supabase.js";
import { analizarProductoLocal } from "./producto.ia.js";
import { guardarProducto } from "./producto.save.js";
import {
  getPresentaciones,
  setPresentaciones,
  crearPresentacionBase,
  renderPresentaciones
} from "./producto.presentaciones.js";


// ================= DEBOUNCE =================
function debounce(fn, delay = 500) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ================= SWEET ALERT HELPERS =================
const swalError = (msg) =>
  Swal.fire({
    icon: "error",
    title: "Error",
    text: msg,
    confirmButtonColor: "#ef4444"
  });

const swalWarn = (msg) =>
  Swal.fire({
    icon: "warning",
    title: "Atención",
    text: msg,
    confirmButtonColor: "#f59e0b"
  });

const swalOk = (msg) =>
  Swal.fire({
    icon: "success",
    title: "Correcto",
    text: msg,
    timer: 1500,
    showConfirmButton: false
  });

const swalLoading = (msg = "Procesando...") =>
  Swal.fire({
    title: msg,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });


/* ================= DOM ================= */
const lista = document.getElementById("lista");
const modal = document.getElementById("modal");
const btnNuevo = document.getElementById("btnNuevo");
const btnGuardar = document.getElementById("btnGuardar");
const dropZone = document.getElementById("dropZone");
const fileInputMedia = document.getElementById("fileInputMedia");
const btnAdjuntarMedia = document.getElementById("btnAdjuntarMedia");
const marca = document.getElementById("marca");

/* 🔐 PROTECCIÓN */
let authChecked = false;

onAuthStateChanged(auth, u => {
  if (authChecked) return;
  authChecked = true;

  if (!u) { 
    location.replace("login.html");
  } else {
    document.body.classList.remove("hidden");
    cargar();
  }
});


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

if (btnAdjuntarMedia && fileInputMedia) {
  btnAdjuntarMedia.onclick = () => fileInputMedia.click();
}

if (fileInputMedia) {
  fileInputMedia.onchange = () => {
    for (const file of fileInputMedia.files) {
      procesarArchivoMedia(file);
    }
    fileInputMedia.value = "";
  };
}

/* ================= STORAGE ================= */
async function subirMediaSupabase(file, productoId, orden) {
  const ext = file.name.split(".").pop();
  const path = `${productoId}/${Date.now()}_${orden}.${ext}`;
  const { error } = await supabase.storage
    .from("catalogo")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("catalogo")
    .getPublicUrl(path);

  return data.publicUrl;
}


/* ================= PRODUCTO BASE ================= */
const codigo = document.getElementById("codigo");
const nombre = document.getElementById("nombre");
const validarCodigoDebounced = debounce(validarCodigoEnVivo, 500);

codigo.addEventListener("input", validarCodigoDebounced);
codigo.addEventListener("blur", validarCodigoEnVivo);
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
//const colorLibre = document.getElementById("colorLibre");
//const btnAgregarColorLibre = document.getElementById("btnAgregarColorLibre");

/* ================= PRESENTACIONES ================= */
const presentacionesDiv = document.getElementById("presentaciones");
const btnAgregarPresentacion = document.getElementById("btnAgregarPresentacion");

/* ================= AGREGAR PRESENTACIÓN ================= */

if (btnAgregarPresentacion) {

  btnAgregarPresentacion.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const lista = getPresentaciones();

    lista.push({
      ...crearPresentacionBase(),
      nombre: "Nueva presentación"
    });

    setPresentaciones(lista);
    renderPresentaciones(presentacionesDiv);

  });

}

/* ================= ESTADO ================= */
let productoActual = null;
let colores = [];
let stockColor = {};
let media = [];
let principalIndex = 0;
let productosCache = [];
let ordenCampo = "nombre";
let ordenAsc = true;
let codigoDuplicado = false;
let guardando = false;

/* ================= MEDIA ================= */
    function procesarArchivoMedia(file) {
      if (!file) return;

      const tipo = file.type.startsWith("video") ? "video" : "image";

      // 🎥 Si es video no tocamos nada
      if (tipo === "video") {
        const reader = new FileReader();
        reader.onload = () => {
          media.push({
            url: reader.result,
            tipo,
            file
          });
          renderMedia();
        };
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.src = reader.result;
      };

      img.onload = () => {

        const SIZE = 1200; // 📏 tamaño final
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = SIZE;
        canvas.height = SIZE;

        // 🎨 Fondo blanco
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, SIZE, SIZE);

        // 📐 Calcular escala manteniendo proporción
        const scale = Math.min(SIZE / img.width, SIZE / img.height);
        const newWidth = img.width * scale;
        const newHeight = img.height * scale;

        // 📍 Centrar imagen
        const x = (SIZE - newWidth) / 2;
        const y = (SIZE - newHeight) / 2;

        ctx.drawImage(img, x, y, newWidth, newHeight);

        // 📦 Convertir a JPG optimizado
        canvas.toBlob((blob) => {

          const archivoFinal = new File(
            [blob],
            file.name.replace(/\.\w+$/, ".jpg"),
            { type: "image/jpeg" }
          );

          const readerFinal = new FileReader();

          readerFinal.onload = () => {
            media.push({
              url: readerFinal.result,
              tipo: "image",
              file: archivoFinal
            });

            renderMedia();
          };

          readerFinal.readAsDataURL(archivoFinal);

        }, "image/jpeg", 0.92); // calidad optimizada
      };

      reader.readAsDataURL(file);
    }


/* ================= COLORES BASE ================= */
const baseColors = [
  { nombre: "Rojo", hex: "#ef4444" },
  { nombre: "Azul", hex: "#3b82f6" },
  { nombre: "Verde", hex: "#22c55e" },
  { nombre: "Amarillo", hex: "#eab308" },
  { nombre: "Negro", hex: "#000000" },
  { nombre: "Blanco", hex: "#ffffff" }
];

function renderColores() {
  colorPicker.innerHTML = [...baseColors, ...colores].map(c => {
    const activo = colores.find(x => x.hex === c.hex);
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
  if (colores.find(c => c.hex === h)) {
    colores = colores.filter(c => c.nombre !== n);
    delete stockColor[n];
  } else {
    colores.push({ nombre: h, hex: h });
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

//btnAgregarColorLibre.onclick = () => {
  //const hex = colorLibre.value;
  //const name = hex.toUpperCase();
 // if (colores.find(c => c.nombre === name)) return;
  //colores.push({ nombre: name, hex });
 // stockColor[name] = 0;
 // renderColores();
 // renderStock();
//};

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
  mediaLista.innerHTML = media.map((m, i) => {
    const esNuevo = !!m.file;

    return `
      <div class="relative border rounded p-1 bg-white ${esNuevo ? "cursor-move" : ""}"
        ${esNuevo ? `
          draggable="true"
          data-index="${i}"
          ondragstart="dragStart(event)"
          ondragover="dragOver(event)"
          ondrop="dropMedia(event)"
        ` : ""}>

        ${
          m.tipo === "video"
            ? `<video src="${m.url}" class="h-24 w-full object-cover rounded" controls></video>`
            : `<img
                src="${m.url}"
                class="h-24 w-full object-cover rounded"
                onerror="this.onerror=null;this.src='/img/placeholder-producto.png'"
              >`
        }

        <button onclick="setPrincipal(${i})"
          class="absolute top-1 left-1 bg-yellow-400 px-1 text-xs rounded">
          ${i === principalIndex ? "⭐" : "☆"}
        </button>

        <button onclick="removeMedia(${i})"
          class="absolute top-1 right-1 bg-red-600 text-white px-1 text-xs rounded">
          ×
        </button>
      </div>
    `;
  }).join("");
}


window.setPrincipal = i => principalIndex = i;

window.removeMedia = i => {
  media.splice(i, 1);
  if (principalIndex >= media.length) principalIndex = 0;
  renderMedia();
};


/* ================= VALIDACIONES ================= */
function validar() {
  if (!nombre.value.trim()) {
    swalWarn("El nombre del producto es obligatorio");
    nombre.focus();
    return false;
  }

  const presentaciones = getPresentaciones();
  if (!presentaciones.length) {
    swalWarn("El producto debe tener al menos una presentación");
    return false;
  }

  for (const p of presentaciones) {

    // 🔹 AQUÍ PEGAS ESTO
    if (!p.nombre.trim()) {
      swalWarn("Cada presentación debe tener un nombre");
      return false;
    }

    if (!p.precio || !p.costo || Number(p.precio) <= Number(p.costo)) {
      swalWarn("Revisa costo y precio en presentaciones");
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

      const lista = getPresentaciones();

      if (!lista.length) return null;

      const preciosValidos = lista
        .filter(p => p.activo)
        .map(p => {

          const precio = p.en_oferta && p.precio_oferta
            ? Number(p.precio_oferta)
            : Number(p.precio);

          return precio > 0 ? precio : null;
        })
        .filter(p => p !== null);

      if (!preciosValidos.length) return null;

      return Math.min(...preciosValidos);
    }


async function validarCodigoEnVivo() {
  const valor = codigo.value.trim();

  if (!valor) {
    codigoDuplicado = false;
    codigo.classList.remove("border-red-500");
    quitarAvisoCodigo();
    return;
  }

  let query = supabase
    .from("catalogo_productos")
    .select("id")
    .eq("codigo", valor)
    .limit(1);

  if (productoActual) {
    query = query.neq("id", productoActual);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.warn("Error validando código:", error);
    return; // ✅ AQUÍ sí es válido
  }

  if (data) {
    codigoDuplicado = true;
    codigo.classList.add("border-red-500");
    mostrarAvisoCodigo("⚠️ Este código ya está registrado");
  } else {
    codigoDuplicado = false;
    codigo.classList.remove("border-red-500");
    quitarAvisoCodigo();
  }
}


function mostrarAvisoCodigo(texto) {
  let aviso = document.getElementById("avisoCodigo");

  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "avisoCodigo";
    aviso.className = "text-xs text-red-600 mt-1";
    codigo.parentNode.appendChild(aviso);
  }

  aviso.textContent = texto;
}

function quitarAvisoCodigo() {
  const aviso = document.getElementById("avisoCodigo");
  if (aviso) aviso.remove();
}

 /* ================= GUARDAR ================= */
if (btnGuardar) btnGuardar.onclick = async () => {

  if (guardando) return;
  guardando = true;
  btnGuardar.disabled = true;

  try {

    if (!validar()) return;

    if (codigoDuplicado) {
      swalWarn("Corrige el código del producto antes de guardar");
      codigo.focus();
      return;
    }

    swalLoading("Guardando producto...");

    const precioBase = obtenerPrecioBase();

    if (precioBase === null) {
      swalWarn("Debes capturar al menos una presentación activa con precio válido");
      throw new Error("Validación");
    }
    const payload = {
      codigo: codigo.value.trim() || null,
      nombre: nombre.value.trim(),
      marca: marca.value.trim() || null,
      descripcion: descripcion.value.trim(),
      categoria: categoriaNueva.value || categoria.value,
      precio: Number(precioBase), 
      es_oferta: es_oferta.checked,
      activo: activo.checked,
      notas: notas.value,
      colores: colores.map(c => c.hex)
    };


   const productoId = await guardarProducto({
      supabase,
      productoActual,
      payload,
      presentaciones: getPresentaciones(),
      media,
      generarSKU,
      obtenerPrecioBase,
      subirMediaSupabase,
      swalError
    });

    swalOk("Producto guardado correctamente");
    cerrar();
    cargar();


  } catch (err) {

    if (err.message !== "Validación") {
      console.error(err);
      swalError("Ocurrió un error inesperado al guardar el producto");
    }

  } finally {
    Swal.close();
    guardando = false;
    btnGuardar.disabled = false;
  }
};


/* ================= UI ================= */
if (btnNuevo) btnNuevo.onclick = () => {
  // 🔁 estado
  productoActual = null;
  colores = [];
  stockColor = {};
  media = [];
  principalIndex = 0;

  // 🧼 LIMPIAR FORMULARIO (CLAVE)
  nombre.value = "";
  codigo.value = "";  
  codigoDuplicado = false;
  codigo.classList.remove("border-red-500");
  quitarAvisoCodigo();
  marca.value = "";
  descripcion.value = "";
  categoria.value = "";
  categoriaNueva.value = "";
  es_oferta.checked = false;
  activo.checked = true;
  notas.value = "";

  document.getElementById("tituloModal").textContent =
    "🧾 Nuevo producto";

  setPresentaciones([{
  ...crearPresentacionBase(),
  nombre: "General"
}]);


  // ✅ funciones CORRECTAS
  renderMedia();
  renderColores();
  renderStock();
  renderPresentaciones(presentacionesDiv);

  modal.classList.remove("hidden");
  history.pushState({ modalAbierto: true }, "");


  setTimeout(() => dropZone.focus(), 100);
};


window.cerrar = () => {

  if (!modal.classList.contains("hidden")) {
    modal.classList.add("hidden");

    if (history.state?.modalAbierto) {
      history.back(); // 👈 regresamos un paso sin salir
    }
  }

  productoActual = null;
  media = [];
  colores = [];
  stockColor = {};
  renderMedia();
  renderColores();
  renderStock();
};



/* ================= LISTA ================= */
async function cargar() {
  const { data, error } = await supabase
    .from("catalogo_productos")
    .select(`
      *,
      catalogo_multimedia (
        url,
        orden,
        tipo
      )
    `)
    .order("es_oferta", { ascending: false })
    .order("nombre");

  if (error) {
    console.error("ERROR SUPABASE:", error);
    swalError("No se pudo cargar el catálogo.");
    productosCache = [];
    renderTabla();
    return;
  }

  productosCache = data || [];
  renderTabla();
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

/* 🔑 ACTUALIZAR CAMPOS PRESENTACIÓN */
window.actualizarCampoPresentacion = (el, campo) => {

  const i = Number(el.dataset.index);

  const lista = getPresentaciones();
  if (!lista[i]) return;

  lista[i][campo] =
    el.type === "checkbox" ? el.checked : el.value;

  setPresentaciones(lista);

  renderPresentaciones(presentacionesDiv);
};

/* ================= EDITAR ================= */
window.editarProducto = async (id) => {
  productoActual = id;

  const { data: producto } = await supabase
  .from("catalogo_productos")
  .select(`
    id,
    codigo,
    nombre,
    marca,
    descripcion,
    categoria,
    precio,
    es_oferta,
    activo,
    notas,
    colores,
    catalogo_multimedia!producto_id (
      url,
      orden,
      tipo
    )
  `)
  .eq("id", id)
  .single();


  document.getElementById("tituloModal").textContent =
    "✏️ Editando producto: " + producto.nombre;

  // ================= DATOS BÁSICOS =================
  nombre.value = producto.nombre || "";
  codigo.value = producto.codigo || "";
  codigoDuplicado = false;
  codigo.classList.remove("border-red-500");
  quitarAvisoCodigo();
  marca.value = producto.marca || "";
  descripcion.value = producto.descripcion || "";
  categoria.value = producto.categoria || "";
  categoriaNueva.value = "";
  es_oferta.checked = producto.es_oferta;
  activo.checked = producto.activo;
  notas.value = producto.notas || "";

  // ================= COLORES (AQUÍ VA) =================
    colores = (producto.colores || []).map(hex => {
      return {
        nombre: hex, // ya no usamos nombre real
        hex: hex
      };
    });

  stockColor = {};
  renderColores();
  renderStock();

  // ================= IMÁGENES (AQUÍ VA) =================
  media = (producto.catalogo_multimedia || [])
  .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  .map(m => ({
    url: m.url,
    tipo: m.tipo === "imagen" ? "image" : "video",
    file: null
  }));

principalIndex = 0;

renderMedia();
modal.classList.remove("hidden");



  // ================= PRESENTACIONES =================
  const { data: pres } = await supabase
    .from("catalogo_presentaciones")
    .select("*")
    .eq("producto_id", id);

  setPresentaciones((pres || []).map(p => ({
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
    sku: p.sku,
    detalle: p.detalle || ""
  })));

  renderPresentaciones(presentacionesDiv);


  // ================= ABRIR MODAL =================
  modal.classList.remove("hidden");
};


function renderTabla() {
  const texto = document
    .getElementById("buscador")
    .value
    .toLowerCase();

  let filtrados = productosCache.filter(p =>
    (p.codigo || "").toLowerCase().includes(texto) ||
    (p.nombre || "").toLowerCase().includes(texto) ||
    (p.marca || "").toLowerCase().includes(texto) ||
    (p.categoria || "").toLowerCase().includes(texto)
  );

  filtrados.sort((a, b) => {
    let v1 = a[ordenCampo] ?? "";
    let v2 = b[ordenCampo] ?? "";

    if (typeof v1 === "string") v1 = v1.toLowerCase();
    if (typeof v2 === "string") v2 = v2.toLowerCase();

    if (v1 < v2) return ordenAsc ? -1 : 1;
    if (v1 > v2) return ordenAsc ? 1 : -1;
    return 0;
  });

  console.log("Productos a renderizar:", filtrados.length);

  lista.innerHTML = filtrados.map(p => {    

        const imagenPrincipal = (() => {
          if (!Array.isArray(p.catalogo_multimedia)) return null;
        
          const img = p.catalogo_multimedia
            .filter(m => m.tipo === "imagen" && m.url)
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))[0];
        
          return img?.url || null;
        })();
    
  
        return `
        <tr
          onclick="editarProducto('${p.id}')"
          class="cursor-pointer hover:bg-slate-50 border-b"
        >
      
         <td class="px-3 py-2">
          <div
            class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100
                  flex items-center justify-center
                  transition-all duration-200
                  hover:scale-150 hover:shadow-xl hover:z-10"
          >
            <img
              src="${imagenPrincipal || '/img/placeholder-producto.png'}"
              alt="Producto"
              class="w-full h-full object-cover"
              onerror="this.onerror=null;this.src='/img/placeholder-producto.png'"
            >
          </div>
        </td>


      
          <td class="px-3 py-2 font-mono">${p.codigo || "-"}</td>
          <td class="px-3 py-2 font-medium text-slate-800 truncate max-w-[320px]">
            ${p.nombre}
          </td>
          <td class="px-3 py-2">${p.categoria || "-"}</td>
          <td class="px-3 py-2 font-semibold">$${p.precio}</td>
      
          <td class="px-3 py-2 text-center">
            <button
              onclick="toggleActivo(event, '${p.id}', ${p.activo})"
              class="px-2 py-0.5 rounded-full text-xs ${
                p.activo
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }"
            >
              ${p.activo ? "Activo" : "Inactivo"}
            </button>
          </td>
      
          
          <td class="px-3 py-2 text-center">
            <button
              onclick="eliminarProducto(event, '${p.id}')"
              class="text-red-600 hover:text-red-800"
              title="Eliminar producto"
              >
              🗑️
            </button>

          </td>

      
        </tr>
      `;
      
  }).join("");
  
}


window.ordenarPor = campo => {
  if (ordenCampo === campo) {
    ordenAsc = !ordenAsc;
  } else {
    ordenCampo = campo;
    ordenAsc = true;
  }

  // 🔄 actualizar flechas visuales
  document.querySelectorAll("th[data-campo]").forEach(th => {
    const flecha = th.querySelector(".flecha");
    th.classList.remove("activo");

    if (!flecha) return;

    if (th.dataset.campo === ordenCampo) {
      th.classList.add("activo");
      flecha.textContent = ordenAsc ? "⬆" : "⬇";
    } else {
      flecha.textContent = "⬍";
    }
  });

  renderTabla();
};


document
  .getElementById("buscador")
  .addEventListener("input", renderTabla);
  
  window.toggleActivo = async (e, id, activoActual) => {
    e.stopPropagation();
  
    const accion = activoActual ? "desactivar" : "activar";
  
    const res = await Swal.fire({
      title: `¿Deseas ${accion} este producto?`,
      text: activoActual
        ? "El producto dejará de mostrarse y venderse"
        : "El producto volverá a estar disponible",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "Cancelar"
    });
  
    if (!res.isConfirmed) return;
  
    const { error } = await supabase
      .from("catalogo_productos")
      .update({ activo: !activoActual })
      .eq("id", id);
  
    if (error) {
      swalError("No se pudo actualizar el estado");
      console.error(error);
      return;
    }
  
    swalOk("Estado actualizado");
    cargar();
  };
  
  window.eliminarProducto = async (e, id) => {
    e.stopPropagation(); // ⛔ evita que se dispare editarProducto
  
    const res = await Swal.fire({
      title: "¿Eliminar producto?",
      text: "Esta acción eliminará el producto y sus presentaciones.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });
  
    if (!res.isConfirmed) return;
  
    const { error } = await supabase
      .from("catalogo_productos")
      .delete()
      .eq("id", id);
  
    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }
  
    Swal.fire({
      icon: "success",
      title: "Producto eliminado",
      timer: 1200,
      showConfirmButton: false
    });
  



    cargar(); // 🔄 refrescar lista
  };

  /* ================= CIERRE MODAL (GLOBAL) ================= */

// botones ✕ y Cancelar
document.querySelectorAll("[data-cerrar]").forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();
    cerrar();
  });
});

// click fuera (overlay)
modal.addEventListener("click", e => {
  if (e.target === modal) {
    cerrar();
  }
});

// evita cerrar cuando se hace click dentro del contenido
const modalContent = modal.firstElementChild;

if (modalContent) {
  modalContent.addEventListener("click", e => {
    e.stopPropagation();
  });
}

/* ===================================================== */
/* 🧠 BOTÓN IA HÍBRIDA (OpenAI + Fallback Local) */
/* ===================================================== */
    const btnIA = document.getElementById("btnIA");
    const textoCompletoIA = document.getElementById("textoCompletoIA");

    if (btnIA) {
      btnIA.onclick = async (e) => {
        e.stopPropagation();

        // 🔥 Determinar qué texto usar
        const textoParaIA = textoCompletoIA?.value?.trim()
          ? textoCompletoIA.value
          : `${nombre.value} ${descripcion.value} ${marca.value}`;

        if (!textoParaIA.trim()) {
          swalWarn("Escribe nombre o pega información del producto");
          return;
        }

        swalLoading("Analizando con IA...");

        let data = null;
        let usoLocal = false;

        try {

          const respuesta = await fetch(
            "https://us-central1-catalogo-peek-shop.cloudfunctions.net/iaProducto",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                textoCompleto: textoParaIA
              })
            }
          );

          if (!respuesta.ok) throw new Error("IA remota falló");

          const result = await respuesta.json();

          if (!result.ok) throw new Error("IA respondió sin éxito");

          data = result;

        } catch (err) {

          console.warn("⚠️ IA remota falló, usando modo local...");
          usoLocal = true;

          data = analizarProductoLocal({
            nombre: nombre.value,
            descripcion: descripcion.value,
            marca: marca.value
          });
        }

        try {

          if (data.nombre) nombre.value = data.nombre;
          if (data.marca) marca.value = data.marca;
          if (data.descripcion) descripcion.value = data.descripcion;
          if (data.categoria) categoria.value = data.categoria;

          if (data.presentaciones?.length) {
            setPresentaciones(data.presentaciones);
            renderPresentaciones(presentacionesDiv);
          }

          if (usoLocal) {
            swalOk("Sugerencias generadas (modo rápido)");
          } else {
            swalOk("Datos completados con IA avanzada");
          }

        } catch (err) {
          console.error(err);
          swalError("Error procesando datos IA");
        } finally {
          Swal.close();
        }
      };
    }



/* ===================================================== */
/* ⚡ BOTÓN IA LOCAL (GRATIS) */
/* ===================================================== */

const btnIALocal = document.getElementById("btnIALocal");

if (btnIALocal) {
  btnIALocal.onclick = (e) => {
    e.stopPropagation();

    if (!nombre.value.trim()) {
      swalWarn("Escribe al menos el nombre del producto");
      return;
    }

    swalLoading("Analizando localmente...");

    try {
      const data = analizarProductoLocal({
        nombre: nombre.value,
        descripcion: descripcion.value,
        marca: marca.value
      });

      if (data.categoria) {
        categoria.value = data.categoria;
      }

      if (data.descripcion) {
        descripcion.value = data.descripcion;
      }

      if (data.presentaciones?.length) {
        setPresentaciones(data.presentaciones);
        renderPresentaciones(presentacionesDiv);
      }

      swalOk("Datos sugeridos (modo rápido)");
    } catch (err) {
      console.error(err);
      swalError("Error en análisis local");
    } finally {
      Swal.close();
    }
  };
}


/* ===================================================== */
/* 📸 FOTO INTELIGENTE + GOOGLE LENS (VERSIÓN ESTABLE) */
/* ===================================================== */

const btnFotoIA = document.getElementById("btnFotoIA");
const btnBuscarLens = document.getElementById("btnBuscarLens");
const inputCamaraIA = document.getElementById("inputCamaraIA");

/* =========================
   📸 BOTÓN TOMAR FOTO
========================= */
if (btnFotoIA) {

  btnFotoIA.addEventListener("click", function (e) {

    e.preventDefault();

    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href =
        "intent://lens.google.com/#Intent;scheme=https;package=com.google.ar.lens;end";
    } else {
      window.open("https://lens.google.com/", "_blank");
    }

  });

}


/* =========================
   📷 CUANDO SE TOMA FOTO
========================= */
if (inputCamaraIA) {

  inputCamaraIA.addEventListener("change", async (e) => {

    const file = e.target.files?.[0];

    if (!file) {
      console.log("No se capturó archivo");
      return;
    }

    console.log("Archivo capturado:", file);

    swalLoading("Procesando imagen...");


    // 🔥 Quitar fondo primero
      let archivoFinal = file;

          try {

        procesarArchivoMedia(file);

        inputCamaraIA.value = "";

        const sugerencia = analizarProductoLocal({
          nombre: nombre.value,
          descripcion: descripcion.value,
          marca: marca.value
        });

        if (sugerencia.categoria) {
          categoria.value = sugerencia.categoria;
        }

        if (sugerencia.presentaciones?.length) {
          setPresentaciones(sugerencia.presentaciones);
          renderPresentaciones(presentacionesDiv);
        }


        swalOk("Imagen agregada correctamente");

      } catch (err) {
        console.error(err);
        swalError("Error procesando imagen");
      }

  });

}

/* =========================
   🔎 BOTÓN GOOGLE LENS
========================= */

if (btnBuscarLens) {

  btnBuscarLens.addEventListener("click", function (e) {

    e.preventDefault();
    e.stopPropagation();

    if (!media.length) {
      swalWarn("Primero toma o agrega una imagen");
      return;
    }

    const img = media[0];

    // 🔥 Si la imagen es base64 (foto recién tomada)
    if (img.url.startsWith("data:image")) {

      swalWarn("Primero guarda el producto para subir la imagen y poder usar Google Lens.");
      return;
    }

    // 🔥 Si ya es URL pública
    if (img.url.startsWith("http")) {

      const url = encodeURIComponent(img.url);

      window.open(
        `https://lens.google.com/uploadbyurl?url=${url}`,
        "_blank"
      );

      return;
    }

    swalWarn("La imagen aún no está disponible para Google Lens.");

  });

}


/* ===================================================== */
/* 📝 ANALIZAR TEXTO COMPLETO PEGADO */
/* ===================================================== */

const btnAnalizarTextoIA = document.getElementById("btnAnalizarTextoIA");


if (btnAnalizarTextoIA) {

  btnAnalizarTextoIA.onclick = async () => {

    if (!textoCompletoIA.value.trim()) {
      swalWarn("Pega primero la información del producto");
      return;
    }

    swalLoading("Analizando texto completo...");

    try {

      const respuesta = await fetch(
        "https://us-central1-catalogo-peek-shop.cloudfunctions.net/iaProducto",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            textoCompleto: textoCompletoIA.value
          })
        }
      );

      if (!respuesta.ok) throw new Error();

      const result = await respuesta.json();

      if (!result.ok) throw new Error();

      // 🔥 AUTOCOMPLETAR CAMPOS

      if (result.nombre) nombre.value = result.nombre;
      if (result.marca) marca.value = result.marca;
      if (result.descripcion) descripcion.value = result.descripcion;
      if (result.categoria) categoria.value = result.categoria;

      if (result.presentaciones?.length) {
        setPresentaciones(result.presentaciones);
        renderPresentaciones(presentacionesDiv);
      }


      swalOk("Producto autocompletado con IA");

    } catch (err) {
      console.error(err);
      swalError("Error analizando texto");
    } finally {
      Swal.close();
    }

  };

}
