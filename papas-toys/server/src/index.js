'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const auth = require('./auth');
const { requireAuth } = auth;
const { normalizeRow } = require('./normalize');
const { processQueue } = require('./geocode');

auth.seedAdmin();

const PORT = Number(process.env.PORT || 8080);
const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// ----- health -----
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ===== Auth endpoints (used by the extension popup AND the dashboard) =====

// POST /auth/login  { email, password } -> { token, refreshToken, expiresAt, email }
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  try {
    res.json(auth.login(email, password));
  } catch (err) {
    res.status(err.status || 400).json({ error: String(err.message || err) });
  }
});

// POST /auth/refresh  { refreshToken } -> fresh tokens
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  try {
    res.json(auth.refresh(refreshToken));
  } catch (err) {
    res.status(err.status || 400).json({ error: String(err.message || err) });
  }
});

// POST /auth/register  { email, password }  (protected: needs ADMIN_SIGNUP_TOKEN)
app.post('/auth/register', (req, res) => {
  const token = req.get('x-admin-token') || '';
  if (!process.env.ADMIN_SIGNUP_TOKEN || token !== process.env.ADMIN_SIGNUP_TOKEN) {
    return res.status(403).json({ error: 'Registration is disabled or token is wrong' });
  }
  const { email, password } = req.body || {};
  try {
    const user = auth.createUser(email, password);
    return res.json({ ok: true, user });
  } catch (err) {
    return res.status(400).json({ error: String(err.message || err) });
  }
});

// ----- upsert helpers -----
const getExisting = db.prepare('SELECT id, address FROM records WHERE id = ?');
const insertRecord = db.prepare(`
  INSERT INTO records
    (id, name, phone, email, company, address, city, market, product,
     record_source, sub_source, comp_app_date, lead_url, raw, uploaded_at, updated_at)
  VALUES
    (@id, @name, @phone, @email, @company, @address, @city, @market, @product,
     @record_source, @sub_source, @comp_app_date, @lead_url, @raw, @now, @now)
`);
const updateRecord = db.prepare(`
  UPDATE records SET
    name = @name, phone = @phone, email = @email, company = @company,
    address = @address, city = @city, market = @market, product = @product,
    record_source = @record_source, sub_source = @sub_source,
    comp_app_date = @comp_app_date, lead_url = @lead_url, raw = @raw,
    updated_at = @now,
    geo_status = CASE WHEN @addressChanged = 1 THEN 'Needs Geocoding' ELSE geo_status END,
    geo_fails  = CASE WHEN @addressChanged = 1 THEN 0 ELSE geo_fails END
  WHERE id = @id
`);

const upsertAll = db.transaction((rows) => {
  let created = 0;
  let updated = 0;
  const skipped = [];
  for (const raw of rows) {
    const rec = normalizeRow(raw);
    if (!rec) {
      skipped.push({ reason: 'no stable id', row: raw && raw.leadName });
      continue;
    }
    const now = new Date().toISOString();
    const existing = getExisting.get(rec.id);
    if (existing) {
      const addressChanged = (existing.address || '') !== (rec.address || '') ? 1 : 0;
      updateRecord.run({ ...rec, now, addressChanged });
      updated += 1;
    } else {
      insertRecord.run({ ...rec, now });
      created += 1;
    }
  }
  return { created, updated, skipped };
});

// ===== Extension endpoints =====

// POST /record-upload  { rows, geocode, queueGeocode, googleFallback }
app.post('/record-upload', requireAuth, async (req, res) => {
  const body = req.body || {};
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows) return res.status(400).json({ error: 'rows must be an array' });
  if (!rows.length) return res.status(400).json({ error: 'No records provided' });
  if (rows.length > 1000) return res.status(413).json({ error: 'Too many records (max 1000)' });

  let result;
  try {
    result = upsertAll(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed', detail: String((err && err.message) || err) });
  }

  // Queue geocoding (best effort, in the background) when asked.
  let queued = 0;
  if (body.queueGeocode !== false) {
    queued = db
      .prepare(
        `SELECT COUNT(*) AS n FROM records
         WHERE archived = 0 AND geo_status IN ('Needs Geocoding','Failed')
           AND address IS NOT NULL AND TRIM(address) <> ''`
      )
      .get().n;
    const googleFallback = body.googleFallback !== false;
    setImmediate(() => {
      processQueue({ limit: 50, googleFallback }).catch(() => {});
    });
  }

  res.json({
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    geocoding: { queued },
  });
});

// POST /record-geocode  -> run the geocoding queue now
app.post('/record-geocode', requireAuth, async (req, res) => {
  const body = req.body || {};
  const limit = Math.min(Number(body.limit || 50), 200);
  const googleFallback = body.googleFallback !== false;
  try {
    const summary = await processQueue({ limit, googleFallback });
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ error: 'Geocode run failed', detail: String((err && err.message) || err) });
  }
});

// ===== Dashboard API =====

function buildWhere(q) {
  const where = [];
  const params = {};
  // Needs Fix tab = anything not cleanly geocoded.
  if (q.tab === 'needsfix') {
    where.push(`(geo_status <> 'Geocoded' OR lat IS NULL OR lng IS NULL)`);
  }
  if (q.archived === 'true') where.push('archived = 1');
  else if (q.archived === 'all') { /* no filter */ }
  else where.push('archived = 0');

  if (q.market) { where.push('market = @market'); params.market = q.market; }
  if (q.record_source) { where.push('record_source = @record_source'); params.record_source = q.record_source; }
  if (q.product) { where.push('product = @product'); params.product = q.product; }
  if (q.geo_status) { where.push('geo_status = @geo_status'); params.geo_status = q.geo_status; }
  if (q.hitlist === 'true') where.push('hitlist = 1');

  if (q.search) {
    where.push(`(
      name LIKE @search OR phone LIKE @search OR email LIKE @search OR
      company LIKE @search OR address LIKE @search OR market LIKE @search
    )`);
    params.search = '%' + q.search + '%';
  }
  return { clause: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

// GET /api/records?search=&market=&record_source=&tab=&archived=&limit=&offset=
app.get('/api/records', requireAuth, (req, res) => {
  const q = req.query || {};
  const limit = Math.min(Number(q.limit || 100), 500);
  const offset = Math.max(Number(q.offset || 0), 0);
  const { clause, params } = buildWhere(q);

  const total = db.prepare(`SELECT COUNT(*) AS n FROM records ${clause}`).get(params).n;
  const rows = db
    .prepare(
      `SELECT * FROM records ${clause} ORDER BY uploaded_at DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });
  res.json({ total, limit, offset, rows });
});

// Distinct values for filter dropdowns.
app.get('/api/facets', requireAuth, (_req, res) => {
  const distinct = (col) =>
    db
      .prepare(`SELECT DISTINCT ${col} AS v FROM records WHERE ${col} IS NOT NULL AND TRIM(${col}) <> '' ORDER BY ${col}`)
      .all()
      .map((r) => r.v);
  res.json({
    market: distinct('market'),
    record_source: distinct('record_source'),
    product: distinct('product'),
    sub_source: distinct('sub_source'),
    geo_status: distinct('geo_status'),
  });
});

// PATCH /api/records/:id  { address?, lat?, lng?, archived?, hitlist? }
const patchable = ['address', 'lat', 'lng', 'archived', 'hitlist'];
app.patch('/api/records/:id', requireAuth, (req, res) => {
  const body = req.body || {};
  const sets = [];
  const params = { id: req.params.id, now: new Date().toISOString() };
  for (const key of patchable) {
    if (key in body) {
      sets.push(`${key} = @${key}`);
      params[key] = key === 'archived' || key === 'hitlist' ? (body[key] ? 1 : 0) : body[key];
    }
  }
  if ('address' in body) {
    sets.push(`geo_status = 'Needs Geocoding'`, 'geo_fails = 0');
  }
  if (('lat' in body || 'lng' in body) && !('address' in body)) {
    sets.push(`geo_status = 'Manual'`);
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

  const info = db
    .prepare(`UPDATE records SET ${sets.join(', ')}, updated_at = @now WHERE id = @id`)
    .run(params);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true, record: db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id) });
});

// ----- static dashboard -----
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Papa's Toys server listening on http://localhost:${PORT}`);
  if (!auth.hasUsers()) {
    console.warn('[warn] no users exist yet — set ADMIN_EMAIL/ADMIN_PASSWORD, or use `npm run adduser`.');
  }
});

// Light background geocoder so the queue drains without manual pokes.
setInterval(() => {
  processQueue({ limit: 10 }).catch(() => {});
}, 60 * 1000);
