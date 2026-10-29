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
function toast(msg, link) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--scuro);color:#fff;padding:.8rem 1.4rem;border-radius:12px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.3);transition:.3s;opacity:0;z-index:999;max-width:90vw;text-align:center;";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  if (link) {
    const a = document.createElement("a");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "💬 Apri WhatsApp";
    a.style.cssText = "display:inline-block;margin-left:.6rem;color:#ffcf5c;text-decoration:underline;font-weight:800;";
    t.appendChild(a);
  }
  requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateX(-50%) translateY(0)"; });
  clearTimeout(t._t);
  t._t = setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(20px)";
  }, link ? 9000 : 2200);
}

/* ---------- API / invio dati (con fallback locale) ---------- */
const API_TIMEOUT_MS = 15000;

/* URL completo dell'API. Restituisce null se il sito è aperto come file
   locale (file://) senza backend: in quel caso l'API non può esistere. */
function apiUrl(path) {
  if (!window.API_BASE && location.protocol === "file:") return null;
  return (window.API_BASE || "") + path;
}

async function postJSON(path, payload, { retries = 1 } = {}) {
  const url = apiUrl(path);
  if (!url) {
    const e = new Error("Sito aperto come file locale: backend non disponibile");
    e.noBackend = true;
    throw e;
  }
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        let msg = "Errore " + res.status;
        try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } catch (e) {
      /* errori di rete / server spento (Render si "sveglia" in ~30s): riprovo una volta */
      const network = e.noBackend || e.name === "AbortError" || e instanceof TypeError;
      if (network && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

/* Link WhatsApp con il riepilogo: usato se il server non è raggiungibile
   così l'ordine non va perso. */
function whatsappSummaryLink(titolo, righe) {
  const num = window.SHOP_CONFIG && window.SHOP_CONFIG.whatsapp;
  if (!num) return "";
  const text = [titolo, ...righe].filter(Boolean).join("\n");
  return "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
}

/* Apre la chat WhatsApp con il messaggio già scritto.
   Nota: l'invio vero e proprio lo fa il cliente premendo “Invia”. */
function openWhatsApp(titolo, righe) {
  const url = whatsappSummaryLink(titolo, righe);
  if (!url) return false;
  const w = window.open(url, "_blank");
  if (!w) location.href = url;
  return true;
}

function orderLines(ordine) {
  const art = (ordine.articoli || []).map(
    (a) => `• ${a.titolo || a.id} × ${a.qty}${a.prezzo != null ? " — " + a.prezzo + " €" : " — su richiesta"}`
  );
  const c = ordine.cliente || {};
  return [
    ...art,
    "",
    "Nome: " + (c.nome || "-"),
    "Email: " + (c.email || "-"),
    c.telefono ? "Telefono: " + c.telefono : "",
    (c.note || c.indirizzo) ? "Note: " + (c.note || c.indirizzo) : "",
  ].filter(Boolean);
}

async function placeOrder(ordine) {
  try {
    const r = await postJSON("/api/orders", ordine);
    return { ok: true, mode: "server", id: r.id };
  } catch (e) {
    if (e.status) return { ok: false, mode: "server-error", message: e.message };
    // fallback: salva in locale (nessun backend raggiungibile)
    const ordini = JSON.parse(localStorage.getItem("ordini") || "[]");
    ordini.unshift(ordine);
    localStorage.setItem("ordini", JSON.stringify(ordini));
    return {
      ok: true,
      mode: "local",
      noBackend: !!e.noBackend,
      waLink: whatsappSummaryLink("Nuovo ordine dal sito", orderLines(ordine)),
    };
  }
}

async function sendQuote(q) {
  try {
    const r = await postJSON("/api/quotes", q);
    return { ok: true, mode: "server", via: r.via };
  } catch (e) {
    if (e.status) return { ok: false, mode: "server-error", message: e.message };
    const list = JSON.parse(localStorage.getItem("preventivi") || "[]");
    list.unshift(q);
    localStorage.setItem("preventivi", JSON.stringify(list));
    return {
      ok: true,
      mode: "local",
      noBackend: !!e.noBackend,
      waLink: whatsappSummaryLink(
        "Richiesta preventivo dal sito",
        [q.articolo ? `• ${q.articolo.titolo || q.articolo.id}` : "", "Nome: " + (q.nome || "-"), q.telefono ? "Telefono: " + q.telefono : "", q.note ? "Note: " + q.note : ""].filter(Boolean)
      ),
    };
  }
}

async function sendContact(c) {
  try {
    const r = await postJSON("/api/contact", c);
    return { ok: true, mode: "server", via: r.via };
  } catch (e) {
    if (e.status) return { ok: false, mode: "server-error", message: e.message };
    const list = JSON.parse(localStorage.getItem("messaggi") || "[]");
    list.unshift(c);
    localStorage.setItem("messaggi", JSON.stringify(list));
    return {
      ok: true,
      mode: "local",
      noBackend: !!e.noBackend,
      waLink: whatsappSummaryLink("Messaggio dal sito", ["Nome: " + (c.nome || "-"), "Email: " + (c.email || "-"), c.telefono ? "Telefono: " + c.telefono : "", c.messaggio || c.note || ""].filter(Boolean)),
    };
  }
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
        <div class="form-group"><label>Telefono / WhatsApp *</label><input required name="telefono" inputmode="tel" placeholder="es. 329 963 6004"></div>
        <div class="form-group"><label>Messaggio</label><textarea rows="3" name="note" placeholder="Misure, quantità, spedizione…"></textarea></div>
        <button class="btn btn--accento btn--block" type="submit">Invia richiesta</button>
        ${window.SHOP_CONFIG.whatsappLink ? `<a class="btn btn--ghost btn--block" style="margin-top:.6rem" href="${esc(window.SHOP_CONFIG.whatsappLink)}?text=${encodeURIComponent("Salve, sono interessato a: " + p.title)}" target="_blank" rel="noopener">💬 Oppure scrivi su WhatsApp</a>` : ""}
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
    nome: f.get("nome"), telefono: f.get("telefono"), note: f.get("note"),
  };

  /* 1) apre subito WhatsApp con la richiesta già scritta (il cliente preme "Invia") */
  const openedWa = openWhatsApp("Richiesta preventivo dal sito", [
    `Articolo: ${p?.title || id}`,
    `Codice: ${id}`,
    p?.price != null ? `Prezzo indicato: ${p.price} €` : "Prezzo: su richiesta",
    "",
    `Nome: ${q.nome || "-"}`,
    `Telefono: ${q.telefono || "-"}`,
    q.note ? `Note: ${q.note}` : "",
  ].filter(Boolean));
  closeModal();

  /* 2) in parallelo salva la richiesta nell'area riservata (admin) */
  const r = await sendQuote(q);
  if (openedWa) {
    if (r.mode === "server") toast("✓ WhatsApp aperto: premi “Invia” nella chat. Richiesta registrata in area riservata.");
    else if (r.mode === "local") toast("✓ WhatsApp aperto: premi “Invia”. (Server offline: richiesta salvata solo su questo dispositivo)");
    else toast("✓ WhatsApp aperto: premi “Invia”. Salvataggio in area riservata fallito: " + (r.message || "errore"));
  } else {
    if (r.mode === "server") toast("Richiesta inviata ✓ Ti ricontatteremo");
    else if (r.mode === "local") toast("⚠️ Server non raggiungibile: richiesta salvata solo su questo dispositivo.", r.waLink);
    else toast("❗ Invio non riuscito: " + (r.message || "errore") + ". Riprova o scrivici su WhatsApp.", window.SHOP_CONFIG.whatsappLink);
  }
}

/* ---------- Lightbox / scheda ---------- */
function viewProduct(id) { location.href = "prodotto.html?id=" + id; }

/* ---------- Anno dinamico ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-year").forEach((el) => (el.textContent = new Date().getFullYear()));
});
