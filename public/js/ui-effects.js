document.addEventListener("DOMContentLoaded", () => {

    /* =============================
   OBSERVER APARICIÓN PRODUCTOS
============================== */

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("producto-visible");
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15
});

window.activarAnimacionProductos = function () {
  document.querySelectorAll(".card-producto, .group").forEach(card => {
    card.classList.add("producto-appear");
    observer.observe(card);
  });
};


  /* =============================
     LUCIDE ICONS
  ============================== */
  if (window.lucide) {
    lucide.createIcons();
  }

  /* =============================
     HEADER SCROLL EFFECT
  ============================== */
  const header = document.getElementById("mainHeader");

  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 40) {
        header.classList.add("shadow-md");
        header.classList.add("backdrop-blur-md");
      } else {
        header.classList.remove("shadow-md");
        header.classList.remove("backdrop-blur-md");
      }
    });
  }

  /* =============================
     MICRO FEEDBACK PRODUCTO
  ============================== */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");

    if (!btn) return;

    if (btn.textContent.includes("Agregar")) {

      const card = btn.closest(".group");

      if (card) {
        card.classList.add("highlight-add");

        setTimeout(() => {
          card.classList.remove("highlight-add");
        }, 350);
      }

      animarIconoCarrito();
    }
  });

  /* =============================
     ANIMACIÓN ICONO CARRITO
  ============================== */
  function animarIconoCarrito() {

    const mobile = document.getElementById("btnCarrito");
    const desktop = document.getElementById("btnCarritoDesktop");

    [mobile, desktop].forEach(el => {
      if (!el) return;

      el.style.transform = "scale(1.1)";
      el.style.transition = "transform .2s ease";

      setTimeout(() => {
        el.style.transform = "scale(1)";
      }, 200);
    });
  }

  /* =============================
     SCROLL SUAVE A CATEGORÍAS
  ============================== */
  window.scrollToCategorias = function () {
    const el = document.getElementById("categorias");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

});

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
