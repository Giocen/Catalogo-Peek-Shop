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

  if (productoActual) {
    const { error } = await supabase
      .from("catalogo_productos")
      .update(payload)
      .eq("id", productoActual);

    if (error) throw error;

  } else {
    const { data, error } = await supabase
      .from("catalogo_productos")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    productoId = data.id;
  }

  /* ================= PRESENTACIONES ================= */

  if (productoActual) {
    await supabase
      .from("catalogo_presentaciones")
      .delete()
      .eq("producto_id", productoActual);
  }

  const presentacionesPayload = presentaciones.map(p => ({
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
  }));

  const { error: errPres } = await supabase
    .from("catalogo_presentaciones")
    .insert(presentacionesPayload);

  if (errPres) throw errPres;

  /* ================= MULTIMEDIA ================= */

  const tieneArchivosNuevos = media.some(m => m.file);

  if (tieneArchivosNuevos) {
    await supabase
      .from("catalogo_multimedia")
      .delete()
      .eq("producto_id", productoId);
  }

  

  await Promise.all(
    media.map(async (m, i) => {
      if (!m.file) return;

      const url = await subirMediaSupabase(m.file, productoId, i);

      return supabase.from("catalogo_multimedia").insert({
        producto_id: productoId,
        tipo: m.tipo === "image" ? "imagen" : "video",
        url,
        orden: i
      });
    })
  );

  return productoId;
}
