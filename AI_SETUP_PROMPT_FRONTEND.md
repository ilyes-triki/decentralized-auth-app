# Frontend Setup Prompt (Any AI)

```text
Help me set up and run the frontend from a fresh clone.

Frontend path:
- ./decentralized-auth

Tasks:
1) Verify Node/npm versions.
2) Install dependencies.
3) Configure API base URLs for dev/prod.
4) Start frontend dev server.
5) Run tests.
6) Validate wallet+auth UI connectivity to backend.

Required frontend config:
- Update src/environments/environment.ts:
  - apiBaseUrl should point to backend auth base (example: http://localhost:8080/api/auth).
- Update src/environments/environment.production.ts:
  - apiBaseUrl should point to deployed backend auth base (HTTPS).

Run commands:
- cd decentralized-auth
- npm install
- npm start
- npm test

Validation checks:
- App loads at http://localhost:4200.
- Login page can call /api/auth/email/start and /api/auth/nonce via configured apiBaseUrl.
- Admin section requests map correctly to /api/admin through API root derivation.
- ACCOUNT_BLOCKED and IP_BLOCKED responses are handled with user-friendly flow.

If errors occur:
- identify whether issue is frontend config, backend availability, CORS, or wallet provider.
- fix and continue until frontend is usable with backend.
```

