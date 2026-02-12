import { supabase } from "./supabase.js";

let carrito = JSON.parse(localStorage.getItem("carrito") || "[]");

const portal = document.getElementById("cart-portal");
const btnCarrito = document.getElementById("btnCarrito");

/* ===== CONFIG ENVÍO  ===== */
const COSTO_ENVIO = 25;
const ENVIO_GRATIS_DESDE = 400;

window.tipoEntrega = "envio"; // envio | tienda
let envioGratisActivo = false;

// 🔊 Sonido celebración
const audioEnvioGratis = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"
);
audioEnvioGratis.volume = 0.4;

function celebrarEnvioGratis() {
  // 🎵 sonido
  audioEnvioGratis.currentTime = 0;
  audioEnvioGratis.play().catch(() => {});

  // 📳 vibración móvil
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  // 🎊 confetti
  lanzarConfetti();
}

/* ================= ABRIR ================= */
export function abrirCarrito() {
  if (!carrito.length) {

    Swal.fire({
      width: 380,
      background: "#ffffff",
      showConfirmButton: true,
      confirmButtonText: "Seguir comprando",
      confirmButtonColor: "#16a34a",
      customClass: {
        popup: "rounded-3xl shadow-2xl"
      },
      showClass: {
        popup: "animate__animated animate__bounceIn"
      },
      html: `
        <div style="text-align:center;padding:10px">

          <div style="
            width:70px;
            height:70px;
            margin:0 auto 10px;
            background:#dcfce7;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;">
            
            <svg width="36" height="36" fill="#16a34a"
              viewBox="0 0 24 24">
              <path d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.44C8.16 16.37 8 16.68 8 17
              a1 1 0 001 1h12v-2H9.42a.25.25 0 01-.22-.37L10.1 14h7.45
              a1 1 0 00.92-.62l3.58-8A1 1 0 0021 4H7z"/>
            </svg>
          </div>

          <h3 style="font-weight:700;font-size:18px;margin-bottom:6px">
            Tu carrito está vacío
          </h3>

          <p style="font-size:14px;color:#64748b">
            Agrega productos para comenzar tu pedido
          </p>

        </div>
      `
    });

    return;
  }

  renderPortal();
}

/* ================= AGREGAR ================= */
  export function agregarAlCarrito(producto) {

    const p = carrito.find(i =>
      i.id === producto.id &&
      i.presentacion_id === producto.presentacion_id &&
      i.color === producto.color
    );

    if (p) {
      p.cantidad++;
    } else {
      carrito.push({ ...producto, cantidad: 1 });
    }

    guardar();
    animarCarritoIcon();
    toast("Agregado al carrito 🛒");
    
  }


/* ================= RENDER PORTAL ================= */
function renderPortal() {

  const subtotal = carrito.reduce((a, p) =>
    a + Number(p.precio) * Number(p.cantidad), 0);

  const faltan = ENVIO_GRATIS_DESDE - subtotal;
  const zona = localStorage.getItem("zona_envio") || "Caucel";

  const metaGratis = 400;

  const progreso =
    zona === "Caucel"
      ? Math.min((subtotal / metaGratis) * 100, 100)
      : 0;  
    // 🎉 Detectar cuando se desbloquea envío gratis
        if (zona === "Caucel" && subtotal >= metaGratis && !envioGratisActivo) {
        envioGratisActivo = true;
        setTimeout(() => celebrarEnvioGratis(), 250);
      }
  
    if (zona !== "Caucel" || subtotal < metaGratis) {
      envioGratisActivo = false;
    }
  const colorBarra =
  progreso >= 100
    ? "linear-gradient(90deg,#facc15,#f59e0b)"  // Dorado al 100%
    : "linear-gradient(90deg,#22c55e,#16a34a)";
    const glowBarra =
      progreso >= 100
        ? "0 0 10px rgba(250,204,21,.8), 0 0 20px rgba(245,158,11,.6)"
        : "none";

  portal.innerHTML = `
  <div id="cartOverlay"
    onclick="window._cerrarSiOverlay(event)"
    style="
      position:fixed;
      inset:0;
      backdrop-filter:blur(6px);
      background:rgba(0,0,0,.35);
      z-index:999999;
      display:flex;
      justify-content:flex-end;
    ">

    <div onclick="event.stopPropagation()"
      style="
        background:#ffffff;
        width:100%;
        max-width:420px;
        height:100%;
        display:flex;
        flex-direction:column;
        box-shadow:-10px 0 40px rgba(0,0,0,.15);
        animation:slideCart .25s ease-out;
      ">

      <!-- HEADER -->
      <div style="
        padding:18px;
        border-bottom:1px solid #f1f5f9;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <div>
          <div style="font-weight:800;font-size:18px;color:#0f172a">
            🛒 Tu carrito
          </div>
          <div style="font-size:12px;color:#64748b">
            ${carrito.length} productos
          </div>
        </div>

        <button onclick="window._cerrarCarrito()"
          style="
            width:34px;height:34px;
            border-radius:50%;
            border:none;
            background:#f1f5f9;
            cursor:pointer;
            font-size:16px;
          ">
          ✕
        </button>
        </div>

      <!-- 🔥 BADGE ENVÍO -->
      ${
          zona === "Caucel"
            ? (
                subtotal >= 400
                  ? `
                    <div style="
                      margin:14px 18px 0;
                      padding:10px;
                      border-radius:12px;
                      background:#dcfce7;
                      color:#166534;
                      font-weight:600;
                      text-align:center;
                      animation:bounceBadge .5s ease;
                    ">
                      🚚 ¡Envío GRATIS desbloqueado!
                    </div>
                  `
                  : `
                    <div style="margin:14px 18px 0">
                      <div style="font-size:12px;color:#475569;margin-bottom:6px">
                        Te faltan <strong>$${faltan > 0 ? faltan : 0}</strong>
                        para envío gratis
                      </div>
                      <div style="
                        height:8px;
                        background:#e2e8f0;
                        border-radius:20px;
                        overflow:hidden;
                      ">
                        <div style="
                          height:100%;
                          width:${progreso}%;
                          background:${colorBarra};
                          box-shadow:${glowBarra};
                          transition:width .4s ease, background .4s ease;
                        "></div>
                      </div>
                    </div>
                  `
              )
            : `
              <div style="
                margin:14px 18px 0;
                padding:12px;
                border-radius:12px;
                background:#fff7ed;
                color:#ea580c;
                font-weight:500;
                font-size:13px;
              ">
                📲 El envío en Mérida se cotiza por WhatsApp
              </div>
            `
        }

      <!-- ENTREGA -->
      <div style="padding:14px 18px 6px">
        <div style="
          display:flex;
          background:#f8fafc;
          border-radius:14px;
          padding:4px;
        ">
          <button
            onclick="window._setEntrega('envio')"
            style="
              flex:1;padding:8px;border:none;
              border-radius:10px;font-weight:600;
              background:${tipoEntrega === "envio" ? "#16a34a" : "transparent"};
              color:${tipoEntrega === "envio" ? "white" : "#334155"};
              transition:.2s;
            ">
            🚚 Envío
          </button>

          <button
            onclick="window._setEntrega('tienda')"
            style="
              flex:1;padding:8px;border:none;
              border-radius:10px;font-weight:600;
              background:${tipoEntrega === "tienda" ? "#16a34a" : "transparent"};
              color:${tipoEntrega === "tienda" ? "white" : "#334155"};
              transition:.2s;
            ">
            🏪 Recoger
          </button>
        </div>
      </div>

      <div id="cartBody"
        style="flex:1;overflow:auto;padding:0 18px 10px;"></div>

      <!-- FOOTER -->
      <div style="
        padding:16px 18px;
        border-top:1px solid #f1f5f9;
        box-shadow:0 -8px 20px rgba(0,0,0,.04);
      ">
        <div id="cartTotal" style="margin-bottom:12px;font-size:14px"></div>

        <button id="btnEnviar"
          style="
            width:100%;
            padding:12px;
            border:none;
            border-radius:14px;
            font-weight:700;
            font-size:15px;
            color:white;
            cursor:pointer;
            background:${
              zona === "Caucel"
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : "linear-gradient(135deg,#f97316,#ea580c)"
            };
            box-shadow:0 6px 18px rgba(0,0,0,.15);
            transition:.2s;
          "
          onmouseover="this.style.transform='scale(1.03)'"
          onmouseout="this.style.transform='scale(1)'"
        >
          ${
            zona === "Caucel"
              ? "Finalizar pedido"
              : "📲 Cotizar envío por WhatsApp"
          }
        </button>
      </div>
    </div>
  </div>

 <style>
  @keyframes slideCart {
    from { transform:translateX(100%); }
    to { transform:translateX(0); }
  }

  @keyframes bounceBadge {
    0% { transform:scale(.8); }
    50% { transform:scale(1.05); }
    100% { transform:scale(1); }
  }

  @keyframes fallConfetti {
    to {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }
</style>
  `;

  const btn = document.getElementById("btnEnviar");

  if (zona === "Caucel") {
    btn.onclick = pedirDatosCliente;
  } else {
    btn.onclick = cotizarEnvioMerida;
  }
  renderItems();
  animarContador(Math.floor(progreso));
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
            <button onclick="_cartMinus('${p.id}','${p.presentacion_id}','${p.color || ""}')">-</button>
            <strong>${cantidad}</strong>
            <button onclick="_cartPlus('${p.id}','${p.presentacion_id}','${p.color || ""}')">+</button>
          </div>
        </div>

        <div style="text-align:right">
          <div style="font-weight:700">$${t}</div>
          <button
            onclick="_cartDel('${p.id}','${p.presentacion_id}','${p.color || ""}')"
            style="
              color:#dc2626;
              font-size:12px;
              background:none;
              border:none;
              cursor:pointer;
              padding:0;
            ">
            Eliminar
          </button>
        </div>
      </div>
      </div>
    `;
  }).join("");

  const zona = localStorage.getItem("zona_envio") || "Caucel";

    let envio = 0;

    if (tipoEntrega === "tienda") {
      envio = 0;
    }
    else if (zona === "Caucel") {
      envio = subtotal >= 400 ? 0 : 25;
    }
    else {
      // Mérida → envío no calculado automáticamente
      envio = 0;
    }

  const totalFinal = subtotal + envio;

  totalEl.innerHTML = `
    <div style="display:flex;justify-content:space-between">
      <span>Subtotal</span><span>$${subtotal}</span>
    </div>
    <div style="display:flex;justify-content:space-between">
      <span>Envío</span>
      <span>
      ${
        tipoEntrega === "tienda"
          ? "Gratis"
          : zona === "Caucel"
            ? (envio === 0 ? "Gratis" : `$${envio}`)
            : "Cotizar por WhatsApp"
      }
      </span>
    </div>
    <div style="display:flex;justify-content:space-between;
                font-weight:800;font-size:18px;margin-top:6px">
      <span>Total</span><span>$${totalFinal}</span>
    </div>
  `;
}

/* ================= ACCIONES ================= */
  window._cartPlus = (id, presId, color) => {
    const p = carrito.find(i =>
      i.id === id &&
      i.presentacion_id === presId &&
      i.color === (color || null)
    );
    if (!p) return;
    p.cantidad++;
    guardar();
    renderItems();
  };

  window._cartMinus = (id, presId, color) => {
    const i = carrito.findIndex(p =>
      p.id === id &&
      p.presentacion_id === presId &&
      p.color === (color || null)
    );
    if (i === -1) return;
    carrito[i].cantidad--;
    if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
    guardar();
    renderItems();
  };

  window._cartDel = (id, presId, color) => {
    carrito = carrito.filter(p =>
      !(p.id === id &&
        p.presentacion_id === presId &&
        p.color === (color || null))
    );
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
    title: "Finalizar pedido",
    width: 420,
    background: "#ffffff",
    confirmButtonText: "Continuar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    customClass: {
      popup: "rounded-3xl shadow-2xl"
    },
    showClass: {
      popup: "animate__animated animate__bounceIn"
    },
    html: `
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:10px">

        <input id="swal-nombre"
          class="swal2-input"
          placeholder="Nombre completo"
          style="border-radius:14px">

        ${
          tipoEntrega === "envio"
            ? `<textarea id="swal-direccion"
                class="swal2-textarea"
                placeholder="Dirección completa"
                style="border-radius:14px"></textarea>`
            : ""
        }

        <textarea id="swal-referencia"
          class="swal2-textarea"
          placeholder="Referencia (opcional)"
          style="border-radius:14px"></textarea>

      </div>
    `,
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
      width: 380,
      background: "#ffffff",
      showConfirmButton: true,
      confirmButtonText: "Perfecto",
      customClass: {
        popup: "rounded-3xl shadow-2xl"
      },
      showClass: {
        popup: "animate__animated animate__bounceIn"
      },
      html: `
        <div style="text-align:center">

          <div style="
            width:70px;
            height:70px;
            margin:0 auto 10px;
            background:linear-gradient(135deg,#22c55e,#16a34a);
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;">
            
            <svg width="36" height="36" fill="white"
              viewBox="0 0 24 24">
              <path d="M9 16.17l-3.88-3.88a1 1 0 00-1.41 1.42l4.59 4.58a1 1 0 001.41 0l9-9a1 1 0 00-1.41-1.42L9 16.17z"/>
            </svg>
          </div>

          <h3 style="font-weight:800;font-size:18px;margin-bottom:6px">
            Pedido enviado 🎉
          </h3>

          <p style="font-size:14px;color:#64748b">
            Te contactaremos por WhatsApp para confirmar tu pedido.
          </p>

        </div>
      `
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

  const zona = localStorage.getItem("zona_envio") || "Caucel";

  let envio = 0;

  if (tipoEntrega === "tienda") {
    envio = 0;
  }
  else if (zona === "Caucel") {
    envio = subtotal >= 400 ? 0 : 25;
  }
  else {
    envio = 0; // Mérida se cotiza aparte
  }

  return {
    subtotal,
    envio,
    total: subtotal + envio
  };
}
  
  function mostrarResumenPedido(cliente) {

  const totales = calcularTotales();
  const numeroPedido = generarNumeroPedido();

  Swal.fire({
    width: 480,
    background: "#ffffff",
    confirmButtonText: "Confirmar pedido",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    customClass: {
      popup: "rounded-3xl shadow-2xl"
    },
    showClass: {
      popup: "animate__animated animate__bounceIn"
    },
    html: `
      <div style="text-align:left;color:#334155">

        <div style="text-align:center;margin-bottom:10px">
          <h3 style="font-weight:800;font-size:18px">
            Pedido ${numeroPedido}
          </h3>
        </div>

        ${carrito.map(p => `
          <div style="
            display:flex;
            align-items:center;
            gap:10px;
            margin-bottom:8px;
            padding:6px;
            border-radius:10px;
            background:#f8fafc">

            <img src="${p.imagen}"
              style="width:40px;height:40px;object-fit:contain;border-radius:8px">

            <div style="flex:1">
              <div style="font-weight:600;font-size:14px">
                ${p.nombre}
              </div>
              <div style="font-size:13px;color:#64748b">
                x${p.cantidad}
              </div>
            </div>

            <div style="font-weight:700">
              $${p.precio * p.cantidad}
            </div>
          </div>
        `).join("")}

        <hr style="margin:10px 0">

        <div style="display:flex;justify-content:space-between">
          <span>Subtotal</span>
          <span>$${totales.subtotal}</span>
        </div>

        <div style="display:flex;justify-content:space-between">
          <span>Envío</span>
          <span>
          ${
            tipoEntrega === "tienda"
              ? "Gratis"
              : (localStorage.getItem("zona_envio") || "Caucel") === "Caucel"
                ? (totales.envio === 0 ? "Gratis" : `$${totales.envio}`)
                : "Cotizar por WhatsApp"
          }
          </span>
        </div>

        <div style="
          display:flex;
          justify-content:space-between;
          font-size:18px;
          font-weight:800;
          margin-top:8px">
          <span>Total</span>
          <span>$${totales.total}</span>
        </div>

      </div>
    `
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
  

  // ================= ANIMACIÓN ICONO CARRITO =================
const style = document.createElement("style");
style.innerHTML = `
@keyframes shakeCart {
  0% { transform:translateX(0); }
  25% { transform:translateX(-4px); }
  50% { transform:translateX(4px); }
  75% { transform:translateX(-4px); }
  100% { transform:translateX(0); }
}`;
document.head.appendChild(style);

function animarCarritoIcon() {
  const icon = document.getElementById("btnCarrito");
  if (!icon) return;

  icon.style.animation = "shakeCart .4s";
  setTimeout(() => icon.style.animation = "", 400);
}


window._cerrarCarrito = () => {
  const overlay = document.getElementById("cartOverlay");
  if (!overlay) return;

  overlay.style.transition = "opacity .2s ease";
  overlay.style.opacity = "0";

  setTimeout(() => {
    const portal = document.getElementById("cart-portal");
    if (portal) portal.innerHTML = "";
  }, 200);
};

function lanzarConfetti() {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "9999999";
  document.body.appendChild(container);

  for (let i = 0; i < 40; i++) {
    const conf = document.createElement("div");
    conf.style.position = "absolute";
    conf.style.width = "6px";
    conf.style.height = "10px";
    conf.style.background =
      ["#22c55e", "#16a34a", "#facc15", "#3b82f6"][Math.floor(Math.random() * 4)];
    conf.style.left = Math.random() * 100 + "%";
    conf.style.top = "-20px";
    conf.style.opacity = "0.9";
    conf.style.transform = `rotate(${Math.random() * 360}deg)`;
    conf.style.animation = `fallConfetti 1.5s ease forwards`;
    container.appendChild(conf);
  }

  setTimeout(() => container.remove(), 1600);
}

function animarContador(final) {
  const el = document.getElementById("contadorProgreso");
  if (!el) return;

  let actual = 0;
  const incremento = final / 20;

  const intervalo = setInterval(() => {
    actual += incremento;
    if (actual >= final) {
      actual = final;
      clearInterval(intervalo);
    }
    el.textContent = Math.floor(actual) + "%";
  }, 15);
}

function cotizarEnvioMerida() {

  const zona = "Mérida (fuera de Caucel)";

  let subtotal = 0;

  carrito.forEach(p => {
    subtotal += Number(p.precio) * Number(p.cantidad);
  });

  let msg = `Hola, quiero cotizar envío para:\n\n`;

  carrito.forEach(p => {
    msg += `${p.nombre}\n`;
    msg += `x${p.cantidad}  $${p.precio * p.cantidad}\n\n`;
  });

  msg += `Subtotal: $${subtotal}\n`;
  msg += `Zona: ${zona}`;

  const numeroWhatsApp = "5219991494268"; // mismo número que producto.js

  window.open(
    `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );
}