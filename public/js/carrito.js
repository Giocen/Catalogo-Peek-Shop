import { supabase } from "./supabase.js";

let carrito = JSON.parse(localStorage.getItem("carrito") || "[]");

const portal = document.getElementById("cart-portal");
const btnCarrito = document.getElementById("btnCarrito");

/* ===== CONFIG ENVÍO ===== */
const COSTO_ENVIO = 25;
const ENVIO_GRATIS_DESDE = 500;

window.tipoEntrega = "envio"; // envio | tienda

/* ================= ABRIR ================= */
export function abrirCarrito() {
    if (!carrito.length) {
      Swal.fire({
        icon: "info",
        title: "Tu carrito está vacío",
        text: "Agrega productos para poder realizar un pedido.",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#16a34a"
      });
      return;
    }
    renderPortal();
  }
  

/* ================= AGREGAR ================= */
export function agregarAlCarrito(producto) {
  const p = carrito.find(i => i.id === producto.id);
  if (p) p.cantidad++;
  else carrito.push({ ...producto, cantidad: 1 });

  guardar();
  toast("Agregado al carrito 🛒");
}

/* ================= RENDER PORTAL ================= */
function renderPortal() {
  portal.innerHTML = `
    <div id="cartOverlay"
      onclick="window._cerrarSiOverlay(event)"
      style="position:fixed;inset:0;background:rgba(0,0,0,.4);
             z-index:999999;display:flex;justify-content:flex-end;">
      
      <div onclick="event.stopPropagation()"
        style="background:white;width:360px;height:100%;
               padding:16px;display:flex;flex-direction:column;">

        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>🛒 Tu carrito</strong>
          <button onclick="portal.innerHTML=''" style="font-size:20px">✕</button>
        </div>

        <!-- Selector entrega -->
        <div style="margin:10px 0;display:flex;gap:8px">
          <button onclick="window._setEntrega('envio')"
            style="flex:1;padding:6px;border-radius:6px;
                   border:1px solid #e5e7eb;
                   background:${tipoEntrega === "envio" ? "#fde68a" : "#fff"}">
            🚚 Envío
          </button>
          <button onclick="window._setEntrega('tienda')"
            style="flex:1;padding:6px;border-radius:6px;
                   border:1px solid #e5e7eb;
                   background:${tipoEntrega === "tienda" ? "#fde68a" : "#fff"}">
            🏪 Recoger
          </button>
        </div>

        <div id="cartBody" style="flex:1;overflow:auto"></div>

        <div style="border-top:1px solid #eee;padding-top:12px">
          <div id="cartTotal"></div>

          <button id="btnEnviar"
            style="margin-top:10px;background:#16a34a;color:white;
                   padding:10px;border-radius:8px;width:100%">
            Realizar pedido
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btnEnviar").onclick = pedirDatosCliente;
  renderItems();
}

/* ================= ITEMS + TOTAL ================= */
function renderItems() {
  const body = document.getElementById("cartBody");
  const totalEl = document.getElementById("cartTotal");

  let subtotal = 0;

  body.innerHTML = carrito.map(p => {
    const precio = Number(p.precio) || 0;
    const cantidad = Number(p.cantidad) || 0;
    const t = precio * cantidad;
    subtotal += t;

    return `
      <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #eee">
        <img src="${p.imagen}" style="width:56px;height:56px;object-fit:contain">

        <div style="flex:1">
          <div style="font-weight:600">${p.nombre}</div>
          <div style="color:#16a34a;font-weight:700">$${precio}</div>

          <div style="margin-top:6px;display:flex;gap:8px;align-items:center">
            <button onclick="_cartMinus('${p.id}')">-</button>
            <strong>${cantidad}</strong>
            <button onclick="_cartPlus('${p.id}')">+</button>
          </div>
        </div>

        <div style="text-align:right">
          <div style="font-weight:700">$${t}</div>
          <button onclick="_cartDel('${p.id}')"
            style="color:#dc2626;text-decoration:underline">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");

  const envio =
    tipoEntrega === "tienda"
      ? 0
      : subtotal >= ENVIO_GRATIS_DESDE
      ? 0
      : COSTO_ENVIO;

  const totalFinal = subtotal + envio;

  totalEl.innerHTML = `
    <div style="display:flex;justify-content:space-between">
      <span>Subtotal</span><span>$${subtotal}</span>
    </div>
    <div style="display:flex;justify-content:space-between">
      <span>Envío</span>
      <span>${envio === 0 ? "Gratis" : `$${envio}`}</span>
    </div>
    <div style="display:flex;justify-content:space-between;
                font-weight:800;font-size:18px;margin-top:6px">
      <span>Total</span><span>$${totalFinal}</span>
    </div>
  `;
}

/* ================= ACCIONES ================= */
window._cartPlus = id => {
  const p = carrito.find(i => i.id === id);
  if (!p) return;
  p.cantidad++;
  guardar();
  renderItems();
};

window._cartMinus = id => {
  const i = carrito.findIndex(p => p.id === id);
  if (i === -1) return;
  carrito[i].cantidad--;
  if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
  guardar();
  renderItems();
};

window._cartDel = id => {
  carrito = carrito.filter(p => p.id !== id);
  guardar();
  renderItems();
};

window._setEntrega = tipo => {
  tipoEntrega = tipo;
  renderPortal();
};

window._cerrarSiOverlay = e => {
  if (e.target.id === "cartOverlay") portal.innerHTML = "";
};

/* ================= DATOS CLIENTE ================= */
function pedirDatosCliente() {
  Swal.fire({
    title: "Datos para tu pedido",
    html: `
      <input id="swal-nombre" class="swal2-input" placeholder="Nombre completo">
      ${
        tipoEntrega === "envio"
          ? `<textarea id="swal-direccion" class="swal2-textarea"
              placeholder="Dirección completa"></textarea>`
          : ""
      }
      <textarea id="swal-referencia" class="swal2-textarea"
        placeholder="Referencia (opcional)"></textarea>
    `,
    confirmButtonText: "Enviar pedido",
    showCancelButton: true,
    preConfirm: () => {
      const nombre = document.getElementById("swal-nombre").value.trim();
      const direccion =
        tipoEntrega === "envio"
          ? document.getElementById("swal-direccion").value.trim()
          : "";

      if (!nombre || (tipoEntrega === "envio" && !direccion)) {
        Swal.showValidationMessage("Completa los datos requeridos");
        return false;
      }

      return { nombre, direccion };
    }
    }).then(r => {
        if (r.isConfirmed) mostrarResumenPedido(r.value);
    });

}

window.pedirDatosCliente = pedirDatosCliente;

/* ================= WHATS ================= */
function enviarWhats(cliente, numeroPedido, totales) {
    let msg = `PEDIDO PEEKSHOP\n\n`;

    msg += `Pedido: ${numeroPedido}\n`;
    msg += `Cliente: ${cliente.nombre}\n`;
    
    if (tipoEntrega === "envio") {
      msg += `Entrega: Envío a domicilio\n`;
      msg += `Dirección: ${cliente.direccion}\n`;
    } else {
      msg += `Entrega: Recoger en tienda\n`;
    }
    
    msg += `\n----------------------\n`;
    msg += `PRODUCTOS\n`;
    msg += `----------------------\n`;
    
    carrito.forEach(p => {
      msg += `${p.nombre}\n`;
      msg += `x${p.cantidad}  $${p.precio * p.cantidad}\n\n`;
    });
    
    msg += `----------------------\n`;
    msg += `RESUMEN\n`;
    msg += `----------------------\n`;
    msg += `Subtotal: $${totales.subtotal}\n`;
    msg += `Envío: ${totales.envio === 0 ? "GRATIS" : `$${totales.envio}`}\n`;
    msg += `TOTAL: $${totales.total}\n\n`;
    msg += `Gracias por tu compra`;
    
  
    window.open(
      `https://wa.me/529992328261?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  
    Swal.fire({
        icon: "success",
        title: "Pedido enviado",
        html: `
          <p style="margin-bottom:6px">
            Gracias por tu compra 🐾
          </p>
          <p style="font-size:14px;color:#555">
            Te daremos seguimiento a tu pedido por <strong>WhatsApp</strong>.
          </p>
        `,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#16a34a"
      }).then(() => limpiarCarrito());
      
  } 
  

/* ================= UTIL ================= */
function guardar() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
  const badge = document.getElementById("carritoCount");
  if (badge) badge.textContent = carrito.reduce((a, p) => a + p.cantidad, 0);
}

function toast(t) {
  const d = document.createElement("div");
  d.textContent = t;
  d.style.cssText =
    "position:fixed;bottom:80px;right:20px;background:#16a34a;color:white;" +
    "padding:10px 14px;border-radius:8px;z-index:9999999";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}

if (btnCarrito) btnCarrito.onclick = abrirCarrito;
guardar();


function limpiarCarrito() {
    carrito = [];
    localStorage.removeItem("carrito");
  
    const badge = document.getElementById("carritoCount");
    if (badge) badge.textContent = "0";
  
    // Cierra el carrito visual
    if (portal) portal.innerHTML = "";
  }

  function generarNumeroPedido() {
    const fecha = new Date();
    const y = fecha.getFullYear().toString().slice(-2);
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    const r = Math.floor(1000 + Math.random() * 9000);
  
    return `PK-${y}${m}${d}-${r}`;
  }

  function calcularTotales() {
    let subtotal = 0;
  
    carrito.forEach(p => {
      subtotal += Number(p.precio) * Number(p.cantidad);
    });
  
    const envio =
      tipoEntrega === "tienda" || subtotal >= ENVIO_GRATIS_DESDE
        ? 0
        : COSTO_ENVIO;
  
    return {
      subtotal,
      envio,
      total: subtotal + envio
    };
  }
  
  function mostrarResumenPedido(cliente) {
    const totales = calcularTotales();
    const numeroPedido = generarNumeroPedido();
  
    const lista = carrito
      .map(p => `• ${p.nombre} x${p.cantidad} = $${p.precio * p.cantidad}`)
      .join("<br>");
  
      Swal.fire({
        title: "Confirmar pedido",
        width: 420,
        html: `
          <div style="text-align:left;font-size:14px">
            <p><strong>No. Pedido:</strong> ${numeroPedido}</p>
            <hr>
      
            <p><strong>Cliente:</strong> ${cliente.nombre}</p>
            ${
              tipoEntrega === "envio"
                ? `<p><strong>Dirección:</strong> ${cliente.direccion}</p>`
                : `<p><strong>Entrega:</strong> Recoger en tienda</p>`
            }
      
            <hr>
            <p><strong>Productos:</strong></p>
            ${lista}
      
            <hr>
            <p>Subtotal: $${totales.subtotal}</p>
            <p>Envío: ${totales.envio === 0 ? "Gratis" : `$${totales.envio}`}</p>
            <p style="font-size:16px;font-weight:800">
              Total: $${totales.total}
            </p>
          </div>
        `,
        showCancelButton: true,
      
        confirmButtonText: "Confirmar pedido",
        confirmButtonColor: "#16a34a",
        allowOutsideClick: false,
        allowEscapeKey: false
      
      }).then(async r => {
        if (!r.isConfirmed) return;
      
        await guardarPedidoSupabase({
          numeroPedido,
          cliente,
          totales
        });
      
        enviarWhats(cliente, numeroPedido, totales);
      });
      
  }

  
  async function guardarPedidoSupabase({ numeroPedido, cliente, totales }) {
    await supabase.from("pedidos").insert({
      numero_pedido: numeroPedido,
      cliente_nombre: cliente.nombre,
      cliente_direccion: cliente.direccion || "",
      tipo_entrega: tipoEntrega,
      subtotal: totales.subtotal,
      envio: totales.envio,
      total: totales.total,
      productos: carrito
    });
  }
  

/* ================= COMPRA DIRECTA ================= */
window.comprarAhoraDirecto = producto => {
    // 🔥 Reemplaza el carrito SOLO para este pedido
    carrito = [{
      ...producto,
      cantidad: 1
    }];
  
    // Guarda para que el flujo existente funcione igual
    guardar();
  
    // Ejecuta el MISMO flujo que el carrito
    pedirDatosCliente();
  };
  