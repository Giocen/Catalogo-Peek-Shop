let presentaciones = [];

export function getPresentaciones() {
  return presentaciones;
}

export function setPresentaciones(data) {
  presentaciones = data || [];
}

export function crearPresentacionBase() {
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
    detalle: "",
    imagen: "",
    imagenPreview: "",
    fileImagen: null,
    color: ""
  };
}

/* ================= MARGEN ================= */

function calcularMargen(p) {
  const costo = Number(p.costo);
  const precio = Number(p.precio);

  if (costo > 0 && precio > 0) {
    p.margen = Number((((precio - costo) / costo) * 100).toFixed(2));
  } else {
    p.margen = 0;
  }
}

/* ================= RENDER ================= */

export function renderPresentaciones(container) {

  container.innerHTML = "";

  if (!presentaciones.length) {
    container.innerHTML = `
      <div class="text-sm text-slate-400 italic">
        Este producto aún no tiene presentaciones.
      </div>
    `;
    return;
  }

  presentaciones.forEach((p, i) => {
    const card = crearCardPresentacion(p, i, container);
    container.appendChild(card);
  });
}

/* ================= CARD ================= */

function crearCardPresentacion(p, i, container) {

  const card = document.createElement("div");
  card.className = "border rounded p-4 space-y-3 bg-gray-50";

  if (p.color) {
    card.style.borderColor = p.color;
  }

  /* ===== NOMBRE ===== */

  const inputNombre = crearInput("text", "input",
    "Nombre (Collar, Bulto 20kg)", p.nombre);

  inputNombre.addEventListener("input", e => {
    p.nombre = e.target.value;
  });

  card.appendChild(inputNombre);

  /* ===== DETALLE ===== */

  const inputDetalle = crearInput("text", "input text-sm",
    "Detalle corto (opcional)", p.detalle || "");

  inputDetalle.addEventListener("input", e => {
    p.detalle = e.target.value;
  });

  card.appendChild(inputDetalle);

  /* ===== COLOR ===== */

  const divColor = document.createElement("div");
  divColor.className = "flex items-center gap-3";

  const labelColor = document.createElement("span");
  labelColor.className = "text-sm text-slate-600";
  labelColor.textContent = "Color:";

  const inputColor = document.createElement("input");
  inputColor.type = "color";
  inputColor.value = p.color || "#000000";
  inputColor.className = "w-10 h-10 rounded border cursor-pointer";

  inputColor.addEventListener("input", e => {
    p.color = e.target.value;
    card.style.borderColor = p.color;
  });

  divColor.appendChild(labelColor);
  divColor.appendChild(inputColor);

  card.appendChild(divColor);

  /* ===== UNIDAD + TALLA ===== */

  const gridVariante = document.createElement("div");
  gridVariante.className = "grid grid-cols-2 gap-2";

  const selectUnidad = document.createElement("select");
  selectUnidad.className = "input";

  ["pieza", "kilo", "bulto"].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (p.unidad === opt) o.selected = true;
    selectUnidad.appendChild(o);
  });

  selectUnidad.addEventListener("change", e => {
    p.unidad = e.target.value;
  });

  const inputTalla = crearInput("text", "input",
    "Variante / Tamaño", p.talla);

  inputTalla.addEventListener("input", e => {
    p.talla = e.target.value;
  });

  gridVariante.appendChild(selectUnidad);
  gridVariante.appendChild(inputTalla);

  card.appendChild(gridVariante);

  /* ===== COSTO / PRECIO ===== */

  const gridPrecios = document.createElement("div");
  gridPrecios.className = "grid grid-cols-2 gap-2";

  const inputCosto = crearInput("number", "input", "Costo", p.costo);
  const inputPrecio = crearInput("number", "input", "Precio venta", p.precio);

  gridPrecios.appendChild(inputCosto);
  gridPrecios.appendChild(inputPrecio);
  card.appendChild(gridPrecios);

  const infoMargen = document.createElement("div");
  infoMargen.className = "text-xs text-gray-600";

  function actualizarMargenUI() {
    calcularMargen(p);
    const ganancia = (Number(p.precio) - Number(p.costo)) || 0;

    infoMargen.innerHTML = `
      Ganancia: <b>$${ganancia}</b> |
      Margen: <b>${p.margen}%</b>
    `;
  }

  inputCosto.addEventListener("input", e => {
    p.costo = e.target.value === "" ? "" : Number(e.target.value);
    actualizarMargenUI();
  });

  inputPrecio.addEventListener("input", e => {
    p.precio = e.target.value === "" ? "" : Number(e.target.value);
    actualizarMargenUI();
  });

  actualizarMargenUI();
  card.appendChild(infoMargen);

  /* ===== IMAGEN ===== */


const divImagen = document.createElement("div");
divImagen.className = "mt-3";

const labelImg = document.createElement("div");
labelImg.className = "text-xs font-semibold text-slate-600 mb-2";
labelImg.textContent = "Imagen (1 clic pegar • doble clic subir)";

const previewBox = document.createElement("div");
previewBox.className =
  "w-28 h-28 border-2 border-dashed rounded-xl bg-slate-100 flex items-center justify-center cursor-pointer hover:border-fuchsia-400 transition";
previewBox.tabIndex = 0;

const inputFile = document.createElement("input");
inputFile.type = "file";
inputFile.accept = "image/*";
inputFile.hidden = true;

/* 🔹 Función estable para actualizar solo preview */
function actualizarPreview(src) {
  previewBox.innerHTML = "";

  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.className = "w-full h-full object-cover rounded-xl";
    previewBox.appendChild(img);
  } else {
    previewBox.innerHTML =
      '<span class="text-xs text-slate-400">Sin imagen</span>';
  }
}

/* Inicial */
actualizarPreview(p.imagenPreview || p.imagen);

/* 🔹 1 clic → enfocar para pegar */
previewBox.addEventListener("click", () => {
  previewBox.focus();
});

/* 🔹 Doble clic → abrir explorador */
previewBox.addEventListener("dblclick", () => {
  inputFile.click();
});

/* 🔹 Subir archivo */
inputFile.addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    p.imagenPreview = reader.result;
    p.fileImagen = file;
    actualizarPreview(reader.result); // 🔥 SOLO actualiza preview
  };
  reader.readAsDataURL(file);
});

/* 🔹 Pegar imagen */
previewBox.addEventListener("paste", e => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let item of items) {
    if (item.type.startsWith("image")) {
      const file = item.getAsFile();
      if (!file) continue;

      const reader = new FileReader();
      reader.onload = () => {
        p.imagenPreview = reader.result;
        p.fileImagen = file;
        actualizarPreview(reader.result); // 🔥 SOLO preview
      };
      reader.readAsDataURL(file);
    }
  }
});

/* 🔹 Drag & Drop */
previewBox.addEventListener("dragover", e => {
  e.preventDefault();
  previewBox.classList.add("border-fuchsia-400");
});

previewBox.addEventListener("dragleave", () => {
  previewBox.classList.remove("border-fuchsia-400");
});

previewBox.addEventListener("drop", e => {
  e.preventDefault();
  previewBox.classList.remove("border-fuchsia-400");

  const file = e.dataTransfer.files?.[0];
  if (!file || !file.type.startsWith("image")) return;

  const reader = new FileReader();
  reader.onload = () => {
    p.imagenPreview = reader.result;
    p.fileImagen = file;
    actualizarPreview(reader.result); // 🔥 SOLO preview
  };
  reader.readAsDataURL(file);
});

divImagen.appendChild(labelImg);
divImagen.appendChild(previewBox);
divImagen.appendChild(inputFile);
card.appendChild(divImagen);

  /* ===== ELIMINAR ===== */

  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "Eliminar";
  btnEliminar.className = "text-red-600 text-sm hover:underline";

  btnEliminar.addEventListener("click", () => {
    presentaciones.splice(i, 1);
    renderPresentaciones(container);
  });

  card.appendChild(btnEliminar);

  return card;
}

/* ================= HELPER ================= */

function crearInput(type, className, placeholder, value) {
  const input = document.createElement("input");
  input.type = type;
  input.className = className;
  input.placeholder = placeholder;
  input.value = value ?? "";
  return input;
}