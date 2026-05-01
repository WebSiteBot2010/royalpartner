const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'royalpartner';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

async function dbQuery(sql, params = []) {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${DB_NAME}\`;`);
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    conn.release();
  }
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

async function initializeDatabase() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('gestore','admin','moderazione','partner') NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS partner_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      website VARCHAR(255),
      contact_email VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS collaborator_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      contact_email VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS communications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS partner_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      partner_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partner_id) REFERENCES partner_applications(id) ON DELETE CASCADE
    );
  `);

  const adminUsers = [
    { email: 'gestore@support', password: 'gestore123', role: 'gestore', display_name: 'Gestore Support' },
    { email: 'admin@support', password: 'admin123', role: 'admin', display_name: 'Admin Support' },
    { email: 'moderazione@support', password: 'moderazione123', role: 'moderazione', display_name: 'Moderazione Support' },
    { email: 'partner@support', password: 'partner123', role: 'partner', display_name: 'Partner Support' }
  ];

  for (const admin of adminUsers) {
    await dbQuery(
      'INSERT IGNORE INTO admins (email, password, role, display_name) VALUES (?, ?, ?, ?)',
      [admin.email, admin.password, admin.role, admin.display_name]
    );
  }

  const [currentAnnouncements] = await dbQuery('SELECT id FROM announcements LIMIT 1');
  if (!currentAnnouncements || currentAnnouncements.length === 0) {
    await dbQuery(
      'INSERT INTO announcements (title, content) VALUES (?, ?), (?, ?)',
      [
        'Benvenuti su Royal Partner',
        'Il sito ufficiale è online con tutte le pagine dedicate a staff, partner e collaboratori.',
        'Novità: Admin Panel attivo',
        'Il sistema ora supporta login role-based e gestione annunci / comunicazioni in tempo reale.'
      ]
    );
  }

  const [currentComms] = await dbQuery('SELECT id FROM communications LIMIT 1');
  if (!currentComms || currentComms.length === 0) {
    await dbQuery(
      'INSERT INTO communications (title, content) VALUES (?, ?), (?, ?)',
      [
        'Comunicazione ufficiale',
        'Royal Partner continua a crescere. Usa il pannello admin per gestire richieste e contenuti.',
        'Aggiornamento sicurezza',
        'Ricorda di usare credenziali al sicuro e di mantenere il database MySQL protetto.'
      ]
    );
  }
}

initializeDatabase().catch((error) => {
  console.error('Database initialization failed:', error.message);
  process.exit(1);
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richieste.' });
  }

  const rows = await dbQuery('SELECT email, role, display_name FROM admins WHERE email = ? AND password = ?', [email, password]);
  if (!rows || rows.length === 0) {
    return res.status(401).json({ error: 'Credenziali non valide.' });
  }

  const admin = rows[0];
  res.json({ success: true, email: admin.email, role: admin.role, displayName: admin.display_name });
});

app.get('/api/annunci', async (req, res) => {
  const rows = await dbQuery('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10');
  res.json(rows);
});

app.get('/api/comunicazioni', async (req, res) => {
  const rows = await dbQuery('SELECT id, title, content, created_at FROM communications ORDER BY created_at DESC LIMIT 10');
  res.json(rows);
});

app.get('/api/applications', async (req, res) => {
  const type = req.query.type === 'collaborator' ? 'collaborator' : 'partner';
  if (type === 'partner') {
    const rows = await dbQuery('SELECT id, name, website, contact_email, description, status, submitted_at FROM partner_applications ORDER BY submitted_at DESC');
    return res.json(rows);
  }

  const rows = await dbQuery('SELECT id, name, role, contact_email, description, status, submitted_at FROM collaborator_applications ORDER BY submitted_at DESC');
  res.json(rows);
});

app.post('/api/partner-applications', async (req, res) => {
  const { name, website, contactEmail, description } = req.body || {};
  if (!name || !contactEmail || !description) {
    return res.status(400).json({ error: 'Nome, email di contatto e descrizione sono obbligatori.' });
  }

  const result = await dbQuery(
    'INSERT INTO partner_applications (name, website, contact_email, description) VALUES (?, ?, ?, ?)',
    [name, website || '', contactEmail, description]
  );

  const message = `Nuova richiesta partner:\nNome: ${name}\nSito: ${website || 'N/A'}\nEmail: ${contactEmail}\nDescrizione: ${description}`;
  await sendDiscordLog(message);

  res.json({ success: true, id: result.insertId });
});

app.post('/api/collaboratore-applications', async (req, res) => {
  const { name, role, contactEmail, description } = req.body || {};
  if (!name || !role || !contactEmail || !description) {
    return res.status(400).json({ error: 'Nome, ruolo desiderato, email e descrizione sono obbligatori.' });
  }

  await dbQuery(
    'INSERT INTO collaborator_applications (name, role, contact_email, description) VALUES (?, ?, ?, ?)',
    [name, role, contactEmail, description]
  );

  res.json({ success: true });
});

app.post('/api/announcement', async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Titolo e contenuto obbligatori.' });
  }

  await dbQuery('INSERT INTO announcements (title, content) VALUES (?, ?)', [title, content]);
  res.json({ success: true });
});

app.post('/api/communication', async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Titolo e contenuto obbligatori.' });
  }

  await dbQuery('INSERT INTO communications (title, content) VALUES (?, ?)', [title, content]);
  res.json({ success: true });
});

app.post('/api/application/accept', async (req, res) => {
  const { id, type } = req.body || {};
  if (!id || !type) {
    return res.status(400).json({ error: 'Id e tipo applicazione richiesti.' });
  }

  if (type === 'partner') {
    const [rows] = await dbQuery('SELECT name FROM partner_applications WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Applicazione partner non trovata.' });
    }
    const name = rows[0].name;
    await dbQuery('UPDATE partner_applications SET status = ? WHERE id = ?', ['accepted', id]);
    await dbQuery('INSERT INTO partner_logs (partner_id, message) VALUES (?, ?)', [id, `Partner accettato: ${name}`]);
    await sendDiscordLog(`Partner accettato: ${name} (ID ${id})`);
    return res.json({ success: true });
  }

  if (type === 'collaborator') {
    const [rows] = await dbQuery('SELECT name FROM collaborator_applications WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Applicazione collaboratore non trovata.' });
    }
    await dbQuery('UPDATE collaborator_applications SET status = ? WHERE id = ?', ['accepted', id]);
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Tipo applicazione non valido.' });
});

app.get('/api/partner-logs', async (req, res) => {
  const rows = await dbQuery(
    `SELECT l.id, l.partner_id, l.message, l.created_at, p.name AS partner_name
     FROM partner_logs l
     JOIN partner_applications p ON p.id = l.partner_id
     ORDER BY l.created_at DESC`
  );
  res.json(rows);
});

app.get('/api/admin/overview', async (req, res) => {
  const [counts] = await dbQuery(
    `SELECT 
       (SELECT COUNT(*) FROM partner_applications WHERE status='pending') AS pendingPartners,
       (SELECT COUNT(*) FROM collaborator_applications WHERE status='pending') AS pendingCollaborators,
       (SELECT COUNT(*) FROM announcements) AS totalAnnouncements,
       (SELECT COUNT(*) FROM communications) AS totalCommunications
     `
  );
  res.json(counts[0] || counts);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RoyalPartner server running on http://localhost:${PORT}`);
});
