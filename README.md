# 🛠️ Mercatino del Tornio — E-commerce utensileria industriale

Sito e-commerce per la vendita di utensileria industriale usata e ricondizionata.
**887 prodotti** organizzati in **8 categorie**, con foto caricate da Google Drive.

## Pagine

| Pagina | Descrizione |
|---|---|
| `index.html` | Home: hero, categorie, prodotti in evidenza, contatti + form |
| `prodotti.html` | Catalogo con filtri, ricerca e ordinamento |
| `prodotto.html?id=pXX` | Scheda prodotto con articoli correlati |
| `carrello.html` | Carrello + invio ordine |
| `admin.html` | Area riservata: ordini, preventivi, messaggi, gestione prezzi |

## Come avviare in locale

```bash
cd negozio
node server.js
```

Apri `http://localhost:8080`.

> Non serve installare nulla: il server usa solo Node.js (≥ 18) senza dipendenze.

## Configurazione (importante)

1. **Dati del negozio** — modifica `js/config.js`:
   - telefono, email, indirizzo, WhatsApp, P.IVA.

2. **Password admin** — copia `.env.example` in `.env` e imposta `ADMIN_PASSWORD`.
   L'area admin è su `/admin.html` (password di default: `admin123`).

3. **Email degli ordini** — scegli uno dei 3 metodi in `.env`:
   - **Resend** (consigliato, gratuito): `RESEND_API_KEY`
   - **Webhook** (Make/Zapier/n8n): `WEBHOOK_URL`
   - **SMTP**: richiede `npm install` (nodemailer)

   Se nessun metodo è configurato, ordini/preventivi/messaggi vengono comunque
   salvati in `data/*.json` e visibili nell'admin.

## Pubblicare online

### Opzione A — Render.com (consigliata, backend + email inclusi)
1. Crea un repository GitHub con la cartella `negozio`.
2. Su [render.com](https://render.com) → **New → Blueprint** → seleziona il repo.
   (il file `render.yaml` è già pronto)
3. Imposta le variabili d'ambiente (`ADMIN_PASSWORD`, `RESEND_API_KEY`…).

> ⚠️ Sul piano gratuito di Render il filesystem è temporaneo: i file in `data/`
> possono azzerarsi a ogni riavvio. Per non perdere gli ordini, configura **Resend**
> (o un webhook): ogni ordine/preventivo viene così inviato via email in tempo reale.

### Opzione B — Solo frontend statico (senza backend)
Il sito funziona anche da solo (carrello e ordini in localStorage).
- **Netlify / Vercel / GitHub Pages**: carica la cartella `negozio`, imposta la
  directory di build come root. Le API non saranno disponibili, ma il catalogo sì.
- Per collegare il backend pubblicato altrove, imposta in `js/config.js`:
  `apiBase: "https://tuo-backend.onrender.com"`.

## Dati

- Catalogo base: `js/products.js` (generato automaticamente da Google Drive).
- Prezzi personalizzati: salvati in `data/prices.json` dall'admin (non toccano il file base).
- Ordini/preventivi/messaggi: `data/orders.json`, `data/quotes.json`, `data/contacts.json`.

## Modifica prezzi

1. Vai su `/admin.html` → tab **Prezzi**.
2. Cerca l'articolo, inserisci il prezzo (lascia vuoto = "su richiesta").
3. Clicca **Salva prezzi**.
