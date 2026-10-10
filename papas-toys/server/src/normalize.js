'use strict';

// Turn one incoming extension row into the flat shape we store.
// The extension sends "found" rows where the scraped contact fields live under
// `searchResult` (company/phone/email/city), with lead + appointment metadata at
// the top level. We stay tolerant of missing keys and alternate spellings.

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === 0) return '0';
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function pickId(row, sr) {
  return firstNonEmpty(
    sr.recordId,
    row.leadId,
    row.rowRecordId,
    row.leadUrl,
    sr.href
  );
}

function pickAddress(row, sr) {
  // Prefer a real street address if the preview exposed one; fall back to city.
  return firstNonEmpty(
    sr.address,
    sr.street,
    sr.mailingAddress,
    sr.streetAddress,
    row.address,
    sr.city,
    row.city
  );
}

function pickCompAppDate(row) {
  const dt = firstNonEmpty(row.appointmentDateTime);
  if (dt) return dt;
  const d = firstNonEmpty(row.appointmentDate);
  const t = firstNonEmpty(row.appointmentTime);
  return [d, t].filter(Boolean).join(' ').trim();
}

// Best-effort parse of the free-text appointment date into an ISO timestamp so it
// can be range-filtered. Returns '' if it can't be parsed.
function toIso(text) {
  if (!text) return '';
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? '' : new Date(ms).toISOString();
}

function normalizeRow(row) {
  const sr = (row && typeof row.searchResult === 'object' && row.searchResult) || {};
  const id = pickId(row || {}, sr);
  if (!id) return null; // cannot upsert without a stable key

  const compAppDate = pickCompAppDate(row || {});
  return {
    id,
    name: firstNonEmpty(sr.name, row.leadName),
    phone: firstNonEmpty(sr.phone, row.phone),
    email: firstNonEmpty(sr.email, row.email),
    company: firstNonEmpty(sr.company, row.company),
    address: pickAddress(row, sr),
    city: firstNonEmpty(sr.city, row.city),
    market: firstNonEmpty(row.market),
    product: firstNonEmpty(row.product, row.workType, sr.workType),
    record_source: firstNonEmpty(row.leadSource, row.recordSource),
    sub_source: firstNonEmpty(row.subSource),
    comp_app_date: compAppDate,
    comp_app_date_iso: toIso(compAppDate),
    lead_url: firstNonEmpty(row.leadUrl, sr.href),
    raw: JSON.stringify(row),
  };
}

module.exports = { normalizeRow, firstNonEmpty };
