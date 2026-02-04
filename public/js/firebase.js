import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configuración de Firebase (la que te dio Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDEfGdlBStoWgTRA5szQz908-Mmj229MTs",
  authDomain: "catalogo-peek-shop.firebaseapp.com",
  projectId: "catalogo-peek-shop",
  storageBucket: "catalogo-peek-shop.firebasestorage.app",
  messagingSenderId: "751626538167",
  appId: "1:751626538167:web:9327f5c0e6072824a25132"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// 🔐 Auth (LO QUE SÍ USAMOS)
export const auth = getAuth(app);
