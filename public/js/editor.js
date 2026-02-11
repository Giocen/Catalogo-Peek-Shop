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
let mediaActual = null;
let zonaActual = null;

/* =========================================================
   ASIGNAR BOTONES
========================================================= */
ZONAS.forEach(zona => {
  const btn = document.getElementById(`edit-zona-${zona}`);
  if (btn) btn.onclick = () => abrirEditor(zona);
});

/* =========================================================
   MODAL EDITOR
========================================================= */
function abrirEditor(zona) {
  zonaActual = zona;
  mediaActual = null;

  Swal.fire({
    title: `Editar zona: ${zona}`,
    width: 600,
    html: `
      <div class="space-y-3 text-left">

        <label class="block text-sm font-semibold">Columnas</label>
        <select id="cols" class="swal2-input">
          <option value="1">1 / 4</option>
          <option value="2">2 / 4</option>
          <option value="3">3 / 4</option>
          <option value="4" selected>4 / 4</option>
        </select>

        <label class="block text-sm font-semibold">Alto (px)</label>
        <input id="alto" type="number" class="swal2-input" value="200">

        <div
          id="drop"
          class="border-2 border-dashed rounded p-4
                 text-center cursor-pointer bg-slate-50">
          📋 Pega una imagen (Ctrl + V)
        </div>

        <label class="block text-sm font-semibold mt-2">
          O subir archivo (imagen o video)
        </label>
        <input
          id="fileMedia"
          type="file"
          accept="image/*,video/*"
          class="swal2-file">

        <div id="preview" class="mt-3"></div>

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Guardar bloque",
    cancelButtonText: "Cancelar",
    preConfirm: guardarBloque
  });

  activarPegado();
  activarFileInput();
}

/* =========================================================
   PEGAR IMAGEN (Ctrl + V)
========================================================= */
function activarPegado() {
  document.addEventListener(
    "paste",
    e => {
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith("image")) {
          mediaActual = item.getAsFile();
          renderPreview();
        }
      }
    },
    { once: true }
  );
}

/* =========================================================
   INPUT FILE (imagen / video)
========================================================= */
function activarFileInput() {
  const input = document.getElementById("fileMedia");
  if (!input) return;

  input.onchange = e => {
    if (e.target.files.length) {
      mediaActual = e.target.files[0];
      renderPreview();
    }
  };
}

/* =========================================================
   PREVIEW
========================================================= */
function renderPreview() {
  const cont = document.getElementById("preview");
  if (!cont || !mediaActual) return;

  const url = URL.createObjectURL(mediaActual);

  cont.innerHTML = mediaActual.type.startsWith("video")
    ? `
      <video
        src="${url}"
        autoplay
        muted
        loop
        class="rounded w-full h-40 object-cover">
      </video>`
    : `
      <img
        src="${url}"
        class="rounded w-full h-40 object-cover">`;
}

/* =========================================================
   GUARDAR BLOQUE (USA catalogo_banners)
========================================================= */
async function guardarBloque() {
  if (!zonaActual || !mediaActual) {
    Swal.showValidationMessage("Debes pegar o subir una imagen o video");
    return false;
  }

  const columnas = +document.getElementById("cols").value;
  const alto = +document.getElementById("alto").value;

  const tipo = mediaActual.type.startsWith("video")
    ? "video"
    : "imagen";

  try {
    /* -----------------------------------------------------
       BORRAR BLOQUES ANTERIORES DE LA ZONA
    ----------------------------------------------------- */
    await supabase
      .from("catalogo_banners")
      .delete()
      .eq("zona", zonaActual);

    /* -----------------------------------------------------
       SUBIR ARCHIVO A STORAGE
    ----------------------------------------------------- */
    const path = `banners/${zonaActual}/${Date.now()}_${mediaActual.name}`;

    const { error: uploadError } = await supabase.storage
      .from("catalogo")
      .upload(path, mediaActual, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("catalogo")
      .getPublicUrl(path);

    /* -----------------------------------------------------
       INSERTAR EN TABLA catalogo_banners
    ----------------------------------------------------- */
    const { error: insertError } = await supabase
      .from("catalogo_banners")
      .insert({
        zona: zonaActual,
        tipo,
        url: data.publicUrl,
        columnas,
        alto,
        orden: Date.now(),
        activo: true
      });

    if (insertError) throw insertError;

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
