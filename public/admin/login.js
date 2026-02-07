import { auth } from "../js/firebase.js";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ------------------ DOM ------------------ */
const btnLogin = document.getElementById("btnLogin");
const error = document.getElementById("error");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

/* ------------------ OJO ------------------ */
const togglePassword = document.getElementById("togglePassword");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");

togglePassword.addEventListener("click", () => {
  const visible = passwordInput.type === "text";
  passwordInput.type = visible ? "password" : "text";
  eyeOpen.classList.toggle("hidden", !visible);
  eyeClosed.classList.toggle("hidden", visible);
});

/* ------------------ LOGIN ------------------ */
btnLogin.addEventListener("click", async () => {
  error.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    error.textContent = "Completa todos los campos";
    return;
  }

  try {
    console.log("🔐 Intentando login:", email);

    // 🔒 Persistencia Firebase
    await setPersistence(auth, browserLocalPersistence);

    // 🔐 Login Firebase
    await signInWithEmailAndPassword(auth, email, password);

    console.log("✅ Login Firebase OK");

    // 🚀 ENTRAR DIRECTO AL ADMIN
   // 🔑 Marcar sesión como admin
sessionStorage.setItem("modo_admin", "1");

// 🚀 ENTRAR DIRECTO AL ADMIN
window.location.replace("catalogo.html");
    

  } catch (e) {
    console.error("❌ Error Login:", e);

    switch (e.code) {
      case "auth/user-not-found":
        error.textContent = "El usuario no existe";
        break;
      case "auth/wrong-password":
        error.textContent = "Contraseña incorrecta";
        break;
      case "auth/invalid-email":
        error.textContent = "Correo inválido";
        break;
      case "auth/too-many-requests":
        error.textContent = "Demasiados intentos, intenta más tarde";
        break;
      default:
        error.textContent = "No se pudo iniciar sesión";
    }
  }
});
