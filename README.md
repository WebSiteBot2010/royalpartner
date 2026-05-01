# RoyalPartner

Questo progetto contiene il sito ufficiale di Royal Partner con:

- Pagina Home
- Chi Siamo
- Servizi Offerti
- Diventa Partner con form e log partner
- Diventa Collaboratore
- Annunci in tempo reale
- Comunicazioni ufficiali in tempo reale
- Admin Panel con accesso role-based per 4 ruoli diversi

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

- `gestore@support` / `gestore123`
- `admin@support` / `admin123`
- `moderazione@support` / `moderazione123`
- `partner@support` / `partner123`

## Note

- Il backend locale usa `server.js` e `data.json` per sviluppo.
- Su Vercel il progetto usa `api/[...path].js` come serverless API, con lo stesso comportamento dei percorsi `/api/*`.
- Se imposti `DISCORD_WEBHOOK_URL`, il backend invierà le notifiche delle nuove richieste partner su Discord.
- La visualizzazione delle pagine è gestita tramite hash routing in `js/app.js`.
- Su Vercel la preview viene aggiornata automaticamente ad ogni deploy/preview branch.
