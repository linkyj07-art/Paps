import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  auth: null,
  user: null,
  tab: 'all',
  limit: 100,
  offset: 0,
  rows: [],
  total: 0,
  filters: {},
  selected: new Set(),
};

async function downloadAuthed(path, fallbackName) {
  const token = state.user ? await state.user.getIdToken() : '';
  const res = await fetch(path, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cd = res.headers.get('Content-Disposition') || '';
  const m = /filename="([^"]+)"/.exec(cd);
  a.download = m ? m[1] : fallbackName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function api(path, opts = {}) {
  const token = state.user ? await state.user.getIdToken() : '';
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (_e) { /* ignore */ }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function show(view) {
  $$('[data-view]').forEach((el) => { el.hidden = el.getAttribute('data-view') !== view; });
}

// ---------- boot ----------
(async function boot() {
  let cfg;
  try {
    cfg = (await (await fetch('/api/config')).json()).firebase;
  } catch (_e) {
    document.body.innerHTML = '<p style="padding:40px">Could not load server config.</p>';
    return;
  }
  if (!cfg.apiKey || !cfg.projectId) {
    document.body.innerHTML =
      '<p style="padding:40px">Firebase web config is not set on the server ' +
      '(FIREBASE_WEB_API_KEY / FIREBASE_PROJECT_ID).</p>';
    return;
  }
  const app = initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
  });
  state.auth = getAuth(app);

  onAuthStateChanged(state.auth, async (user) => {
    state.user = user;
    if (user) {
      show('app');
      await loadFacets();
      await refresh(true);
    } else {
      show('login');
    }
  });

  wireEvents();
})();

// ---------- events ----------
function wireEvents() {
  $('[data-role="login-form"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('[data-role="login-error"]');
    errEl.textContent = '';
    try {
      await signInWithEmailAndPassword(state.auth, fd.get('email'), fd.get('password'));
    } catch (err) {
      errEl.textContent = (err && err.message) || 'Login failed';
    }
  });

  $('[data-action="signout"]').addEventListener('click', () => signOut(state.auth));
  $('[data-action="close-drawer"]').addEventListener('click', closeDrawer);
  $('[data-role="drawer-overlay"]').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  let searchTimer;
  $('[data-role="search"]').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const v = e.target.value.trim();
    searchTimer = setTimeout(() => { state.filters.search = v; refresh(true); }, 300);
  });

  $('[data-action="load-older"]').addEventListener('click', () => {
    state.offset += state.limit;
    refresh(false);
  });

  $('[data-action="export"]').addEventListener('click', async () => {
    try { await downloadAuthed('/api/export.csv?' + queryString(), 'bullsleads.csv'); }
    catch (err) { setStatusNote('Export failed: ' + err.message); }
  });
  $('[data-action="backup"]').addEventListener('click', async () => {
    try { await downloadAuthed('/api/backup', 'bullsleads-backup.json'); }
    catch (err) { setStatusNote('Backup failed: ' + err.message); }
  });

  // bulk action bar
  $('[data-role="select-all"]').addEventListener('change', (e) => {
    if (e.target.checked) state.rows.forEach((r) => state.selected.add(r.id));
    else state.selected.clear();
    renderRows();
  });
  $$('[data-bulk]').forEach((b) => b.addEventListener('click', async () => {
    const action = b.getAttribute('data-bulk');
    if (action === 'clear') { state.selected.clear(); renderRows(); return; }
    const ids = [...state.selected];
    if (!ids.length) return;
    if (action === 'archive' && !window.confirm(`Archive ${ids.length} lead(s)?`)) return;
    try {
      await api('/api/records/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) });
      state.selected.clear();
      await loadStats();
      await refresh(true);
    } catch (err) { setStatusNote('Bulk action failed: ' + err.message); }
  }));

  $('[data-action="purge-off-market"]').addEventListener('click', async () => {
    try {
      const { count } = await api('/api/admin/off-market-count');
      if (!count) { setStatusNote('No off-market leads to remove.'); return; }
      if (!window.confirm(`Delete ${count} lead(s) not in Boise / Twin Falls / Idaho Falls? This cannot be undone.`)) return;
      const r = await api('/api/admin/purge-off-market', { method: 'POST', body: '{}' });
      setStatusNote(`Removed ${r.deleted} off-market lead(s).`);
      await loadFacets();
      await refresh(true);
    } catch (err) {
      setStatusNote('Cleanup failed: ' + err.message);
    }
  });

  // Top-nav page switching (Records / Calendar / Routes)
  $$('.nav a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const page = a.getAttribute('href').replace('#', '');
    $$('.nav a').forEach((x) => x.classList.toggle('active', x === a));
    $$('[data-page]').forEach((s) => { s.hidden = s.getAttribute('data-page') !== page; });
    if (page === 'calendar') renderCalendar();
  }));

  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
    state.tab = t.getAttribute('data-tab');
    refresh(true);
  }));

  $$('[data-filter]').forEach((el) => {
    const key = el.getAttribute('data-filter');
    const ev = el.matches('select') ? 'change' : 'change';
    el.addEventListener(ev, () => {
      if (el.type === 'checkbox') state.filters[key] = el.checked;
      else state.filters[key] = el.value;
      if (key === 'date_range') {
        $('[data-role="custom-range"]').hidden = el.value !== 'custom';
      }
      // Don't query on a half-filled custom range; wait for both ends.
      if (state.filters.date_range === 'custom' && (!state.filters.date_from || !state.filters.date_to)) {
        if (key === 'date_from' || key === 'date_to') return;
      }
      refresh(true);
    });
  });
}

// ---------- data ----------
function queryString() {
  const f = state.filters;
  const p = new URLSearchParams();
  p.set('tab', state.tab);
  p.set('limit', state.limit);
  p.set('offset', state.offset);
  if (f.search) p.set('search', f.search);
  const multi = (k) => { if (Array.isArray(f[k]) && f[k].length) p.set(k, f[k].join(',')); };
  multi('market'); multi('record_source'); multi('product'); multi('sub_source');
  if (f.hitlist) p.set('hitlist', 'true');
  if (f.date_range) {
    p.set('date_field', f.date_field || 'comp_app_date');
    p.set('date_range', f.date_range);
    if (f.date_range === 'custom') {
      if (f.date_from) p.set('date_from', f.date_from);
      if (f.date_to) p.set('date_to', f.date_to);
    }
  }
  p.set('archived', f.show_archived ? 'all' : 'false');
  return p.toString();
}

const MS_KEYS = ['market', 'record_source', 'product', 'sub_source'];

async function loadFacets() {
  try {
    const facets = await api('/api/facets');
    MS_KEYS.forEach((key) => buildMultiSelect(key, facets[key] || []));
  } catch (_e) { /* non-fatal */ }
}

function buildMultiSelect(key, values) {
  const ms = $(`[data-ms="${key}"]`);
  if (!ms) return;
  const selected = new Set(state.filters[key] || []);
  const menu = $('.ms-menu', ms);
  menu.innerHTML = values.length
    ? values.map((v) => `
        <label class="ms-opt">
          <input type="checkbox" value="${escapeAttr(v)}" ${selected.has(v) ? 'checked' : ''} />
          <span>${escapeHtml(v)}</span>
        </label>`).join('')
    : '<div class="ms-empty">No options yet</div>';

  updateMsLabel(key);

  const toggle = $('.ms-toggle', ms);
  toggle.onclick = (e) => {
    e.stopPropagation();
    const open = !menu.hidden;
    $$('.ms-menu').forEach((m) => { m.hidden = true; });
    menu.hidden = open;
  };
  $$('input', menu).forEach((cb) => cb.addEventListener('change', () => {
    const vals = $$('input:checked', menu).map((c) => c.value);
    state.filters[key] = vals;
    updateMsLabel(key);
    refresh(true);
  }));
}

function updateMsLabel(key) {
  const ms = $(`[data-ms="${key}"]`);
  if (!ms) return;
  const vals = state.filters[key] || [];
  const label = $('.ms-label', ms);
  label.textContent = vals.length === 0 ? 'Any' : vals.length === 1 ? vals[0] : `${vals.length} selected`;
  ms.classList.toggle('ms-active', vals.length > 0);
}

// close any open multiselect menu when clicking elsewhere
document.addEventListener('click', () => { $$('.ms-menu').forEach((m) => { m.hidden = true; }); });

function activeFilterLabel() {
  const f = state.filters;
  if (f.date_range) {
    const labels = { yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow', custom: 'Custom range' };
    return labels[f.date_range] || 'Filtered';
  }
  if (state.tab === 'needsentry') return 'Needs Entry';
  return 'All leads';
}

async function loadStats() {
  try {
    const s = await api('/api/stats?' + queryString());
    const tiles = [
      ['Found leads', s.found],
      ['Needs entry', s.needsEntry],
      ['Scheduled today', s.scheduledToday],
      ['Scheduled this week', s.scheduledWeek],
      ['Hitlist', s.hitlist],
    ];
    const p = s.products || {};
    const prodDefs = [
      ['Roofing', p.roofing, 'prod-roof'],
      ['Windows', p.windows, 'prod-win'],
      ['Siding', p.siding, 'prod-side'],
      ['Bath', p.bath, 'prod-bath'],
      ['Other', p.other, 'prod-other'],
    ];
    const prodHtml = `
      <div class="prodbreak">
        <div class="prodbreak-head">Products — <strong>${escapeHtml(activeFilterLabel())}</strong> <span class="muted">(${p.total || 0} leads)</span></div>
        <div class="prodbreak-tiles">
          ${prodDefs.map(([l, n, cls]) => `<div class="ptile ${cls}"><div class="ptile-n">${n ?? 0}</div><div class="ptile-l">${l}</div></div>`).join('')}
        </div>
      </div>`;
    const marketTiles = (s.byMarket || []).slice(0, 3)
      .map((m) => `<div class="stat stat-sm"><div class="stat-n">${m.n}</div><div class="stat-l">${escapeHtml(m.market)}</div></div>`).join('');
    $('[data-role="stats"]').innerHTML =
      '<div class="stat-row">' +
      tiles.map(([l, n]) => `<div class="stat"><div class="stat-n">${n ?? 0}</div><div class="stat-l">${l}</div></div>`).join('') +
      marketTiles + '</div>' + prodHtml;
  } catch (_e) { /* non-fatal */ }
}

async function refresh(reset) {
  if (reset) { state.offset = 0; state.rows = []; loadStats(); }
  renderChips();
  setStatus('Loading…');
  try {
    const data = await api('/api/records?' + queryString());
    state.total = data.total;
    state.rows = reset ? data.rows : state.rows.concat(data.rows);
    renderRows();
  } catch (err) {
    setStatus('Error: ' + err.message);
  }
}

// ---------- render ----------
function renderChips() {
  const f = state.filters;
  const chips = [`<button class="chip chip-clear" data-action="clear">Clear filters</button>`];
  const msChip = (k, lbl) => { if (Array.isArray(f[k]) && f[k].length) chips.push(chip(lbl + ': ' + f[k].join(', '), k)); };
  msChip('market', 'Market');
  msChip('record_source', 'Record Source');
  msChip('product', 'Product');
  msChip('sub_source', 'Sub Source');
  if (f.date_range) {
    const labels = { yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow', custom: 'Custom' };
    const fieldLabels = { comp_app_date: 'Comp App Date', uploaded: 'Uploaded', updated: 'Last Updated' };
    let r = labels[f.date_range] || f.date_range;
    if (f.date_range === 'custom' && f.date_from && f.date_to) r = `${f.date_from} → ${f.date_to}`;
    chips.push(chip((fieldLabels[f.date_field] || 'Comp App Date') + ': ' + r, '__date'));
  }
  const el = $('[data-role="chips"]');
  el.innerHTML = chips.join('');
  $('[data-action="clear"]').addEventListener('click', clearFilters);
}
function chip(label, key) {
  return `<button class="chip" data-chip="${key}">${escapeHtml(label)} ✕</button>`;
}
function clearFilters() {
  state.filters = {};
  $$('[data-filter]').forEach((el) => { if (el.type === 'checkbox') el.checked = false; else el.value = el.querySelector('option') ? el.options[0].value : ''; });
  $$('.ms-menu input:checked').forEach((cb) => { cb.checked = false; });
  MS_KEYS.forEach(updateMsLabel);
  $('[data-role="custom-range"]').hidden = true;
  refresh(true);
}

function renderRows() {
  const tbody = $('[data-role="rows"]');
  if (!state.rows.length) {
    tbody.innerHTML = '';
    setStatus('No records.');
    return;
  }
  tbody.innerHTML = state.rows.map(rowHtml).join('');
  setStatus(`Showing ${state.rows.length} of ${state.total} records`);
  // row opens the detail, except clicks on the checkbox cell
  $$('tr[data-id]').forEach((tr) => {
    const id = tr.getAttribute('data-id');
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.cbcell')) return;
      openDrawer(id);
    });
    const cb = $('input[type="checkbox"]', tr);
    if (cb) cb.addEventListener('change', () => {
      if (cb.checked) state.selected.add(id); else state.selected.delete(id);
      renderBulkBar();
    });
  });
  const selAll = $('[data-role="select-all"]');
  if (selAll) selAll.checked = state.rows.length > 0 && state.rows.every((r) => state.selected.has(r.id));
  renderBulkBar();
}

function renderBulkBar() {
  const bar = $('[data-role="bulkbar"]');
  const n = state.selected.size;
  bar.hidden = n === 0;
  $('[data-role="bulk-count"]').textContent = `${n} selected`;
}

function isToday(iso) {
  if (!iso) return false;
  const tz = { timeZone: 'America/Boise', year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(iso).toLocaleDateString('en-CA', tz) === new Date().toLocaleDateString('en-CA', tz);
}

function rowHtml(r) {
  const flags = [r.hitlist ? '<span class="tag tag-hit">Hitlist</span>' : '',
    r.archived ? '<span class="tag">Archived</span>' : ''].join('');
  const checked = state.selected.has(r.id) ? 'checked' : '';
  const todayCls = isToday(r.scheduled_at) ? ' sched-today' : '';
  return `
    <tr data-id="${escapeHtml(r.id)}" class="rowlink${todayCls}">
      <td class="cbcell"><input type="checkbox" ${checked} /></td>
      <td><div class="rec-name">${escapeHtml(r.name || '(no name)')}</div>
          <div class="muted">${escapeHtml(r.market || '')} ${flags}</div></td>
      <td>${escapeHtml(r.company || '')}</td>
      <td>${escapeHtml(r.phone || '')}</td>
      <td class="muted">${escapeHtml(r.email || '')}</td>
      <td>${escapeHtml(r.product || '')}</td>
      <td class="muted">${escapeHtml(r.comp_app_date || '')}</td>
      <td class="muted">${r.scheduled_at ? '<span class="sched-pill">' + fmtDate(r.scheduled_at) + '</span>' : ''}</td>
      <td class="muted">${fmtDate(r.uploaded_at)}</td>
      <td class="chev">›</td>
    </tr>`;
}

async function patch(id, body, removeRow = false) {
  try {
    const { record } = await api('/api/records/' + encodeURIComponent(id), {
      method: 'PATCH', body: JSON.stringify(body),
    });
    const idx = state.rows.findIndex((x) => x.id === id);
    if (removeRow && !state.filters.show_archived) {
      if (idx >= 0) state.rows.splice(idx, 1);
      renderRows();
    } else if (idx >= 0) {
      state.rows[idx] = record;
      renderRows();
    }
  } catch (err) {
    setStatusNote('Update failed: ' + err.message);
  }
}

// ---------- calendar ----------
async function renderCalendar() {
  const el = $('[data-role="calendar"]');
  el.innerHTML = '<div class="status">Loading…</div>';
  try {
    const data = await api('/api/records?scheduled=true&limit=500');
    const rows = (data.rows || []).filter((r) => r.scheduled_at);
    if (!rows.length) { el.innerHTML = '<div class="status">No scheduled leads yet.</div>'; return; }
    rows.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    const groups = {};
    rows.forEach((r) => { (groups[calDateKey(r.scheduled_at)] = groups[calDateKey(r.scheduled_at)] || []).push(r); });
    el.innerHTML = Object.entries(groups).map(([day, items]) => `
      <div class="cal-day">
        <div class="cal-date">${escapeHtml(day)}</div>
        <div class="cal-items">
          ${items.map((r) => `
            <button class="cal-item" data-id="${escapeAttr(r.id)}">
              <span class="cal-time">${escapeHtml(calTime(r.scheduled_at))}</span>
              <span class="cal-name">${escapeHtml(r.name || '(no name)')}</span>
              <span class="cal-appt">${r.comp_app_date ? 'Appt: ' + escapeHtml(r.comp_app_date) : ''}</span>
            </button>`).join('')}
        </div>
      </div>`).join('');
    $$('.cal-item', el).forEach((b) => b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      if (!state.rows.find((x) => x.id === id)) state.rows.push(rows.find((x) => x.id === id));
      openDrawer(id);
    }));
  } catch (err) {
    el.innerHTML = '<div class="status">Error: ' + escapeHtml(err.message) + '</div>';
  }
}
function calDateKey(iso) {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Boise', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}
function calTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Boise', hour: 'numeric', minute: '2-digit' });
}

// ---------- lead detail drawer ----------
function geoBadge(status) {
  const cls = status === 'Geocoded' || status === 'Manual' ? 'badge-ok'
    : status === 'Failed' ? 'badge-bad' : 'badge-warn';
  return `<span class="badge ${cls}">${escapeHtml(status || 'Unknown')}</span>`;
}
function field(k, v) {
  if (v == null || v === '') return '';
  return `<div class="d-field"><div class="k">${escapeHtml(k)}</div><div class="v">${v}</div></div>`;
}
function link(url, label) {
  if (!url) return '';
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(label || url)}</a>`;
}

function openDrawer(id) {
  const r = state.rows.find((x) => x.id === id);
  if (!r) return;
  $('[data-role="d-name"]').textContent = r.name || '(no name)';
  $('[data-role="d-sub"]').textContent = [r.company, r.market].filter(Boolean).join(' · ');

  let raw = {};
  try { raw = r.raw ? JSON.parse(r.raw) : {}; } catch (_e) { /* ignore */ }

  const isNotFound = r.lead_status === 'not_found';
  const inp = (key, label, val) =>
    `<label class="d-in"><span>${label}</span><input class="control" data-edit="${key}" value="${escapeAttr(val || '')}" /></label>`;

  // Not-found leads get a fill-in form (manual entry). Found leads are read-only.
  const editForm = [
    inp('name', 'Name', r.name),
    inp('company', 'Company', r.company),
    inp('phone', 'Phone', r.phone),
    inp('email', 'Email', r.email),
    inp('address', 'Address', r.address),
    inp('city', 'City', r.city),
    inp('market', 'Market', r.market),
    inp('product', 'Product', r.product),
    inp('record_source', 'Record Source', r.record_source),
    inp('sub_source', 'Sub Source', r.sub_source),
    inp('comp_app_date', 'Comp App Date', r.comp_app_date),
  ].join('');

  const readView = `
    <div class="d-section"><h3>Contact</h3><div class="d-grid">${[
      field('Name', escapeHtml(r.name)),
      field('Company', escapeHtml(r.company)),
      field('Phone', r.phone ? link('tel:' + r.phone.replace(/[^0-9+]/g, ''), r.phone) : ''),
      field('Email', r.email ? link('mailto:' + r.email, r.email) : ''),
      field('Address', escapeHtml(r.address)),
      field('City', escapeHtml(r.city)),
    ].join('')}</div></div>
    <div class="d-section"><h3>Lead</h3><div class="d-grid">${[
      field('Market', escapeHtml(r.market)),
      field('Product', escapeHtml(r.product)),
      field('Record Source', escapeHtml(r.record_source)),
      field('Sub Source', escapeHtml(r.sub_source)),
      field('Comp App Date', escapeHtml(r.comp_app_date)),
    ].join('')}</div></div>`;

  const meta = [
    field('Scheduled', r.scheduled_at ? fmtDate(r.scheduled_at) : '<span class="muted">Not scheduled</span>'),
    field('Uploaded', fmtDate(r.uploaded_at)),
    field('Last Updated', fmtDate(r.updated_at)),
    field('Status', isNotFound ? '<span class="badge badge-warn">Needs entry</span>' : '<span class="badge badge-ok">Found</span>'),
    field('Record ID', escapeHtml(r.id)),
  ].join('');

  $('[data-role="d-body"]').innerHTML = `
    ${isNotFound
      ? `<div class="d-note">This lead was not found by the scanner. Fill in the details below, then mark it as entered to move it into All Leads.</div>
         <div class="d-section"><h3>Lead details</h3><div class="d-form">${editForm}</div>
           <button class="btn btn-dark" data-d-action="save">Save details</button>
         </div>`
      : readView}
    <div class="d-section"><h3>Status</h3><div class="d-grid">${meta}</div></div>
    <div class="d-section">
      <h3>Schedule</h3>
      <div class="d-schedule">
        <input type="datetime-local" class="control" data-role="sched-input" value="${toLocalInput(r.scheduled_at)}" />
        <button class="btn btn-dark" data-d-action="schedule">Schedule</button>
        ${r.scheduled_at ? '<button class="btn" data-d-action="unschedule">Clear</button>' : ''}
      </div>
    </div>
    <div class="d-actions">
      ${isNotFound ? '<button class="btn btn-dark" data-d-action="entered">Mark as entered</button>' : ''}
      <button class="btn" data-d-action="hitlist">${r.hitlist ? 'On Hitlist ✓' : 'Add to Hitlist'}</button>
      <button class="btn btn-danger" data-d-action="archive">${r.archived ? 'Archived' : 'Archive'}</button>
    </div>
    <details class="d-raw"><summary>Raw captured data</summary><pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre></details>
  `;

  const body = $('[data-role="d-body"]');
  const on = (sel, fn) => { const el = $(sel, body); if (el) el.addEventListener('click', fn); };

  on('[data-d-action="save"]', async () => {
    const patchBody = {};
    $$('[data-edit]', body).forEach((el) => { patchBody[el.getAttribute('data-edit')] = el.value.trim(); });
    await patch(id, patchBody);
    setStatusNote('Saved');
    openDrawer(id);
  });
  on('[data-d-action="entered"]', async () => {
    // Save any edits AND flip status to found so it moves to All Leads.
    const patchBody = { lead_status: 'found' };
    $$('[data-edit]', body).forEach((el) => { patchBody[el.getAttribute('data-edit')] = el.value.trim(); });
    await patch(id, patchBody, true);
    closeDrawer();
  });
  on('[data-d-action="hitlist"]', async () => { await patch(id, { hitlist: r.hitlist ? 0 : 1 }); openDrawer(id); });
  on('[data-d-action="archive"]', async () => { await patch(id, { archived: 1 }, true); closeDrawer(); });
  on('[data-d-action="schedule"]', async () => {
    const v = $('[data-role="sched-input"]', body).value;
    if (!v) { setStatusNote('Pick a date/time first'); return; }
    await patch(id, { scheduled_at: new Date(v).toISOString() });
    openDrawer(id);
  });
  on('[data-d-action="unschedule"]', async () => { await patch(id, { scheduled_at: null }); openDrawer(id); });

  $('[data-role="drawer"]').hidden = false;
  $('[data-role="drawer-overlay"]').hidden = false;
}
function closeDrawer() {
  $('[data-role="drawer"]').hidden = true;
  $('[data-role="drawer-overlay"]').hidden = true;
}

// ---------- helpers ----------
function setStatus(msg) { $('[data-role="status"]').textContent = msg; }
function setStatusNote(msg) { const el = $('[data-role="status"]'); el.textContent = msg; }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('en-US', { timeZone: 'America/Boise', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escapeAttr(s) { return escapeHtml(s); }

// chip remove (delegated)
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-chip]');
  if (!c) return;
  const key = c.getAttribute('data-chip');
  if (key === '__date') {
    delete state.filters.date_range; delete state.filters.date_from; delete state.filters.date_to;
    const s = $('[data-filter="date_range"]'); if (s) s.value = '';
    $('[data-role="custom-range"]').hidden = true;
  }
  else if (MS_KEYS.includes(key)) {
    delete state.filters[key];
    const ms = $(`[data-ms="${key}"]`);
    if (ms) $$('.ms-menu input:checked', ms).forEach((cb) => { cb.checked = false; });
    updateMsLabel(key);
  }
  else { delete state.filters[key]; const el = $(`[data-filter="${key}"]`); if (el) el.value = ''; }
  refresh(true);
});
