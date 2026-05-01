const dotenv = require('dotenv');

dotenv.config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1499667459882618950/UaKNbU7cWE3_a5obc4fmYf-sPhrNlzrLK4cCI0MfDELrBe0ABJM8JqtN0ozUj_DPf3pB';

const initialStore = {
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

let store = JSON.parse(JSON.stringify(initialStore));

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

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

function respond(res, status, payload) {
  res.writeHead(status, { ...defaultHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.replace(/^\/api/, '') || '/';
  const query = url.searchParams;

  try {
    if (req.method === 'POST' && route === '/login') {
      const { email, password } = await parseJsonBody(req);
      if (!email || !password) {
        return respond(res, 400, { error: 'Email e password richieste.' });
      }

      const admin = store.admins.find((item) => item.email === email && item.password === password);
      if (!admin) {
        return respond(res, 401, { error: 'Credenziali non valide.' });
      }

      return respond(res, 200, { success: true, email: admin.email, role: admin.role, displayName: admin.display_name });
    }

    if (req.method === 'GET' && route === '/annunci') {
      return respond(res, 200, store.announcements.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }

    if (req.method === 'GET' && route === '/comunicazioni') {
      return respond(res, 200, store.communications.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }

    if (req.method === 'GET' && route === '/applications') {
      const type = query.get('type') === 'collaborator' ? 'collaborator' : 'partner';
      if (type === 'partner') {
        return respond(res, 200, store.partner_applications.slice().sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)));
      }
      return respond(res, 200, store.collaborator_applications.slice().sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)));
    }

    if (req.method === 'POST' && route === '/partner-applications') {
      const { name, website, contactEmail, description } = await parseJsonBody(req);
      if (!name || !contactEmail || !description) {
        return respond(res, 400, { error: 'Nome, email di contatto e descrizione sono obbligatori.' });
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
      const message = `Nuova richiesta partner:\nNome: ${name}\nSito: ${website || 'N/A'}\nEmail: ${contactEmail}\nDescrizione: ${description}`;
      sendDiscordLog(message);

      return respond(res, 200, { success: true, id: application.id });
    }

    if (req.method === 'POST' && route === '/collaboratore-applications') {
      const { name, role, contactEmail, description } = await parseJsonBody(req);
      if (!name || !role || !contactEmail || !description) {
        return respond(res, 400, { error: 'Nome, ruolo desiderato, email e descrizione sono obbligatori.' });
      }

      store.collaborator_applications.push({
        id: getNextId(store.collaborator_applications),
        name,
        role,
        contact_email: contactEmail,
        description,
        status: 'pending',
        submitted_at: new Date().toISOString()
      });

      return respond(res, 200, { success: true });
    }

    if (req.method === 'POST' && route === '/announcement') {
      const { title, content } = await parseJsonBody(req);
      if (!title || !content) {
        return respond(res, 400, { error: 'Titolo e contenuto obbligatori.' });
      }

      store.announcements.push({
        id: getNextId(store.announcements),
        title,
        content,
        created_at: new Date().toISOString()
      });

      return respond(res, 200, { success: true });
    }

    if (req.method === 'POST' && route === '/communication') {
      const { title, content } = await parseJsonBody(req);
      if (!title || !content) {
        return respond(res, 400, { error: 'Titolo e contenuto obbligatori.' });
      }

      store.communications.push({
        id: getNextId(store.communications),
        title,
        content,
        created_at: new Date().toISOString()
      });

      return respond(res, 200, { success: true });
    }

    if (req.method === 'POST' && route === '/application/accept') {
      const { id, type } = await parseJsonBody(req);
      if (!id || !type) {
        return respond(res, 400, { error: 'Id e tipo applicazione richiesti.' });
      }

      if (type === 'partner') {
        const appIndex = store.partner_applications.findIndex((item) => item.id === Number(id));
        if (appIndex === -1) {
          return respond(res, 404, { error: 'Applicazione partner non trovata.' });
        }
        store.partner_applications[appIndex].status = 'accepted';
        store.partner_logs.push({
          id: getNextId(store.partner_logs),
          partner_id: Number(id),
          message: `Partner accettato: ${store.partner_applications[appIndex].name}`,
          created_at: new Date().toISOString()
        });
        sendDiscordLog(`Partner accettato: ${store.partner_applications[appIndex].name} (ID ${id})`);
        return respond(res, 200, { success: true });
      }

      if (type === 'collaborator') {
        const appIndex = store.collaborator_applications.findIndex((item) => item.id === Number(id));
        if (appIndex === -1) {
          return respond(res, 404, { error: 'Applicazione collaboratore non trovata.' });
        }
        store.collaborator_applications[appIndex].status = 'accepted';
        return respond(res, 200, { success: true });
      }

      return respond(res, 400, { error: 'Tipo applicazione non valido.' });
    }

    if (req.method === 'GET' && route === '/partner-logs') {
      const logs = store.partner_logs.map((log) => {
        const partner = store.partner_applications.find((item) => item.id === log.partner_id) || {};
        return { ...log, partner_name: partner.name || 'Unknown' };
      });
      return respond(res, 200, logs.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }

    if (req.method === 'GET' && route === '/admin/overview') {
      return respond(res, 200, {
        pendingPartners: store.partner_applications.filter((item) => item.status === 'pending').length,
        pendingCollaborators: store.collaborator_applications.filter((item) => item.status === 'pending').length,
        totalAnnouncements: store.announcements.length,
        totalCommunications: store.communications.length
      });
    }

    return respond(res, 404, { error: 'Endpoint non trovato.' });
  } catch (error) {
    console.error('API error:', error);
    return respond(res, 500, { error: 'Errore interno del server.' });
  }
};
