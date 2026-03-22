/**
 * Alpaquitay Frontend — app.js
 * Handles auth, contract upload/verification, and contract listing.
 */

// ─── State ───
let token = null;
let currentContractId = null;

// ─── DOM References ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const authOverlay   = $('#auth-overlay');
const authForm      = $('#auth-form');
const authError     = $('#auth-error');
const app           = $('#app');
const userBadge     = $('#user-badge');

// Upload
const dropZone      = $('#drop-zone');
const fileInput     = $('#file-input');
const filePreview   = $('#file-preview');
const fileName      = $('#file-name');
const fileSize      = $('#file-size');
const fileRemove    = $('#file-remove');
const uploadFileBtn = $('#upload-file-btn');
const uploadTextBtn = $('#upload-text-btn');

// Results
const resultSection = $('#result-section');
const verifySection = $('#verify-section');

// ═══════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = $('#userId').value.trim();
  const apiKey = $('#apiKey').value.trim();

  if (!userId || !apiKey) return;

  setLoading('#auth-btn', true);
  authError.classList.add('hidden');

  try {
    const res = await api('/auth/token', {
      method: 'POST',
      body: { userId, apiKey }
    }, false);

    token = res.token;
    userBadge.textContent = res.userId;

    authOverlay.classList.add('hidden');
    app.classList.remove('hidden');

    loadContracts();
    toast('Sesión iniciada', 'success');
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  } finally {
    setLoading('#auth-btn', false);
  }
});

$('#logout-btn').addEventListener('click', () => {
  token = null;
  currentContractId = null;
  app.classList.add('hidden');
  authOverlay.classList.remove('hidden');
  resultSection.classList.add('hidden');
  verifySection.classList.add('hidden');
});

// ═══════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════

$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.add('hidden'));
    tab.classList.add('active');
    $(`#${tab.dataset.tab}`).classList.remove('hidden');
  });
});

// ═══════════════════════════════════════════════
//  FILE UPLOAD
// ═══════════════════════════════════════════════

let selectedFile = null;

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) selectFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) selectFile(fileInput.files[0]);
});

function selectFile(file) {
  const allowed = ['application/pdf', 'text/plain'];
  if (!allowed.includes(file.type)) {
    toast('Solo se permiten archivos PDF o TXT', 'error');
    return;
  }
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  filePreview.classList.remove('hidden');
  uploadFileBtn.classList.remove('hidden');
  dropZone.style.display = 'none';
}

fileRemove.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  uploadFileBtn.classList.add('hidden');
  dropZone.style.display = '';
});

uploadFileBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  setLoading('#upload-file-btn', true);

  try {
    const formData = new FormData();
    formData.append('contract', selectedFile);

    const res = await fetch('/api/contracts/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    const data = await res.json();
    showResult(data.contract);
    toast('Contrato subido correctamente', 'success');

    // Reset file input
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    uploadFileBtn.classList.add('hidden');
    dropZone.style.display = '';

    loadContracts();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading('#upload-file-btn', false);
  }
});

// ═══════════════════════════════════════════════
//  TEXT UPLOAD
// ═══════════════════════════════════════════════

uploadTextBtn.addEventListener('click', async () => {
  const content = $('#contract-text').value.trim();
  const title = $('#contract-title').value.trim();

  if (!content) {
    toast('Escribe el contenido del contrato', 'error');
    return;
  }

  setLoading('#upload-text-btn', true);

  try {
    const res = await api('/contracts/upload-text', {
      method: 'POST',
      body: { content, title: title || 'Sin título' }
    });

    showResult(res.contract);
    toast('Contrato de texto subido correctamente', 'success');

    $('#contract-text').value = '';
    $('#contract-title').value = '';

    loadContracts();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading('#upload-text-btn', false);
  }
});

// ═══════════════════════════════════════════════
//  SHOW RESULT
// ═══════════════════════════════════════════════

function showResult(contract) {
  currentContractId = contract.id;

  $('#result-id').textContent = contract.id;
  $('#result-name').textContent = contract.originalName;
  $('#result-hash').textContent = contract.sha256Hash;
  $('#result-date').textContent = formatDate(contract.hashGeneratedAt);
  $('#result-contract-status').textContent = contract.status;

  const statusBadge = $('#result-status');
  statusBadge.textContent = contract.status;
  statusBadge.className = 'badge ' + statusBadgeClass(contract.status);

  resultSection.classList.remove('hidden');
  verifySection.classList.add('hidden');

  // Scroll to result
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ═══════════════════════════════════════════════
//  VERIFY INTEGRITY
// ═══════════════════════════════════════════════

$('#verify-btn').addEventListener('click', async () => {
  if (!currentContractId) return;

  setLoading('#verify-btn', true);

  try {
    const res = await api(`/contracts/${currentContractId}/verify`, {
      method: 'POST'
    });

    const { integrity } = res;
    const verifyResult = $('#verify-result');

    if (integrity.isValid) {
      verifyResult.className = 'verify-result verified';
      verifyResult.innerHTML = `
        <h3>✅ Integridad Verificada</h3>
        <p>El contrato no ha sido modificado desde que fue subido.</p>
        <div class="hash-compare">
          Almacenado: ${integrity.storedHash}<br>
          Calculado:&nbsp; ${integrity.computedHash}
        </div>
        <p>Verificado: ${formatDate(integrity.verifiedAt)}</p>
      `;
    } else {
      verifyResult.className = 'verify-result tampered';
      verifyResult.innerHTML = `
        <h3>⚠️ Integridad Comprometida</h3>
        <p>El archivo ha sido modificado. Los hashes NO coinciden.</p>
        <div class="hash-compare">
          Almacenado: ${integrity.storedHash}<br>
          Calculado:&nbsp; ${integrity.computedHash}
        </div>
      `;
    }

    verifySection.classList.remove('hidden');
    verifySection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Update status badge
    const statusBadge = $('#result-status');
    statusBadge.textContent = integrity.status;
    statusBadge.className = 'badge ' + statusBadgeClass(integrity.status);
    $('#result-contract-status').textContent = integrity.status;

    toast(integrity.isValid ? 'Integridad verificada ✓' : 'Integridad comprometida ⚠️',
          integrity.isValid ? 'success' : 'error');

    loadContracts();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading('#verify-btn', false);
  }
});

// ═══════════════════════════════════════════════
//  COPY HASH
// ═══════════════════════════════════════════════

$('#copy-hash-btn').addEventListener('click', () => {
  const hash = $('#result-hash').textContent;
  navigator.clipboard.writeText(hash).then(() => {
    toast('Hash copiado al portapapeles', 'info');
  });
});

// ═══════════════════════════════════════════════
//  NEW CONTRACT
// ═══════════════════════════════════════════════

$('#new-contract-btn').addEventListener('click', () => {
  currentContractId = null;
  resultSection.classList.add('hidden');
  verifySection.classList.add('hidden');
  $('#upload-section').scrollIntoView({ behavior: 'smooth' });
});

// ═══════════════════════════════════════════════
//  CONTRACTS LIST
// ═══════════════════════════════════════════════

$('#refresh-btn').addEventListener('click', loadContracts);

async function loadContracts() {
  const list = $('#contracts-list');

  try {
    const res = await api('/contracts?limit=50');
    const { contracts } = res;

    if (!contracts || contracts.length === 0) {
      list.innerHTML = '<p class="empty-state">No hay contratos aún. ¡Sube el primero!</p>';
      return;
    }

    list.innerHTML = contracts.map(c => `
      <div class="contract-row" data-id="${c._id}">
        <span class="contract-row-icon">${c.mimeType === 'application/pdf' ? '📕' : '📄'}</span>
        <div class="contract-row-info">
          <div class="contract-row-name">${c.originalName}</div>
          <div class="contract-row-hash">${c.sha256Hash.slice(0, 24)}...</div>
        </div>
        <span class="badge ${statusBadgeClass(c.status)}">${c.status}</span>
        <span class="contract-row-date">${formatDate(c.createdAt)}</span>
      </div>
    `).join('');

    // Click to view details
    list.querySelectorAll('.contract-row').forEach(row => {
      row.addEventListener('click', async () => {
        const id = row.dataset.id;
        try {
          const res = await api(`/contracts/${id}`);
          showResult({
            id: res.contract.id,
            originalName: res.contract.originalName,
            sha256Hash: res.contract.sha256Hash,
            hashGeneratedAt: res.contract.hashGeneratedAt,
            status: res.contract.status
          });
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    list.innerHTML = `<p class="empty-state">Error cargando contratos</p>`;
  }
}

// ═══════════════════════════════════════════════
//  API HELPER
// ═══════════════════════════════════════════════

async function api(path, options = {}, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(`/api${path}`, config);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════

function setLoading(btnSelector, loading) {
  const btn = $(btnSelector);
  if (!btn) return;
  const span = btn.querySelector('span:first-child');
  const loader = btn.querySelector('.btn-loader');
  
  if (loading) {
    btn.disabled = true;
    if (span) span.style.opacity = '0.5';
    if (loader) loader.classList.remove('hidden');
  } else {
    btn.disabled = false;
    if (span) span.style.opacity = '1';
    if (loader) loader.classList.add('hidden');
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function statusBadgeClass(status) {
  switch (status) {
    case 'verified':
    case 'paid':
    case 'completed':
      return 'badge-green';
    case 'tampered':
    case 'failed':
      return 'badge-red';
    case 'processing':
      return 'badge-yellow';
    default:
      return 'badge-accent';
  }
}

function toast(message, type = 'info') {
  const container = $('#toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = '0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
