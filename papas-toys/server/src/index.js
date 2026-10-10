'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const { requireAuth, PROJECT_ID } = require('./auth');
const { normalizeRow } = require('./normalize');
const { processQueue } = require('./geocode');

const PORT = Number(process.env.PORT || 8080);
// Geocoding (address -> lat/lng for a map) is optional. Set GEOCODE_ENABLED=false
// to turn it off entirely — no background queue, no failed-geocode noise.
const GEOCODE_ENABLED = String(process.env.GEOCODE_ENABLED || 'true').toLowerCase() !== 'false';
const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// ----- health / config for the dashboard login -----
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/api/config', (_req, res) => {
  // The dashboard reads the Firebase web config it needs to sign users in.
  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_WEB_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || (PROJECT_ID ? `${PROJECT_ID}.firebaseapp.com` : ''),
      projectId: PROJECT_ID || '',
    },
  });
});

// ----- upsert helpers -----
const getExisting = db.prepare('SELECT id, address FROM records WHERE id = ?');
const insertRecord = db.prepare(`
  INSERT INTO records
    (id, name, phone, email, company, address, city, market, product,
     record_source, sub_source, comp_app_date, comp_app_date_iso, lead_url, raw, uploaded_at, updated_at)
  VALUES
    (@id, @name, @phone, @email, @company, @address, @city, @market, @product,
     @record_source, @sub_source, @comp_app_date, @comp_app_date_iso, @lead_url, @raw, @now, @now)
`);
const updateRecord = db.prepare(`
  UPDATE records SET
    name = @name, phone = @phone, email = @email, company = @company,
    address = @address, city = @city, market = @market, product = @product,
    record_source = @record_source, sub_source = @sub_source,
    comp_app_date = @comp_app_date, comp_app_date_iso = @comp_app_date_iso,
    lead_url = @lead_url, raw = @raw,
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

  // Queue geocoding (best effort, in the background) when asked — unless disabled.
  let queued = 0;
  if (GEOCODE_ENABLED && body.queueGeocode !== false) {
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
  if (!GEOCODE_ENABLED) {
    return res.json({ ok: true, disabled: true, processed: 0, geocoded: 0, failed: 0, remaining: 0 });
  }
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

const TZ = process.env.DISPLAY_TZ || 'America/Boise';

// The Y-M-D of "now" in the display timezone.
function todayYmd() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// UTC instant corresponding to local midnight of `ymd` in the display timezone.
function zonedMidnightUtc(ymd) {
  const utc = new Date(ymd + 'T00:00:00Z');
  const local = new Date(utc.toLocaleString('en-US', { timeZone: TZ }));
  const offset = utc.getTime() - local.getTime();
  return new Date(utc.getTime() + offset).toISOString();
}
// Resolve a date_range (+ optional custom from/to) to [startIso, endIso) or null.
function dateBounds(range, from, to) {
  const today = todayYmd();
  let startYmd;
  let endYmd;
  if (range === 'today') { startYmd = today; endYmd = addDays(today, 1); }
  else if (range === 'yesterday') { startYmd = addDays(today, -1); endYmd = today; }
  else if (range === 'tomorrow') { startYmd = addDays(today, 1); endYmd = addDays(today, 2); }
  else if (range === 'custom') {
    if (!from && !to) return null;
    startYmd = from || to;
    endYmd = addDays(to || from, 1);
  } else return null;
  return { start: zonedMidnightUtc(startYmd), end: zonedMidnightUtc(endYmd) };
}
const DATE_COLUMNS = { uploaded: 'uploaded_at', updated: 'updated_at', comp_app_date: 'comp_app_date_iso' };

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

  // Date range filter on the chosen date field.
  const col = DATE_COLUMNS[q.date_field] || 'uploaded_at';
  const bounds = dateBounds(q.date_range, q.date_from, q.date_to);
  if (bounds) {
    where.push(`${col} >= @date_start AND ${col} < @date_end`);
    params.date_start = bounds.start;
    params.date_end = bounds.end;
  }

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
const patchable = ['address', 'lat', 'lng', 'archived', 'hitlist', 'scheduled_at'];
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
  if (!PROJECT_ID) console.warn('[warn] FIREBASE_PROJECT_ID not set — auth will reject tokens.');
});

// Light background geocoder so the queue drains without manual pokes.
if (GEOCODE_ENABLED) setInterval(() => {
  processQueue({ limit: 10 }).catch(() => {});
}, 60 * 1000);
