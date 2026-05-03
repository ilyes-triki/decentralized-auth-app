# Decentralized Auth — Frontend

Angular single-page application for wallet-based sign-in with **MetaMask** (or any injected Ethereum provider). It talks to the backend REST API for nonce retrieval, login, profile verification, and optional admin dashboards.

---

## Tech stack

| Area | Technology |
|------|------------|
| Framework | **Angular** 21 |
| Language | **TypeScript** |
| Wallet | **ethers** v6 (browser provider / signing) |
| Styling | **SCSS**, component-scoped styles |
| SSR | **Angular SSR** (`@angular/ssr`) — production builds include a Node server bundle |
| Unit tests | **Vitest** via `@angular/build` |

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** (project pins `packageManager` in `package.json`; use `npm ci` or `npm install` accordingly)

The backend API should be running when you exercise login and authenticated routes (default dev URL below).

---

## Getting started

### Install dependencies

```bash
npm install
```

### Development server

```bash
npm start
```

Opens the app at **`http://localhost:4200/`** by default (`ng serve`). The home route is the **landing page**; **Sign in** lives at **`/login`**.

### Pointing at the API

API calls use `environment.apiBaseUrl`. For local development this is set in:

- `src/environments/environment.ts`
- `src/environments/environment.production.ts`

Default:

```text
http://localhost:8080/api/auth
```

Change these files (or replace with file replacements / CI variables) when deploying so the UI targets your deployed backend.

---

## NPM scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Start dev server | `npm start` | `ng serve` — hot reload on port 4200 |
| Production build | `npm run build` | Optimized browser + SSR artifacts under `dist/` |
| Unit tests | `npm test` | `ng test` (Vitest) |
| Watch build | `npm run watch` | Development build in watch mode |
| Serve SSR output | `npm run serve:ssr:decentralized-auth` | Run built Node server (after `ng build`) |
| Clean Angular cache | `npm run clean:cache` | Removes `.angular/cache` if tooling acts up |

---

## Application routes (overview)

| Path | Guard | Description |
|------|-------|-------------|
| `/` | — | Public landing page |
| `/login` | Logged-out only | Wallet connect + signature login |
| `/wallet-setup` | Logged-out only | MetaMask installation guidance |
| `/profile` | Authenticated | Profile and server verification |
| `/admin` | Admin role | Admin dashboard (stats, history, access log) |

Unauthenticated access to protected routes redirects to **`/login`**.

---

## Project layout (high level)

```text
src/
  app/
    core/           # Route guards, HTTP interceptors
    pages/          # Feature routes (home, login, profile, admin, wallet-setup)
    services/       # Auth, API, Web3, toast, error helpers
    shared/         # Navbar, banners, toast host
    models/
  environments/     # apiBaseUrl and production flags
  styles.scss       # Global tokens and layout
```

---

## Testing

```bash
npm test
```

Tests run in Node with **Vitest**; no separate browser install is required for the default CLI setup.

---

## Production build

```bash
npm run build
```

Review Angular CLI output for `dist/decentralized-auth/`. Configure your host or reverse proxy to serve the browser bundle and, if you use SSR, the generated server entry.

**Before go-live:** set `environment.production.ts` `apiBaseUrl` to your real API base (HTTPS in production).

---

## Troubleshooting

| Issue | Suggestion |
|-------|------------|
| Login fails / network errors | Confirm backend is up and CORS allows `http://localhost:4200` (or your dev URL). |
| MetaMask not detected | Install the extension or use **Wallet setup**; some browsers need permission prompts. |
| Stale build errors | Run `npm run clean:cache` and rebuild. |
| Wrong API host | Edit `src/environments/environment*.ts` `apiBaseUrl`. |

---

## Related repository

Backend service (Spring Boot) lives alongside this project under **`decentralized-auth-backend/backend/`** — see that folder’s `README.md` for API and environment configuration.

---

## License

Use and license terms follow your organization or repository root `LICENSE` file (if present).
