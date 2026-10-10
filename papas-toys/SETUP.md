# Bullsleads — Detailed Setup Guide

This walks you through everything, start to finish, assuming no prior experience
with Firebase or Railway. Follow it top to bottom. Budget ~45 minutes the first time.

**What you're building:** the Chrome extension scrapes leads from Salesforce and
uploads them to a backend you own on Railway; you view them on a dashboard (also
on Railway). Login is handled by Firebase (Google), so no passwords touch your
server.

**You'll need:**
- A Google account (for Firebase) — free.
- A GitHub account (to host the code Railway deploys from) — free.
- A Railway account — free trial, then usage-based (this app is tiny; a few $/mo).
- Google Chrome (to run the extension).

---

## Part 0 — Get the code onto GitHub

Railway deploys from a GitHub repo, so the code needs to be there first. It already
is, on the branch `claude/awesome-galileo-zl63ut` of your `linkyj07-art/Paps` repo.

1. Go to <https://github.com/linkyj07-art/Paps>.
2. Confirm you can see the `papas-toys/` folder (switch to the
   `claude/awesome-galileo-zl63ut` branch using the branch dropdown if needed).

If it's there, skip to Part 1. (If you'd rather it be on the `main` branch, tell me
and I'll open a pull request to merge it.)

---

## Part 1 — Firebase (login / user accounts)

Firebase here does ONE job: it holds your user accounts and checks passwords. Your
lead data does NOT go to Firebase — it goes to your Railway backend.

### 1.1 Create the project
1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it e.g. `papas-toys`. Click **Continue**.
4. **Google Analytics:** toggle it **off** (you don't need it). Click **Create project**.
5. Wait for it to finish, then click **Continue**.

### 1.2 Turn on Email/Password login
1. In the left sidebar, click **Build → Authentication**.
2. Click **Get started**.
3. On the **Sign-in method** tab, click **Email/Password** in the list.
4. Toggle the first switch (**Email/Password**) to **Enabled**. Leave the second
   (passwordless) off. Click **Save**.

### 1.3 Create your login user
1. Still in **Authentication**, click the **Users** tab.
2. Click **Add user**.
3. Enter the email + password you want to log in with (e.g. your email and a strong
   password). Click **Add user**.
4. Repeat for anyone else who needs access.
   *(These are the credentials you'll type into the extension popup and the dashboard.)*

### 1.4 Grab your two config values
1. Click the **gear icon** (top-left, next to "Project Overview") → **Project settings**.
2. On the **General** tab, scroll to **Your apps**. If there's no app yet:
   - Click the **`</>`** (Web) icon.
   - Nickname it `papas-toys-web`, do NOT check "Firebase Hosting". Click **Register app**.
   - You'll see a code snippet — you only need two things from it.
3. Copy and save these two values somewhere:
   - **Web API Key** — looks like `AIzaSy...` (also shown near the top of Project settings).
   - **Project ID** — looks like `papas-toys-xxxxx`.

You're done with Firebase for now. Keep those two values handy.

---

## Part 2 — Railway (backend + dashboard)

### 2.1 Create the service from GitHub
1. Go to <https://railway.app> and sign in (use **Login with GitHub** — easiest).
2. Click **New Project**.
3. Choose **Deploy from GitHub repo**.
4. If prompted, authorize Railway to access your GitHub, and specifically grant it
   access to the `linkyj07-art/Paps` repository.
5. Pick the **Paps** repo. Railway creates a service and tries to build.

### 2.2 Point it at the right folder and branch
The code lives in a subfolder, so tell Railway where to look.
1. Click the service (the box/card that appeared).
2. Go to the **Settings** tab.
3. Under **Source** / **Service**:
   - **Branch:** set to `claude/awesome-galileo-zl63ut` (or `main` if you merged it).
   - **Root Directory:** set to `papas-toys/server`.
4. Railway should detect the `Dockerfile` automatically (Builder = Dockerfile). If
   there's a **Builder** setting, make sure it's **Dockerfile**, not Nixpacks.

### 2.3 Add a persistent volume (so leads aren't lost on redeploy)
1. In the service, find **+ Create** or right-click the canvas → **Volume** (also
   available under the service's **Settings → Volumes**, depending on UI version).
2. Create a volume attached to this service with **Mount path:** `/data`.
3. Save.

### 2.4 Set environment variables
1. In the service, open the **Variables** tab.
2. Add these (click **New Variable** for each — name on the left, value on the right):

   | Name | Value |
   |---|---|
   | `FIREBASE_PROJECT_ID` | your Project ID from step 1.4 |
   | `FIREBASE_WEB_API_KEY` | your Web API Key from step 1.4 |
   | `DB_PATH` | `/data/papas-toys.db` |
   | `GEOCODE_USER_AGENT` | `papas-toys/1.0 (your-real-email@example.com)` |

   Optional:
   | Name | Value |
   |---|---|
   | `GOOGLE_MAPS_API_KEY` | a Google Geocoding API key, only if you want Google instead of free OpenStreetMap |

   **Do NOT** add `PORT` — Railway sets it automatically.
3. Railway will redeploy when you save variables. Watch the **Deployments** tab; wait
   for a green "Success".

### 2.5 Get your public URL
1. Go to **Settings → Networking → Public Networking**.
2. Click **Generate Domain** (pick the port it offers, usually 8080). 
3. You'll get a URL like `https://papas-toys-production-xxxx.up.railway.app`.
4. Open it in your browser. You should see the **Bullsleads** login screen.
   - Log in with the Firebase user from step 1.3 to confirm it works. (It'll show
     "No records" until the extension uploads some — that's expected.)

**Save your Railway domain** — you need it for the extension next.

---

## Part 3 — Point the extension at your backend

Right now the extension files have placeholders. Replace them with your real values.

You can either (A) let me fill them in for you — just send me your Railway domain
and Web API Key — or (B) edit the two files yourself:

### 3.1 Edit `c.js`
File: `papas-toys/extension/c.js`. Replace the placeholders:
```js
globalThis.CONTEXT_LAYER_CONFIG = {
  firebaseWebApiKey: "AIzaSy...your key...",
  recordUploadUrl:  "https://YOUR-DOMAIN.up.railway.app/record-upload",
  recordGeocodeUrl: "https://YOUR-DOMAIN.up.railway.app/record-geocode",
};
```

### 3.2 Edit `manifest.json`
File: `papas-toys/extension/manifest.json`. In `host_permissions`, replace the
placeholder domain with your Railway domain:
```json
"host_permissions": [
  "https://identitytoolkit.googleapis.com/*",
  "https://securetoken.googleapis.com/*",
  "https://YOUR-DOMAIN.up.railway.app/*"
]
```

### 3.3 Load the extension in Chrome
1. Download the `papas-toys/extension/` folder to your computer (if you edited on
   GitHub, download the repo as a ZIP and unzip, or `git clone` it).
2. Open Chrome → go to `chrome://extensions`.
3. Toggle **Developer mode** ON (top-right).
4. Click **Load unpacked**.
5. Select the `extension` folder (the one containing `manifest.json`).
6. The extension appears in your toolbar.

---

## Part 4 — Use it (end-to-end test)

1. Click the extension icon → a popup opens ("Papa's Login"). Log in with your
   Firebase user. It should say "Logged in as …".
2. Go to your Salesforce org (`*.lightning.force.com`) and open one of the supported
   list views: **MOD Data Today**, **Confirmed for Today**, or **Confirmed for Tomorrow**.
3. The **Record Lookup** panel appears. Click **Scan Rows**, pick markets, **Search
   Records**, then **Upload Records**.
4. Open your Railway dashboard URL, log in, and your leads are there — click any lead
   to see all its details.

---

## Troubleshooting

- **Dashboard says "Firebase web config is not set"** → `FIREBASE_WEB_API_KEY` or
  `FIREBASE_PROJECT_ID` is missing/wrong in Railway Variables. Fix and redeploy.
- **Extension login fails ("INVALID_LOGIN_CREDENTIALS")** → wrong email/password, or
  the user wasn't created in Firebase (step 1.3), or the Web API Key in `c.js` is wrong.
- **Upload fails with "Not logged in or not authorized"** → the `FIREBASE_PROJECT_ID`
  on the server doesn't match the project whose Web API Key the extension uses. They
  must be the same Firebase project.
- **Leads disappear after a redeploy** → the volume isn't mounted at `/data`, or
  `DB_PATH` isn't `/data/papas-toys.db`. Check Part 2.3 / 2.4.
- **Addresses never geocode** → `GEOCODE_USER_AGENT` must contain a real email
  (OpenStreetMap requires it). For higher volume, set `GOOGLE_MAPS_API_KEY`.
- **Railway build fails** → confirm Root Directory is `papas-toys/server` and the
  Builder is Dockerfile.

---

## What costs money

- **Firebase**: Email/Password auth is free at your scale.
- **Railway**: usage-based after the trial. A tiny always-on service + small volume is
  typically a few dollars a month.
- **Geocoding**: OpenStreetMap is free (rate-limited). Google is pay-per-use (only if
  you set the key).
