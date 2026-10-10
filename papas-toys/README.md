# Bullsleads

Your own backend + admin dashboard for the Record Lookup extension, replacing
the original `daddy-record-admin.web.app`. The extension scrapes matched records
from Salesforce and uploads them here; the dashboard lets you view, edit,
geocode, hitlist and archive them.

```
papas-toys/
├── server/            Node/Express API + static dashboard (deploys to Railway)
│   ├── src/           API, auth, geocoding, SQLite
│   ├── public/        the "Bullsleads" dashboard (HTML/CSS/JS)
│   └── Dockerfile     container image Railway builds
└── extension/         the Chrome extension, repointed to your backend
                       (only c.js + manifest.json changed; a.js/b.js/p.* unchanged)
```

Auth stays on **Firebase Authentication** (your own Firebase project), so the
extension popup and the dashboard share the same user accounts. The server only
*verifies* Firebase tokens — no passwords touch it.

---

## 1. Firebase (one-time, free)

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Sign-in method →** enable **Email/Password**.
3. **Authentication → Users →** add the accounts that should be able to log in.
4. **Project settings → General →** add a Web App if there isn't one, then copy:
   - **Web API Key** (looks like `AIza...`)
   - **Project ID**

## 2. Deploy the server to Railway

1. Push this repo to GitHub (or use the Railway CLI).
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo, and set
   the **root directory** to `papas-toys/server` (Railway will use the Dockerfile).
3. **Add a Volume** to the service and mount it at `/data` (this is where the
   SQLite database lives so it survives redeploys).
4. Set these **Variables** on the service:

   | Variable | Value |
   |---|---|
   | `FIREBASE_PROJECT_ID` | your Firebase project ID |
   | `FIREBASE_WEB_API_KEY` | your Firebase Web API key |
   | `DB_PATH` | `/data/papas-toys.db` |
   | `GEOCODE_USER_AGENT` | `papas-toys/1.0 (you@example.com)` — a real email (Nominatim requires it) |
   | `GOOGLE_MAPS_API_KEY` | *(optional)* enables Google geocoding fallback |
   | `GEOCODE_PROVIDER` | `nominatim` (default) or `google` |

   `PORT` is provided by Railway automatically — don't set it.
5. Deploy. Railway gives you a domain like `https://papas-toys-production.up.railway.app`.
   Open it — you should see the login screen. Health check is at `/healthz`.

## 3. Point the extension at your backend

In `papas-toys/extension/`:

- **`c.js`** — replace `YOUR-RAILWAY-APP.up.railway.app` with your Railway domain
  and `YOUR_FIREBASE_WEB_API_KEY` with your Firebase Web API key.
- **`manifest.json`** — replace `YOUR-RAILWAY-APP.up.railway.app` in
  `host_permissions` with the same domain.

Then load it: Chrome → `chrome://extensions` → **Developer mode** → **Load
unpacked** → select the `extension/` folder. Log in through the extension popup
with one of your Firebase users.

---

## How it fits together

```
Salesforce Lightning  ──(content script a.js scrapes)──►  extension
        extension popup ──login──►  Firebase Auth (your project)  ──ID token──┐
        extension bg b.js ──POST /record-upload (Bearer token)──►  Railway server
                                                                   │  verifies token
                                                                   │  upserts to SQLite
                                                                   │  queues geocoding
        you ──login──►  dashboard (same Firebase)  ──GET /api/records──►  Railway server
```

## API (all require `Authorization: Bearer <firebase-id-token>`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/record-upload` | `{ rows, queueGeocode, googleFallback }` → upsert, returns `{ created, updated, skipped, geocoding:{queued} }` (the shape the extension expects) |
| POST | `/record-geocode` | drain the geocoding queue now |
| GET | `/api/records` | list with `search`, `market`, `record_source`, `product`, `tab`, `archived`, `limit`, `offset` |
| GET | `/api/facets` | distinct values for the filter dropdowns |
| PATCH | `/api/records/:id` | `{ address?, lat?, lng?, archived?, hitlist? }` |
| GET | `/api/config` | Firebase web config for the dashboard login |

## Geocoding

- Default: **OpenStreetMap Nominatim** — free, no key, throttled to ~1 req/sec,
  and it requires a real contact email in `GEOCODE_USER_AGENT`.
- Optional: set `GOOGLE_MAPS_API_KEY` to use Google as the `googleFallback` the
  extension requests, or set `GEOCODE_PROVIDER=google` to make it primary.
- Records are geocoded on upload, on a 60-second timer, and on demand via the
  dashboard's **Run Geocoding** button. Editing an address re-queues it.

## Local run (optional)

```bash
cd papas-toys/server
cp .env.example .env    # fill in FIREBASE_* ; set DB_PATH=./data/papas-toys.db
npm install
npm start               # http://localhost:8080
```

## Notes / not yet wired

The dashboard's Records view is fully functional (search, market / record source /
product / sub-source / geo-status filters, All Leads / Needs Fix, address + lat/lng
editing, hitlist, archive, geocoding). The **Map / Calendar / Routes / Legend /
Users** nav items and a few visual-only filter controls (Location / Door / Call,
the appointment-outcome checkboxes) are placeholders — tell me which you want
built out and I'll wire them to real data.
