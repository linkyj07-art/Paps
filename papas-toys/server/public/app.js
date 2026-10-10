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
};

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

  $('[data-action="geocode"]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Geocoding…';
    try {
      const r = await api('/record-geocode', { method: 'POST', body: JSON.stringify({ limit: 100 }) });
      await refresh(true);
      setStatusNote(`Geocoded ${r.geocoded}, failed ${r.failed}, ${r.remaining} remaining`);
    } catch (err) {
      setStatusNote('Geocode error: ' + err.message);
    } finally {
      e.target.disabled = false;
      e.target.textContent = 'Run Geocoding';
    }
  });

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
  if (f.market) p.set('market', f.market);
  if (f.record_source) p.set('record_source', f.record_source);
  if (f.product) p.set('product', f.product);
  if (f.sub_source) p.set('sub_source', f.sub_source);
  if (f.geo_status) p.set('geo_status', f.geo_status);
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

async function loadFacets() {
  try {
    const facets = await api('/api/facets');
    const fill = (key) => {
      const sel = $(`[data-filter="${key}"]`);
      if (!sel || !facets[key]) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="">Any</option>' +
        facets[key].map((v) => `<option>${escapeHtml(v)}</option>`).join('');
      sel.value = cur;
    };
    ['market', 'record_source', 'product', 'sub_source', 'geo_status'].forEach(fill);
  } catch (_e) { /* non-fatal */ }
}

async function refresh(reset) {
  if (reset) { state.offset = 0; state.rows = []; }
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
  if (f.market) chips.push(chip('Market: ' + f.market, 'market'));
  if (f.record_source) chips.push(chip('Record Source: ' + f.record_source, 'record_source'));
  if (f.product) chips.push(chip('Product: ' + f.product, 'product'));
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
  // wire per-row controls
  $$('tr[data-id]').forEach((tr) => {
    const id = tr.getAttribute('data-id');
    $('[data-role="addr"]', tr).addEventListener('change', (e) => patch(id, { address: e.target.value }));
    $$('[data-ll]', tr).forEach((inp) => inp.addEventListener('change', () => {
      const lat = parseFloat($('[data-ll="lat"]', tr).value);
      const lng = parseFloat($('[data-ll="lng"]', tr).value);
      patch(id, { lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null });
    }));
    $('[data-action="hitlist"]', tr).addEventListener('click', () => patch(id, { hitlist: 1 }));
    $('[data-action="archive"]', tr).addEventListener('click', () => patch(id, { archived: 1 }, true));
    $('[data-role="open"]', tr).addEventListener('click', () => openDrawer(id));
  });
}

function rowHtml(r) {
  const geoClass = r.geo_status === 'Geocoded' || r.geo_status === 'Manual' ? 'geo-ok'
    : r.geo_status === 'Failed' ? 'geo-failed' : 'geo-needs';
  return `
    <tr data-id="${escapeHtml(r.id)}">
      <td><div class="rec-name" data-role="open">${escapeHtml(r.name || '(no name)')}</div>
          <div class="muted">${escapeHtml(r.market || '')}</div></td>
      <td class="muted">${fmtDate(r.uploaded_at)}</td>
      <td class="muted">${fmtDate(r.updated_at)}</td>
      <td>${escapeHtml(r.phone || '')}</td>
      <td><input class="addr-input" data-role="addr" value="${escapeAttr(r.address || '')}" /></td>
      <td><input class="ll-input" data-ll="lat" value="${r.lat ?? ''}" /></td>
      <td><input class="ll-input" data-ll="lng" value="${r.lng ?? ''}" /></td>
      <td class="geo ${geoClass}">${escapeHtml(r.geo_status || '')}</td>
      <td>${r.geo_fails ?? 0}</td>
      <td><div class="rowbtns">
        <button class="btn" data-action="hitlist">Hitlist</button>
        <button class="btn btn-danger" data-action="archive">Archive</button>
      </div></td>
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

  const contact = [
    field('Name', escapeHtml(r.name)),
    field('Company', escapeHtml(r.company)),
    field('Phone', r.phone ? link('tel:' + r.phone.replace(/[^0-9+]/g, ''), r.phone) : ''),
    field('Email', r.email ? link('mailto:' + r.email, r.email) : ''),
    field('Address', escapeHtml(r.address)),
    field('City', escapeHtml(r.city)),
  ].join('');

  const lead = [
    field('Market', escapeHtml(r.market)),
    field('Product', escapeHtml(r.product)),
    field('Record Source', escapeHtml(r.record_source)),
    field('Sub Source', escapeHtml(r.sub_source)),
    field('Comp App Date', escapeHtml(r.comp_app_date)),
  ].join('');

  const meta = [
    field('Scheduled', r.scheduled_at ? fmtDate(r.scheduled_at) : '<span class="muted">Not scheduled</span>'),
    field('Uploaded', fmtDate(r.uploaded_at)),
    field('Last Updated', fmtDate(r.updated_at)),
    field('Hitlist', r.hitlist ? 'Yes' : 'No'),
    field('Archived', r.archived ? 'Yes' : 'No'),
    field('Record ID', escapeHtml(r.id)),
  ].join('');

  $('[data-role="d-body"]').innerHTML = `
    <div class="d-section"><h3>Contact</h3><div class="d-grid">${contact}</div></div>
    <div class="d-section"><h3>Lead</h3><div class="d-grid">${lead}</div></div>
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
      <button class="btn" data-d-action="hitlist">${r.hitlist ? 'On Hitlist ✓' : 'Add to Hitlist'}</button>
      <button class="btn btn-danger" data-d-action="archive">${r.archived ? 'Archived' : 'Archive'}</button>
    </div>
    <details class="d-raw"><summary>Raw captured data</summary><pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre></details>
  `;

  const body = $('[data-role="d-body"]');
  const h = $('[data-d-action="hitlist"]', body);
  const a = $('[data-d-action="archive"]', body);
  const s = $('[data-d-action="schedule"]', body);
  const u = $('[data-d-action="unschedule"]', body);
  if (h) h.addEventListener('click', async () => { await patch(id, { hitlist: r.hitlist ? 0 : 1 }); openDrawer(id); });
  if (a) a.addEventListener('click', async () => { await patch(id, { archived: 1 }, true); closeDrawer(); });
  if (s) s.addEventListener('click', async () => {
    const v = $('[data-role="sched-input"]', body).value;
    if (!v) { setStatusNote('Pick a date/time first'); return; }
    await patch(id, { scheduled_at: new Date(v).toISOString() });
    openDrawer(id);
  });
  if (u) u.addEventListener('click', async () => { await patch(id, { scheduled_at: null }); openDrawer(id); });

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
  else { delete state.filters[key]; const el = $(`[data-filter="${key}"]`); if (el) el.value = ''; }
  refresh(true);
});
