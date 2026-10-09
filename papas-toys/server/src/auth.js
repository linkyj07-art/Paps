'use strict';

// Self-contained auth: email/password accounts in SQLite (scrypt-hashed),
// signed with our own HS256 JWTs. No third-party auth service.

const crypto = require('crypto');
const db = require('./db');

const AUTH_SECRET = process.env.AUTH_SECRET || '';
const ACCESS_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

if (!AUTH_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[auth] AUTH_SECRET is not set — set a long random string or tokens cannot be trusted.');
}

// ---------- password hashing (scrypt, built-in) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}
function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const derived = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(expected, derived);
}

// ---------- minimal JWT (HS256) ----------
const b64url = (buf) => Buffer.from(buf).toString('base64url');
function sign(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verify(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Bad signature');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (payload.exp && Date.now() > payload.exp) throw new Error('Token expired');
  return payload;
}

function issueTokens(user) {
  const now = Date.now();
  const base = { sub: user.id, email: user.email };
  return {
    token: sign({ ...base, type: 'access', exp: now + ACCESS_TTL_MS }),
    refreshToken: sign({ ...base, type: 'refresh', exp: now + REFRESH_TTL_MS }),
    expiresAt: now + ACCESS_TTL_MS,
    email: user.email,
  };
}

// ---------- user store ----------
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare('INSERT INTO users (email, pass_hash, created_at) VALUES (?, ?, ?)');
const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users');

function createUser(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !password) throw new Error('Email and password are required');
  if (getUserByEmail.get(normalized)) throw new Error('A user with that email already exists');
  const info = insertUser.run(normalized, hashPassword(password), new Date().toISOString());
  return { id: info.lastInsertRowid, email: normalized };
}

function login(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = getUserByEmail.get(normalized);
  if (!user || !verifyPassword(password, user.pass_hash)) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }
  return issueTokens(user);
}

function refresh(refreshToken) {
  let payload;
  try {
    payload = verify(refreshToken);
  } catch (err) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }
  if (payload.type !== 'refresh') throw Object.assign(new Error('Not a refresh token'), { status: 401 });
  const user = getUserById.get(payload.sub);
  if (!user) throw Object.assign(new Error('User no longer exists'), { status: 401 });
  return issueTokens(user);
}

// Seed an initial admin from env if there are no users yet.
function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (countUsers.get().n > 0) return;
  try {
    createUser(email, password);
    // eslint-disable-next-line no-console
    console.log(`[auth] seeded initial admin user: ${String(email).toLowerCase()}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] could not seed admin:', err.message);
  }
}

// ---------- express middleware ----------
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = verify(match[1]);
    if (payload.type !== 'access') return res.status(401).json({ error: 'Wrong token type' });
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', detail: String(err.message || err) });
  }
}

module.exports = {
  requireAuth, login, refresh, createUser, seedAdmin,
  hasUsers: () => countUsers.get().n > 0,
};
