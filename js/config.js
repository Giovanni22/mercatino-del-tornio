/* ============================================================
   MERCATINO DEL TORNIO — Configurazione negozio
   ============================================================
   MODIFICA QUI i dati del tuo negozio (telefono, email, indirizzo).
   Questi valori vengono usati su tutte le pagine del sito.
   ============================================================ */
window.SHOP_CONFIG = {
  name: "Mercatino del Tornio",
  tagline: "Utensileria industriale",

  // --- Contatti reali: sostituisci con i tuoi dati ---
  phone: "+39 329 963 6004",        // es. "+39 333 123 4567"
  email: "meccanico.tornitore@gmail.com", // es. "mio@email.it"
  address: "Italia",
  whatsapp: "393299636004",        // es. "393331234567" (solo cifre, senza +)

  // --- Backend ---
  // Se il frontend è pubblicato su un dominio diverso dal backend,
  // metti qui l'URL completo del backend (es. "https://mio-backend.onrender.com").
  // Se è lo stesso dominio, lascia vuoto "".
  apiBase: ""
};

window.API_BASE = window.SHOP_CONFIG.apiBase || "";

/* Testo contatti usato nel piè di pagina e nelle pagine */
window.SHOP_CONFIG.phoneLink = window.SHOP_CONFIG.phone.replace(/[^+\d]/g, "");
window.SHOP_CONFIG.whatsappLink = window.SHOP_CONFIG.whatsapp
  ? "https://wa.me/" + window.SHOP_CONFIG.whatsapp
  : "";
