/* =========================================
   ENVÍO CIUDAD CAUCEL – PEEK SHOP PRO
========================================= */

/* 📍 Ubicación de la tienda */
export const TIENDA = {
  lat: 21.0007084,
  lng: -89.7123379
};

/* 📍 Límite del periférico hacia Mérida
   Si el cliente tiene una longitud mayor,
   se considera hacia el centro / Mérida y se cotiza por WhatsApp
*/
export const LIMITE_PERIFERICO = -89.67;

/* 📦 Configuración de zonas */
export const CONFIG_ENVIO = {
  zonaExpress: 1.5, // km
  zonaGratis: 3,    // km
  zonaMedia: 4,     // km
  zonaMaxima: 5     // km máximo reparto automático
};

/* 📲 WhatsApp */
export const WHATSAPP_TIENDA = "5219991494268";

/* =========================================
   DISTANCIA HAVERSINE
========================================= */
export function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/* =========================================
   FORMATEAR PRECIO
========================================= */
export function formatearPrecio(valor) {
  return Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* =========================================
   CALCULAR ENVÍO SEGÚN UBICACIÓN
========================================= */
export function calcularEnvioCaucel(latCliente, lngCliente) {
  if (!latCliente || !lngCliente) {
    return {
      zona: "desconocida",
      envio: null,
      distancia: null,
      tipo: "desconocida",
      dentroZona: false,
      mensaje: "No se pudo detectar tu ubicación"
    };
  }

  /* ================= PERIFÉRICO ================= */
  if (lngCliente > LIMITE_PERIFERICO || latCliente < 20.95) {
    return {
      zona: "fuera_caucel",
      envio: null,
      distancia: null,
      tipo: "cotizar_whatsapp",
      dentroZona: false,
      mensaje: "Tu ubicación está pasando periférico hacia Mérida"
    };
  }

  /* ================= DISTANCIA ================= */
  const distancia = calcularDistanciaKm(
    TIENDA.lat,
    TIENDA.lng,
    latCliente,
    lngCliente
  );

  if (distancia <= CONFIG_ENVIO.zonaExpress) {
    return {
      zona: "zona express",
      envio: 0,
      distancia,
      tipo: "express",
      dentroZona: true,
      mensaje: "Envío express gratis"
    };
  }

  if (distancia <= CONFIG_ENVIO.zonaGratis) {
    return {
      zona: "zona cercana",
      envio: 0,
      distancia,
      tipo: "gratis",
      dentroZona: true,
      mensaje: "Envío gratis en tu zona"
    };
  }

  if (distancia <= CONFIG_ENVIO.zonaMedia) {
    return {
      zona: "zona media",
      envio: 15,
      distancia,
      tipo: "normal",
      dentroZona: true,
      mensaje: "Envío de $15"
    };
  }

  if (distancia <= CONFIG_ENVIO.zonaMaxima) {
    return {
      zona: "zona lejana",
      envio: 25,
      distancia,
      tipo: "normal",
      dentroZona: true,
      mensaje: "Envío de $25"
    };
  }

  return {
    zona: "fuera_caucel",
    envio: null,
    distancia,
    tipo: "cotizar_whatsapp",
    dentroZona: false,
    mensaje: "Tu ubicación está fuera de la zona automática de entrega"
  };
}

/* =========================================
   GEOLOCALIZAR CLIENTE
========================================= */
export function obtenerUbicacionCliente() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        ok: false,
        error: "Tu navegador no soporta geolocalización"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy || null
        });
      },
      (err) => {
        resolve({
          ok: false,
          error: err?.message || "No se pudo obtener la ubicación"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
}

/* =========================================
   GUARDAR / LEER ZONA
========================================= */
const STORAGE_KEY = "peekshop_zona_cliente";

export function guardarZonaCliente(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function leerZonaCliente() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function limpiarZonaCliente() {
  localStorage.removeItem(STORAGE_KEY);
}

/* =========================================
   DETECTAR Y GUARDAR
========================================= */
export async function detectarZonaCliente() {

  const guardado = leerZonaCliente();

  if (guardado && guardado.actualizadoEn) {

    const minutos = (Date.now() - guardado.actualizadoEn) / 60000;

    if (minutos < 30) {
      return guardado;
    }

  }

  const ubicacion = await obtenerUbicacionCliente();

  if (!ubicacion.ok) {
    const resultado = {
      ok: false,
      lat: null,
      lng: null,
      precision: null,
      calculo: null,
      error: ubicacion.error
    };

    guardarZonaCliente(resultado);
    return resultado;
  }

  const calculo = calcularEnvioCaucel(ubicacion.lat, ubicacion.lng);

  const resultado = {
    ok: true,
    lat: ubicacion.lat,
    lng: ubicacion.lng,
    precision: ubicacion.precision,
    calculo,
    actualizadoEn: Date.now()
  };

  guardarZonaCliente(resultado);
  return resultado;
}

/* =========================================
   WHATSAPP
========================================= */
export function construirLinkWhatsApp({
  producto = "",
  precio = "",
  zona = "",
  distancia = "",
  lat = "",
  lng = ""
} = {}) {
  const mensaje = [
    "Hola, quiero cotizar envío para mi pedido en Peek Shop.",
    producto ? `Producto: ${producto}` : "",
    precio ? `Precio: $${precio}` : "",
    zona ? `Zona detectada: ${zona}` : "",
    distancia ? `Distancia aprox: ${Number(distancia).toFixed(1)} km` : "",
    lat && lng ? `Ubicación: https://www.google.com/maps?q=${lat},${lng}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${WHATSAPP_TIENDA}?text=${encodeURIComponent(mensaje)}`;
}