'use strict';

const db = require('./db');

const PROVIDER = (process.env.GEOCODE_PROVIDER || 'nominatim').toLowerCase();
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const USER_AGENT = process.env.GEOCODE_USER_AGENT || 'papas-toys/1.0';
const MAX_FAILS = Number(process.env.GEOCODE_MAX_FAILS || 5);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Nominatim asks for <= 1 request/second. Serialize all calls through this.
let nominatimChain = Promise.resolve();
function throttleNominatim(fn) {
  const run = nominatimChain.then(fn);
  nominatimChain = run.then(() => sleep(1100), () => sleep(1100));
  return run;
}

async function geocodeNominatim(address) {
  return throttleNominatim(async () => {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(address);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error('Nominatim HTTP ' + res.status);
    const json = await res.json();
    if (!Array.isArray(json) || !json.length) throw new Error('No geocode match');
    return { lat: Number(json[0].lat), lng: Number(json[0].lon), provider: 'nominatim' };
  });
}

async function geocodeGoogle(address) {
  if (!GOOGLE_KEY) throw new Error('Google geocoding requested but GOOGLE_MAPS_API_KEY is not set');
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json?address=' +
    encodeURIComponent(address) +
    '&key=' +
    encodeURIComponent(GOOGLE_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Google HTTP ' + res.status);
  const json = await res.json();
  if (json.status !== 'OK' || !json.results || !json.results.length) {
    throw new Error('Google geocode status ' + json.status);
  }
  const loc = json.results[0].geometry.location;
  return { lat: Number(loc.lat), lng: Number(loc.lng), provider: 'google' };
}

// Geocode a single address string. `googleFallback` mirrors the extension's flag:
// try the primary provider, then fall back to Google if a key is configured.
async function geocodeAddress(address, { googleFallback = true } = {}) {
  if (!address || !address.trim()) throw new Error('Empty address');
  const primary = PROVIDER === 'google' ? geocodeGoogle : geocodeNominatim;
  try {
    return await primary(address);
  } catch (err) {
    if (googleFallback && PROVIDER !== 'google' && GOOGLE_KEY) {
      return geocodeGoogle(address);
    }
    throw err;
  }
}

const selectQueue = db.prepare(
  `SELECT id, address FROM records
   WHERE archived = 0
     AND geo_status IN ('Needs Geocoding', 'Failed')
     AND geo_fails < ?
     AND address IS NOT NULL AND TRIM(address) <> ''
   ORDER BY uploaded_at ASC
   LIMIT ?`
);
const markGeocoded = db.prepare(
  `UPDATE records SET lat = ?, lng = ?, geo_status = 'Geocoded', geo_last_error = NULL, updated_at = ? WHERE id = ?`
);
const markFailed = db.prepare(
  `UPDATE records SET geo_fails = geo_fails + 1, geo_status = 'Failed', geo_last_error = ?, updated_at = ? WHERE id = ?`
);

// Process up to `limit` pending records. Returns a small summary.
async function processQueue({ limit = 25, googleFallback = true } = {}) {
  const rows = selectQueue.all(MAX_FAILS, limit);
  let geocoded = 0;
  let failed = 0;
  for (const row of rows) {
    const now = new Date().toISOString();
    try {
      const { lat, lng } = await geocodeAddress(row.address, { googleFallback });
      markGeocoded.run(lat, lng, now, row.id);
      geocoded += 1;
    } catch (err) {
      markFailed.run(String((err && err.message) || err), now, row.id);
      failed += 1;
    }
  }
  const remaining = db
    .prepare(
      `SELECT COUNT(*) AS n FROM records
       WHERE archived = 0 AND geo_status IN ('Needs Geocoding','Failed')
         AND geo_fails < ? AND address IS NOT NULL AND TRIM(address) <> ''`
    )
    .get(MAX_FAILS).n;
  return { processed: rows.length, geocoded, failed, remaining };
}

module.exports = { geocodeAddress, processQueue, MAX_FAILS };
