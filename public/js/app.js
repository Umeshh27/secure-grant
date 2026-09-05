// ==========================================
// Secure Grant Portal - Client Application
// ==========================================

const state = {
  token: localStorage.getItem('securegrant_jwt') || null,
  user: null,
  grants: [],
  myApplications: [],
  adminUsers: [],
};

// Helper: Decode JWT payload without external library
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Helper: API Fetcher
async function apiCall(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type');
  let data = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { ok: response.ok, status: response.status, data };
}

// Toast Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  // Check URL for OAuth redirect token
  const urlParams = new URLSearchParams(window.location.search);
  const oauthToken = urlParams.get('token');
  if (oauthToken) {
    setAuthToken(oauthToken);
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast('OAuth 2.0 Login Successful!', 'success');
  } else if (state.token) {
    initUserFromToken();
  }

  setupEventListeners();
  updateUIForAuth();
  await loadGrants();
  checkApiHealth();
});

function setAuthToken(token) {
  state.token = token;
  if (token) {
    localStorage.setItem('securegrant_jwt', token);
    initUserFromToken();
  } else {
    localStorage.removeItem('securegrant_jwt');
    state.user = null;
  }
  updateUIForAuth();
}

function initUserFromToken() {
  const decoded = parseJwt(state.token);
  if (decoded && decoded.exp * 1000 > Date.now()) {
    state.user = {
      userId: decoded.userId || decoded.sub,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      email: decoded.email || `User #${decoded.userId}`,
      name: decoded.name || `User #${decoded.userId}`,
    };
  } else {
    setAuthToken(null);
  }
}

function updateUIForAuth() {
  const unauthDiv = document.getElementById('auth-unauthenticated');
  const authDiv = document.getElementById('auth-authenticated');
  const navMyApps = document.getElementById('nav-my-apps');
  const navGrantor = document.getElementById('nav-grantor');
  const navAdmin = document.getElementById('nav-admin');
  const btnCreateModal = document.getElementById('btn-grantor-create-modal');

  if (state.user) {
    unauthDiv.style.display = 'none';
    authDiv.style.display = 'flex';
    document.getElementById('display-user-name').textContent = state.user.name || state.user.email;

    const rolesContainer = document.getElementById('display-user-roles');
    rolesContainer.innerHTML = state.user.roles
      .map((r) => `<span class="role-tag role-${r.toLowerCase()}">${r}</span>`)
      .join(' ');

    const hasAdmin = state.user.roles.includes('ADMIN');
    const hasGrantor = state.user.roles.includes('GRANTOR');
    const hasGrantee = state.user.roles.includes('GRANTEE');

    navAdmin.style.display = hasAdmin ? 'inline-block' : 'none';
    navGrantor.style.display = hasGrantor ? 'inline-block' : 'none';
    navMyApps.style.display = hasGrantee ? 'inline-block' : 'none';
    btnCreateModal.style.display = hasGrantor ? 'inline-flex' : 'none';
  } else {
    unauthDiv.style.display = 'flex';
    authDiv.style.display = 'none';
    navAdmin.style.display = 'none';
    navGrantor.style.display = 'none';
    navMyApps.style.display = 'none';
    btnCreateModal.style.display = 'none';
  }
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.tab-view').forEach((el) => {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  document.querySelectorAll('.nav-link').forEach((el) => el.classList.remove('active'));

  const targetView = document.getElementById(`view-${tabId}`);
  const targetLink = document.querySelector(`[data-tab="${tabId}"]`);

  if (targetView) {
    targetView.style.display = 'block';
    targetView.classList.add('active');
  }
  if (targetLink) {
    targetLink.classList.add('active');
  }

  if (tabId === 'grants') loadGrants();
  if (tabId === 'my-apps') loadMyApplications();
  if (tabId === 'grantor') loadGrantorView();
  if (tabId === 'admin') loadAdminView();
}

// Event Listeners
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('[data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Auth Modals
  const authModal = document.getElementById('auth-modal');
  document.getElementById('btn-open-login').addEventListener('click', () => {
    openAuthModal('login');
  });
  document.getElementById('btn-open-register').addEventListener('click', () => {
    openAuthModal('register');
  });
  document.getElementById('btn-close-auth-modal').addEventListener('click', () => {
    authModal.classList.remove('active');
  });
  document.getElementById('btn-logout').addEventListener('click', () => {
    setAuthToken(null);
    showToast('Signed out successfully.', 'info');
    switchTab('grants');
  });

  // Auth Form Tabs
  document.getElementById('tab-btn-login').addEventListener('click', () => {
    document.getElementById('tab-btn-login').classList.add('active');
    document.getElementById('tab-btn-register').classList.remove('active');
    document.getElementById('form-login').style.display = 'block';
    document.getElementById('form-register').style.display = 'none';
  });
  document.getElementById('tab-btn-register').addEventListener('click', () => {
    document.getElementById('tab-btn-register').classList.add('active');
    document.getElementById('tab-btn-login').classList.remove('active');
    document.getElementById('form-register').style.display = 'block';
    document.getElementById('form-login').style.display = 'none';
  });

  // Login Form Submit
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.ok && res.data.accessToken) {
      setAuthToken(res.data.accessToken);
      authModal.classList.remove('active');
      showToast('Logged in successfully!', 'success');
    } else {
      showToast(res.data?.message || 'Login failed', 'error');
    }
  });

  // Register Form Submit
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    const res = await apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      showToast('Account registered! Signing you in...', 'success');
      // Auto login
      const loginRes = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (loginRes.ok && loginRes.data.accessToken) {
        setAuthToken(loginRes.data.accessToken);
        authModal.classList.remove('active');
      }
    } else {
      showToast(res.data?.message || 'Registration failed', 'error');
    }
  });

  // OAuth Simulation Button
  document.getElementById('btn-oauth-login').addEventListener('click', async () => {
    const res = await apiCall('/api/auth/google/callback?code=mock_test_code_demo_user');
    if (res.ok && res.data.accessToken) {
      setAuthToken(res.data.accessToken);
      authModal.classList.remove('active');
      showToast('Google OAuth 2.0 authentication successful!', 'success');
    } else {
      showToast(res.data?.message || 'OAuth failed', 'error');
    }
  });

  // Quick Demo Buttons
  document.getElementById('btn-quick-admin').addEventListener('click', async () => {
    const res = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@securegrant.org', password: 'AdminSecurePassword123!' }),
    });
    if (res.ok && res.data.accessToken) {
      setAuthToken(res.data.accessToken);
      showToast('Switched to ADMIN session (admin@securegrant.org)', 'success');
      switchTab('admin');
    } else {
      showToast('Admin account not found. Ensure DB is seeded.', 'error');
    }
  });

  document.getElementById('btn-quick-grantor').addEventListener('click', async () => {
    const res = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'grantor@securegrant.org', password: 'GrantorPassword123!' }),
    });
    if (res.ok && res.data.accessToken) {
      setAuthToken(res.data.accessToken);
      showToast('Switched to GRANTOR session (grantor@securegrant.org)', 'success');
      switchTab('grantor');
    } else {
      showToast('Grantor account not found. Ensure DB is seeded.', 'error');
    }
  });

  document.getElementById('btn-quick-grantee').addEventListener('click', async () => {
    const res = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'grantee@securegrant.org', password: 'GranteePassword123!' }),
    });
    if (res.ok && res.data.accessToken) {
      setAuthToken(res.data.accessToken);
      showToast('Switched to GRANTEE session (grantee@securegrant.org)', 'success');
      switchTab('grants');
    } else {
      showToast('Grantee account not found. Ensure DB is seeded.', 'error');
    }
  });

  document.getElementById('btn-quick-oauth').addEventListener('click', async () => {
    const res = await apiCall('/api/auth/google/callback?code=mock_test_code_quick_eval');
    if (res.ok && res.data.accessToken) {
      setAuthToken(res.data.accessToken);
      showToast('Signed in via OAuth 2.0 simulation!', 'success');
      switchTab('grants');
    }
  });

  // Apply Modal Handlers
  const applyModal = document.getElementById('apply-modal');
  document.getElementById('btn-close-apply-modal').addEventListener('click', () => {
    applyModal.classList.remove('active');
  });

  document.getElementById('form-apply').addEventListener('submit', async (e) => {
    e.preventDefault();
    const grantId = document.getElementById('apply-grant-id').value;
    const proposal = document.getElementById('apply-proposal').value;

    const res = await apiCall(`/api/grants/${grantId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ proposal }),
    });

    if (res.ok) {
      showToast('Application successfully submitted! (HTTP 201)', 'success');
      applyModal.classList.remove('active');
      document.getElementById('apply-proposal').value = '';
    } else {
      showToast(res.data?.message || 'Failed to submit proposal', 'error');
    }
  });

  // Create Grant Modal Handlers
  const createGrantModal = document.getElementById('create-grant-modal');
  const openGrantModal = () => {
    createGrantModal.classList.add('active');
  };
  document.getElementById('btn-grantor-create-modal')?.addEventListener('click', openGrantModal);
  document.getElementById('btn-open-create-grant-tab')?.addEventListener('click', openGrantModal);
  document.getElementById('btn-close-grant-modal').addEventListener('click', () => {
    createGrantModal.classList.remove('active');
  });

  document.getElementById('form-create-grant').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('grant-title').value;
    const amount = Number(document.getElementById('grant-amount').value);
    const description = document.getElementById('grant-desc').value;

    const res = await apiCall('/api/grants', {
      method: 'POST',
      body: JSON.stringify({ title, amount, description }),
    });

    if (res.ok) {
      showToast('Grant opportunity published! (HTTP 201)', 'success');
      createGrantModal.classList.remove('active');
      document.getElementById('form-create-grant').reset();
      await loadGrants();
      if (document.getElementById('view-grantor').classList.contains('active')) {
        await loadGrantorView();
      }
    } else {
      showToast(res.data?.message || 'Failed to create grant', 'error');
    }
  });

  document.getElementById('btn-close-apps-panel')?.addEventListener('click', () => {
    document.getElementById('grantor-applications-panel').style.display = 'none';
  });

  // API Explorer Setup
  setupApiExplorer();
}

function openAuthModal(mode) {
  const modal = document.getElementById('auth-modal');
  modal.classList.add('active');
  if (mode === 'login') {
    document.getElementById('tab-btn-login').click();
  } else {
    document.getElementById('tab-btn-register').click();
  }
}

// Load Grants Explorer
async function loadGrants() {
  const container = document.getElementById('grants-container');
  // Grants listing requires authentication in specification
  const res = await apiCall('/api/grants');

  if (!res.ok) {
    if (res.status === 401) {
      container.innerHTML = `
        <div class="card p-4 text-center" style="grid-column: 1/-1;">
          <h3 class="mb-2">Authentication Required</h3>
          <p class="text-secondary mb-3">Please sign in or use one of the quick demo accounts above to explore grants.</p>
          <button class="btn btn-primary" onclick="openAuthModal('login')">Sign In Now</button>
        </div>
      `;
    } else {
      container.innerHTML = `<p class="text-muted">Error loading grants (${res.data?.message || res.status})</p>`;
    }
    return;
  }

  state.grants = res.data;

  if (state.grants.length === 0) {
    container.innerHTML = `
      <div class="card p-4 text-center" style="grid-column: 1/-1;">
        <p class="text-secondary">No grant opportunities found. Sign in as a GRANTOR to publish one!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.grants
    .map(
      (grant) => `
    <div class="grant-card card">
      <div>
        <div class="grant-header">
          <span class="grant-amount">$${Number(grant.amount).toLocaleString()} USD</span>
        </div>
        <h3 class="grant-title">${escapeHtml(grant.title)}</h3>
        <p class="grant-desc">${escapeHtml(grant.description)}</p>
      </div>
      <div class="grant-footer">
        <div class="grantor-meta">
          Offered by: <strong>${escapeHtml(grant.grantor_name || 'Organization')}</strong>
        </div>
        ${
          state.user && state.user.roles.includes('GRANTEE')
            ? `<button class="btn btn-sm btn-primary" onclick="openApplyModal(${grant.id}, '${escapeAttr(grant.title)}')">Apply</button>`
            : ''
        }
      </div>
    </div>
  `
    )
    .join('');
}

// Open Apply Modal
window.openApplyModal = function (grantId, grantTitle) {
  if (!state.user) {
    openAuthModal('login');
    return;
  }
  document.getElementById('apply-grant-id').value = grantId;
  document.getElementById('apply-grant-title').value = grantTitle;
  document.getElementById('apply-modal').classList.add('active');
};

// Load My Applications (Grantee)
async function loadMyApplications() {
  const tbody = document.getElementById('my-applications-tbody');
  const res = await apiCall('/api/applications/my');

  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">${res.data?.message || 'Access Denied'}</td></tr>`;
    return;
  }

  state.myApplications = res.data;

  if (state.myApplications.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No applications submitted yet. Browse open grants to apply.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.myApplications
    .map(
      (app) => `
    <tr>
      <td>#${app.id}</td>
      <td><strong>${escapeHtml(app.grant_title)}</strong></td>
      <td>$${Number(app.grant_amount).toLocaleString()}</td>
      <td>${escapeHtml(app.grantor_name || '')}</td>
      <td><span class="status-badge status-${app.status}">${app.status.replace('_', ' ')}</span></td>
      <td>${new Date(app.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-glass" onclick="viewApplicationDetail(${app.id})">View</button>
      </td>
    </tr>
  `
    )
    .join('');
}

// View Application Detail
window.viewApplicationDetail = async function (appId) {
  const res = await apiCall(`/api/applications/${appId}`);
  if (res.ok) {
    alert(`Application #${res.data.id}\nGrant: ${res.data.grant_title}\nStatus: ${res.data.status}\n\nProposal:\n${res.data.proposal}`);
  } else {
    showToast(res.data?.message || 'Failed to fetch application', 'error');
  }
};

// Load Grantor View
async function loadGrantorView() {
  const listContainer = document.getElementById('grantor-grants-list');
  const res = await apiCall('/api/grants');

  if (!res.ok) {
    listContainer.innerHTML = `<p class="text-muted">${res.data?.message || 'Unauthorized'}</p>`;
    return;
  }

  // Filter grants owned by this grantor
  const myGrants = res.data.filter((g) => g.grantor_id === state.user?.userId);

  if (myGrants.length === 0) {
    listContainer.innerHTML = `<p class="text-secondary">You have not published any grants yet.</p>`;
    return;
  }

  listContainer.innerHTML = myGrants
    .map(
      (grant) => `
    <div class="card p-3 mb-3 d-flex justify-between items-center" style="background: rgba(255,255,255,0.02)">
      <div>
        <h4 style="font-size: 1.1rem; font-weight:700;">${escapeHtml(grant.title)}</h4>
        <div class="d-flex gap-3 text-secondary" style="font-size:0.85rem; margin-top:4px;">
          <span>Budget: <strong style="color:#34D399">$${Number(grant.amount).toLocaleString()}</strong></span>
          <span>ID: #${grant.id}</span>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-glass" onclick="loadGrantApplications(${grant.id}, '${escapeAttr(grant.title)}')">
          View Applications
        </button>
        <button class="btn btn-sm btn-ghost" onclick="deleteGrant(${grant.id})">
          Delete
        </button>
      </div>
    </div>
  `
    )
    .join('');
}

// Load Grant Applications for Grantor Review
window.loadGrantApplications = async function (grantId, grantTitle) {
  const panel = document.getElementById('grantor-applications-panel');
  const list = document.getElementById('grantor-apps-list');
  const title = document.getElementById('grantor-apps-title');

  title.textContent = `Applications for "${grantTitle}"`;
  panel.style.display = 'block';
  list.innerHTML = `<p class="text-muted">Loading received proposals...</p>`;

  const res = await apiCall(`/api/grants/${grantId}/applications`);

  if (!res.ok) {
    list.innerHTML = `<p class="text-rose-400">Error: ${res.data?.message || 'Access Forbidden'}</p>`;
    return;
  }

  if (res.data.length === 0) {
    list.innerHTML = `<p class="text-secondary">No applications have been submitted for this grant yet.</p>`;
    return;
  }

  list.innerHTML = res.data
    .map(
      (app) => `
    <div class="card p-3 mb-3" style="background: rgba(255,255,255,0.03);">
      <div class="d-flex justify-between items-center mb-2">
        <div>
          <strong>Applicant: ${escapeHtml(app.grantee_name)}</strong> (${escapeHtml(app.grantee_email)})
        </div>
        <span class="status-badge status-${app.status}">${app.status.replace('_', ' ')}</span>
      </div>
      <p class="font-mono text-secondary mb-3" style="font-size:0.85rem; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px;">
        ${escapeHtml(app.proposal)}
      </p>
      <div class="d-flex gap-2 items-center">
        <span style="font-size:0.8rem; color:var(--text-muted)">Update Decision:</span>
        <button class="btn btn-sm btn-glass" onclick="updateApplicationStatus(${app.id}, 'under_review', ${grantId}, '${escapeAttr(grantTitle)}')">Under Review</button>
        <button class="btn btn-sm btn-primary" style="background:#059669" onclick="updateApplicationStatus(${app.id}, 'approved', ${grantId}, '${escapeAttr(grantTitle)}')">Approve</button>
        <button class="btn btn-sm btn-ghost" style="color:#FDA4AF" onclick="updateApplicationStatus(${app.id}, 'rejected', ${grantId}, '${escapeAttr(grantTitle)}')">Reject</button>
      </div>
    </div>
  `
    )
    .join('');
};

window.updateApplicationStatus = async function (appId, status, grantId, grantTitle) {
  const res = await apiCall(`/api/applications/${appId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

  if (res.ok) {
    showToast(`Application #${appId} updated to ${status}`, 'success');
    window.loadGrantApplications(grantId, grantTitle);
  } else {
    showToast(res.data?.message || 'Failed to update status', 'error');
  }
};

window.deleteGrant = async function (grantId) {
  if (!confirm('Are you sure you want to delete this grant? This action cannot be undone.')) return;

  const res = await apiCall(`/api/grants/${grantId}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Grant deleted successfully', 'success');
    loadGrantorView();
    loadGrants();
  } else {
    showToast(res.data?.message || 'Failed to delete grant', 'error');
  }
};

// Load Admin View
async function loadAdminView() {
  const tbody = document.getElementById('admin-users-tbody');
  const res = await apiCall('/api/users');

  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">${res.data?.message || 'Access Forbidden (Requires ADMIN role)'}</td></tr>`;
    return;
  }

  state.adminUsers = res.data;

  tbody.innerHTML = state.adminUsers
    .map(
      (u) => `
    <tr>
      <td>#${u.id}</td>
      <td><strong>${escapeHtml(u.name)}</strong></td>
      <td>${escapeHtml(u.email)}</td>
      <td>${u.oauth_provider ? `<span class="badge badge-subtle">${u.oauth_provider}</span>` : 'Local'}</td>
      <td>
        <div class="roles-tags">
          ${(u.roles || []).map((r) => `<span class="role-tag role-${r.toLowerCase()}">${r}</span>`).join(' ')}
        </div>
      </td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-glass" onclick="assignRoleToUser(${u.id}, 'GRANTOR')">+ GRANTOR</button>
          <button class="btn btn-sm btn-glass" onclick="assignRoleToUser(${u.id}, 'ADMIN')">+ ADMIN</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');
}

window.assignRoleToUser = async function (userId, roleName) {
  const res = await apiCall(`/api/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleName }),
  });

  if (res.ok) {
    showToast(`Role ${roleName} assigned to User #${userId}! (HTTP 200)`, 'success');
    loadAdminView();
  } else {
    showToast(res.data?.message || 'Failed to assign role', 'error');
  }
};

// API Explorer Setup
function setupApiExplorer() {
  const methodTag = document.getElementById('console-method');
  const urlInput = document.getElementById('console-url');
  const payloadInput = document.getElementById('console-payload');
  const responseViewer = document.getElementById('console-response');
  const statusBadge = document.getElementById('response-status-badge');
  const timeBadge = document.getElementById('response-time-badge');

  document.querySelectorAll('.endpoint-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.endpoint-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const method = btn.getAttribute('data-method');
      const url = btn.getAttribute('data-url');

      methodTag.textContent = method;
      methodTag.className = `method-tag method-${method.toLowerCase()}`;
      urlInput.value = url;

      // Default sample payloads
      if (url.includes('/auth/register')) {
        payloadInput.value = JSON.stringify({ name: 'Alice Smith', email: 'alice@example.com', password: 'Password123!' }, null, 2);
      } else if (url.includes('/auth/login')) {
        payloadInput.value = JSON.stringify({ email: 'admin@securegrant.org', password: 'AdminSecurePassword123!' }, null, 2);
      } else if (url.includes('/users/') && url.includes('/roles')) {
        payloadInput.value = JSON.stringify({ roleName: 'GRANTOR' }, null, 2);
      } else if (url === '/api/grants' && method === 'POST') {
        payloadInput.value = JSON.stringify({ title: 'Quantum Computing Advancement Grant', description: 'Seed funding for novel quantum error correction research.', amount: 120000 }, null, 2);
      } else if (url.includes('/apply')) {
        payloadInput.value = JSON.stringify({ proposal: 'We propose to construct a topological fault-tolerant logical qubit prototype.' }, null, 2);
      } else {
        payloadInput.value = '';
      }
    });
  });

  document.getElementById('btn-execute-request').addEventListener('click', async () => {
    const method = methodTag.textContent;
    const url = urlInput.value;
    let body = null;

    if (['POST', 'PUT', 'PATCH'].includes(method) && payloadInput.value.trim()) {
      try {
        body = JSON.stringify(JSON.parse(payloadInput.value));
      } catch (e) {
        showToast('Invalid JSON in request payload', 'error');
        return;
      }
    }

    const start = performance.now();
    responseViewer.textContent = 'Executing request...';
    statusBadge.textContent = 'Status: ...';

    try {
      const res = await apiCall(url, { method, body });
      const duration = Math.round(performance.now() - start);

      statusBadge.textContent = `Status: ${res.status} ${res.ok ? 'OK' : 'Error'}`;
      statusBadge.className = `badge ${res.ok ? 'badge-admin' : 'badge-subtle'}`;
      if (res.status >= 200 && res.status < 300) {
        statusBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        statusBadge.style.color = '#6EE7B7';
      } else {
        statusBadge.style.backgroundColor = 'rgba(244, 63, 94, 0.2)';
        statusBadge.style.color = '#FDA4AF';
      }

      timeBadge.textContent = `${duration} ms`;
      responseViewer.textContent = JSON.stringify(res.data, null, 2);
    } catch (err) {
      statusBadge.textContent = 'Network Error';
      responseViewer.textContent = JSON.stringify({ error: err.message }, null, 2);
    }
  });
}

// Health Check Checker
async function checkApiHealth() {
  const badge = document.getElementById('api-health-badge');
  try {
    const res = await apiCall('/api/health');
    if (res.ok) {
      badge.innerHTML = `<span class="dot dot-success"></span> API: Healthy &bull; DB: ${res.data.services.database}`;
    } else {
      badge.innerHTML = `<span class="dot dot-admin"></span> API: Degraded`;
    }
  } catch (e) {
    badge.innerHTML = `<span class="dot dot-admin"></span> API: Offline`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
