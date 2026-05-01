# RoyalPartner

Questo progetto contiene il sito ufficiale di Royal Partner con:

- Pagina Home
- Chi Siamo
- Servizi Offerti
- Diventa Partner con form e log partner
- Diventa Collaboratore
- Annunci in tempo reale
- Comunicazioni ufficiali in tempo reale
- Admin Panel con 4 ruoli separati e pagine dedicate:
  - `adminpanelgestore.html` - Gestore (accesso completo)
  - `adminpaneladmin.html` - Admin (partner e collaboratori)
  - `adminpanelmoderazione.html` - Moderazione (annunci e comunicazioni)
  - `adminpanelpartner.html` - Partner (partner e log)
- Pagine pubbliche: `requestpartner.html`, `requestcollab.html`, `annunci.html`, `comunicazioni.html`

## File principali

- `index.html` — interfaccia principale del sito
- `css/style.css` — stili personalizzati
- `js/app.js` — logica client-side per routing, modali e admin
- `server.js` — backend Express locale
- `api/[...path].js` — backend serverless per Vercel
- `package.json` — dipendenze e script
- `.env.example` — esempio di configurazione webhook Discord

## Installazione e avvio

1. Copia il file di esempio:

```bash
cp .env.example .env
```

2. Modifica `.env` solo se vuoi usare un webhook Discord diverso.

3. Installa le dipendenze:

```bash
npm install
```

4. Avvia il server:

```bash
npm start
```

5. Apri il sito su:

```text
http://localhost:3000
```

## Credenziali admin di prova

Ogni ruolo ha accesso solo alle proprie pagine admin dedicate:

- **gestore@support** / `gestore123` → `adminpanelgestore.html` (tutto: partner, collaboratori, annunci, comunicazioni, log)
- **admin@support** / `admin123` → `adminpaneladmin.html` (partner e collaboratori)
- **moderazione@support** / `moderazione123` → `adminpanelmoderazione.html` (annunci e comunicazioni)
- **partner@support** / `partner123` → `adminpanelpartner.html` (partner e log)

Ogni pagina admin verifica automaticamente il ruolo corretto e mostra "Accesso negato" se si usa un'email sbagliata.

## Deploy su Vercel

Il sito è configurato per il deploy automatico su Vercel:

1. Connetti il repository GitHub a Vercel
2. Aggiungi la variabile d'ambiente `DISCORD_WEBHOOK_URL` nel dashboard Vercel
3. Il deploy avviene automaticamente ad ogni push

Il sito sarà disponibile su `https://royalpartner.vercel.app`

### File di configurazione Vercel

- `vercel.json` — configurazione routing per API serverless
- `api/[...path].js` — backend serverless per Vercel

## Note

- Il backend locale usa `server.js` e `data.json` per sviluppo.
- Su Vercel il progetto usa `api/[...path].js` come serverless API, con lo stesso comportamento dei percorsi `/api/*`.
- Se imposti `DISCORD_WEBHOOK_URL`, il backend invierà le notifiche delle nuove richieste partner su Discord.
- La visualizzazione delle pagine è gestita tramite hash routing in `js/app.js`.
- Su Vercel la preview viene aggiornata automaticamente ad ogni deploy/preview branch.
