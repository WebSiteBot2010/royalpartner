const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1499667459882618950/UaKNbU7cWE3_a5obc4fmYf-sPhrNlzrLK4cCI0MfDELrBe0ABJM8JqtN0ozUj_DPf3pB';
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      admins: [
        { email: 'gestore@support', password: 'gestore123', role: 'gestore', display_name: 'Gestore Support' },
        { email: 'admin@support', password: 'admin123', role: 'admin', display_name: 'Admin Support' },
        { email: 'moderazione@support', password: 'moderazione123', role: 'moderazione', display_name: 'Moderazione Support' },
        { email: 'partner@support', password: 'partner123', role: 'partner', display_name: 'Partner Support' }
      ],
      partner_applications: [],
      collaborator_applications: [],
      announcements: [
        {
          id: 1,
          title: 'Benvenuti su Royal Partner',
          content: 'Il sito ufficiale è online con tutte le pagine dedicate a staff, partner e collaboratori.',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'Novità: Admin Panel attivo',
          content: 'Il sistema ora supporta login role-based e gestione annunci / comunicazioni in tempo reale.',
          created_at: new Date().toISOString()
        }
      ],
      communications: [
        {
          id: 1,
          title: 'Comunicazione ufficiale',
          content: 'Royal Partner continua a crescere. Usa il pannello admin per gestire richieste e contenuti.',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'Aggiornamento sicurezza',
          content: 'Ricorda di usare credenziali al sicuro e di mantenere il progetto in una cartella protetta.',
          created_at: new Date().toISOString()
        }
      ],
      partner_logs: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Impossibile leggere data.json:', error.message);
    process.exit(1);
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let store = loadData();

function getNextId(collection) {
  return collection.length === 0 ? 1 : Math.max(...collection.map((item) => item.id)) + 1;
}

async function sendDiscordLog(message) {
  if (!WEBHOOK_URL) {
    console.log('[Discord webhook disabled]', message);
    return;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
  } catch (error) {
    console.error('Discord webhook error:', error.message);
  }
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richieste.' });
  }

  const admin = store.admins.find((item) => item.email === email && item.password === password);
  if (!admin) {
    return res.status(401).json({ error: 'Credenziali non valide.' });
  }

  res.json({ success: true, email: admin.email, role: admin.role, displayName: admin.display_name });
});

app.get('/api/annunci', (req, res) => {
  res.json(store.announcements.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.get('/api/comunicazioni', (req, res) => {
  res.json(store.communications.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.get('/api/applications', (req, res) => {
  const type = req.query.type === 'collaborator' ? 'collaborator' : 'partner';
  if (type === 'partner') {
    return res.json(store.partner_applications.slice().sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)));
  }
  res.json(store.collaborator_applications.slice().sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)));
});

app.post('/api/partner-applications', (req, res) => {
  const { name, website, contactEmail, description } = req.body || {};
  if (!name || !contactEmail || !description) {
    return res.status(400).json({ error: 'Nome, email di contatto e descrizione sono obbligatori.' });
  }

  const application = {
    id: getNextId(store.partner_applications),
    name,
    website: website || '',
    contact_email: contactEmail,
    description,
    status: 'pending',
    submitted_at: new Date().toISOString()
  };

  store.partner_applications.push(application);
  saveData(store);

  const message = `Nuova richiesta partner:\nNome: ${name}\nSito: ${website || 'N/A'}\nEmail: ${contactEmail}\nDescrizione: ${description}`;
  sendDiscordLog(message);

  res.json({ success: true, id: application.id });
});

app.post('/api/collaboratore-applications', (req, res) => {
  const { name, role, contactEmail, description } = req.body || {};
  if (!name || !role || !contactEmail || !description) {
    return res.status(400).json({ error: 'Nome, ruolo desiderato, email e descrizione sono obbligatori.' });
  }

  const application = {
    id: getNextId(store.collaborator_applications),
    name,
    role,
    contact_email: contactEmail,
    description,
    status: 'pending',
    submitted_at: new Date().toISOString()
  };

  store.collaborator_applications.push(application);
  saveData(store);
  res.json({ success: true });
});

app.post('/api/announcement', (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Titolo e contenuto obbligatori.' });
  }

  store.announcements.push({
    id: getNextId(store.announcements),
    title,
    content,
    created_at: new Date().toISOString()
  });
  saveData(store);
  res.json({ success: true });
});

app.post('/api/communication', (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Titolo e contenuto obbligatori.' });
  }

  store.communications.push({
    id: getNextId(store.communications),
    title,
    content,
    created_at: new Date().toISOString()
  });
  saveData(store);
  res.json({ success: true });
});

app.post('/api/application/accept', (req, res) => {
  const { id, type } = req.body || {};
  if (!id || !type) {
    return res.status(400).json({ error: 'Id e tipo applicazione richiesti.' });
  }

  if (type === 'partner') {
    const appIndex = store.partner_applications.findIndex((item) => item.id === Number(id));
    if (appIndex === -1) {
      return res.status(404).json({ error: 'Applicazione partner non trovata.' });
    }
    store.partner_applications[appIndex].status = 'accepted';
    store.partner_logs.push({
      id: getNextId(store.partner_logs),
      partner_id: Number(id),
      message: `Partner accettato: ${store.partner_applications[appIndex].name}`,
      created_at: new Date().toISOString()
    });
    saveData(store);
    sendDiscordLog(`Partner accettato: ${store.partner_applications[appIndex].name} (ID ${id})`);
    return res.json({ success: true });
  }

  if (type === 'collaborator') {
    const appIndex = store.collaborator_applications.findIndex((item) => item.id === Number(id));
    if (appIndex === -1) {
      return res.status(404).json({ error: 'Applicazione collaboratore non trovata.' });
    }
    store.collaborator_applications[appIndex].status = 'accepted';
    saveData(store);
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Tipo applicazione non valido.' });
});

app.get('/api/partner-logs', (req, res) => {
  const logs = store.partner_logs.map((log) => {
    const partner = store.partner_applications.find((item) => item.id === log.partner_id) || {};
    return { ...log, partner_name: partner.name || 'Unknown' };
  });
  res.json(logs.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.get('/api/admin/overview', (req, res) => {
  res.json({
    pendingPartners: store.partner_applications.filter((item) => item.status === 'pending').length,
    pendingCollaborators: store.collaborator_applications.filter((item) => item.status === 'pending').length,
    totalAnnouncements: store.announcements.length,
    totalCommunications: store.communications.length
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RoyalPartner server running on http://localhost:${PORT}`);
});
