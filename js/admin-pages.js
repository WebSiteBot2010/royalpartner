const API_BASE = '/api';
const toastEl = document.createElement('div');
toastEl.className = 'toast';
document.body.appendChild(toastEl);

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 4200);
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Errore ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(error.message || 'Errore di rete. Assicurati che il server sia attivo.');
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function renderTable(rows, headers) {
  if (!rows.length) {
    return `<p class="empty-message">Nessun elemento trovato.</p>`;
  }
  const head = headers.map((header) => `<th>${header}</th>`).join('');
  const body = rows.join('');
  return `<div class="table-wrapper"><table class="table-block"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderPartnerApplications(applications, showActions = false) {
  return renderTable(
    applications.map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.website || 'N/A'}</td>
        <td>${item.contact_email}</td>
        <td>${item.description}</td>
        <td>${item.status}</td>
        <td>${item.submitted_at ? formatDate(item.submitted_at) : '-'}</td>
        ${showActions ? `<td><button class="button" data-action="accept" data-id="${item.id}" data-type="partner">Accetta</button></td>` : ''}
      </tr>
    `),
    showActions
      ? ['ID', 'Nome', 'Sito', 'Email', 'Descrizione', 'Stato', 'Inviata', 'Azioni']
      : ['ID', 'Nome', 'Sito', 'Email', 'Descrizione', 'Stato', 'Inviata']
  );
}

function renderCollaboratorApplications(applications, showActions = false) {
  return renderTable(
    applications.map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.role}</td>
        <td>${item.contact_email}</td>
        <td>${item.description}</td>
        <td>${item.status}</td>
        <td>${item.submitted_at ? formatDate(item.submitted_at) : '-'}</td>
        ${showActions ? `<td><button class="button" data-action="accept" data-id="${item.id}" data-type="collaborator">Accetta</button></td>` : ''}
      </tr>
    `),
    showActions
      ? ['ID', 'Nome', 'Ruolo', 'Email', 'Descrizione', 'Stato', 'Inviata', 'Azioni']
      : ['ID', 'Nome', 'Ruolo', 'Email', 'Descrizione', 'Stato', 'Inviata']
  );
}

function renderAnnouncements(announcements) {
  return announcements.length
    ? announcements
        .map((item) => `
      <article class="card">
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        <small>${formatDate(item.created_at)}</small>
      </article>
    `)
        .join('')
    : '<p class="empty-message">Non ci sono annunci al momento.</p>';
}

function renderCommunications(communications) {
  return communications.length
    ? communications
        .map((item) => `
      <article class="card">
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        <small>${formatDate(item.created_at)}</small>
      </article>
    `)
        .join('')
    : '<p class="empty-message">Non ci sono comunicazioni al momento.</p>';
}

function renderLogs(logs) {
  return logs.length
    ? logs
        .map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.partner_name}</td>
        <td>${item.message}</td>
        <td>${formatDate(item.created_at)}</td>
      </tr>
    `)
        .join('')
    : '<tr><td colspan="4" class="empty-message">Nessun log partner trovato.</td></tr>';
}

async function submitPartnerForm(formId, listId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const websiteField = form.elements.website;
    const data = {
      name: form.elements.name.value.trim(),
      website: websiteField ? websiteField.value.trim() : '',
      contactEmail: form.elements.contactEmail.value.trim(),
      description: form.elements.description.value.trim()
    };
    if (!data.name || !data.contactEmail || !data.description) {
      showToast('Compila tutti i campi obbligatori.');
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
      if (listId) await refreshPartnerApplications(listId);
    } catch (error) {
      showToast(error.message);
    }
  });
}

async function submitCollaboratorForm(formId, listId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {
      name: form.elements.name.value.trim(),
      role: form.elements.role.value.trim(),
      contactEmail: form.elements.contactEmail.value.trim(),
      description: form.elements.description.value.trim()
    };
    if (!data.name || !data.role || !data.contactEmail || !data.description) {
      showToast('Compila tutti i campi obbligatori.');
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
      if (listId) await refreshCollaboratorApplications(listId);
    } catch (error) {
      showToast(error.message);
    }
  });
}

async function refreshPartnerApplications(containerId, showActions = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const applications = await fetchJson(`${API_BASE}/applications?type=partner`);
    container.innerHTML = renderPartnerApplications(applications, showActions);
  } catch (error) {
    container.innerHTML = `<p class="empty-message">${error.message}</p>`;
  }
}

async function refreshCollaboratorApplications(containerId, showActions = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const applications = await fetchJson(`${API_BASE}/applications?type=collaborator`);
    container.innerHTML = renderCollaboratorApplications(applications, showActions);
  } catch (error) {
    container.innerHTML = `<p class="empty-message">${error.message}</p>`;
  }
}

async function refreshAnnouncements(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const announcements = await fetchJson(`${API_BASE}/annunci`);
    container.innerHTML = renderAnnouncements(announcements);
  } catch (error) {
    container.innerHTML = `<p class="empty-message">${error.message}</p>`;
  }
}

async function refreshCommunications(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const communications = await fetchJson(`${API_BASE}/comunicazioni`);
    container.innerHTML = renderCommunications(communications);
  } catch (error) {
    container.innerHTML = `<p class="empty-message">${error.message}</p>`;
  }
}

async function refreshPartnerLogs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const logs = await fetchJson(`${API_BASE}/partner-logs`);
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="table-block">
          <thead><tr><th>ID</th><th>Partner</th><th>Messaggio</th><th>Creato</th></tr></thead>
          <tbody>${renderLogs(logs)}</tbody>
        </table>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p class="empty-message">${error.message}</p>`;
  }
}

async function refreshOverview(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const overview = await fetchJson(`${API_BASE}/admin/overview`);
    container.innerHTML = `
      <div class="panel-grid">
        <div class="panel-card"><h3>Partner pendenti</h3><p>${overview.pendingPartners}</p></div>
        <div class="panel-card"><h3>Collaboratori pendenti</h3><p>${overview.pendingCollaborators}</p></div>
        <div class="panel-card"><h3>Annunci</h3><p>${overview.totalAnnouncements}</p></div>
        <div class="panel-card"><h3>Comunicazioni</h3><p>${overview.totalCommunications}</p></div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p class="empty-message">${error.message}</p>`;
  }
}

async function acceptApplication(id, type) {
  await fetchJson(`${API_BASE}/application/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type })
  });
}

async function loginAndLoad(email, password, expectedRole) {
  try {
    const auth = await fetchJson(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (expectedRole && auth.role !== expectedRole) {
      showToast(`Accesso negato: questa pagina richiede il ruolo ${expectedRole}.`);
      return false;
    }
    return true;
  } catch (error) {
    showToast(`Impossibile effettuare il login: ${error.message}`);
    return false;
  }
}

function setupModalTriggers() {
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

async function initPartnerRequestPage() {
  await refreshPartnerApplications('partner-requests-list');
  await refreshPartnerLogs('partner-logs-list');
  submitPartnerForm('partner-request-form', 'partner-requests-list');
  setupModalTriggers();
}

async function initCollaboratorRequestPage() {
  await refreshCollaboratorApplications('collaborator-requests-list');
  submitCollaboratorForm('collaborator-request-form', 'collaborator-requests-list');
  setupModalTriggers();
}

async function initAnnouncementsPage() {
  await refreshAnnouncements('announcements-list');
}

async function initCommunicationsPage() {
  await refreshCommunications('communications-list');
}

async function initAdminRolePage(role, email, password) {
  document.getElementById('admin-role-label').textContent = role;
  document.getElementById('admin-email-label').textContent = email;
  const logged = await loginAndLoad(email, password);
  if (!logged) {
    document.getElementById('admin-content').innerHTML = '<p class="empty-message">Login automatico non riuscito. Controlla il backend e riprova.</p>';
    return;
  }
  await refreshOverview('admin-overview');
  if (['gestore', 'admin', 'partner'].includes(role)) {
    await refreshPartnerApplications('partner-requests-list', true);
  }
  if (['gestore', 'admin'].includes(role)) {
    await refreshCollaboratorApplications('collaborator-requests-list', true);
  }
  if (['gestore', 'moderazione'].includes(role)) {
    await refreshAnnouncements('announcements-preview');
    await refreshCommunications('communications-preview');
    setupAnnouncementForm('announcement-form');
    setupCommunicationForm('communication-form');
  }
  if (['gestore', 'partner'].includes(role)) {
    await refreshPartnerLogs('partner-logs-list');
  }
  if (role === 'gestore' || role === 'admin' || role === 'partner') {
    setupAcceptButtons();
  }
}

function setupAcceptButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action="accept"]');
    if (!button) return;
    const id = button.dataset.id;
    const type = button.dataset.type;
    try {
      await acceptApplication(id, type);
      showToast('Applicazione accettata.');
      if (type === 'partner') await refreshPartnerApplications('partner-requests-list');
      if (type === 'collaborator') await refreshCollaboratorApplications('collaborator-requests-list');
      if (document.getElementById('partner-logs-list')) await refreshPartnerLogs('partner-logs-list');
    } catch (error) {
      showToast(error.message);
    }
  });
}

function setupAnnouncementForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    const content = form.elements.content.value.trim();
    if (!title || !content) {
      showToast('Compila titolo e contenuto.');
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
      await refreshAnnouncements('announcements-preview');
    } catch (error) {
      showToast(error.message);
    }
  });
}

function setupCommunicationForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    const content = form.elements.content.value.trim();
    if (!title || !content) {
      showToast('Compila titolo e contenuto.');
      return;
    }
    try {
      await fetchJson(`${API_BASE}/communication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      showToast('Comunicazione pubblicata.');
      form.reset();
      await refreshCommunications('communications-preview');
    } catch (error) {
      showToast(error.message);
    }
  });
}

function setupLinkButtons() {
  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('href').startsWith('#')) return;
      event.preventDefault();
      window.location.href = link.href;
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupModalTriggers();
  setupLinkButtons();
});
