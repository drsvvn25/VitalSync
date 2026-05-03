/**
 * VitalSync – Auth Helper (JWT storage + role redirects)
 */

// Suppress the Bootstrap 5.3 SelectorEngine feature-detection probe.
// Bootstrap internally runs querySelector('*,:x') to test browser selector
// capabilities. It wraps the call in try/catch, so nothing breaks, but the
// error still surfaces in DevTools. The listener below silences it selectively.
window.addEventListener('error', function (e) {
    if (e.message && e.message.includes(':x') && e.message.includes('valid selector')) {
        e.preventDefault();   // stop DevTools from logging it
        e.stopPropagation();
        return false;
    }
}, true /* capture phase — fires before DevTools sees it */);


const TOKEN_KEY = 'vs_token';
const USER_KEY = 'vs_user';
const API_BASE = 'http://localhost:5000/api';

// ── Token helpers ──────────────────────────────────────────
function saveAuth(token, user) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function getUser() {
    const u = sessionStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
}

function clearAuth() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
}

function isLoggedIn() {
    return !!getToken();
}

// ── Redirect helpers ──────────────────────────────────────
function redirectByRole(role) {
    if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else if (role === 'doctor') {
        window.location.href = 'doctor-dashboard.html';
    } else {
        window.location.href = 'patient-dashboard.html';
    }
}

function requireAuth(allowedRoles = []) {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    const user = getUser();
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        redirectByRole(user.role);
        return false;
    }
    return true;
}

function logout() {
    clearAuth();
    window.location.href = 'login.html';
}

// ── Populate sidebar user info ─────────────────────────────
function populateSidebarUser() {
    const user = getUser();
    if (!user) return;
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
}

// ── Toast notifications ────────────────────────────────────
function showToast(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `vs-toast ${type !== 'success' ? type : ''}`;
    toast.innerHTML = `<span>${icons[type] || '✅'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Fetch wrapper with auth header ─────────────────────────
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
        clearAuth();
        window.location.href = 'login.html';
        return;
    }
    return { ok: res.ok, status: res.status, data };
}
