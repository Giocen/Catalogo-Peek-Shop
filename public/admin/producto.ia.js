export function analizarProductoLocal({ nombre, descripcion, marca }) {
  const texto = `${nombre} ${descripcion} ${marca}`.toLowerCase();

  let categoriaDetectada = null;
  let unidadDetectada = "pieza";
  let tallaDetectada = "";
  let nombrePresentacion = "General";

  if (/croqueta|alimento|dog chow|pro plan|nupec|royal canin/.test(texto)) {
    categoriaDetectada = "Alimentos";
  }

  if (/collar|correa|pechera/.test(texto)) {
    categoriaDetectada = "Accesorios";
  }

  if (/juguete|pelota|mordedera/.test(texto)) {
    categoriaDetectada = "Juguetes";
  }

  if (/arena|arenero|sanitario/.test(texto)) {
    categoriaDetectada = "Higiene";
  }

  if (/shampoo|jab[oó]n|antipulgas|spray/.test(texto)) {
    categoriaDetectada = "Salud e higiene";
  }

  if (/cama|transportadora|jaula/.test(texto)) {
    categoriaDetectada = "Descanso y transporte";
  }

  if (/vitamina|suplemento|antibi[oó]tico/.test(texto)) {
    categoriaDetectada = "Veterinaria";
  }

  const kgMatch = texto.match(/(\d+)\s?(kg|kilo|kilos)/);

  if (kgMatch) {
    unidadDetectada = "bulto";
    tallaDetectada = `${kgMatch[1]} kg`;
    nombrePresentacion = `Bulto ${kgMatch[1]}kg`;
  }

  return {
    categoria: categoriaDetectada,
    descripcion: descripcion || "",
    presentaciones: [{
      nombre: nombrePresentacion,
      unidad: unidadDetectada,
      cantidad: 1,
      talla: tallaDetectada,
      costo: "",
      precio: "",
      precio_oferta: "",
      en_oferta: false,
      margen: 0,
      stock: 0,
      activo: true,
      detalle: ""
    }]
  };
}
