import { auth } from "../js/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { supabase } from "../js/supabase.js";


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

  const reader = new FileReader();
  const tipo = file.type.startsWith("video") ? "video" : "image";

  reader.onload = () => {
    media.push({ url: reader.result, tipo, file });
    renderMedia();
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

/* ================= PRESENTACIONES ================= */
let presentaciones = [];

if (btnAgregarPresentacion) {
  btnAgregarPresentacion.onclick = () => {
    presentaciones.push(crearPresentacionBase());
    renderPresentaciones();
  };
}


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
    sku: "",
    detalle: ""
  };
}

/* 🔧 CÁLCULO DE MARGEN */
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

    calcularMargen(p);

    return `
      <div class="border rounded p-4 space-y-2 bg-gray-50">

        <input class="input" placeholder="Nombre (Collar, Bulto 20kg)"
          value="${p.nombre}"
          data-index="${i}"
          onchange="actualizarCampoPresentacion(this,'nombre')">

          <input class="input text-sm"
          placeholder="Detalle corto (opcional) · Ej. Tabletas masticables"
          value="${p.detalle || ""}"
          data-index="${i}"
          onchange="actualizarCampoPresentacion(this,'detalle')">

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
            <label class="text-xs text-slate-500">Variante / Tamaño</label>
            <input class="input"
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
            oninput="actualizarCampoPresentacion(this,'costo')">

          <input type="number" class="input" placeholder="Precio venta"
            value="${p.precio}"
            data-index="${i}"
            oninput="actualizarCampoPresentacion(this,'precio')">
        </div>

        <div class="text-xs text-gray-600 info-margen">
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
            data-index="${i}">
          <span class="cursor-help"
            title="Activa un precio especial para esta presentación">
            En oferta
          </span>
        </div>

        ${p.en_oferta ? `
          <input type="number" class="input" placeholder="Precio oferta"
            value="${p.precio_oferta}"
            onchange="actualizarCampoPresentacion(this,'precio_oferta')"
data-index="${i}"
>
        ` : ""}

        <div class="grid grid-cols-2 gap-2">
          <input type="number" class="input" placeholder="Stock"
            value="${p.stock}"
            onchange="actualizarCampoPresentacion(this,'stock')"
data-index="${i}"
>

          <div class="flex items-center gap-2 text-sm">
            <input type="checkbox"
              ${p.activo ? "checked" : ""}
              onchange="window.actualizarCampoPresentacion(this,'activo')"
              data-index="${i}">
            <span class="cursor-help"
              title="Si se desactiva, esta presentación no se vende">
              Activa
            </span>
          </div>
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
    swalWarn("El nombre del producto es obligatorio");
    nombre.focus();
    return false;
  }

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
  let min = null;

  for (const p of presentaciones) {
    if (!p.activo) continue;
    const precio = p.en_oferta && p.precio_oferta
      ? Number(p.precio_oferta)
      : Number(p.precio);
    if (!precio || precio <= 0) continue;
    if (min === null || precio < min) min = precio;
  }
  return min;
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
            swalWarn("Debes capturar al menos un precio válido");
            throw new Error("Validación");
          }          
          
          // 🔒 respaldo de precio al editar
          let precioFinal = precioBase;

          if (!precioFinal && productoActual) {
            const { data: prodActual, error } = await supabase
              .from("catalogo_productos")
              .select("precio")
              .eq("id", productoActual)
              .single();
          
            if (error || prodActual?.precio == null) {
              swalError("No se pudo recuperar el precio actual del producto");
              throw new Error("Validación");
            }
          
            precioFinal = prodActual.precio;
          }
          
          if (precioFinal == null || isNaN(precioFinal)) {
            swalError("El producto debe tener un precio válido");
            throw new Error("Validación");
          }
          
      
          const payload = {
            codigo: codigo.value.trim() || null,
            nombre: nombre.value.trim(),
            marca: marca.value.trim() || null,
            descripcion: descripcion.value.trim(),
            categoria: categoriaNueva.value || categoria.value,
            precio: Number(precioFinal), 
            es_oferta: es_oferta.checked,
            activo: activo.checked,
            notas: notas.value,
            colores: colores.map(c => c.nombre)
          };

    

    let productoId = productoActual;

    /* 🔁 EDITAR PRODUCTO */
    if (productoActual) {
      const { error } = await supabase
        .from("catalogo_productos")
        .update(payload)
        .eq("id", productoActual);

      if (error) {
        swalError(error.message);
        return;
      }

      // 🧹 borrar presentaciones anteriores
      
      //if (productoActual && presentaciones.length) {
       // const { error: errDel } = await supabase
        //  .from("catalogo_presentaciones")
        //  .delete()
         // .eq("producto_id", productoActual);
      
      //  if (errDel) {
        //  swalError("No se pudieron borrar las presentaciones anteriores");
        //  console.error(errDel);
        //  return; // ⛔ detener guardado
       // }
     // }

      

    }
    /* ➕ NUEVO PRODUCTO */
    else {
      const { data, error } = await supabase
        .from("catalogo_productos")
        .insert(payload)
        .select()
        .single();

      if (error) {
        swalError(error.message);
        return;
      }

      productoId = data.id;
    }


// 🧹 BORRAR PRESENTACIONES ANTERIORES (ANTES DE INSERTAR)
if (productoActual) {
  const { error: errDel } = await supabase
  .from("catalogo_presentaciones")
  .delete()
  .eq("producto_id", productoActual)
  .select();

  if (errDel) {
    swalError("No se pudieron borrar las presentaciones anteriores");
    throw new Error("Validación");
  }
}


    /* 📦 GUARDAR PRESENTACIONES */
  for (const p of presentaciones) {
  const { error } = await supabase
    .from("catalogo_presentaciones")
    .insert({
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
      sku: generarSKU(p),
      detalle: p.detalle || null
    });

  if (error) {
    swalError("Error al guardar presentaciones");
    console.error(error);
    throw new Error("Validación");
  }
}





    /* 🖼️ MULTIMEDIA */
    // borrar multimedia previa
    const tieneArchivosNuevos = media.some(m => m.file);

    if (tieneArchivosNuevos) {
      await supabase
        .from("catalogo_multimedia")
        .delete()
        .eq("producto_id", productoId);
    }
    

      try {
        for (let i = 0; i < media.length; i++) {
          const m = media[i];
      
          if (!m.file) continue;
      
          const url = await subirMediaSupabase(m.file, productoId, i);        
         
      
          await supabase.from("catalogo_multimedia").insert({
            producto_id: productoId,
            tipo: m.tipo === "image" ? "imagen" : "video",
            url,
            orden: i
          });
        }
      } catch (err) {
        swalError("Error al subir imágenes. El producto se guardó, pero la imagen no.");
        console.error("ERROR IMAGEN:", err);
        return;
      }
      
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

  // 📦 presentación base
  presentaciones = [{
    ...crearPresentacionBase(),
    nombre: "General"
  }];

  // ✅ funciones CORRECTAS
  renderMedia();
  renderColores();
  renderStock();
  renderPresentaciones();

  modal.classList.remove("hidden");

  setTimeout(() => dropZone.focus(), 100);
};


window.cerrar = () => {
  modal.classList.add("hidden");
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
  if (!presentaciones[i]) return;

  presentaciones[i][campo] =
    el.type === "checkbox" ? el.checked : el.value;

  if (campo === "costo" || campo === "precio") {
    calcularMargen(presentaciones[i]);

    // 🔄 solo actualiza el texto de margen/ganancia
    const contenedor = el.closest(".border");
    if (contenedor) {
      const info = contenedor.querySelector(".info-margen");
      if (info) {
        info.innerHTML = `
          Ganancia:
          <b>$${((Number(presentaciones[i].precio) - Number(presentaciones[i].costo)) || 0)}</b>
          | Margen:
          <b>${presentaciones[i].margen}%</b>
        `;
      }
    }
  }
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
  colores = (producto.colores || []).map(nombre => {
    const base = baseColors.find(b => b.nombre === nombre);
    return {
      nombre,
      hex: base?.hex || "#000000"
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
    sku: p.sku,
    detalle: p.detalle || ""

  }));

  renderPresentaciones();

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

