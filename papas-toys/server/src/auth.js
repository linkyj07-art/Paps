'use strict';

// Firebase ID-token verification middleware.
//
// The extension logs users in through Firebase Authentication and sends the
// resulting ID token as `Authorization: Bearer <token>` on every upload.
// The admin dashboard does the same. This middleware verifies that token.

const admin = require('firebase-admin');

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT;

if (!admin.apps.length) {
  // If GOOGLE_APPLICATION_CREDENTIALS is set, applicationDefault() picks it up.
  // Otherwise we initialize with just the projectId, which is enough to verify
  // ID tokens against Google's public certificates.
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    });
  } catch (_err) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
}

if (!PROJECT_ID) {
  // eslint-disable-next-line no-console
  console.warn(
    '[auth] FIREBASE_PROJECT_ID is not set — token verification will fail. ' +
      'Set it to the Firebase project that owns your user accounts.'
  );
}

async function verifyToken(idToken) {
  return admin.auth().verifyIdToken(idToken);
}

// Express middleware: require a valid Firebase ID token.
async function requireAuth(req, res, next) {
  const header = req.get('authorization') || req.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  try {
    const decoded = await verifyToken(match[1]);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || '',
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', detail: String(err && err.message || err) });
  }
}

module.exports = { admin, requireAuth, verifyToken, PROJECT_ID };
