# BERT deployment runbook — paid pilot hosting

This runbook is for **hosted paid pilot** deployments: a small number of tenants, real Google Workspace data, and operator support. It assumes **Phase 1** API behaviour is in place (`server/server.mjs`): production env validation at boot, **`GET /api/health`**, **`GET /api/readiness`**, and safer startup logs. See also **`docs/production-launch-checklist.md`**.

---

## 1. Target paid-pilot architecture

### Recommended split origin (three hosts)

```txt
usebert.co.uk        -> marketing website (static or CMS; not this repo)
app.usebert.co.uk    -> React/Vite frontend (static build from `npm run build` / `dist/`)
api.usebert.co.uk    -> Express API (`server/server.mjs`, Node process)
```

- The SPA is built with **`FRONTEND_URL=https://app.usebert.co.uk`** (or your chosen app host) so links in emails and OAuth return URLs resolve correctly.
- The API listens on **`PORT`** (default **8787** internally); the public URL is **`https://api.usebert.co.uk`** with TLS at the reverse proxy.
- **`GOOGLE_REDIRECT_URI`** must exactly match the registered OAuth redirect, e.g. **`https://api.usebert.co.uk/auth/google/callback`**.

### Alternative: single app host + path routing

```txt
app.usebert.co.uk    -> reverse proxy: static files for `/` + proxy `/api` and `/auth` to the Node API
```

- One public hostname; simpler DNS and TLS.
- Configure the proxy so **`FRONTEND_URL`** is still **`https://app.usebert.co.uk`** (the user-facing origin) and **`GOOGLE_REDIRECT_URI`** matches the **callback URL the browser hits** (often the same host: `https://app.usebert.co.uk/auth/google/callback` if the API is mounted there—must match Google Cloud Console).

Pick one model per environment and keep **redirect URIs** and **`FRONTEND_URL`** consistent with what users and Google see.

---

## 2. Required environment variables

### Must set for production API (`NODE_ENV=production`)

| Variable | Purpose |
|----------|---------|
| **`NODE_ENV`** | Set to **`production`** to enable strict boot checks and readiness HTTP semantics. |
| **`PORT`** | API listen port inside the container/VM (default **8787** if unset). |
| **`SESSION_SECRET`** | Cookie signing for Express; must be **strong**, **not** the local default, and **≥ 24 characters** or the API will refuse to start. |
| **`FRONTEND_URL`** | Public origin of the SPA (e.g. `https://app.usebert.co.uk`). Used in redirects and email links. Use **HTTPS** for non-loopback hosts. |
| **`GOOGLE_CLIENT_ID`** | OAuth web client ID. |
| **`GOOGLE_CLIENT_SECRET`** | OAuth client secret. |
| **`GOOGLE_REDIRECT_URI`** | Must match the OAuth redirect URL registered in Google Cloud (e.g. `https://api.usebert.co.uk/auth/google/callback`). |
| **`GOOGLE_SHARED_DRIVE_ID`** | Shared Drive (or folder) the provisioning Google account can write to. |
| **`BERT_ALLOWED_ORIGINS`** | Comma-separated **exact** browser/Capacitor origins allowed to call the API with credentials (e.g. `https://app.usebert.co.uk,capacitor://localhost,http://localhost:5173`). No `*` wildcard with `Access-Control-Allow-Credentials`. |
| **`BERT_COOKIE_SAMESITE_NONE`** | Set to **`true`** to force session cookies to **`SameSite=None; Secure`** even when **`NODE_ENV`** is not **`production`** (e.g. HTTPS staging). When **`NODE_ENV=production`**, this behaviour is always on for BERT session cookies. **`SameSite=None` requires HTTPS** on the API. |
| **`APP_SUPPORT_EMAIL`** | Customer-facing support inbox (e.g. `admin@usebert.co.uk`) for server-driven mail. |
| **`SMTP_HOST`** | Outbound mail server for invites and notifications. |
| **`SMTP_PORT`** | Typically **587** (STARTTLS) or **465** (TLS). |
| **`SMTP_USER`** | SMTP auth user. |
| **`SMTP_PASS`** | SMTP auth password or app password. |

### Strongly recommended (email identity)

The API treats a complete SMTP config as including a from-address. Set at least one of:

- **`SMTP_FROM_EMAIL`** (and optionally **`SMTP_FROM_NAME`**)

If SMTP is incomplete, many flows still work using **manual invite links** / mailto drafts from the app, but **server-sent** invite and incident mail will not work until SMTP is complete.

### Optional tuning / branding

| Variable | Purpose |
|----------|---------|
| **`APP_BRAND_NAME`** | Brand string in emails and OAuth callback pages. |
| **`APP_ADMIN_EMAIL`** | Alias for support inbox if **`APP_SUPPORT_EMAIL`** is unset. |
| **`SHEETS_READ_GAP_MS`** | Throttle between Sheets reads (default 500 ms). |
| **`SHEETS_QUOTA_MAX_RETRIES`** | Retries on 429 / quota errors (default 8). |

Reference: **`.env.example`** (local + commented production block). For credentialed cross-origin behaviour, see **`scripts/verify-cors-cookies.md`** and [§9.5 Cookies and split origins](#95-cookies-and-split-origins).

---

## 3. Google Cloud setup

1. **OAuth consent screen** — Configure for **External** or **Internal** (Workspace) as appropriate; add scopes needed for Drive and Sheets (already requested by the app).
2. **Web OAuth client** — Create credentials of type **Web application**.
3. **Authorized redirect URIs** — Add exactly **`GOOGLE_REDIRECT_URI`** for this environment, e.g.  
   **`https://api.usebert.co.uk/auth/google/callback`**
4. **APIs** — Enable **Google Drive API** and **Google Sheets API** for the Google Cloud project.
5. **Shared Drive** — The ID in **`GOOGLE_SHARED_DRIVE_ID`** must be a drive/folder the **Google account that completes OAuth on the API server** can access (typically membership in a Shared Drive for production provisioning).
6. **Least privilege** — Use a dedicated Google user or service policy for the API’s stored session; rotate credentials if the session file is ever exposed.

---

## 4. Email / domain setup

- Set **`APP_SUPPORT_EMAIL=admin@usebert.co.uk`** (or your pilot support address).
- Configure **SMTP** with a reputable provider (transactional email recommended for pilots).
- Configure **SPF**, **DKIM**, and **DMARC** on the **sending domain** used in **`SMTP_FROM_EMAIL`** to improve deliverability and reduce spoofing risk.
- **Before a customer demo:** send a **test invite** (or incident notification) to a mailbox you control and confirm inbox placement (not spam).

---

## 5. Health / readiness checks

| Endpoint | Role |
|----------|------|
| **`GET /api/health`** | **Liveness** — process is up; returns version, environment, whether Google env vars are present, and **`sharedDriveConfigured`** (boolean). Does **not** expose raw Drive IDs. |
| **`GET /api/readiness`** | **Readiness** — Google env complete, **`.sessions`** directory writable, and production env rules satisfied. |

### Recommended hosting behaviour

- **Uptime / external ping** — Use **`/api/health`** (expect HTTP **200** and `"ok": true`).
- **Load balancer / orchestrator readiness** — Use **`/api/readiness`**; expect **HTTP 200** when `"ready": true`. When **`NODE_ENV=production`** and the instance is **not** ready, the API returns **HTTP 503** so traffic should not be routed to that instance until configuration is fixed.

See **`docs/production-launch-checklist.md`** for boot-blocking rules in production.

---

## 6. First deployment checklist

1. **Build frontend** — `npm run build` (outputs **`dist/`**).
2. **Deploy API** — Ship **`server/server.mjs`** with **`package.json`** dependencies installed (`npm ci --omit=dev` or equivalent in the API image).
3. **Set env vars** — All required variables from section 2; confirm **`NODE_ENV=production`** and **`BERT_ALLOWED_ORIGINS`** lists every hosted app / Capacitor / dev origin that calls the API with cookies (see [§9.5](#95-cookies-and-split-origins)).
4. **Start API** — `node server/server.mjs` (or `npm run server` with env injected).
5. **`GET /api/health`** — Confirm **200** and expected flags.
6. **`GET /api/readiness`** — Confirm **200** and **`"ready": true`** before marking the instance in service.
7. **Google OAuth** — From the SPA as an admin/setup user, complete **Connect Google** so the API stores a valid session under **`.sessions/`**.
8. **Send test invite** — Verify SMTP or manual link path.
9. **Hosted onboarding** — Open **`?invite=<token>`** for a valid invite; complete provisioning per UI (may take minutes; watch API logs).
10. **Validate workspace** — Use Admin & setup **Check workspace** (and **Fix workspace** if needed) after linking folders.
11. **Smoke test** — One audit, one action, one report export path relevant to the pilot role set.

---

## 7. Troubleshooting boot failures

If the API **exits on start** in production, check the console for listed **blocking** issues:

| Symptom / cause | Fix |
|-----------------|-----|
| Missing **`SESSION_SECRET`** | Set a long random secret in the environment. |
| Weak / **default `SESSION_SECRET`** | Do not use the local dev default; use 24+ random characters. |
| **`ALLOW_INSECURE_OAUTH_STATE=true`** | Unset or set to false in production. |
| **Incomplete Google env** | Set all of **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`**, **`GOOGLE_REDIRECT_URI`**, **`GOOGLE_SHARED_DRIVE_ID`**. |
| **HTTP URLs** for public hosts | Use **HTTPS** for **`FRONTEND_URL`** and **`GOOGLE_REDIRECT_URI`** on real domains (warnings may appear for http). |
| **`.sessions` not writable** | Ensure the process user can write to the app directory’s **`.sessions/`** (or mount a writable volume there). |
| **Google redirect mismatch** | **`GOOGLE_REDIRECT_URI`** must match the Google Cloud Console entry character-for-character (scheme, host, path). |
| **Cross-origin `fetch` + cookies** | Set **`BERT_ALLOWED_ORIGINS`** to every exact app origin; API must use **HTTPS** so **`SameSite=None; Secure`** session cookies are stored. See [§9.5](#95-cookies-and-split-origins). |
| **SMTP incomplete** | Does not block API boot; blocks **readiness** only if you later tie readiness to SMTP (current code does **not** require SMTP for readiness—invite mail may still fail until SMTP is set). |

If the process **starts** but **`/api/readiness`** returns **503** in production, read the JSON **`errors`**, **`missingGoogleKeys`**, and **`checks.sessionStoreWritable`** fields.

---

## 8. What not to do

- **Do not commit `.env`** or real secrets to git.
- **Do not** use **`localhost`** in production **`FRONTEND_URL`** (users and Google redirects will break for real customers).
- **Do not log secrets** (API keys, `SESSION_SECRET`, SMTP passwords, OAuth tokens). Use the API’s redacted startup style in production as a baseline; avoid extra debug logging in pilot.
- **Do not change `localStorage` keys** in the client “for deployment”—keys are part of the persisted workspace model; migrations need a deliberate plan.
- **Do not rename role literals** (`Master`, `Admin`, etc.) without a coordinated app + sheet migration.
- **Do not** treat this paid-pilot runbook as **public self-serve launch** readiness—self-serve still needs durable multi-tenant auth, database/billing, abuse controls, and a full security review beyond this document.

---

## 9. Android paid pilot (hosted API + release APK)

This path targets **internal BERT operators** provisioning customer workspaces from a **release-signed** Android build that talks to **`https://api.usebert.co.uk`** (not loopback).

### 9.1 API host

1. Deploy the Node API (`server/server.mjs`) to **`https://api.usebert.co.uk`** with **`NODE_ENV=production`** and the [required environment variables](#2-required-environment-variables) (especially **`SESSION_SECRET`**, Google OAuth, **`FRONTEND_URL`**, **`GOOGLE_REDIRECT_URI`** matching this deployment).
2. Ensure **`.sessions/`** on the API host is writable and contains:
   - **`google-session.json`** after an operator completes **Connect Google** on the API (server-side Drive/Sheets access).
   - **`master-operators.json`** — created/updated only on the server via **`npm run seed:master`** (never ship Master passwords inside the mobile bundle).

### 9.2 Seed a Master operator (on the API host)

With **`BERT_MASTER_SEED_SECRET`** set in the API environment (see **`.env.example`**):

```bash
npm run seed:master -- --email <ops@yourorg.example> --name "Operator" --password '<strong-password>' --confirm
```

Verify Master auth against the live API (no secrets in logs):

```bash
curl -sS -X POST "https://api.usebert.co.uk/api/auth/master/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"<ops@yourorg.example>","password":"<strong-password>"}' | head -c 200
```

Expect JSON with **`"ok":true`** and a **`Set-Cookie`** for the Master session on success.

### 9.3 Pilot APK build (from this repo)

- **Do not** set **`VITE_ENABLE_DEMO_LOGIN=true`**, **`VITE_SHOW_DEBUG_UI=true`**, or embed demo passwords for pilot builds.
- Build the web bundle with the hosted API base, verify, sync Capacitor, then produce the release APK:

```bash
npm run android:apk:pilot
```

That runs **`VITE_API_BASE_URL=https://api.usebert.co.uk npm run build`**, **`BERT_VERIFY_PILOT_DIST=1 npm run verify:auth`**, **`npm run android:sync`**, and **`npm run android:apk:release`**.

**Blockers:** `android:apk:release` requires your Android **release keystore** and signing config (see `scripts/build-android-release-apk.sh` / Android Gradle signing). Without a keystore, use the debug APK script only for non-pilot devices.

### 9.4 Device flow (operator)

1. Install the pilot APK.
2. On the **sign-in** screen, open **Workspace setup (Master only)** (or load the app with **`?setup=master`** in the URL) to reach the Master-only sign-in card.
3. Sign in with the **Master email** and password from **`seed:master`** (server-checked; not stored in the APK).
4. After sign-in, the app opens **Onboarding (workspace setup)** in a **narrow shell** until you choose **Account → Open full BERT navigation** or sign out. Company staff without Master accounts never see the Master-only portal by default.
5. **Connect Google** runs against the **hosted API** origin; complete OAuth in the system browser / WebView as configured.

### 9.5 Cookies and split origins

When the SPA is served from a different origin than the API (static app host vs `api.usebert.co.uk`), or when the Android shell uses a **`capacitor://`** (or **`http://localhost`**) document origin while calling **`https://api…`**, the client uses **`fetch(..., { credentials: "include" })`**. The API then needs:

1. **CORS** — Set **`BERT_ALLOWED_ORIGINS`** to every exact **`Origin`** the app may send (include **`https://app.usebert.co.uk`**, **`capacitor://localhost`**, and local Vite preview origins if used). The API reflects **`Access-Control-Allow-Origin`** to that exact value and sets **`Access-Control-Allow-Credentials: true`**. Do **not** use a wildcard origin with credentials.
2. **Session cookies** — In **`NODE_ENV=production`** (or when **`BERT_COOKIE_SAMESITE_NONE=true`**), BERT sets **`bert_master_session`** / **`bert_company_session`** as **`SameSite=None; Secure; HttpOnly; Path=/`** (signed). **`SameSite=None` requires `Secure`**, so the API must be served over **HTTPS** in production. Logout and invalid-session paths clear cookies with the **same** attributes so WebViews drop them reliably.

If Master session cookies are dropped, sign-in may return **`200`** but **`GET /api/auth/master/session`** stays **`401`** — fix allowlisted origins and TLS before widening the pilot.

Manual checks: **`scripts/verify-cors-cookies.md`**.

## Revision

Update this runbook when hosting provider, domains, or Phase 2+ production architecture (e.g. managed DB for invites) changes.
