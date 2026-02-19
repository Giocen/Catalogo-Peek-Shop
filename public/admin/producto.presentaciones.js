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
    detalle: ""
  };
}

/* =========================================================
   🔧 CÁLCULO DE MARGEN (SE MANTIENE IGUAL)
========================================================= */
function calcularMargen(p) {
  const costo = Number(p.costo);
  const precio = Number(p.precio);

  if (costo > 0 && precio > 0) {
    p.margen = Number((((precio - costo) / costo) * 100).toFixed(2));
  } else {
    p.margen = 0;
  }
}

/* =========================================================
   🎨 RENDER PRINCIPAL
========================================================= */
export function renderPresentaciones(container) {

  container.innerHTML = "";

  if (!presentaciones.length) {
    container.innerHTML = `
      <div class="text-sm text-slate-400 italic">
        Este producto aún no tiene presentaciones.
        Agrega al menos una para poder venderlo.
      </div>
    `;
    return;
  }

  presentaciones.forEach((p, i) => {
    const card = crearCardPresentacion(p, i, container);
    container.appendChild(card);
  });
}

/* =========================================================
   🧩 COMPONENTE PRESENTACIÓN
========================================================= */
function crearCardPresentacion(p, i, container) {

  const card = document.createElement("div");
  card.className = "border rounded p-4 space-y-2 bg-gray-50";

  /* ================= NOMBRE ================= */
  const inputNombre = crearInput("text", "input",
    "Nombre (Collar, Bulto 20kg)", p.nombre);
  inputNombre.addEventListener("input", e => {
    p.nombre = e.target.value;
  });
  card.appendChild(inputNombre);

  /* ================= DETALLE ================= */
  const inputDetalle = crearInput("text", "input text-sm",
    "Detalle corto (opcional)", p.detalle || "");
  inputDetalle.addEventListener("input", e => {
    p.detalle = e.target.value;
  });
  card.appendChild(inputDetalle);

  /* ================= UNIDAD + TALLA ================= */
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

  /* ================= COSTO / PRECIO ================= */
  const gridPrecios = document.createElement("div");
  gridPrecios.className = "grid grid-cols-2 gap-2";

  const inputCosto = crearInput("number", "input", "Costo", p.costo);
  const inputPrecio = crearInput("number", "input", "Precio venta", p.precio);

  gridPrecios.appendChild(inputCosto);
  gridPrecios.appendChild(inputPrecio);
  card.appendChild(gridPrecios);

  /* ================= MARGEN ================= */
  const infoMargen = document.createElement("div");
  infoMargen.className = "text-xs text-gray-600";

  function actualizarMargenUI() {
    calcularMargen(p);

    const ganancia =
      (Number(p.precio) - Number(p.costo)) || 0;

    infoMargen.innerHTML = `
      Ganancia:
      <b>$${ganancia}</b> |
      Margen:
      <b>${p.margen}%</b>
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

  /* ================= OFERTA ================= */
  const divOferta = document.createElement("div");
  divOferta.className = "flex items-center gap-2 text-sm";

  const chkOferta = document.createElement("input");
  chkOferta.type = "checkbox";
  chkOferta.checked = p.en_oferta;

  const spanOferta = document.createElement("span");
  spanOferta.textContent = "En oferta";

  divOferta.appendChild(chkOferta);
  divOferta.appendChild(spanOferta);
  card.appendChild(divOferta);

  const inputOferta = crearInput("number", "input",
    "Precio oferta", p.precio_oferta);
  inputOferta.style.display = p.en_oferta ? "block" : "none";

  chkOferta.addEventListener("change", e => {
    p.en_oferta = e.target.checked;
    inputOferta.style.display =
      p.en_oferta ? "block" : "none";
  });

  inputOferta.addEventListener("input", e => {
    p.precio_oferta =
      e.target.value === "" ? "" : Number(e.target.value);
  });

  card.appendChild(inputOferta);

  /* ================= STOCK + ACTIVO ================= */
  const gridStock = document.createElement("div");
  gridStock.className = "grid grid-cols-2 gap-2";

  const inputStock = crearInput("number", "input", "Stock", p.stock);
  inputStock.addEventListener("input", e => {
    p.stock = Number(e.target.value) || 0;
  });

  const divActivo = document.createElement("div");
  divActivo.className = "flex items-center gap-2 text-sm";

  const chkActivo = document.createElement("input");
  chkActivo.type = "checkbox";
  chkActivo.checked = p.activo;
  chkActivo.addEventListener("change", e => {
    p.activo = e.target.checked;
  });

  const spanActivo = document.createElement("span");
  spanActivo.textContent = "Activa";

  divActivo.appendChild(chkActivo);
  divActivo.appendChild(spanActivo);

  gridStock.appendChild(inputStock);
  gridStock.appendChild(divActivo);
  card.appendChild(gridStock);

  /* ================= ELIMINAR ================= */
  const btnEliminar = document.createElement("button");
  btnEliminar.textContent = "Eliminar";
  btnEliminar.className = "text-red-600 text-sm";

  btnEliminar.addEventListener("click", () => {
    presentaciones.splice(i, 1);
    renderPresentaciones(container);
  });

  card.appendChild(btnEliminar);

  return card;
}

/* =========================================================
   🛠 HELPER INPUT
========================================================= */
function crearInput(type, className, placeholder, value) {
  const input = document.createElement("input");
  input.type = type;
  input.className = className;
  input.placeholder = placeholder;
  input.value = value ?? "";
  return input;
}
