// ── ตั้งค่า Base URL ──────────────────────────────────────
// localhost  → เปลี่ยนเป็น https://yourdomain.com/api เมื่อ deploy
const API_BASE = 'http://localhost:3000/api';

// ── Token helpers ─────────────────────────────────────────
const Auth = {
  getToken()       { return localStorage.getItem('rc_token'); },
  setToken(t)      { localStorage.setItem('rc_token', t); },
  removeToken()    { localStorage.removeItem('rc_token'); },
  getUser()        { return JSON.parse(localStorage.getItem('rc_user') || 'null'); },
  setUser(u)       { localStorage.setItem('rc_user', JSON.stringify(u)); },
  removeUser()     { localStorage.removeItem('rc_user'); },
  isLoggedIn()     { return !!this.getToken(); },
  isAdmin()        { return this.getUser()?.role === 'admin'; },
  logout() {
    this.removeToken();
    this.removeUser();
    window.location.href = 'login.html';
  },
};

// ── Core fetch wrapper ────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // FormData ไม่ต้องใส่ Content-Type (browser จัดการเอง)
  if (options.body instanceof FormData) delete headers['Content-Type'];

  try {
    const res = await fetch(API_BASE + path, { ...options, headers });
    const data = await res.json();

    if (res.status === 401) { Auth.logout(); return; }
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    return data;
  } catch (err) {
    console.error(`[API] ${path}:`, err.message);
    showToast('error', err.message);
    throw err;
  }
}

// ── Shorthand methods ─────────────────────────────────────
const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)   => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
  upload: (path, form)   => apiFetch(path, { method: 'POST',   body: form }),
};

// ── Global toast notification ─────────────────────────────
function showToast(type = 'success', message = '') {
  let toast = document.getElementById('rc-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'rc-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;
      border-radius:8px;font-size:14px;font-weight:700;color:#fff;
      box-shadow:0 4px 16px rgba(0,0,0,.2);transition:opacity .3s;opacity:0;
      font-family:'Hanuman',sans-serif;max-width:320px;
    `;
    document.body.appendChild(toast);
  }
  const colors = { success: '#1D9E75', error: '#c0392b', warning: '#d4891a', info: '#114E72' };
  toast.style.background = colors[type] || colors.info;
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}

// ── Auth guard (ใส่ทุกหน้าที่ต้อง login) ──────────────────
function requireLogin(redirectTo = 'login.html') {
  if (!Auth.isLoggedIn()) window.location.href = redirectTo;
}
function requireAdmin() {
  requireLogin();
  if (!Auth.isAdmin()) window.location.href = 'main.html';
}

// ── Update header UI based on login state ─────────────────
function initHeaderUI() {
  const user = Auth.getUser();
  const loginBtn = document.querySelector('.BtnLogin');
  if (!loginBtn) return;
  if (user) {
    loginBtn.href = 'profile.html';
    loginBtn.querySelector('.BtnLogin-text').textContent = 'MY ACCOUNT';
  }
}

document.addEventListener('DOMContentLoaded', initHeaderUI);