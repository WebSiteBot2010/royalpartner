const API_BASE = '/api';
const authKey = 'royalpartner-admin-auth';

const state = {
  auth: null,
  announcements: [],
  communications: []
};

const pages = {
  home: document.querySelector('[data-page="home"]'),
  chi: document.querySelector('[data-page="chi-siamo"]'),
  servizi: document.querySelector('[data-page="servizi-offerti"]'),
  partner: document.querySelector('[data-page="diventa-partner"]'),
  collab: document.querySelector('[data-page="diventa-collaboratore"]'),
  annunci: document.querySelector('[data-page="annunci"]'),
  comunicazioni: document.querySelector('[data-page="comunicazioni"]'),
  admin: document.querySelector('[data-page="admin-panel"]')
};

const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
const toastEl = document.getElementById('toast');
const announcementsHome = document.getElementById('annunci-home');
const communicationsHome = document.getElementById('comunicazioni-home');
const announcementsList = document.getElementById('annunci-list');
const communicationsList = document.getElementById('comunicazioni-list');
const adminSection = document.getElementById('admin-content');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLogoutButton = document.getElementById('admin-logout');
const adminInfo = document.getElementById('admin-info');
const adminActions = document.getElementById('admin-actions');
const adminLoggedIn = document.getElementById('admin-logged-in');
const adminData = document.getElementById('admin-data');

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 4200);
}

function updateRoute() {
  const hash = window.location.hash.slice(1) || 'home';
  Object.keys(pages).forEach((key) => {
    pages[key].classList.toggle('visible', key === hash);
  });
  navLinks.forEach((link) => {
    const route = link.getAttribute('href').slice(1);
    link.classList.toggle('active', route === hash);
  });
  if (hash === 'admin') {
    renderAdminPage();
  }
}

function setVisiblePage(element) {
  Object.values(pages).forEach((section) => section.classList.remove('visible'));
  element.classList.add('visible');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Errore di rete');
  }
  return response.json();
}

async function loadLiveContent() {
  try {
    const [annunci, comunicazioni] = await Promise.all([
      fetchJson(`${API_BASE}/annunci`),
      fetchJson(`${API_BASE}/comunicazioni`)
    ]);
    state.announcements = annunci;
    state.communications = comunicazioni;
    renderLiveBoxes();
  } catch (error) {
    console.warn('Live content error', error.message);
  }
}

function renderLiveBoxes() {
  announcementsHome.innerHTML = state.announcements.slice(0, 3).map((item) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.content}</p>
      <small>${new Date(item.created_at).toLocaleString()}</small>
    </article>
  `).join('');

  communicationsHome.innerHTML = state.communications.slice(0, 3).map((item) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.content}</p>
      <small>${new Date(item.created_at).toLocaleString()}</small>
    </article>
  `).join('');

  announcementsList.innerHTML = state.announcements.map((item) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.content}</p>
      <small>${new Date(item.created_at).toLocaleString()}</small>
    </article>
  `).join('');

  communicationsList.innerHTML = state.communications.map((item) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.content}</p>
      <small>${new Date(item.created_at).toLocaleString()}</small>
    </article>
  `).join('');
}

function loadAuth() {
  try {
    return JSON.parse(sessionStorage.getItem(authKey) || 'null');
  } catch {
    return null;
  }
}

function saveAuth(auth) {
  if (auth) {
    sessionStorage.setItem(authKey, JSON.stringify(auth));
  } else {
    sessionStorage.removeItem(authKey);
  }
  state.auth = auth;
}

function createStatusChip(status) {
  return `<span class="status-chip ${status}">${status}</span>`;
}

async function submitPartner(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = {
    name: form.elements.name.value.trim(),
    website: form.elements.website.value.trim(),
    contactEmail: form.elements.contactEmail.value.trim(),
    description: form.elements.description.value.trim()
  };

  if (!data.name || !data.contactEmail || !data.description) {
    showToast('Compila tutti i campi richiesti per la partner request.');
    return;
  }

  try {
    await fetchJson(`${API_BASE}/partner-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    showToast('Richiesta partner inviata con successo.');
    form.reset();
  } catch (error) {
    showToast(error.message);
  }
}

async function submitCollaboratore(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = {
    name: form.elements.name.value.trim(),
    role: form.elements.role.value.trim(),
    contactEmail: form.elements.contactEmail.value.trim(),
    description: form.elements.description.value.trim()
  };

  if (!data.name || !data.role || !data.contactEmail || !data.description) {
    showToast('Compila tutti i campi richiesti per la candidatura collaboratore.');
    return;
  }

  try {
    await fetchJson(`${API_BASE}/collaboratore-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    showToast('Candidatura collaboratore inviata con successo.');
    form.reset();
  } catch (error) {
    showToast(error.message);
  }
}

async function loginAdmin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value.trim();

  if (!email || !password) {
    showToast('Inserisci email e password.');
    return;
  }

  try {
    const auth = await fetchJson(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    saveAuth(auth);
    renderAdminPage();
    showToast(`Accesso come ${auth.role}.`);
  } catch (error) {
    showToast('Login fallito: ' + error.message);
  }
}

function renderAdminPage() {
  const auth = state.auth;
  if (!auth) {
    adminLoginForm.classList.remove('hidden');
    adminLoggedIn.classList.add('hidden');
    adminData.innerHTML = '<p>Effettua il login con una delle 4 email di supporto nel pannello admin.</p>';
    return;
  }

  adminLoginForm.classList.add('hidden');
  adminLoggedIn.classList.remove('hidden');
  adminInfo.querySelector('#admin-role').textContent = auth.role;
  adminInfo.querySelector('#admin-email').textContent = auth.email;
  adminInfo.querySelector('#admin-display').textContent = auth.displayName;
  renderAdminDashboard();
}

async function renderAdminDashboard() {
  const auth = state.auth;
  if (!auth) return;

  const [overview, partnerApps, collaboratorApps, partnerLogs] = await Promise.all([
    fetchJson(`${API_BASE}/admin/overview`),
    fetchJson(`${API_BASE}/applications?type=partner`),
    fetchJson(`${API_BASE}/applications?type=collaborator`),
    fetchJson(`${API_BASE}/partner-logs`)
  ]);

  const summaryCards = `
    <div class="panel-grid">
      <div class="panel-card">
        <h3>Richieste partner pendenti</h3>
        <p>${overview.pendingPartners}</p>
      </div>
      <div class="panel-card">
        <h3>Richieste collaboratori pendenti</h3>
        <p>${overview.pendingCollaborators}</p>
      </div>
      <div class="panel-card">
        <h3>Annunci salvati</h3>
        <p>${overview.totalAnnouncements}</p>
      </div>
      <div class="panel-card">
        <h3>Comunicazioni salvate</h3>
        <p>${overview.totalCommunications}</p>
      </div>
    </div>
  `;

  let content = summaryCards;

  if (['gestore', 'admin', 'partner'].includes(auth.role)) {
    content += renderApplicationsSection(partnerApps, 'partner');
  }

  if (['gestore', 'admin'].includes(auth.role)) {
    content += renderApplicationsSection(collaboratorApps, 'collaborator');
  }

  if (['gestore', 'moderazione'].includes(auth.role)) {
    content += renderContentManagementSection();
  }

  if (['gestore', 'partner'].includes(auth.role)) {
    content += renderLogsSection(partnerLogs);
  }

  adminData.innerHTML = content;
}

function renderApplicationsSection(applications, type) {
  const title = type === 'partner' ? 'Richieste Partner' : 'Candidature Collaboratori';
  return `
    <section class="section">
      <div class="section-title">
        <h2>${title}</h2>
      </div>
      <div class="table-wrapper">
        <table class="table-block">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Dettagli</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${applications.map((item) => `
              <tr>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${type === 'partner' ? `Sito: ${item.website || 'N/A'}<br>Email: ${item.contact_email}` : `Ruolo: ${item.role}<br>Email: ${item.contact_email}`}<br><small>${item.description}</small></td>
                <td>${createStatusChip(item.status)}</td>
                <td>${item.status === 'pending' ? `<button class="button" data-action="accept" data-id="${item.id}" data-type="${type}">Accetta</button>` : '<span style="opacity:.75;">Nessuna azione</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderContentManagementSection() {
  return `
    <section class="section">
      <div class="section-title">
        <h2>Gestione contenuti</h2>
      </div>
      <div class="panel-grid">
        <div class="panel-card">
          <h3>Aggiungi annuncio</h3>
          <form id="announcement-form" class="form-grid">
            <input name="title" class="input-field" placeholder="Titolo annuncio" required />
            <textarea name="content" class="textarea-field" placeholder="Contenuto annuncio" required></textarea>
            <button type="submit" class="button">Pubblica annuncio</button>
          </form>
        </div>
        <div class="panel-card">
          <h3>Aggiungi comunicazione ufficiale</h3>
          <form id="communication-form" class="form-grid">
            <input name="title" class="input-field" placeholder="Titolo comunicazione" required />
            <textarea name="content" class="textarea-field" placeholder="Contenuto comunicazione" required></textarea>
            <button type="submit" class="button">Pubblica comunicazione</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderLogsSection(logs) {
  return `
    <section class="section">
      <div class="section-title">
        <h2>Log Partner</h2>
      </div>
      <div class="table-wrapper">
        <table class="table-block">
          <thead>
            <tr>
              <th>ID</th>
              <th>Partner</th>
              <th>Messaggio</th>
              <th>Creato</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map((item) => `
              <tr>
                <td>${item.id}</td>
                <td>${item.partner_name}</td>
                <td>${item.message}</td>
                <td>${new Date(item.created_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function handleAdminClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  if (action === 'accept') {
    const id = button.dataset.id;
    const type = button.dataset.type;
    try {
      await fetchJson(`${API_BASE}/application/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      showToast('Applicazione accettata.');
      renderAdminDashboard();
      await loadLiveContent();
    } catch (error) {
      showToast(error.message);
    }
  }
}

async function handleAdminForms(event) {
  if (event.target.id === 'announcement-form') {
    event.preventDefault();
    const form = event.target;
    const title = form.elements.title.value.trim();
    const content = form.elements.content.value.trim();
    if (!title || !content) {
      showToast('Inserisci titolo e contenuto per lannuncio.');
      return;
    }
    try {
      await fetchJson(`${API_BASE}/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      showToast('Annuncio pubblicato.');
      form.reset();
      await loadLiveContent();
      renderAdminDashboard();
    } catch (error) {
      showToast(error.message);
    }
  }

  if (event.target.id === 'communication-form') {
    event.preventDefault();
    const form = event.target;
    const title = form.elements.title.value.trim();
    const content = form.elements.content.value.trim();
    if (!title || !content) {
      showToast('Inserisci titolo e contenuto per la comunicazione.');
      return;
    }
    try {
      await fetchJson(`${API_BASE}/communication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      showToast('Comunicazione ufficiale pubblicata.');
      form.reset();
      await loadLiveContent();
      renderAdminDashboard();
    } catch (error) {
      showToast(error.message);
    }
  }
}

function initializeRoutes() {
  window.addEventListener('hashchange', updateRoute);
  updateRoute();
}

function initializeEvents() {
  document.getElementById('partner-form').addEventListener('submit', submitPartner);
  document.getElementById('collaboratore-form').addEventListener('submit', submitCollaboratore);
  adminLoginForm.addEventListener('submit', loginAdmin);
  adminLogoutButton.addEventListener('click', () => {
    saveAuth(null);
    renderAdminPage();
    showToast('Logout effettuato.');
  });
  adminData.addEventListener('click', handleAdminClick);
  adminData.addEventListener('submit', handleAdminForms);
  document.querySelectorAll('[data-open-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.openModal);
      target?.classList.add('visible');
      document.body.style.overflow = 'hidden';
    });
  });
  document.querySelectorAll('.modal-close').forEach((button) => {
    button.addEventListener('click', () => {
      button.closest('.modal-backdrop')?.classList.remove('visible');
      document.body.style.overflow = '';
    });
  });
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        backdrop.classList.remove('visible');
        document.body.style.overflow = '';
      }
    });
  });
}

function initialize() {
  state.auth = loadAuth();
  initializeRoutes();
  initializeEvents();
  loadLiveContent();
  setInterval(loadLiveContent, 12000);
  setTimeout(() => {
    announcementsHome.closest('.hero-grid')?.classList.add('fade-in');
  }, 100);
}

initialize();
