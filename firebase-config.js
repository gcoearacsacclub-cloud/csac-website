import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEJWW3bt8GrLJSTADi8LXYCuTZfvtH-z0",
  authDomain: "csac-website-ac5e0.firebaseapp.com",
  projectId: "csac-website-ac5e0",
  storageBucket: "csac-website-ac5e0.firebasestorage.app",
  messagingSenderId: "158901367805",
  appId: "1:158901367805:web:064520d31b2a22ad3b9f94",
  measurementId: "G-PR5Z8BSL2P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
