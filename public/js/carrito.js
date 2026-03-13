import { supabase } from "./supabase.js";
import { calcularEnvioCaucel } from "./envio-caucel.js";


function getCarrito() {
  return JSON.parse(localStorage.getItem("carrito") || "[]");
}

function setCarrito(data) {
  localStorage.setItem("carrito", JSON.stringify(data));
}



window.tipoEntrega = "envio"; // envio | tienda

function celebrarEnvioGratis() {

  // 📳 vibración móvil
  if (navigator.vibrate) {
    navigator.vibrate([120, 60, 120]);
  }

  // 🎊 confetti
  lanzarConfetti();
}


function formatearPrecio(valor) {
  return Number(valor).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
/* ================= ABRIR ================= */
export function abrirCarrito() {

  const carrito = getCarrito();

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
  setTimeout(renderItems, 50);
  
}

 window.abrirCarrito = abrirCarrito;

/* ================= AGREGAR ================= */
export function agregarAlCarrito(producto) {

  producto.presentacion_id = producto.presentacion_id || null;

  const carrito = getCarrito();

  const p = carrito.find(i =>
    i.id === producto.id &&
    i.presentacion_id === producto.presentacion_id
  );

  if (p) {
    p.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  setCarrito(carrito);
  guardar();
  animarCarritoIcon();
  toast("Agregado al carrito 🛒");
}


/* ================= RENDER PORTAL ================= */
function renderPortal() {

  const carrito = getCarrito();
  // 🔥 Crear overlay dinámicamente sin depender de cart-portal
  let portal = document.getElementById("peekshop-cart-overlay");

  if (portal) portal.remove();

 portal = document.createElement("div");
  portal.id = "peekshop-cart-overlay";
  portal.className = "cart-overlay";

  portal.style.position = "fixed";
  portal.style.inset = "0";
  portal.style.background = "rgba(15,23,42,.55)";
  portal.style.backdropFilter = "blur(6px)";
  portal.style.zIndex = "2147483647";
  portal.style.display = "flex";
  portal.style.justifyContent = "flex-end";

  document.body.appendChild(portal);
  document.body.style.overflow = "hidden";
  const subtotal = carrito.reduce((a, p) =>
    a + Number(p.precio) * Number(p.cantidad), 0);

  

        portal.innerHTML = `
        <div class="cart-panel">
        <div style="
            width:100%;
            max-width:420px;
            height:100vh;
            background:rgba(255,255,255,.95);
            backdrop-filter:blur(18px);
            display:flex;
            flex-direction:column;
            box-shadow:-25px 0 70px rgba(0,0,0,.35);
            animation:slideCart .25s ease-out;
          ">

          <!-- HEADER -->
          <div class="cart-header">
            <div>
              <div class="cart-title">
                <i data-lucide="shopping-cart"></i>
                Tu carrito
              </div>
              <div class="cart-subtitle">
                ${carrito.length} productos
              </div>
            </div>

            <button class="cart-close" onclick="window._cerrarCarrito()">
              <i data-lucide="x"></i>
            </button>
          </div>

         <!-- BADGE ENVÍO -->
          <div id="shippingBadge" style="
            padding:12px 14px;
            margin:12px 16px 6px 16px;
            border-radius:14px;
            background:#f8fafc;
            border:1px solid #e2e8f0;
            font-size:13px;
            line-height:1.4;
          ">

            <div style="font-weight:700;color:#0f172a">
              🚚 Envíos en Ciudad Caucel
            </div>

            <div style="color:#64748b;margin-top:2px">
              Costo calculado según tu ubicación
            </div>

            <button id="btnUbicacionCart"
              style="
                margin-top:8px;
                padding:6px 10px;
                border-radius:8px;
                border:none;
                background:#22c55e;
                color:white;
                font-size:12px;
                font-weight:700;
                cursor:pointer;
              ">
              📍 Compartir ubicación
            </button>

          </div>

          <!-- ENTREGA -->
          <div class="delivery-toggle">

            <div class="delivery-indicator"
              style="left:${tipoEntrega === "envio" ? "4px" : "calc(50% + 2px)"}">
            </div>

            <button
              class="delivery-btn ${tipoEntrega === "envio" ? "active" : ""}"
              onclick="window._setEntrega('envio')">
              <i data-lucide="truck"></i>
              Envío
            </button>

            <button
              class="delivery-btn ${tipoEntrega === "tienda" ? "active" : ""}"
              onclick="window._setEntrega('tienda')">
              <i data-lucide="store"></i>
              Recoger
            </button>

          </div>

          <!-- BODY -->
          <div id="cartBody" class="cart-body"></div>

          <!-- FOOTER -->
          <div class="cart-footer">

          <div id="cartTotal" class="cart-total"></div>

          <button
            onclick="pedirDatosCliente()"
            style="
              margin-top:10px;
              width:100%;
              padding:14px;
              border:none;
              border-radius:14px;
              font-weight:800;
              font-size:15px;
              background:linear-gradient(135deg,#22c55e,#16a34a);
              color:white;
              cursor:pointer;
              box-shadow:0 6px 16px rgba(0,0,0,.15);
            ">
            Finalizar pedido 🚀
          </button>

        </div>

          </div>

        <style>
          @keyframes slideCart {
            from { 
              transform: translateX(100%);
              opacity: 0;
            }
            to { 
              transform: translateX(0);
              opacity: 1;
            }
          }
        </style>

      `;

      const latGuardada = localStorage.getItem("cliente_lat");
      const lngGuardada = localStorage.getItem("cliente_lng");

      const badge = document.getElementById("shippingBadge");

      if (latGuardada && lngGuardada && badge) {

    const envioData = calcularEnvioCaucel(
      Number(latGuardada),
      Number(lngGuardada)
    );

      if (envioData.tipo === "cotizar_whatsapp") {

    badge.innerHTML = `
    <div style="font-weight:700;color:#0f172a">
    📍 Tu zona: Mérida
    </div>

    <div style="font-size:12px;color:#64748b;margin-top:4px">
    📲 Envío se cotiza por WhatsApp
    </div>
    `;

    }

    if (envioData.tipo === "cotizar_whatsapp") {

        badge.innerHTML = `
          <div style="font-weight:700;color:#0f172a">
            📍 Fuera de zona automática
          </div>

          <button onclick="cotizarEnvioMerida()"
            style="
              margin-top:6px;
              padding:6px 10px;
              border:none;
              border-radius:8px;
              background:#22c55e;
              color:white;
              font-weight:700;
              font-size:12px;
            ">
            Cotizar envío por WhatsApp
          </button>
        `;
      }

    else {

      badge.innerHTML = `
        <div style="font-weight:700;color:#0f172a">
          📍 Envío a tu zona: ${
            envioData.envio === 0
              ? "Gratis 🚚"
              : "$" + formatearPrecio(envioData.envio)
          }
        </div>

        <div style="font-size:12px;color:#64748b;margin-top:4px">
          Entrega estimada: Hoy mismo 🚀
        </div>
      `;

    }
}

    const btnUbicacionCart = document.getElementById("btnUbicacionCart");
    if (window.lucide) lucide.createIcons();

    if (btnUbicacionCart) {

      btnUbicacionCart.onclick = () => {

        if (!navigator.geolocation) {
          alert("Tu navegador no soporta ubicación");
          return;
        }

        btnUbicacionCart.textContent = "Obteniendo ubicación...";

        navigator.geolocation.getCurrentPosition(pos => {

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          localStorage.setItem("cliente_lat", lat);
          localStorage.setItem("cliente_lng", lng);

          renderPortal();
          setTimeout(renderItems, 50);

          const envioData = calcularEnvioCaucel(Number(lat), Number(lng));

          const badge = document.getElementById("shippingBadge");

          if (!badge) return;

          badge.innerHTML = `
            <div style="font-weight:700;color:#0f172a">
              📍 Envío a tu zona: ${
                envioData.envio === 0
                  ? "Gratis 🚚"
                  : "$" + formatearPrecio(envioData.envio)
              }
            </div>

            <div style="font-size:12px;color:#64748b;margin-top:4px">
              Entrega estimada: Hoy mismo 🚀
            </div>
          `;

          renderItems();

        }, () => {

          btnUbicacionCart.textContent = "Intentar de nuevo";

        });

      };

    }

  }
/* ================= ITEMS + TOTAL ================= */
function renderItems() {

  const carrito = getCarrito();
  
  const body = document.getElementById("cartBody");
  const totalEl = document.getElementById("cartTotal");

  if (!body || !totalEl) return;

  let subtotal = 0;

  // ================= RENDER ITEMS =================
  if (!carrito.length) {

    body.innerHTML = `
      <div style="padding:20px;text-align:center;color:#64748b">
        Tu carrito está vacío
      </div>
    `;

    totalEl.innerHTML = "";
    return;
  }

  body.innerHTML = carrito.map(p => {

    const precio = Number(p.precio) || 0;
    const cantidad = Number(p.cantidad) || 0;
    const totalItem = precio * cantidad;

    subtotal += totalItem;

    return `
      <div class="cart-item">

        <img src="${p.imagen || ''}" class="cart-item-img">

       <div class="cart-item-info">
          <div class="cart-item-name">${p.nombre}</div>

          ${p.presentacion ? `
            <div style="font-size:12px;color:#64748b;margin-top:2px">
              Presentación: <b>${p.presentacion}</b>
            </div>
          ` : ""}

          <div class="cart-item-price">$${formatearPrecio(precio)}</div>

          <div class="cart-qty">

            <button 
              class="qty-btn qty-minus"
              onclick="event.stopPropagation(); _cartMinus('${p.id}', ${p.presentacion_id ? `'${p.presentacion_id}'` : 'null'})">
              <i data-lucide="minus"></i>
            </button>

            <div class="qty-number">
              ${cantidad}
            </div>

            <button 
              class="qty-btn qty-plus"
              onclick="event.stopPropagation(); _cartPlus('${p.id}', ${p.presentacion_id ? `'${p.presentacion_id}'` : 'null'})">
              <i data-lucide="plus"></i>
            </button>

          </div>
        </div>

        <div class="cart-item-right">
          <div class="cart-item-total">$${formatearPrecio(totalItem)}</div>

          <button
            class="qty-btn qty-delete"
            onclick="event.stopPropagation(); _cartDel('${p.id}', ${p.presentacion_id ? `'${p.presentacion_id}'` : 'null'})">
            <i data-lucide="trash-2"></i>
          </button>
        </div>

      </div>
    `;

  }).join("");

  // ================= CALCULAR ENVÍO =================
 
    let envio = 0;

    if (tipoEntrega === "envio") {

      const lat = Number(localStorage.getItem("cliente_lat"));
      const lng = Number(localStorage.getItem("cliente_lng"));

      if (lat && lng) {
        const envioData = calcularEnvioCaucel(lat, lng);

        if (envioData?.tipo === "cotizar_whatsapp") {
          envio = 0;
        } else {
          envio = envioData?.envio ?? 0;
        }
      }

    }

  const totalFinal = subtotal + envio;

  // ================= RENDER TOTAL =================
  totalEl.innerHTML = `
    <div class="cart-summary-row">
      <span>Subtotal</span>
      <span>$${formatearPrecio(subtotal)}</span>
    </div>

   <div class="cart-summary-row">
    <span>Envío</span>
    <span>
      ${
        tipoEntrega === "tienda"
          ? "Gratis"
          : envio === 0
            ? "Gratis"
            : `$${formatearPrecio(envio)}`
      }
    </span>
  </div>

    <div class="cart-summary-total">
      <span>Total</span>
      <span>$${formatearPrecio(totalFinal)}</span>
    </div>
  `;

  // Volver a pintar iconos
  if (window.lucide) lucide.createIcons();
}

/* ================= ACCIONES ================= */
window._cartPlus = (id, presId) => {
  const carrito = getCarrito();

  const p = carrito.find(i =>
    i.id === id &&
    i.presentacion_id === (presId || null)
  );
  if (!p) return;

  p.cantidad++;

  setCarrito(carrito);
  guardar();
  renderItems();
  actualizarToggleEntrega();
};

window._cartMinus = (id, presId) => {
  const carrito = getCarrito();

  const index = carrito.findIndex(i =>
    i.id === id &&
    i.presentacion_id === (presId || null)
  );
  if (index === -1) return;

  carrito[index].cantidad--;

  if (carrito[index].cantidad <= 0) {
    carrito.splice(index, 1);
  }

  setCarrito(carrito);
  guardar();
  renderItems();
  actualizarToggleEntrega();
};

window._cartDel = (id, presId) => {
  let carrito = getCarrito();

  carrito = carrito.filter(i =>
    !(
      i.id === id &&
      i.presentacion_id === (presId || null)
    )
  );

  setCarrito(carrito);
  guardar();
  renderItems();
  actualizarToggleEntrega();
};

window._setEntrega = tipo => {
  tipoEntrega = tipo;
  actualizarToggleEntrega();
  renderItems();
};


window._cerrarCarrito = () => {
  const overlay = document.getElementById("peekshop-cart-overlay");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
};

/* ================= DATOS CLIENTE ================= */
function pedirDatosCliente(esCompraDirecta = false) {
  const esEnvio = tipoEntrega === "envio";

  Swal.fire({
    title: esEnvio ? "Datos de Envío" : "Datos del Cliente",
    width: 420,
    background: "#ffffff",
    confirmButtonText: esEnvio ? "Continuar con envío" : "Continuar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    customClass: {
      popup: "rounded-3xl shadow-2xl"
    },
    showClass: {
      popup: "animate__animated animate__bounceIn"
    },
    html: `
      <div class="swal-form">

        <div class="swal-info-box">
          <div class="swal-info-icon">🔒</div>
          <div>
            <strong>Información protegida</strong><br>
            ${
              esEnvio
                ? "Tus datos se utilizan para la entrega y confirmación del pedido."
                : "Tus datos se utilizan para identificar tu pedido en tienda."
            }
          </div>
        </div>

        <input 
          id="swal-nombre"
          class="swal2-input swal-custom-input"
          placeholder="Nombre completo">

        ${
          esEnvio
            ? `
              <textarea
                id="swal-direccion"
                class="swal2-textarea swal-custom-input"
                placeholder="Dirección completa"></textarea>

              <textarea
                id="swal-referencia"
                class="swal2-textarea swal-custom-input"
                placeholder="Referencia (opcional)"></textarea>

              <!-- 📍 UBICACIÓN -->
              <div style="
                margin-top:10px;
                padding:12px;
                border:1px solid #e2e8f0;
                border-radius:14px;
                background:#f8fafc;
              ">
                <div style="font-size:13px;color:#334155;font-weight:700;margin-bottom:6px;">
                  📍 Ubicación (opcional)
                </div>

                <button type="button" id="btnUbicacion"
                  onclick="window.__psGetUbicacion && window.__psGetUbicacion(event)"
                  style="
                    width:100%;
                    padding:10px 12px;
                    border-radius:12px;
                    border:none;
                    font-weight:800;
                    background:linear-gradient(135deg,#22c55e,#16a34a);
                    color:white;
                    cursor:pointer;
                    pointer-events:auto;
                  ">
                  Compartir mi ubicación
                </button>

                <div id="ubicacionEstado" style="margin-top:8px;font-size:12px;color:#64748b;">
                  Si compartes tu ubicación, nos ayuda a encontrar tu domicilio más rápido.
                </div>

                <input type="hidden" id="swal-lat" value="">
                <input type="hidden" id="swal-lng" value="">
                <input type="hidden" id="swal-maps" value="">
              </div>
            `
            : ""
        }

      </div>
    `,

    didOpen: () => {
      const popup = Swal.getPopup();
      const textareas = popup.querySelectorAll("textarea");

      textareas.forEach(t => {
        t.style.height = "auto";
        t.style.overflow = "hidden";
        t.addEventListener("input", () => {
          t.style.height = "auto";
          t.style.height = t.scrollHeight + "px";
        });
      });

      // 📍 Botón de ubicación (solo si es envío)    
      if (esEnvio) {
        const popup = Swal.getPopup();

        // Definimos handler global temporal (seguro con SweetAlert + móvil)
        window.__psGetUbicacion = (ev) => {
          try {
            ev?.preventDefault?.();
            ev?.stopPropagation?.();

            const btnUbic = popup?.querySelector("#btnUbicacion");
            const estado = popup?.querySelector("#ubicacionEstado");
            const latEl = popup?.querySelector("#swal-lat");
            const lngEl = popup?.querySelector("#swal-lng");
            const mapsEl = popup?.querySelector("#swal-maps");

            if (!btnUbic || !estado || !latEl || !lngEl || !mapsEl) {
              console.warn("No se encontraron elementos de ubicación dentro del Swal.");
              return;
            }

            // ✅ feedback inmediato (si esto no cambia, es que NO está clickeando)
            estado.textContent = "📍 Preparando ubicación...";

            if (!window.isSecureContext) {
              estado.textContent = "⚠️ La ubicación requiere HTTPS.";
              return;
            }

            if (!navigator.geolocation) {
              estado.textContent = "⚠️ Tu navegador no soporta ubicación.";
              return;
            }

            btnUbic.disabled = true;
            btnUbic.style.opacity = "0.85";
            estado.textContent = "Obteniendo ubicación… (acepta el permiso del navegador)";

            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

                latEl.value = String(lat);
                lngEl.value = String(lng);
                localStorage.setItem("cliente_lat", lat);
                localStorage.setItem("cliente_lng", lng);
                mapsEl.value = mapsUrl;

                estado.innerHTML = `
                  ✅ Ubicación guardada<br>
                  <a href="${mapsUrl}" target="_blank" style="color:#16a34a;font-weight:800;text-decoration:underline;">
                    Ver en Google Maps
                  </a>
                `;

                btnUbic.textContent = "Ubicación lista ✅";
                btnUbic.disabled = false;
                btnUbic.style.opacity = "1";
              },
              (err) => {
                let msg = "No se pudo obtener la ubicación.";
                if (err?.code === 1) msg = "Permiso denegado. Activa ubicación en tu navegador.";
                if (err?.code === 2) msg = "Ubicación no disponible. Activa GPS e inténtalo.";
                if (err?.code === 3) msg = "Tiempo de espera. Intenta de nuevo.";

                estado.textContent = `⚠️ ${msg}`;
                btnUbic.disabled = false;
                btnUbic.style.opacity = "1";
                btnUbic.textContent = "Intentar de nuevo";
              },
              {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
              }
            );
          } catch (e) {
            console.error("Error ubicación:", e);
          }
        };
      }   
      
    },

    preConfirm: () => {
      const nombre = document.getElementById("swal-nombre").value.trim();
      const direccion = esEnvio
        ? document.getElementById("swal-direccion")?.value.trim()
        : "";

      const referencia = document.getElementById("swal-referencia")?.value.trim() || "";

      // 📍 ubicación opcional
      const lat = esEnvio ? (document.getElementById("swal-lat")?.value || "") : "";
      const lng = esEnvio ? (document.getElementById("swal-lng")?.value || "") : "";
      const maps = esEnvio ? (document.getElementById("swal-maps")?.value || "") : "";

      if (!nombre) {
        Swal.showValidationMessage("Ingresa tu nombre");
        return false;
      }

      if (esEnvio && !direccion) {
        Swal.showValidationMessage("Ingresa la dirección completa");
        return false;
      }

      return { nombre, direccion, referencia, lat, lng, maps };
    }
  }).then(r => {
    if (r.isConfirmed) {
      mostrarResumenPedido(r.value, esCompraDirecta);
    }
  });
}

window.pedirDatosCliente = pedirDatosCliente;
/* ================= WHATS ================= */
function enviarWhats(cliente, numeroPedido, totales) {
    let msg = `PEDIDO PEEK SHOP\n\n`;

    msg += `Pedido: ${numeroPedido}\n`;
    msg += `Cliente: ${cliente.nombre}\n`;
    
  if (tipoEntrega === "envio") {
    msg += `Entrega: Envío a domicilio\n`;
    msg += `Dirección: ${cliente.direccion}\n`;

    // ✅ agrega esto
    if (cliente.referencia) {
      msg += `Referencia: ${cliente.referencia}\n`;
    }

    if (cliente.maps) {
      msg += `Ubicación: ${cliente.maps}\n`;
    }
  } else {
    msg += `Entrega: Recoger en tienda\n`;
  }
    
    msg += `\n----------------------\n`;
    msg += `PRODUCTOS\n`;
    msg += `----------------------\n`;
    
    const productos = window._compraTemporal || getCarrito();

    productos.forEach(p => {
  const presTxt = p.presentacion ? ` (${p.presentacion})` : "";
  msg += `${p.nombre}${presTxt}\n`;
  msg += `x${p.cantidad}  $${formatearPrecio(p.precio * p.cantidad)}\n\n`;
});
    
    msg += `----------------------\n`;
    msg += `RESUMEN\n`;
    msg += `----------------------\n`;
    msg += `Subtotal: $${formatearPrecio(totales.subtotal)}\n`;
    msg += `Envío: ${totales.envio === 0 ? "GRATIS" : `$${totales.envio}`}\n`;
    msg += `TOTAL: $${formatearPrecio(totales.total)}\n\n`;
    msg += `Gracias por tu compra`;
    
  
    window.open(
      `https://wa.me/529991494268?text=${encodeURIComponent(msg)}`,
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

  const carrito = getCarrito();

  const total = carrito.reduce((a, p) => a + p.cantidad, 0);

  const desktop = document.getElementById("carritoCount");
  const mobile = document.getElementById("carritoCountMobile");

  if (desktop) desktop.textContent = total;
  if (mobile) mobile.textContent = total;
}



      function toast(t) {
        const d = document.createElement("div");

        d.innerHTML = `
          <div style="
            display:flex;
            align-items:center;
            gap:8px;
          ">
            <i data-lucide="check-circle" style="width:16px;height:16px"></i>
            ${t}
          </div>
        `;

        d.style.cssText =
          "position:fixed;bottom:80px;right:20px;background:#16a34a;color:white;" +
          "padding:12px 16px;border-radius:12px;z-index:9999999;" +
          "box-shadow:0 10px 25px rgba(0,0,0,.15);" +
          "animation:fadeIn .2s ease;";

        document.body.appendChild(d);

        if (window.lucide) lucide.createIcons();

        setTimeout(() => d.remove(), 1200);
      }

guardar();


 function limpiarCarrito() {
  setCarrito([]);
  localStorage.removeItem("compra_directa");
  guardar();

  const overlay = document.getElementById("peekshop-cart-overlay");
    if (overlay) overlay.remove();
}


  function generarNumeroPedido() {
    const fecha = new Date();
    const y = fecha.getFullYear().toString().slice(-2);
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    const r = Math.floor(1000 + Math.random() * 9000);
  
    return `PK-${y}${m}${d}-${r}`;
  }

  function calcularTotales(productos = []) {

  if (!Array.isArray(productos)) {
    console.warn("calcularTotales recibió algo inválido:", productos);
    return { subtotal: 0, envio: 0, total: 0 };
  }

  let subtotal = 0;

  productos.forEach(p => {
    subtotal += Number(p.precio) * Number(p.cantidad);
  });

 

  let envio = 0;

  if (tipoEntrega === "tienda") {
    envio = 0;
  }
  else {

  const lat = Number(localStorage.getItem("cliente_lat"));
  const lng = Number(localStorage.getItem("cliente_lng"));

  if (!lat || !lng) {
    envio = 0;
  } else {
    const envioData = calcularEnvioCaucel(lat, lng);
    envio = envioData?.envio ?? 0;
  }

}

  return {
    subtotal,
    envio,
    total: subtotal + envio
  };
}

  
 function mostrarResumenPedido(cliente, esCompraDirecta = false) {

  const productos =
    esCompraDirecta && window._compraTemporal
      ? window._compraTemporal
      : getCarrito();

  const totales = calcularTotales(productos);  // ✅ ahora sí se pasa el array
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

        ${productos.map(p => `
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

              <div style="font-size:12px;color:#64748b">
                ${p.presentacion ? `Presentación: <b>${p.presentacion}</b>` : ""}
              </div>
            </div>

            <div style="font-weight:700">
              $${formatearPrecio(p.precio * p.cantidad)}
            </div>
          </div>
        `).join("")}

        <hr style="margin:10px 0">

        <div style="display:flex;justify-content:space-between">
          <span>Subtotal</span>
          <span>$${formatearPrecio(totales.subtotal)}</span>
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
          <span>$${formatearPrecio(totales.total)}</span>
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
  const esEnvio = tipoEntrega === "envio";

  const { error } = await supabase.from("pedidos").insert({
    numero_pedido: numeroPedido,
    cliente_nombre: cliente.nombre,
    cliente_direccion: esEnvio ? (cliente.direccion || "") : "",
    cliente_referencia: esEnvio ? (cliente.referencia || "") : "",

    cliente_lat: esEnvio && cliente.lat ? Number(cliente.lat) : null,
    cliente_lng: esEnvio && cliente.lng ? Number(cliente.lng) : null,
    cliente_maps_url: esEnvio ? (cliente.maps || "") : "",

    tipo_entrega: tipoEntrega,
    subtotal: totales.subtotal,
    envio: totales.envio,
    total: totales.total,
    productos: window._compraTemporal || getCarrito()
  });

  if (error) {
    console.error("Error guardando pedido:", error);
    Swal.fire("Error", "No se pudo guardar el pedido", "error");
  }
}

/* ================= COMPRA DIRECTA ================= */
    window.comprarAhoraDirecto = producto => {

      window._compraTemporal = [{
        ...producto,
        cantidad: 1
      }];

      seleccionarTipoEntregaCompraDirecta();
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
  const mobile = document.getElementById("btnCarrito");
  const desktop = document.getElementById("btnCarritoDesktop");

  if (mobile) {
    mobile.style.animation = "shakeCart .4s";
    setTimeout(() => mobile.style.animation = "", 400);
  }

  if (desktop) {
    desktop.style.animation = "shakeCart .4s";
    setTimeout(() => desktop.style.animation = "", 400);
  }
}


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

  const carrito = getCarrito();

  const zona = "Mérida (fuera de Caucel)";
  let subtotal = 0;

  carrito.forEach(p => {
    subtotal += Number(p.precio) * Number(p.cantidad);
  });

  let msg = `Hola, quiero cotizar envío para:\n\n`;

  carrito.forEach(p => {
    msg += `${p.nombre}\n`;
    msg += `x${p.cantidad}  $${formatearPrecio(p.precio * p.cantidad)}\n\n`;
  });

  msg += `Subtotal: $${formatearPrecio(subtotal)}\n`;
  msg += `Zona: ${zona}`;

  const numeroWhatsApp = "5219991494268";

  window.open(
    `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(msg)}`,
    "_blank"
  );
}

function seleccionarTipoEntregaCompraDirecta() {

  const ultima = localStorage.getItem("ultima_entrega") || "envio";
  const producto = window._compraTemporal?.[0];

  if (!producto) return;

  const subtotal = Number(producto.precio) * Number(producto.cantidad);
  

  Swal.fire({
    width: 430,
    background: "#ffffff",
    showConfirmButton: true,
    confirmButtonText: "Continuar",
    customClass: {
      popup: "rounded-3xl shadow-2xl"
    },
    showClass: {
      popup: "animate__animated animate__fadeInUp"
    },
    html: `
            <div class="ps-delivery">

              <div class="ps-title">
                ¿Cómo deseas recibir tu pedido?
              </div>

              <div class="ps-product">
                <div class="ps-product-name">${producto.nombre}</div>
                <div class="ps-product-sub">Subtotal: $${formatearPrecio(subtotal)}</div>
              </div>

              <div class="ps-toggle">

                <div id="swalToggleIndicator" class="ps-indicator"></div>

                <button id="optEnvio" class="ps-btn">
                  🚚 Envío
                </button>

                <button id="optTienda" class="ps-btn">
                  🏪 Recoger
                </button>

              </div>

              <div id="costoEstimado" class="ps-cost-box"></div>

            </div>
          `,
    
    didOpen: () => {

      const btnEnvio = document.getElementById("optEnvio");
      const btnTienda = document.getElementById("optTienda");
      const costoBox = document.getElementById("costoEstimado");

      let seleccion = ultima;

      function calcularEnvio() {

          const ahora = new Date();
          const hora = ahora.getHours();
          const dentroHorario = hora >= 9 && hora < 21;

          let mensajeHorario = dentroHorario
            ? "Entrega estimada: Hoy mismo 🚀"
            : "Entrega estimada: Mañana 🕘";

          if (seleccion === "tienda") {
            return {
              texto: `Recoger en tienda — GRATIS 🏪<br><small>${mensajeHorario}</small>`,
              envio: 0
            };
          }

         const lat = Number(localStorage.getItem("cliente_lat"));
          const lng = Number(localStorage.getItem("cliente_lng"));

          if (!lat || !lng) {
            return {
              texto: `Comparte tu ubicación para calcular el envío 📍<br><small>${mensajeHorario}</small>`,
              envio: 0
            };
          }

          const envioData = calcularEnvioCaucel(lat, lng);

          if (!envioData || envioData.tipo === "cotizar_whatsapp") {
            return {
              texto: `Envío se cotiza por WhatsApp 📲<br><small>${mensajeHorario}</small>`,
              envio: 0
            };
          }

          return {
            texto: `Costo estimado de envío: ${
              envioData.envio === 0
                ? "Gratis 🚚"
                : `$${formatearPrecio(envioData.envio)}`
            }<br><small>${mensajeHorario}</small>`,
            envio: envioData.envio
          };
        }

     function actualizarUI() {

          const indicator = document.getElementById("swalToggleIndicator");

          btnEnvio.classList.remove("active");
          btnTienda.classList.remove("active");

          if (seleccion === "envio") {
            btnEnvio.classList.add("active");
            indicator.style.left = "6px";
          } else {
            btnTienda.classList.add("active");
            indicator.style.left = "calc(50% + 0px)";
          }

          const envioInfo = calcularEnvio();

          costoBox.innerHTML = `
            ${envioInfo.texto}<br>
            Total estimado: <strong>$${formatearPrecio(subtotal + envioInfo.envio)}</strong>
          `;
        }

      btnEnvio.onclick = () => {
        seleccion = "envio";
        actualizarUI();
      };

      btnTienda.onclick = () => {
        seleccion = "tienda";
        actualizarUI();
      };

      actualizarUI();

      Swal.getConfirmButton().onclick = () => {
        tipoEntrega = seleccion;
        localStorage.setItem("ultima_entrega", seleccion);
        Swal.close();

        setTimeout(() => {
          pedirDatosCliente(true);
        }, 200);
      };
    }
  });
}

function actualizarToggleEntrega() {
  const toggle = document.querySelector(".delivery-toggle");
  if (!toggle) return;

  const envioBtn = toggle.querySelector("[onclick*=\"envio\"]");
  const tiendaBtn = toggle.querySelector("[onclick*=\"tienda\"]");
  const indicator = toggle.querySelector(".delivery-indicator");

  if (!envioBtn || !tiendaBtn || !indicator) return;

  envioBtn.classList.remove("active");
  tiendaBtn.classList.remove("active");

  if (tipoEntrega === "envio") {
    envioBtn.classList.add("active");
    indicator.style.left = "4px";
  } else {
    tiendaBtn.classList.add("active");
    indicator.style.left = "calc(50% + 2px)";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnCarrito = document.getElementById("btnCarrito");

  if (btnCarrito) {
    btnCarrito.addEventListener("click", abrirCarrito);
  }
});
