const API_BASE = '/api';

function showLoginToast(message, success = false) {
  let toast = document.getElementById('admin-login-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-login-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  if (success) toast.style.background = 'rgba(34, 197, 94, 0.95)';
  clearTimeout(window.adminLoginToastTimeout);
  window.adminLoginToastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    toast.style.background = '';
  }, 4200);
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value.trim();

  if (!email || !password) {
    showLoginToast('Compila email e password prima di continuare.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Credenziali non valide');
    }
    showLoginToast(`Accesso effettuato come ${result.role}. Reindirizzamento...`, true);
    const role = result.role;
    const destination = {
      gestore: 'adminpanelgestore.html',
      admin: 'adminpaneladmin.html',
      moderazione: 'adminpanelmoderazione.html',
      partner: 'adminpanelpartner.html'
    }[role] || 'adminpanelgestore.html';
    setTimeout(() => {
      window.location.href = destination;
    }, 1200);
  } catch (error) {
    showLoginToast(error.message || 'Login fallito');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }
});
