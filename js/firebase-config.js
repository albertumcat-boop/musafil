// ─────────────────────────────────────────────
// js/firebase-config.js
// Credenciales de Firebase — Inmotex Musafil
// Si cambias de proyecto solo edita este archivo
// ─────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "AIzaSyCFqZgbpWsIaw_mEnry_6JC7Bt2Am6mW2k",
  authDomain:        "inmotex-musafil.firebaseapp.com",
  projectId:         "inmotex-musafil",
  storageBucket:     "inmotex-musafil.firebasestorage.app",
  messagingSenderId: "843593464291",
  appId:             "1:843593464291:web:609975952853e637e008d6"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();
