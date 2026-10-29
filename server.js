/* ============================================================
   MERCATINO DEL TORNIO — Server negozio (Node.js, zero dipendenze)
   ============================================================
   - Serve il sito statico
   - API per ordini, preventivi e contatti
   - Salva tutto in data/*.json
   - Invia email via Resend / webhook / SMTP (nodemailer opzionale)
   - Area admin con gestione prezzi

   Avvio:  node server.js
   Porta:  PORT (default 8080)

   Variabili d'ambiente (file .env opzionale):
     PORT=8080
     ADMIN_PASSWORD=...            (password area admin, default "admin123")
     RESEND_API_KEY=...            (per inviare email con Resend)
     EMAIL_FROM=...                (mittente, default "negozio@mercatinodeltornio.it")
     EMAIL_TO=...                  (destinatario ordini, default SHOP email)
     WEBHOOK_URL=...               (webhook a cui inoltrare ordini, es. Make/Zapier)
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const PORT = process.env.PORT || 8080;

/* ---------- Carica .env (semplice, senza dipendenze) ---------- */
(function loadEnv() {
  const envFile = path.join(ROOT, ".env");
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
})();

/* ---------- Helpers JSON ---------- */
function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  ensureData();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
function appendJSON(file, obj) {
  const list = readJSON(file, []);
  list.unshift(obj);
  writeJSON(file, list);
  return list.length;
}

/* ---------- Catalogo base (da js/products.js) ---------- */
let BASE_CATALOG = { categories: [], products: [] };
(function loadCatalog() {
  const src = fs.readFileSync(path.join(ROOT, "js", "products.js"), "utf8");
  const m = src.match(/window\.CATALOG\s*=\s*(\{.*\});?\s*$/s);
  if (m) BASE_CATALOG = JSON.parse(m[1]);
})();

function mergedCatalog() {
  const prices = readJSON("prices.json", {});
  const products = BASE_CATALOG.products.map((p) =>
    Object.prototype.hasOwnProperty.call(prices, p.id)
      ? { ...p, price: prices[p.id] }
      : p
  );
  return { categories: BASE_CATALOG.categories, products };
}

/* ---------- Invio notifiche (email / webhook) ---------- */
const SHOP_EMAIL = "meccanico.tornitore@gmail.com";
const EMAIL_FROM = process.env.EMAIL_FROM || "negozio@mercatinodeltornio.it";
const EMAIL_TO = process.env.EMAIL_TO || SHOP_EMAIL;

function htmlEsc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function orderToHtml(o) {
  const rows = (o.articoli || [])
    .map((a) => `<tr><td>${htmlEsc(a.titolo || a.id)}</td><td>${a.qty}</td><td>${a.prezzo != null ? a.prezzo.toLocaleString("it-IT") + " €" : "su richiesta"}</td></tr>`)
    .join("");
  return `
    <h2>Nuovo ordine ricevuto</h2>
    <p><b>Data:</b> ${htmlEsc(o.data)}</p>
    <p><b>Nome:</b> ${htmlEsc(o.cliente?.nome)}<br>
    <b>Email:</b> ${htmlEsc(o.cliente?.email)}<br>
    <b>Telefono:</b> ${htmlEsc(o.cliente?.telefono)}</p>
    <p><b>Note:</b> ${htmlEsc(o.cliente?.note || "—")}</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><th>Articolo</th><th>Qtà</th><th>Prezzo</th></tr>${rows}
    </table>`;
}
function quoteToHtml(q) {
  return `<h2>Richiesta preventivo</h2>
    <p><b>Articolo:</b> ${htmlEsc(q.articolo?.titolo || q.articolo?.id)}<br>
    <b>Nome:</b> ${htmlEsc(q.nome)}<br><b>Email:</b> ${htmlEsc(q.email)}<br><b>Telefono:</b> ${htmlEsc(q.telefono)}</p>
    <p><b>Note:</b> ${htmlEsc(q.note || "—")}</p>`;
}
function contactToHtml(c) {
  return `<h2>Messaggio dal sito</h2><p><b>Nome:</b> ${htmlEsc(c.nome)}<br><b>Email:</b> ${htmlEsc(c.email)}</p><p>${htmlEsc(c.messaggio)}</p>`;
}

async function sendEmail(subject, html) {
  // 1) Resend (https://resend.com) — HTTP API, nessuna dipendenza
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.RESEND_API_KEY },
      body: JSON.stringify({ from: "Mercatino del Tornio <" + EMAIL_FROM + ">", to: [EMAIL_TO], subject, html }),
    });
    if (!res.ok) throw new Error("Resend: " + res.status + " " + (await res.text()));
    return "resend";
  }
  // 2) Webhook generico (Make, Zapier, n8n, ...)
  if (process.env.WEBHOOK_URL) {
    const res = await fetch(process.env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, html }),
    });
    if (!res.ok) throw new Error("Webhook: " + res.status);
    return "webhook";
  }
  // 3) SMTP via nodemailer (solo se installato: npm i nodemailer)
  if (process.env.SMTP_HOST) {
    let nodemailer;
    try { nodemailer = require("nodemailer"); } catch { throw new Error("SMTP richiede nodemailer: esegui npm install"); }
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "1",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await t.sendMail({ from: EMAIL_FROM, to: EMAIL_TO, subject, html });
    return "smtp";
  }
  return null; // nessun canale configurato
}

/* ---------- Auth admin (semplice token in memoria) ---------- */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const tokens = new Set();
function checkAuth(req) {
  const h = req.headers["authorization"] || "";
  return tokens.has(h.replace(/^Bearer\s+/i, ""));
}

/* ---------- Server HTTP ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) { reject(new Error("body troppo grande")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error("JSON non valido")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const method = req.method;

  try {
    /* ---------- API ---------- */
    if (url.startsWith("/api/")) {
      cors(res);
      if (method === "OPTIONS") { res.writeHead(204); return res.end(); }

      if (method === "GET" && url === "/api/health") return json(res, 200, { ok: true, time: new Date().toISOString() });

      if (method === "GET" && url === "/api/catalog") return json(res, 200, mergedCatalog());

      if (method === "POST" && url === "/api/orders") {
        const o = await readBody(req);
        if (!o || !o.cliente || !o.cliente.email) return json(res, 400, { ok: false, error: "Dati mancanti" });
        o.data = o.data || new Date().toISOString();
        o.numero = "ORD-" + Date.now();
        appendJSON("orders.json", o);
        let via = null;
        try { via = await sendEmail("🛒 " + o.numero + " — Nuovo ordine", orderToHtml(o)); }
        catch (e) { console.error("Email non inviata:", e.message); }
        console.log("Nuovo ordine salvato:", o.numero, "via", via || "file");
        return json(res, 200, { ok: true, id: o.numero });
      }

      if (method === "POST" && url === "/api/quotes") {
        const q = await readBody(req);
        if (!q || !q.email) return json(res, 400, { ok: false, error: "Email mancante" });
        q.data = q.data || new Date().toISOString();
        appendJSON("quotes.json", q);
        let via = null;
        try { via = await sendEmail("📐 Richiesta preventivo", quoteToHtml(q)); }
        catch (e) { console.error("Email non inviata:", e.message); }
        return json(res, 200, { ok: true, via });
      }

      if (method === "POST" && url === "/api/contact") {
        const c = await readBody(req);
        if (!c || !c.email || !c.messaggio) return json(res, 400, { ok: false, error: "Dati mancanti" });
        c.data = c.data || new Date().toISOString();
        appendJSON("contacts.json", c);
        let via = null;
        try { via = await sendEmail("✉️ Messaggio dal sito", contactToHtml(c)); }
        catch (e) { console.error("Email non inviata:", e.message); }
        return json(res, 200, { ok: true, via });
      }

      if (method === "POST" && url === "/api/admin/login") {
        const b = await readBody(req);
        if (b.password !== ADMIN_PASSWORD) return json(res, 401, { ok: false, error: "Password errata" });
        const token = crypto.randomBytes(24).toString("hex");
        tokens.add(token);
        return json(res, 200, { ok: true, token });
      }

      /* --- rotte admin protette --- */
      if (!checkAuth(req)) return json(res, 401, { ok: false, error: "Non autorizzato" });

      if (method === "GET" && url === "/api/admin/orders") return json(res, 200, readJSON("orders.json", []));
      if (method === "GET" && url === "/api/admin/quotes") return json(res, 200, readJSON("quotes.json", []));
      if (method === "GET" && url === "/api/admin/contacts") return json(res, 200, readJSON("contacts.json", []));
      if (method === "GET" && url === "/api/admin/prices") return json(res, 200, readJSON("prices.json", {}));

      if (method === "POST" && url === "/api/admin/prices") {
        const b = await readBody(req);
        const incoming = b.prices || {};
        // salva solo le differenze rispetto al catalogo base
        const overrides = {};
        for (const p of BASE_CATALOG.products) {
          if (Object.prototype.hasOwnProperty.call(incoming, p.id)) {
            const v = incoming[p.id];
            if ((v == null && p.price != null) || (v != null && v !== p.price)) overrides[p.id] = v;
          }
        }
        writeJSON("prices.json", overrides);
        return json(res, 200, { ok: true, modificati: Object.keys(overrides).length });
      }

      return json(res, 404, { ok: false, error: "API non trovata" });
    }

    /* ---------- File statici ---------- */
    let fileUrl = url === "/" ? "/index.html" : url;
    const filePath = path.normalize(path.join(ROOT, fileUrl));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        return res.end('<h1>404</h1><p>Pagina non trovata</p><a href="/">Torna alla home</a>');
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  } catch (e) {
    if (!res.headersSent) json(res, 500, { ok: false, error: e.message });
  }
});

server.listen(PORT, () => {
  console.log("🛠️  Mercatino del Tornio online → http://localhost:" + PORT);
  console.log("   Admin: http://localhost:" + PORT + "/admin.html");
});
