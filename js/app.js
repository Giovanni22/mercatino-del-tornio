/* ============================================================
   MERCATINO DEL TORNIO — logica condivisa
   ============================================================ */
const SHOP_NAME = window.SHOP_CONFIG?.name || "Mercatino del Tornio";
const CFG = window.SHOP_CONFIG || {};

/* ---------- Caricamento catalogo (API con fallback su products.js) ---------- */
window.__initCatalog = (() => {
  let p = null;
  return function () {
    if (!p) {
      p = (async () => {
        try {
          const res = await fetch(window.API_BASE + "/api/catalog");
          if (res.ok) {
            const c = await res.json();
            if (c && c.products && c.products.length) window.CATALOG = c;
          }
        } catch (e) { /* offline/statico: usa products.js */ }
        return window.CATALOG;
      })();
    }
    return p;
  };
})();

/* ---------- Header ---------- */
function renderHeader(active) {
  const el = document.getElementById("header");
  if (!el) return;
  el.innerHTML = `
    <div class="container header__top">
      <a class="logo" href="index.html">
        <span class="logo__badge">🛠️</span>
        <span>${SHOP_NAME}</span>
      </a>
      <nav class="nav">
        <a href="index.html" class="${active === "home" ? "active" : ""}">Home</a>
        <a href="prodotti.html" class="${active === "prodotti" ? "active" : ""}">Prodotti</a>
        <a href="index.html#contatti" class="${active === "contatti" ? "active" : ""}">Contatti</a>
      </nav>
      <div class="header__actions">
        ${CFG.phone ? `<a class="header__phone" href="tel:${esc(CFG.phoneLink)}">📞 <span>${esc(CFG.phone)}</span></a>` : ""}
        <a class="cart-btn" href="carrello.html">
          <span>🛒</span> <span class="cart-btn__label">Carrello</span>
          <span class="cart-btn__count" id="cart-count">0</span>
        </a>
      </div>
    </div>`;
  updateCartBadge();
}

/* ---------- Carrello (localStorage) ---------- */
function getCart() {
  try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}
function cartCount() {
  return getCart().reduce((s, i) => s + (i.qty || 1), 0);
}
function updateCartBadge() {
  const b = document.getElementById("cart-count");
  if (b) b.textContent = cartCount();
}
function addToCart(id, qty = 1) {
  const cart = getCart();
  const found = cart.find((i) => i.id === id);
  if (found) found.qty += qty;
  else cart.push({ id, qty });
  saveCart(cart);
  toast("Aggiunto al carrello ✓");
}
function setQty(id, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart(cart);
  }
}
function removeFromCart(id) {
  saveCart(getCart().filter((i) => i.id !== id));
}

/* ---------- Helper ---------- */
function fmtPrice(p) {
  if (p == null) return null;
  return p.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}
function productById(id) {
  return (window.CATALOG?.products || []).find((p) => p.id === id);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function imgTag(src, alt) {
  const fallback = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#eef1f5" width="400" height="300"/><text x="50%" y="50%" font-size="18" fill="#9aa5b3" text-anchor="middle" font-family="sans-serif">Foto</text></svg>'
  );
  return `<img src="${src}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">`;
}

/* ---------- Card prodotto ---------- */
function productCard(p) {
  const price = fmtPrice(p.price);
  const priceHtml = price
    ? `<div class="product-card__price">${price}</div>`
    : `<div class="product-card__price surichiesta">Prezzo su richiesta</div>`;
  const btn = price
    ? `<button class="btn btn--small btn--cart" onclick="addToCart('${p.id}')">Aggiungi</button>`
    : `<button class="btn btn--small btn--richiesta" onclick="requestQuote('${p.id}')">Preventivo</button>`;
  return `
    <article class="product-card">
      <a class="product-card__img" href="prodotto.html?id=${p.id}">
        <span class="product-card__tag">${esc(p.subcategory || p.category)}</span>
        ${imgTag(p.img, p.title)}
      </a>
      <div class="product-card__body">
        <div class="product-card__cat">${esc(p.category)}</div>
        <h3><a href="prodotto.html?id=${p.id}">${esc(p.title)}</a></h3>
        ${priceHtml}
        <div class="product-card__foot">
          ${btn}
          <a class="btn btn--small btn--ghost btn--detail" href="prodotto.html?id=${p.id}" title="Scheda prodotto">Scheda →</a>
        </div>
      </div>
    </article>`;
}

/* ---------- Toast ---------- */
function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--scuro);color:#fff;padding:.8rem 1.4rem;border-radius:12px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.3);transition:.3s;opacity:0;z-index:999;max-width:90vw;text-align:center;";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateX(-50%) translateY(0)"; });
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(20px)";
  }, 2200);
}

/* ---------- API / invio dati (con fallback locale) ---------- */
async function postJSON(path, payload) {
  const res = await fetch(window.API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "Errore " + res.status;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function placeOrder(ordine) {
  try {
    await postJSON("/api/orders", ordine);
    return { ok: true, mode: "server" };
  } catch (e) {
    // fallback: salva in locale (nessun backend raggiungibile)
    const ordini = JSON.parse(localStorage.getItem("ordini") || "[]");
    ordini.unshift(ordine);
    localStorage.setItem("ordini", JSON.stringify(ordini));
    return { ok: true, mode: "local" };
  }
}

async function sendQuote(q) {
  try { return await postJSON("/api/quotes", q); }
  catch { const list = JSON.parse(localStorage.getItem("preventivi") || "[]"); list.unshift(q); localStorage.setItem("preventivi", JSON.stringify(list)); return { ok: true, mode: "local" }; }
}

async function sendContact(c) {
  try { return await postJSON("/api/contact", c); }
  catch { const list = JSON.parse(localStorage.getItem("messaggi") || "[]"); list.unshift(c); localStorage.setItem("messaggi", JSON.stringify(list)); return { ok: true, mode: "local" }; }
}

/* ---------- Modale richiesta preventivo ---------- */
function requestQuote(id) {
  const p = productById(id);
  if (!p) return;
  let m = document.getElementById("modal");
  if (!m) {
    m = document.createElement("div");
    m.id = "modal";
    document.body.appendChild(m);
  }
  m.style.cssText = "position:fixed;inset:0;background:rgba(10,16,25,.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:1.2rem;";
  m.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <h3>Richiedi preventivo</h3>
      <p class="modal-sub">${esc(p.title)}</p>
      <form onsubmit="submitQuoteForm(event, '${p.id}')">
        <div class="form-group"><label>Nome e cognome *</label><input required name="nome"></div>
        <div class="form-group"><label>Email *</label><input type="email" required name="email"></div>
        <div class="form-group"><label>Telefono</label><input name="telefono"></div>
        <div class="form-group"><label>Note</label><textarea rows="3" name="note"></textarea></div>
        <button class="btn btn--accento btn--block" type="submit">Invia richiesta</button>
      </form>
    </div>`;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
}
function closeModal() {
  const m = document.getElementById("modal");
  if (m) m.remove();
}
async function submitQuoteForm(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  const p = productById(id);
  const q = {
    data: new Date().toISOString(),
    articolo: { id, titolo: p?.title, prezzo: p?.price ?? null },
    nome: f.get("nome"), email: f.get("email"), telefono: f.get("telefono"), note: f.get("note"),
  };
  const r = await sendQuote(q);
  closeModal();
  toast(r.mode === "server" ? "Preventivo inviato ✓ Ti ricontatteremo" : "Richiesta salvata in locale (offline)");
}

/* ---------- Lightbox / scheda ---------- */
function viewProduct(id) { location.href = "prodotto.html?id=" + id; }

/* ---------- Anno dinamico ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-year").forEach((el) => (el.textContent = new Date().getFullYear()));
});
