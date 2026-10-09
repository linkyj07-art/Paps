'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'papas-toys.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id               TEXT PRIMARY KEY,         -- stable record id (recordId/leadId/rowRecordId)
    name             TEXT,
    phone            TEXT,
    email            TEXT,
    company          TEXT,
    address          TEXT,
    city             TEXT,
    market           TEXT,
    product          TEXT,
    record_source    TEXT,
    sub_source       TEXT,
    comp_app_date    TEXT,                      -- appointment date/time as captured
    lead_url         TEXT,
    lat              REAL,
    lng              REAL,
    geo_status       TEXT NOT NULL DEFAULT 'Needs Geocoding', -- Needs Geocoding | Geocoded | Failed | Manual
    geo_fails        INTEGER NOT NULL DEFAULT 0,
    geo_last_error   TEXT,
    archived         INTEGER NOT NULL DEFAULT 0,
    hitlist          INTEGER NOT NULL DEFAULT 0,
    raw              TEXT,                      -- full original row JSON
    uploaded_at      TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL UNIQUE,
    pass_hash   TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_records_market        ON records(market);
  CREATE INDEX IF NOT EXISTS idx_records_geo_status    ON records(geo_status);
  CREATE INDEX IF NOT EXISTS idx_records_archived      ON records(archived);
  CREATE INDEX IF NOT EXISTS idx_records_uploaded_at   ON records(uploaded_at);
  CREATE INDEX IF NOT EXISTS idx_records_comp_app_date ON records(comp_app_date);
`);

module.exports = db;
