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

export function renderPresentaciones(container) {

  if (!presentaciones.length) {
    container.innerHTML = `
      <div class="text-sm text-slate-400 italic">
        Este producto aún no tiene presentaciones.
        Agrega al menos una para poder venderlo.
      </div>
    `;
    return;
  }

  container.innerHTML = presentaciones.map((p, i) => {

    calcularMargen(p);

    return `
      <div class="border rounded p-4 space-y-2 bg-gray-50">

        <input class="input"
          placeholder="Nombre (Collar, Bulto 20kg)"
          value="${p.nombre}"
          data-index="${i}"
          onchange="window.actualizarCampoPresentacion(this,'nombre')">

        <input class="input text-sm"
          placeholder="Detalle corto (opcional)"
          value="${p.detalle || ""}"
          data-index="${i}"
          onchange="window.actualizarCampoPresentacion(this,'detalle')">

        <div class="grid grid-cols-2 gap-2">

          <div>
            <label class="text-xs text-slate-500">Unidad</label>
            <select class="input"
              data-index="${i}"
              onchange="window.actualizarCampoPresentacion(this,'unidad')">
              <option ${p.unidad==="pieza"?"selected":""}>pieza</option>
              <option ${p.unidad==="kilo"?"selected":""}>kilo</option>
              <option ${p.unidad==="bulto"?"selected":""}>bulto</option>
            </select>
          </div>

          <div>
            <label class="text-xs text-slate-500">Variante / Tamaño</label>
            <input class="input"
              value="${p.talla}"
              data-index="${i}"
              onchange="window.actualizarCampoPresentacion(this,'talla')">
          </div>

        </div>

        <div class="grid grid-cols-2 gap-2">
          <input type="number" class="input"
            placeholder="Costo"
            value="${p.costo}"
            data-index="${i}"
            oninput="window.actualizarCampoPresentacion(this,'costo')">

          <input type="number" class="input"
            placeholder="Precio venta"
            value="${p.precio}"
            data-index="${i}"
            oninput="window.actualizarCampoPresentacion(this,'precio')">
        </div>

        <div class="text-xs text-gray-600 info-margen">
          Ganancia:
          <b>$${((Number(p.precio) - Number(p.costo)) || 0)}</b> |
          Margen:
          <b>${p.margen}%</b>
        </div>

        <div class="flex items-center gap-2 text-sm">
          <input type="checkbox"
            ${p.en_oferta ? "checked" : ""}
            data-index="${i}"
            onchange="window.actualizarCampoPresentacion(this,'en_oferta')">
          <span>En oferta</span>
        </div>

        ${p.en_oferta ? `
          <input type="number" class="input"
            placeholder="Precio oferta"
            value="${p.precio_oferta}"
            data-index="${i}"
            onchange="window.actualizarCampoPresentacion(this,'precio_oferta')">
        ` : ""}

        <div class="grid grid-cols-2 gap-2">
          <input type="number" class="input"
            placeholder="Stock"
            value="${p.stock}"
            data-index="${i}"
            onchange="window.actualizarCampoPresentacion(this,'stock')">

          <div class="flex items-center gap-2 text-sm">
            <input type="checkbox"
              ${p.activo ? "checked" : ""}
              data-index="${i}"
              onchange="window.actualizarCampoPresentacion(this,'activo')">
            <span>Activa</span>
          </div>
        </div>

        <button onclick="window.eliminarPresentacion(${i})"
          class="text-red-600 text-sm">
          Eliminar
        </button>

      </div>
    `;
  }).join("");
}

window.actualizarCampoPresentacion = (el, campo) => {

  const i = Number(el.dataset.index);
  if (!presentaciones[i]) return;

  presentaciones[i][campo] =
    el.type === "checkbox" ? el.checked : el.value;

  if (campo === "costo" || campo === "precio") {
    calcularMargen(presentaciones[i]);
  }
};

window.eliminarPresentacion = (i) => {
  presentaciones.splice(i, 1);
  const container = document.getElementById("presentaciones");
  renderPresentaciones(container);
};
