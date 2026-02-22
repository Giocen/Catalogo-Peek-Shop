import { supabase } from "./supabase.js";

/* =========================================================
   CONFIG
========================================================= */
const MODO_ADMIN = localStorage.getItem("modo_admin") === "1";

if (!MODO_ADMIN) {
  console.log("Modo cliente activo");
}

/* =========================================================
   ZONAS EDITABLES
========================================================= */
const ZONAS = ["superior", "lateral-izq", "lateral-der"];

/* =========================================================
   MOSTRAR BOTONES ✏️
========================================================= */
if (MODO_ADMIN) {
  document
    .querySelectorAll('[id^="edit-zona"]')
    .forEach(b => b.classList.remove("hidden"));
}

/* =========================================================
   ESTADO
========================================================= */
let zonaActual = null;

/* =========================================================
   ASIGNAR BOTONES
========================================================= */
ZONAS.forEach(zona => {
  const btn = document.getElementById(`edit-zona-${zona}`);
  if (btn) btn.onclick = () => abrirEditor(zona);
});

/* =========================================================
   MODAL EDITOR (ICONOS)
========================================================= */
function abrirEditor(zona) {

  zonaActual = zona;

  Swal.fire({
    title: `Editar zona: ${zona}`,
    width: 600,
    html: `
      <div class="space-y-4 text-left">

        <label class="block text-sm font-semibold">
          Seleccionar icono
        </label>

        <select id="icono" class="swal2-input">
          <option value="shopping-bag">Shopping Bag</option>
          <option value="bone">Bone</option>
          <option value="cat">Cat</option>
          <option value="dog">Dog</option>
          <option value="fish">Fish</option>
          <option value="heart">Heart</option>
          <option value="gift">Gift</option>
          <option value="sparkles">Sparkles</option>
          <option value="truck">Truck</option>
        </select>

        <label class="block text-sm font-semibold">
          Texto
        </label>
        <input id="texto"
               class="swal2-input"
               placeholder="Ej: Alimentos">

        <label class="block text-sm font-semibold">
          Link
        </label>
        <input id="link"
               class="swal2-input"
               placeholder="/?cat=Alimentos">

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Guardar bloque",
    cancelButtonText: "Cancelar",
    preConfirm: guardarBloque
  });

}

/* =========================================================
   GUARDAR BLOQUE (ICONOS)
========================================================= */
async function guardarBloque() {

  const icono = document.getElementById("icono").value;
  const texto = document.getElementById("texto").value;
  const link = document.getElementById("link").value;

  if (!icono || !texto) {
    Swal.showValidationMessage("Debes completar icono y texto");
    return false;
  }

  try {

    /* -----------------------------------------------------
       INSERTAR NUEVO BLOQUE (NO BORRA LOS ANTERIORES)
       Permite múltiples iconos en la zona
    ----------------------------------------------------- */
    const { error } = await supabase
      .from("catalogo_banners")
      .insert({
        zona: zonaActual,
        tipo: "icono",
        icono,
        texto,
        link,
        orden: Date.now(),
        activo: true
      });

    if (error) throw error;

    /* -----------------------------------------------------
       NOTIFICAR AL HOME
    ----------------------------------------------------- */
    document.dispatchEvent(
      new CustomEvent("zona-actualizada", {
        detail: zonaActual
      })
    );

    return true;

  } catch (err) {
    console.error(err);
    Swal.showValidationMessage("Error guardando el bloque");
    return false;
  }
}