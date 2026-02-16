document.addEventListener("DOMContentLoaded", () => {

  lucide.createIcons();

  const header = document.getElementById("mainHeader");
  const estadoEl = document.getElementById("estadoHorario");

  /* =====================================================
     CONFIG HORARIO
  ===================================================== */

  const HORARIOS = {
    semana: [
      { inicio: 9, fin: 13 },
      { inicio: 16, fin: 21 }
    ],
    domingo: [
      { inicio: 9, fin: 14 }
    ]
  };

  function getHorarioHoy() {
    const dia = new Date().getDay();
    return dia === 0 ? HORARIOS.domingo : HORARIOS.semana;
  }

  function getEstadoHorario() {

    const ahora = new Date();
    const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
    const horarios = getHorarioHoy();

    let abierto = false;
    let proximoCambio = null;

    for (let bloque of horarios) {

      if (horaActual >= bloque.inicio && horaActual < bloque.fin) {
        abierto = true;
        proximoCambio = bloque.fin;
        break;
      }

      if (horaActual < bloque.inicio && !proximoCambio) {
        proximoCambio = bloque.inicio;
      }
    }

    if (!abierto && !proximoCambio) {
      // ya cerró todo el día
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);
      mañana.setHours(getHorarioHoy()[0].inicio, 0, 0, 0);
      proximoCambio = getHorarioHoy()[0].inicio;
    }

    return { abierto, proximoCambio };
  }

  function tiempoRestante(horaDecimal) {

    const ahora = new Date();
    const horas = Math.floor(horaDecimal);
    const minutos = Math.round((horaDecimal - horas) * 60);

    const target = new Date();
    target.setHours(horas, minutos, 0, 0);

    if (target < ahora) target.setDate(target.getDate() + 1);

    const diff = target - ahora;

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / (1000 * 60)) % 60);

    return `${h}h ${m}m`;
  }

  /* =====================================================
     ACTUALIZAR ESTADO EN TIEMPO REAL
  ===================================================== */

  function actualizarEstadoHorario() {

    if (!estadoEl) return;

    const estado = getEstadoHorario();
    const tiempo = estado.proximoCambio
      ? tiempoRestante(estado.proximoCambio)
      : "";

    if (estado.abierto) {

      header.style.background = "rgba(34,197,94,0.95)";
      header.classList.add("backdrop-blur-md", "shadow-xl");

      estadoEl.innerHTML = `
        <div class="flex items-center gap-2
                    text-white text-xs font-medium
                    tracking-wide">

          <span class="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>

          <i data-lucide="sun" class="w-4 h-4"></i>

          Abierto ahora · Cierra en ${tiempo}
        </div>
      `;

    } else {

      header.style.background = "rgba(17,24,39,0.95)";
      header.classList.add("backdrop-blur-md", "shadow-xl");

      estadoEl.innerHTML = `
        <div class="flex items-center gap-2
                    text-yellow-200 text-xs font-medium
                    tracking-wide">

          <span class="w-2 h-2 bg-yellow-400 rounded-full"></span>

          <i data-lucide="moon" class="w-4 h-4"></i>

          Cerrado · Abre en ${tiempo}
        </div>
      `;
    }

    lucide.createIcons();
  }

  actualizarEstadoHorario();
  setInterval(actualizarEstadoHorario, 60000);

  /* =====================================================
     HEADER SCROLL PREMIUM
  ===================================================== */

  window.addEventListener("scroll", () => {
    if (!header) return;

    if (window.scrollY > 40) {
      header.classList.add("shadow-2xl");
    } else {
      header.classList.remove("shadow-2xl");
    }
  });

  /* =====================================================
     MICRO FEEDBACK PRODUCTO
  ===================================================== */

  document.addEventListener("click", e => {

    const btn = e.target.closest(".btn-agregar");
    if (!btn) return;

    const card = btn.closest(".group");
    if (!card) return;

    card.style.transition = "all .25s cubic-bezier(.4,0,.2,1)";
    card.style.transform = "scale(0.97)";
    card.style.boxShadow = "0 20px 40px rgba(0,0,0,.12)";

    setTimeout(() => {
      card.style.transform = "scale(1)";
      card.style.boxShadow = "";
    }, 250);
  });

  /* =====================================================
     MODAL HORARIO ESTILO APPLE
  ===================================================== */

document.getElementById("btnHorario")?.addEventListener("click", () => {

  const estado = getEstadoHorario();
  const tiempo = estado.proximoCambio
    ? tiempoRestante(estado.proximoCambio)
    : "";

  const estadoTienda = estado.abierto
    ? `
      <div class="mb-4 p-5 rounded-2xl
                  bg-gradient-to-r from-green-50 to-emerald-50
                  border border-green-200
                  flex items-center gap-4
                  transition-all duration-500 ease-out">

        <div class="w-10 h-10 flex items-center justify-center
                    rounded-full bg-green-100
                    transition-all duration-500">

          <i data-lucide="sun"
             class="w-5 h-5 text-green-600
                    transition-all duration-500"></i>
        </div>

        <div>
          <div class="font-semibold text-green-800">
            Tienda abierta
          </div>
          <div class="text-xs text-green-700 opacity-80">
            Cierra en ${tiempo}
          </div>
        </div>
      </div>
    `
    : `
      <div class="mb-4 p-5 rounded-2xl
                  bg-gradient-to-r from-gray-50 to-slate-100
                  border border-gray-200
                  flex items-center gap-4
                  transition-all duration-500 ease-out">

        <div class="w-10 h-10 flex items-center justify-center
                    rounded-full bg-gray-200
                    transition-all duration-500">

          <i data-lucide="moon"
             class="w-5 h-5 text-gray-700
                    transition-all duration-500"></i>
        </div>

        <div>
          <div class="font-semibold text-gray-800">
            Tienda cerrada
          </div>
          <div class="text-xs text-gray-600 opacity-80">
            Abre en ${tiempo}
          </div>
        </div>
      </div>
    `;

  Swal.fire({
    width: 500,
    background: "#ffffff",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#111827",
    customClass: {
      popup: "rounded-[28px] shadow-2xl animate__animated animate__fadeInUp"
    },
    html: `
      <div class="text-left text-sm text-gray-700 space-y-6">

        <div class="flex items-center gap-2 text-base font-semibold text-gray-900">
          <i data-lucide="clock" class="w-5 h-5"></i>
          Horario en tienda física
        </div>

        ${estadoTienda}

        <div class="p-6 rounded-2xl
                    bg-gray-50 border border-gray-200
                    text-sm leading-relaxed">

          <div class="flex items-center gap-2 font-semibold mb-3">
            <i data-lucide="store" class="w-4 h-4"></i>
            Horario en tienda
          </div>

          <div class="text-gray-700">
            Lunes a Sábado<br>
            9:00 am – 1:00 pm<br>
            4:00 pm – 9:00 pm<br><br>
            Domingo<br>
            9:00 am – 2:00 pm
          </div>
        </div>

        <div class="p-5 rounded-2xl
                    bg-gradient-to-r from-blue-50 to-indigo-50
                    border border-blue-200
                    text-blue-700 text-xs leading-relaxed">

          <div class="flex items-start gap-2">
            <i data-lucide="message-circle"
               class="w-4 h-4 mt-[2px]"></i>

            <div>
              <strong>Asesoría en línea disponible</strong><br>
              Aunque la tienda esté cerrada, puedes escribirnos por WhatsApp.
              Te responderemos lo antes posible.
            </div>
          </div>
        </div>

      </div>
    `,
    didOpen: () => {
      if (window.lucide) {
        lucide.createIcons();
      }
    }
  });

});



  /* =====================================================
     ENVÍOS PREMIUM
  ===================================================== */

  document.getElementById("btnEnvios")?.addEventListener("click", () => {

    Swal.fire({
      title: "Información de Envíos",
      width: 460,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#111827",
      background: "#ffffff",
      customClass: {
        popup: "rounded-3xl shadow-2xl"
      },
      html: `
        <div class="text-left text-sm text-gray-700 space-y-6">

          <div class="p-5 rounded-2xl bg-gray-50 border border-gray-200">
            <div class="font-semibold mb-2 flex items-center gap-2">
              <i data-lucide="truck" class="w-4 h-4"></i>
              Ciudad Caucel
            </div>
            Envío GRATIS en compras mayores a <strong>$400</strong><br>
            Menor a $400 → <strong>$25</strong>
          </div>

          <div class="p-5 rounded-2xl bg-gray-50 border border-gray-200">
            <div class="font-semibold mb-2 flex items-center gap-2">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              Otros fraccionamientos
            </div>
            Se cotiza por WhatsApp
          </div>

        </div>
      `,
      didOpen: () => lucide.createIcons()
    });
  });

  /* =====================================================
     UBICACIÓN
  ===================================================== */

  document.getElementById("btnUbicacion")?.addEventListener("click", () => {
    window.open("https://maps.app.goo.gl/r5SchUKfgtPcyReb7", "_blank");
  });

});
