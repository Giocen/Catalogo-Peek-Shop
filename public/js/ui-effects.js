document.addEventListener("DOMContentLoaded", () => {

  /* =============================
     LUCIDE ICONS
  ============================== */
  if (window.lucide) {
    lucide.createIcons();
  }

  /* =============================
     OBSERVER APARICIÓN PRODUCTOS
  ============================== */

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("producto-visible");
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  window.activarAnimacionProductos = function () {
    document.querySelectorAll(".card-producto").forEach(card => {
      card.classList.add("producto-appear");
      observer.observe(card);
    });
  };

  /* =============================
     HEADER SCROLL EFFECT
  ============================== */

  const header = document.getElementById("mainHeader");

  if (header) {
    window.addEventListener("scroll", () => {
      const scrolled = window.scrollY > 40;

      header.classList.toggle("shadow-md", scrolled);
      header.classList.toggle("backdrop-blur-md", scrolled);

    }, { passive: true });
  }

  /* =============================
     MICRO FEEDBACK PRODUCTO
  ============================== */

  document.addEventListener("click", (e) => {

    const btn = e.target.closest(".btn-agregar");
    if (!btn) return;

    const card = btn.closest(".group");

    if (card) {
      card.classList.add("highlight-add");

      setTimeout(() => {
        card.classList.remove("highlight-add");
      }, 350);
    }

    animarIconoCarrito();
  });

  /* =============================
     ANIMACIÓN ICONO CARRITO
  ============================== */

  function animarIconoCarrito() {

    const mobile = document.getElementById("btnCarrito");
    const desktop = document.getElementById("btnCarritoDesktop");

    [mobile, desktop].forEach(el => {
      if (!el) return;

      el.classList.add("carrito-anim");

      setTimeout(() => {
        el.classList.remove("carrito-anim");
      }, 200);
    });
  }

  /* =============================
     SCROLL SUAVE A CATEGORÍAS
  ============================== */

  window.scrollToCategorias = function () {
    const el = document.getElementById("categorias");
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  /* =============================
     BOTTOM NAV ACTIVE
  ============================== */

  const bottomButtons = document.querySelectorAll("nav button, nav a");

  bottomButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      bottomButtons.forEach(b => b.classList.remove("bottom-nav-active"));
      btn.classList.add("bottom-nav-active");
    });
  });

});