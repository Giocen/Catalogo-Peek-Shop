/* ========== producto.save.js =============== */

export async function guardarProducto({
  supabase,
  productoActual,
  payload,
  presentaciones,
  media,
  generarSKU,
  obtenerPrecioBase,
  subirMediaSupabase,
  swalError
}) {

  let productoId = productoActual;

  /* ================= PRODUCTO ================= */

  if (presentaciones?.length) {

    const preciosValidos = presentaciones
      .filter(p => p.activo)
      .map(p => {
        const precio = p.en_oferta && p.precio_oferta
          ? Number(p.precio_oferta)
          : Number(p.precio);

        return precio > 0 ? precio : null;
      })
      .filter(p => p !== null);

    if (preciosValidos.length) {
      payload.precio = Math.min(...preciosValidos);
    }
  }

  const precioNumerico = Number(payload?.precio);

  if (!Number.isFinite(precioNumerico) || precioNumerico <= 0) {
    throw new Error("El producto debe tener al menos una presentación activa con precio válido");
  }

  const payloadSeguro = {
    ...payload,
    precio: precioNumerico
  };

  if (productoActual) {

    const { error } = await supabase
      .from("catalogo_productos")
      .update(payloadSeguro)
      .eq("id", productoActual);

    if (error) throw error;

  } else {

    const { data, error } = await supabase
      .from("catalogo_productos")
      .insert(payloadSeguro)
      .select()
      .single();

    if (error) throw error;

    productoId = data.id;
  }

  /* ================= PRESENTACIONES ================= */

  // 🔥 TRAER ACTUALES SIEMPRE
  const { data: actuales, error: errActuales } = await supabase
    .from("catalogo_presentaciones")
    .select("id")
    .eq("producto_id", productoId);

  if (errActuales) throw errActuales;

  const idsActuales = actuales?.map(p => p.id) || [];
  const idsFormulario = (presentaciones || [])
    .filter(p => p.id)
    .map(p => p.id);

  const idsEliminar = idsActuales.filter(
    id => !idsFormulario.includes(id)
  );

  if (idsEliminar.length) {
    const { error: errDelete } = await supabase
      .from("catalogo_presentaciones")
      .delete()
      .in("id", idsEliminar);

    if (errDelete) throw errDelete;
  }

  // 🔥 INSERT / UPDATE
  for (let i = 0; i < (presentaciones || []).length; i++) {

    const p = presentaciones[i];

    let imagenURL = p.imagen?.trim() ? p.imagen.trim() : null;

    if (p.fileImagen) {
      imagenURL = await subirMediaSupabase(
        p.fileImagen,
        productoId,
        `pres_${i}`
      );
    }

    const dataPres = {
      producto_id: productoId,
      nombre: p.nombre || "",
      unidad: p.unidad || "pieza",
      cantidad: Number(p.cantidad) || 1,
      talla: p.talla || null,
      costo: p.costo ? Number(p.costo) : 0,
      precio: p.precio ? Number(p.precio) : 0,
      precio_oferta: p.precio_oferta
        ? Number(p.precio_oferta)
        : null,
      en_oferta: !!p.en_oferta,
      margen: Number(p.margen) || 0,
      stock: Number(p.stock) || 0,
      activo: !!p.activo,
      sku: generarSKU(p),
      detalle: p.detalle || "",
      imagen: imagenURL,
      color: p.color || null
    };

    if (p.id) {

      const { error: errUpdate } = await supabase
        .from("catalogo_presentaciones")
        .update(dataPres)
        .eq("id", p.id);

      if (errUpdate) throw errUpdate;

    } else {

      const { error: errInsert } = await supabase
        .from("catalogo_presentaciones")
        .insert(dataPres);

      if (errInsert) throw errInsert;
    }
  }

  /* ================= MULTIMEDIA ================= */

  const tieneArchivosNuevos = media.some(m => m.file);

  if (tieneArchivosNuevos) {
    const { error: errDeleteMedia } = await supabase
      .from("catalogo_multimedia")
      .delete()
      .eq("producto_id", productoId);

    if (errDeleteMedia) throw errDeleteMedia;
  }

  for (let i = 0; i < media.length; i++) {

    const m = media[i];
    if (!m.file) continue;

    const url = await subirMediaSupabase(m.file, productoId, i);

    const { error } = await supabase
      .from("catalogo_multimedia")
      .insert({
        producto_id: productoId,
        tipo: m.tipo === "image" ? "imagen" : "video",
        url,
        orden: i
      });

    if (error) throw error;
  }

  return productoId;
}