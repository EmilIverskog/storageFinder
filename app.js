// --- State ---
let currentScreen = 'search';
let editingOriginalId = null;
let pendingImportData = null;

const STORAGE_KEY = 'warehouse_components';

// --- Data ---
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Navigation ---
function navigate(screen) {
  closeMenu();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  const titles = {
    search: 'Detalj Sökare',
    detail: 'Detalj',
    add: 'Lägg till detalj',
    edit: 'Ändra detalj',
    editForm: 'Ändra detalj',
    import: 'Importera data'
  };

  document.getElementById('headerTitle').textContent = titles[screen] || 'Detalj Sökare';
  currentScreen = screen;

  const left = document.getElementById('headerLeft');
  if (screen === 'search') {
    left.innerHTML = '';
    left.className = 'header-spacer';
  } else {
    const backTarget = screen === 'editForm' ? 'edit' : 'search';
    left.className = '';
    left.innerHTML = `<button class="btn-back" onclick="navigate('${backTarget}')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      Tillbaka
    </button>`;
  }

  document.getElementById('screen' + screen.charAt(0).toUpperCase() + screen.slice(1)).classList.add('active');

  // Reset screen-specific state
  if (screen === 'search') {
    document.getElementById('searchInput').value = '';
    renderSearchResults('');
    setTimeout(() => document.getElementById('searchInput').focus(), 100);
  } else if (screen === 'add') {
    document.getElementById('addId').value = '';
    document.getElementById('addLocation').value = '';
    setTimeout(() => document.getElementById('addId').focus(), 100);
  } else if (screen === 'edit') {
    document.getElementById('editSearchInput').value = '';
    renderEditSearchResults('');
    setTimeout(() => document.getElementById('editSearchInput').focus(), 100);
  } else if (screen === 'import') {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileLabel').innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span>Tryck för att välja JSON-fil</span>`;
    document.getElementById('importBtn').disabled = true;
    pendingImportData = null;
  }
}

// --- Menu ---
function toggleMenu() {
  document.getElementById('menuOverlay').classList.toggle('open');
}

function closeMenu() {
  document.getElementById('menuOverlay').classList.remove('open');
}

document.getElementById('menuBtn').addEventListener('click', toggleMenu);
document.getElementById('menuBackdrop').addEventListener('click', closeMenu);

// --- Search ---
function renderSearchResults(query) {
  const container = document.getElementById('searchResults');
  const data = loadData();

  if (data.length === 0 && !query) {
    container.innerHTML = '<div class="empty-state">Inga detaljer tillagda ännu.<br>Använd menyn för att lägga till detaljer.</div>';
    return;
  }

  const q = query.trim().toLowerCase();
  const matches = q ? data.filter(c => c.id.toLowerCase().includes(q)) : data;

  if (matches.length === 0) {
    container.innerHTML = '<div class="no-results">Inga resultat hittades</div>';
    return;
  }

  container.innerHTML = '<div class="results-list">' + matches.map(c =>
    `<div class="result-item" onclick="showDetail('${escHtml(c.id)}')">
      <span class="result-id">${escHtml(c.id)}</span>
      <span class="result-arrow">&rarr;</span>
      <span class="result-location">${escHtml(c.location)}</span>
    </div>`
  ).join('') + '</div>' +
  `<div class="count-badge">${matches.length} detalj${matches.length !== 1 ? 'er' : ''}</div>`;
}

document.getElementById('searchInput').addEventListener('input', e => {
  renderSearchResults(e.target.value);
});

function showDetail(id) {
  const data = loadData();
  const comp = data.find(c => c.id === id);
  if (!comp) return;
  document.getElementById('detailId').textContent = comp.id;
  document.getElementById('detailLocation').textContent = comp.location;
  navigate('detail');
}

// --- Add ---
function saveNew() {
  const id = document.getElementById('addId').value.trim();
  const location = document.getElementById('addLocation').value.trim();
  if (!id || !location) { toast('Fyll i alla fält'); return; }

  const data = loadData();
  if (data.some(c => c.id === id)) { toast('Detalj ID finns redan'); return; }

  data.push({ id, location });
  saveData(data);
  toast('Detalj sparad');
  navigate('search');
}

// --- Edit ---
function renderEditSearchResults(query) {
  const container = document.getElementById('editSearchResults');
  const data = loadData();
  const q = query.trim().toLowerCase();

  if (!q) { container.innerHTML = ''; return; }

  const matches = data.filter(c => c.id.toLowerCase().includes(q));

  if (matches.length === 0) {
    container.innerHTML = '<div class="no-results">Inga resultat hittades</div>';
    return;
  }

  container.innerHTML = matches.map(c =>
    `<div class="result-item" onclick="openEditForm('${escHtml(c.id)}')">
      <span class="result-id">${escHtml(c.id)}</span>
      <span class="result-arrow">&rarr;</span>
      <span class="result-location">${escHtml(c.location)}</span>
    </div>`
  ).join('');
}

document.getElementById('editSearchInput').addEventListener('input', e => {
  renderEditSearchResults(e.target.value);
});

function openEditForm(id) {
  const data = loadData();
  const comp = data.find(c => c.id === id);
  if (!comp) return;

  editingOriginalId = comp.id;
  document.getElementById('editId').value = comp.id;
  document.getElementById('editLocation').value = comp.location;
  navigate('editForm');
}

function saveEdit() {
  const newId = document.getElementById('editId').value.trim();
  const newLocation = document.getElementById('editLocation').value.trim();
  if (!newId || !newLocation) { toast('Fyll i alla fält'); return; }

  const data = loadData();
  if (newId !== editingOriginalId && data.some(c => c.id === newId)) {
    toast('Detalj ID finns redan');
    return;
  }

  const idx = data.findIndex(c => c.id === editingOriginalId);
  if (idx === -1) return;

  data[idx] = { id: newId, location: newLocation };
  saveData(data);
  toast('Detalj uppdaterad');
  navigate('search');
}

function confirmDelete() {
  document.getElementById('deleteDialog').classList.add('open');
}

function deleteComponent() {
  const data = loadData().filter(c => c.id !== editingOriginalId);
  saveData(data);
  closeDialog('deleteDialog');
  toast('Detalj borttagen');
  navigate('search');
}

// --- Export ---
function exportData() {
  closeMenu();
  const data = loadData();
  if (data.length === 0) { toast('Ingen data att exportera'); return; }

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const filename = `detaljer_backup_${ts}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Data exporterad');
}

// --- Import ---
document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('fileLabel').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
    <span class="file-name">${escHtml(file.name)}</span>`;

  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!validateImportData(parsed)) {
        toast('Ogiltig filstruktur');
        pendingImportData = null;
        document.getElementById('importBtn').disabled = true;
        return;
      }
      pendingImportData = parsed;
      document.getElementById('importBtn').disabled = false;
    } catch {
      toast('Kunde inte läsa JSON-filen');
      pendingImportData = null;
      document.getElementById('importBtn').disabled = true;
    }
  };
  reader.readAsText(file);
});

function validateImportData(data) {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    item && typeof item === 'object' &&
    typeof item.id === 'string' && item.id.trim() !== '' &&
    typeof item.location === 'string' && item.location.trim() !== ''
  );
}

function confirmImport() {
  if (!pendingImportData) return;
  document.getElementById('importDialog').classList.add('open');
}

function doImport() {
  closeDialog('importDialog');
  saveData(pendingImportData);
  toast(`${pendingImportData.length} detaljer importerade`);
  pendingImportData = null;
  navigate('search');
}

// --- Dialogs ---
function closeDialog(id) {
  document.getElementById(id).classList.remove('open');
}

// --- Toast ---
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

// --- Utils ---
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// --- Init ---
renderSearchResults('');
