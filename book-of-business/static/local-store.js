"use strict";
// In-browser replacement for server.py, used by the standalone
// book-of-business.html. Mirrors the server's API so app.js works unchanged.
// Data lives in this browser's localStorage under STORAGE_KEY.

(function () {
  const STORAGE_KEY = "book-of-business.v1";
  const CLIENT_FIELDS = ["first_name", "last_name", "dob", "phone", "email",
    "address", "city", "state", "zip", "source", "notes"];
  const POLICY_FIELDS = ["client_id", "carrier", "product_type", "product_name", "policy_number",
    "status", "face_amount", "annual_premium", "payment_mode", "app_date",
    "effective_date", "commission_rate", "commission_paid", "chargeback",
    "beneficiary", "follow_up_date", "notes"];
  const NUMERIC = new Set(["face_amount", "annual_premium", "commission_rate", "commission_paid", "chargeback"]);
  const CLIENT_CSV_PREFIXED = { notes: "client_notes" };
  const CSV_COLUMNS = CLIENT_FIELDS.map((f) => CLIENT_CSV_PREFIXED[f] || f)
    .concat(POLICY_FIELDS.filter((f) => f !== "client_id"));

  class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }

  const now = () => new Date().toISOString().slice(0, 19);
  function toNumber(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    const t = String(v).trim().replace(/[$,%]/g, "");
    if (!t) return 0;
    const n = Number(t);
    if (!Number.isFinite(n)) throw new HttpError(400, `not a number: '${v}'`);
    return n;
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (d && Array.isArray(d.clients) && Array.isArray(d.policies)) return d;
    } catch {}
    return { nextClientId: 1, nextPolicyId: 1, clients: [], policies: [] };
  }
  function save(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      throw new HttpError(500, "Couldn't save in this browser (storage full or blocked). Export a CSV backup now.");
    }
  }

  function cleanClient(data) {
    const c = {};
    CLIENT_FIELDS.forEach((f) => (c[f] = String(data[f] ?? "").trim()));
    if (!c.first_name && !c.last_name) throw new HttpError(400, "Client needs a first or last name");
    return c;
  }
  function cleanPolicy(db, data) {
    const p = {};
    POLICY_FIELDS.forEach((f) => {
      if (NUMERIC.has(f)) p[f] = toNumber(data[f]);
      else if (f === "client_id") p[f] = parseInt(data[f], 10);
      else p[f] = String(data[f] ?? "").trim();
    });
    if (!p.client_id || !db.clients.some((c) => c.id === p.client_id)) throw new HttpError(400, "Policy needs a valid client");
    return p;
  }

  function saveClient(db, data, id) {
    const c = cleanClient(data);
    if (id == null) {
      const rec = { id: db.nextClientId++, ...c, created_at: now(), updated_at: now() };
      db.clients.push(rec);
      return rec.id;
    }
    const rec = db.clients.find((x) => x.id === id);
    if (!rec) throw new HttpError(404, "Client not found");
    Object.assign(rec, c, { updated_at: now() });
    return id;
  }
  function savePolicy(db, data, id) {
    const p = cleanPolicy(db, data);
    if (id == null) {
      const rec = { id: db.nextPolicyId++, ...p, created_at: now(), updated_at: now() };
      db.policies.push(rec);
      return rec.id;
    }
    const rec = db.policies.find((x) => x.id === id);
    if (!rec) throw new HttpError(404, "Policy not found");
    Object.assign(rec, p, { updated_at: now() });
    return id;
  }

  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function listClients(db) {
    return db.clients.map((c) => {
      const ps = db.policies.filter((p) => p.client_id === c.id);
      return {
        ...c,
        policy_count: ps.length,
        inforce_premium: ps.filter((p) => p.status === "In Force" || p.status === "Issued")
          .reduce((s, p) => s + (p.annual_premium || 0), 0),
      };
    }).sort((a, b) => cmp(a.last_name, b.last_name) || cmp(a.first_name, b.first_name));
  }
  function listPolicies(db) {
    const byId = new Map(db.clients.map((c) => [c.id, c]));
    return db.policies.map((p) => {
      const c = byId.get(p.client_id) || {};
      return { ...p, first_name: c.first_name, last_name: c.last_name, dob: c.dob, phone: c.phone, email: c.email, state: c.state };
    }).sort((a, b) => cmp(b.app_date || b.created_at, a.app_date || a.created_at));
  }

  // --- CSV ---------------------------------------------------------------
  function csvCell(v) {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", i = 0, quoted = false;
    text = text.replace(/^﻿/, "");
    while (i < text.length) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        if (ch === '"') { quoted = false; i++; continue; }
        field += ch; i++; continue;
      }
      if (ch === '"') { quoted = true; i++; continue; }
      if (ch === ",") { row.push(field); field = ""; i++; continue; }
      if (ch === "\r" || ch === "\n") {
        row.push(field); rows.push(row); row = []; field = "";
        i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
        continue;
      }
      field += ch; i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  function exportCsv(db) {
    const lines = [CSV_COLUMNS.join(",")];
    for (const c of listClients(db)) {
      const ps = db.policies.filter((p) => p.client_id === c.id).sort((a, b) => cmp(a.app_date, b.app_date));
      const clientCells = CLIENT_FIELDS.map((f) => c[f]);
      if (!ps.length) lines.push(clientCells.concat(POLICY_FIELDS.slice(1).map(() => "")).map(csvCell).join(","));
      for (const p of ps) lines.push(clientCells.concat(POLICY_FIELDS.slice(1).map((f) => p[f])).map(csvCell).join(","));
    }
    return lines.join("\r\n") + "\r\n";
  }

  function policyExists(db, clientId, p) {
    return db.policies.some((x) => x.client_id === clientId && (p.policy_number
      ? x.policy_number === p.policy_number
      : !x.policy_number && x.carrier.toLowerCase() === p.carrier.toLowerCase()
        && x.product_type === p.product_type && x.app_date === p.app_date));
  }

  function importCsv(db, text) {
    const rows = parseCsv(text);
    if (!rows.length) throw new HttpError(400, "CSV is empty");
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/ /g, "_"));
    let clientsAdded = 0, policiesAdded = 0, policiesSkipped = 0;
    rows.slice(1).forEach((cells, idx) => {
      const row = {};
      header.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
      const client = {};
      CLIENT_FIELDS.forEach((f) => (client[f] = row[CLIENT_CSV_PREFIXED[f] || f] || ""));
      if (!client.first_name && !client.last_name) return;
      const existing = db.clients.find((c) => c.first_name.toLowerCase() === client.first_name.toLowerCase()
        && c.last_name.toLowerCase() === client.last_name.toLowerCase() && c.dob === client.dob);
      let clientId;
      if (existing) clientId = existing.id;
      else { clientId = saveClient(db, client); clientsAdded++; }
      const policy = {};
      POLICY_FIELDS.slice(1).forEach((f) => (policy[f] = row[f] || ""));
      if (!["carrier", "policy_number", "product_type", "annual_premium", "face_amount"].some((f) => policy[f])) return;
      policy.client_id = clientId;
      policy.status = policy.status || "Submitted";
      if (policyExists(db, clientId, policy)) { policiesSkipped++; return; }
      try { savePolicy(db, policy); } catch (e) { throw new HttpError(400, `Row ${idx + 2}: ${e.message}`); }
      policiesAdded++;
    });
    return { clients_added: clientsAdded, policies_added: policiesAdded, policies_skipped: policiesSkipped };
  }

  // --- request router (same paths as server.py) --------------------------
  function handle(method, path, body) {
    const parts = path.split("?")[0].split("/").filter(Boolean);
    if (parts[0] !== "api" || parts.length < 2 || parts.length > 3) throw new HttpError(404, "Not found");
    const resource = parts[1];
    let id = null;
    if (parts.length === 3) {
      if (!/^\d+$/.test(parts[2])) throw new HttpError(404, "Not found");
      id = +parts[2];
    }
    const db = load();
    const write = (result) => { save(db); return result; };
    if (resource === "clients") {
      if (method === "GET" && id === null) return listClients(db);
      if (method === "POST" && id === null) return write({ id: saveClient(db, body || {}) });
      if (method === "PUT" && id !== null) return write({ id: saveClient(db, body || {}, id) });
      if (method === "DELETE" && id !== null) {
        if (!db.clients.some((c) => c.id === id)) throw new HttpError(404, "Client not found");
        db.clients = db.clients.filter((c) => c.id !== id);
        db.policies = db.policies.filter((p) => p.client_id !== id);
        return write({ ok: true });
      }
    } else if (resource === "policies") {
      if (method === "GET" && id === null) return listPolicies(db);
      if (method === "POST" && id === null) return write({ id: savePolicy(db, body || {}) });
      if (method === "PUT" && id !== null) return write({ id: savePolicy(db, body || {}, id) });
      if (method === "DELETE" && id !== null) {
        if (!db.policies.some((p) => p.id === id)) throw new HttpError(404, "Policy not found");
        db.policies = db.policies.filter((p) => p.id !== id);
        return write({ ok: true });
      }
    } else if (resource === "export" && method === "GET") {
      return exportCsv(db);
    } else if (resource === "import" && method === "POST") {
      return write(importCsv(db, body || ""));
    }
    throw new HttpError(404, "Not found");
  }

  window.LocalStore = {
    request(method, path, body) {
      try {
        return Promise.resolve(handle(method, path, body));
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };
})();
