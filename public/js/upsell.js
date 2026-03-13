// /js/upsell.js
import { supabase } from "./supabase.js";
import { agregarAlCarrito } from "./carrito.js";

/* =========================================================
   Helpers de texto / normalización
========================================================= */
function norm(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s) {
  const t = norm(s).split(" ").filter(Boolean);
  // quita palabras muy comunes que ensucian
  const stop = new Set([
    "de","la","el","y","para","con","sin","en","por","a","un","una","del",
    "perro","perros","gato","gatos","ave","aves","pez","peces","conejo","conejos",
    "kg","gr","g","ml","l","pz","pzas"
  ]);
  return t.filter(x => x.length >= 3 && !stop.has(x));
}

function includesAny(haystack, arr) {
  const h = norm(haystack);
  return (arr || []).some(k => h.includes(norm(k)));
}

function overlapCount(aTokens, bTokens) {
  const a = new Set(aTokens);
  let c = 0;
  for (const t of bTokens) if (a.has(t)) c++;
  return c;
}

/* =========================================================
   Reglas (contexto -> keywords + "filtros base")
========================================================= */
const REGLAS_UPSELL = [
  {
    name: "Arenero",
    match: (p) => /arenero|arenera|litter box/i.test(`${p.nombre} ${p.descripcion || ""}`),
    keywords: ["pala", "arena", "bolsas", "tapete", "desodorante", "filtro", "odor"],
    preferCats: true,
    titulo: "Complementa tu arenero",
  },
  {
    name: "Alimento",
    match: (p) =>
      /alimento|croqueta|croquetas|nupec|royal|pro plan|hills|humedo|húmedo|lata|pate|paté/i
        .test(`${p.nombre} ${p.descripcion || ""}`) ||
      (p.categoria || "").toLowerCase().includes("alimento"),
    keywords: ["sobres", "snack", "premio", "premios", "latas", "pate", "paté", "suplemento"],
    titulo: "Súmale algo rico",
  },
  {
    name: "Antipulgas / desparasitación",
    match: (p) => /nexgard|bravecto|simparica|antipulgas|desparasit/i.test(`${p.nombre} ${p.descripcion || ""}`),
    keywords: ["collar", "spray", "shampoo", "champu", "peine", "pipeta", "toallitas"],
    titulo: "Protección extra",
  },
  {
    name: "Accesorios general",
    match: (p) => (p.categoria || "").toLowerCase().includes("accesor"),
    keywords: ["correa", "pechera", "arnes", "placa", "plato", "comedero", "bebedero", "juguete"],
    titulo: "Te puede servir también",
  },
];

function pickRegla(p) {
  return (
    REGLAS_UPSELL.find((r) => r.match(p)) || {
      titulo: "Recomendado para ti",
      keywords: ["juguete", "snack", "premio", "bolsas", "comedero", "bebedero", "shampoo"],
    }
  );
}

/* =========================================================
   Precio / imagen
========================================================= */
function formatearPrecio(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function optimizarImg(url, size = 320) {
  if (!url) return "/img/placeholder.png";
  if (url.includes("supabase")) return `${url}?width=${size}&quality=70&format=webp`;
  return url;
}

function encodeProd(obj) {
  try { return encodeURIComponent(JSON.stringify(obj)); }
  catch { return encodeURIComponent("{}"); }
}

function decodeProd(str) {
  try { return JSON.parse(decodeURIComponent(str || "%7B%7D")); }
  catch { return null; }
}

/* =========================================================
   Contexto del producto actual (mascota/categoría/marca)
========================================================= */
function detectarMascota(p) {
  const s = norm(`${p.tipo_mascota || ""} ${p.categoria || ""} ${p.nombre || ""} ${p.descripcion || ""}`);
  if (/gato|felin/.test(s)) return "gato";
  if (/perro|canin/.test(s)) return "perro";
  if (/ave|pajaro|pajaro|bird/.test(s)) return "ave";
  if (/pez|acuario|peces|fish/.test(s)) return "acuario";
  if (/conejo|roedor|hamster|cobayo/.test(s)) return "pequenos";
  if (/reptil|tortuga|iguana|lagarto/.test(s)) return "reptil";
  return ""; // desconocido
}

function detectarMarca(p) {
  const s = norm(`${p.nombre || ""} ${p.descripcion || ""}`);
  const marcas = ["nupec","royal canin","pro plan","purina","hills","hill s","eukanuba","bravecto","nexgard","simparica"];
  const hit = marcas.find(m => s.includes(norm(m)));
  return hit || "";
}

function categoriaBase(p) {
  // “Alimentos” -> alimentos, “Accesorios Perro” -> accesorios
  const c = norm(p.categoria || "");
  if (!c) return "";
  return c.split(" ")[0]; // primera palabra como base simple
}

/* =========================================================
   Scoring de candidatos (lo que hace que “sugiera bien”)
========================================================= */
function scoreCandidate(actual, cand, ctx) {
  if (!cand?.id || cand.id === actual.id) return -9999;

  const aText = norm(`${actual.nombre} ${actual.descripcion || ""} ${actual.categoria || ""} ${actual.tipo_mascota || ""}`);
  const cText = norm(`${cand.nombre} ${cand.descripcion || ""} ${cand.categoria || ""} ${cand.tipo_mascota || ""}`);

  // Evita recomendar “lo mismo” por nombre casi idéntico
  const aTok = tokens(aText);
  const cTok = tokens(cText);
  const overlap = overlapCount(aTok, cTok);

  let score = 0;

  // Mascota: muy importante
  if (ctx.mascota && norm(cand.tipo_mascota || "").includes(ctx.mascota)) score += 50;

  // Categoría base: importante
  if (ctx.catBase && norm(cand.categoria || "").includes(ctx.catBase)) score += 30;

  // Keyword de regla: importante
  if (ctx.keywords?.length && includesAny(`${cand.nombre} ${cand.descripcion || ""}`, ctx.keywords)) score += 35;

  // Complemento por “intención” (si compras antipulgas, NO recomendar antipulgas otra vez como prioridad)
  const esMismaCategoriaExacta = norm(cand.categoria || "") === norm(actual.categoria || "");
  if (esMismaCategoriaExacta) score -= 10; // preferimos complemento, no clon

  // Coincidencia por tokens compartidos (pero sin pasarnos)
  score += Math.min(overlap * 4, 20);

  // Marca: si es alimento, no siempre conviene misma marca; si es accesorio, da igual.
  if (ctx.marca && norm(`${cand.nombre} ${cand.descripcion || ""}`).includes(norm(ctx.marca))) score += 10;

  // Penaliza si parece “demasiado igual”
  if (overlap >= 6) score -= 25;

  // Penaliza sugerencias genéricas tipo “servicio”, “envio”, etc.
  if (/servicio|envio|suscripcion|recarga/.test(cText)) score -= 40;

  return score;
}

/* =========================================================
   Query builder: trae candidatos sin casarte con 1 OR
========================================================= */
function buildCandidateOrs(actual, ctx) {
  const ors = [];

  // 1) Keywords de la regla
  (ctx.keywords || []).slice(0, 8).forEach((k) => {
    const kk = norm(k);
    if (kk) ors.push(`nombre.ilike.%${kk}%`);
    if (kk) ors.push(`descripcion.ilike.%${kk}%`);
  });

  // 2) Mascota (si existe columna tipo_mascota en tu tabla)
  if (ctx.mascota) {
    // Ojo: si tu campo guarda "Perro / Gato", esto igual pega.
    ors.push(`tipo_mascota.ilike.%${ctx.mascota}%`);
  }

  // 3) Categoría base
  if (ctx.catBase) {
    ors.push(`categoria.ilike.%${ctx.catBase}%`);
  }

  // 4) Si no hay nada, algo genérico
  if (!ors.length) {
    ors.push(`categoria.ilike.%accesor%`);
    ors.push(`categoria.ilike.%alimento%`);
  }

  // quita duplicados
  return Array.from(new Set(ors)).join(",");
}

/* =========================================================
   MAIN
========================================================= */
/**
 * Carga productos sugeridos y los pinta en #upsellBox
 * @param {object} p Producto actual
 */
export async function initUpsell(p) {

  const box = document.getElementById("upsellBox");
  if (!box || !p?.id) return;

  const regla = pickRegla(p);

  const ctx = {
    mascota: detectarMascota(p),
    catBase: categoriaBase(p),
    marca: detectarMarca(p),
    keywords: regla.keywords || [],
  };

  /* ================= QUERY INTELIGENTE ================= */

  const orQuery = buildCandidateOrs(p, ctx);

  let { data: candidatos, error } = await supabase
    .from("catalogo_productos")
    .select(`
      id,
      nombre,
      precio,
      categoria,
      descripcion,
      tipo_mascota,
      activo
    `)
    
    .eq("activo", true)
    .neq("id", p.id)
    .or(orQuery)
    .limit(40)

  if (error) {
    console.warn("upsell error", error);
    return;
  }

  /* ================= FALLBACK ================= */

  if (!candidatos || candidatos.length < 4) {

    const { data: fallback } = await supabase
      .from("catalogo_productos")
      .select("id,nombre,precio,categoria,descripcion,tipo_mascota")
      .eq("activo", true)
      .neq("id", p.id)
      .ilike("categoria", `%${p.categoria || ""}%`)
      .limit(20);

    candidatos = fallback || [];
  }

  if (!candidatos.length) {
    box.innerHTML = "";
    return;
  }

  /* ================= SCORING ================= */

  const ranked = candidatos
    .map(c => ({
      cand: c,
      s: scoreCandidate(p, c, ctx)
    }))
    .filter(x => x.s > 5)
    .sort((a,b)=>b.s-a.s)
    .map(x=>x.cand);

  if (!ranked.length) {
    box.innerHTML = "";
    return;
  }

  /* ================= LIMIT ================= */

  const isDesktop = window.matchMedia("(min-width:768px)").matches;
  const maxItems = isDesktop ? 4 : 6;

  const productos = ranked.slice(0,maxItems);

  const ids = productos.map(p=>p.id);

  /* ================= MULTIMEDIA ================= */

  const { data: media } = await supabase
    .from("catalogo_multimedia")
    .select("producto_id,url,orden")
    .in("producto_id", ids);

  /* ================= PRESENTACIONES ================= */

  const { data: pres } = await supabase
    .from("catalogo_presentaciones")
    .select("id,producto_id,precio,activo,nombre,talla,color,imagen")
    .in("producto_id", ids)
    .eq("activo", true)
    .order("precio", { ascending:true });

  const presMap = new Map();

  (pres || []).forEach(v=>{
    if(!presMap.has(v.producto_id))
      presMap.set(v.producto_id,v);
  });

  /* ================= RENDER ================= */

  const items = productos.map(prod=>{

    const img = media
      ?.filter(m=>m.producto_id===prod.id)
      ?.sort((a,b)=>(a.orden??0)-(b.orden??0))[0]?.url;

    const v = presMap.get(prod.id);

    const precio = v?.precio ?? prod.precio;

    const payload = {
      id: prod.id,
      presentacion_id: v?.id || null,
      nombre: prod.nombre,
      precio: precio,
      imagen: v?.imagen || img || "/img/placeholder.png",
      presentacion: (v?.nombre || v?.talla || "").trim() || null,
      cantidad:1
    };

    return `
      <div class="bg-white border rounded-xl p-3 flex gap-3 hover:shadow-md transition">

        <a href="/producto.html?id=${prod.id}" class="shrink-0">
          <div class="w-14 h-14 rounded-lg bg-gray-50 border flex items-center justify-center overflow-hidden">
            <img src="${optimizarImg(v?.imagen || img)}"
                 class="w-full h-full object-contain">
          </div>
        </a>

        <div class="flex-1 min-w-0">

          <a href="/producto.html?id=${prod.id}"
            class="block text-sm font-semibold line-clamp-2 hover:underline">
            ${prod.nombre}
          </a>

          <div class="text-green-700 font-bold text-sm mt-1">
            $${formatearPrecio(precio)}
          </div>

          <button
            class="mt-2 w-full bg-black text-white py-2 rounded-lg text-xs"
            data-upsell-add="1"
            data-prod="${encodeProd(payload)}">

            + Agregar
          </button>

        </div>

      </div>
    `;
  });

  box.innerHTML = `
    <div class="rounded-xl border bg-white p-4">

      <div class="flex items-center gap-2 mb-3">

        <div class="w-7 h-7 flex items-center justify-center
                    rounded-lg bg-yellow-100 text-yellow-700">
          ✨
        </div>

        <div class="font-bold">
          ${regla.titulo || "Recomendado para ti"}
        </div>

      </div>

      <div class="grid md:grid-cols-2 gap-3">
        ${items.join("")}
      </div>

    </div>
  `;

  /* ================= EVENTOS ================= */

  box.querySelectorAll("[data-upsell-add]").forEach(btn=>{

    btn.addEventListener("click",()=>{

      const raw = btn.getAttribute("data-prod");
      const producto = decodeProd(raw);

      if(!producto) return;

      agregarAlCarrito(producto);

      btn.classList.add("animate-pulse");

      setTimeout(()=>{
        btn.classList.remove("animate-pulse");
      },400);

    });

  });

}