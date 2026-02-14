 /* ==========producto.save.js=============== */

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

/* ================= PRODUCTO ================= */

// 🔥 RECALCULAR PRECIO DESDE PRESENTACIONES (ANTI-NULL)
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

  if (productoActual) {

    const { error: errDelete } = await supabase
      .from("catalogo_presentaciones")
      .delete()
      .eq("producto_id", productoId);

    if (errDelete) throw errDelete;
  }

  if (presentaciones?.length) {

    const dataInsert = presentaciones.map(p => ({
      producto_id: productoId,
      nombre: p.nombre,
      unidad: p.unidad,
      cantidad: p.cantidad,
      talla: p.talla,
      costo: Number(p.costo),
      precio: Number(p.precio),
      precio_oferta: p.precio_oferta
        ? Number(p.precio_oferta)
        : null,
      en_oferta: p.en_oferta,
      margen: Number(p.margen),
      stock: Number(p.stock),
      activo: p.activo,
      sku: generarSKU(p),
      detalle: p.detalle || ""
    }));

    const { error: errInsert } = await supabase
      .from("catalogo_presentaciones")
      .insert(dataInsert);

    if (errInsert) throw errInsert;
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

  await Promise.all(
    media.map(async (m, i) => {
      if (!m.file) return;

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
    })
  );

  return productoId;
}
