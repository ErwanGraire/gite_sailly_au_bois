// Importation de Firebase depuis les serveurs officiels (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Ta configuration Firebase (La "clé" de ta base de données)
const firebaseConfig = {
  apiKey: "AIzaSyAnpeURRQ6268bj1AhWsAS6wh5eg02n1HI",
  authDomain: "gite-sailly-au-bois.firebaseapp.com",
  projectId: "gite-sailly-au-bois",
  storageBucket: "gite-sailly-au-bois.firebasestorage.app",
  messagingSenderId: "804129214683",
  appId: "1:804129214683:web:d8e457877927cf0b69fcfe",
  measurementId: "G-JPZ0P95DZ6"
};

// Initialisation
const app = initializeApp(firebaseConfig);

// Exportation des outils d'Authentification et de Base de données pour les autres fichiers
export const auth = getAuth(app);
export const db = getFirestore(app);