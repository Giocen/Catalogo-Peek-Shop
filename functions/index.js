const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const OpenAI = require("openai");

setGlobalOptions({ maxInstances: 10 });

/* ================= SECRET ================= */
const OPENAI_KEY = defineSecret("OPENAI_KEY");

/* ================= FUNCIÓN IA ================= */
exports.iaProducto = onRequest(
  {
    secrets: [OPENAI_KEY],
    cors: true
  },
  async (req, res) => {

    // CORS manual extra (seguridad adicional)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Método no permitido"
      });
    }

    try {

      const { nombre, descripcion, marca } = req.body || {};

      if (!nombre) {
        return res.status(400).json({
          ok: false,
          error: "Nombre requerido"
        });
      }

      /* 🔥 Crear cliente OpenAI DENTRO */
      const openai = new OpenAI({
        apiKey: OPENAI_KEY.value()
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Devuelve únicamente JSON válido sin texto adicional. No agregues explicaciones."
          },
          {
            role: "user",
            content: `
Analiza este producto para tienda de mascotas:

Nombre: ${nombre}
Marca: ${marca || ""}
Descripción: ${descripcion || ""}

Devuelve EXACTAMENTE este formato JSON:

{
  "categoria": "",
  "descripcion": "",
  "presentaciones": [
    {
      "nombre": "",
      "unidad": "pieza",
      "costo": 0,
      "precio": 0,
      "stock": 0,
      "activo": true
    }
  ]
}
`
          }
        ],
        temperature: 0.4
      });

      const texto = completion.choices[0].message.content;

      let json;

      try {
        json = JSON.parse(texto);
      } catch (parseError) {
        logger.error("Respuesta no fue JSON válido:", texto);

        return res.status(500).json({
          ok: false,
          error: "IA no devolvió JSON válido"
        });
      }

      return res.json({
        ok: true,
        categoria: json.categoria || "",
        descripcion: json.descripcion || "",
        presentaciones: Array.isArray(json.presentaciones)
          ? json.presentaciones
          : []
      });

    } catch (err) {
      logger.error("ERROR IA:", err);

      return res.status(500).json({
        ok: false,
        error: err.message
      });
    }
  }
);