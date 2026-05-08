# General Project Setup Prompt (Any AI)

Use this prompt with any AI assistant to set up this project from a fresh clone.

```text
You are helping me set up a full-stack project after cloning it.

Goal:
1) Verify prerequisites.
2) Configure frontend and backend environment values.
3) Install dependencies.
4) Run backend and frontend locally.
5) Validate login/auth/admin flows.
6) Provide a final checklist of what was configured.

Project structure:
- Frontend: ./decentralized-auth
- Backend repo: ./decentralized-auth-backend
- Backend app directory: ./decentralized-auth-backend/backend

Required setup rules:
- Backend:
  - Configure APP_AUTH_JWT_SECRET (strong Base64 secret for non-dev).
  - Configure APP_CORS_ALLOWED_ORIGINS to include frontend origin.
  - Optionally configure APP_AUTH_ADMIN_WALLETS for admin access.
  - Use H2 for local quick run OR configure SPRING_DATASOURCE_URL / USERNAME / PASSWORD with postgres profile.
- Frontend:
  - Set src/environments/environment.ts apiBaseUrl (usually http://localhost:8080/api/auth for local).
  - Set src/environments/environment.production.ts apiBaseUrl for production backend URL.

What I want from you:
- Give exact commands for Windows PowerShell and bash when needed.
- Explain each required variable in 1 short line.
- Run or propose smoke checks:
  - backend health/admin access endpoint,
  - frontend app loads at localhost:4200,
  - login flow can reach nonce endpoint,
  - blocked/admin routes behavior sanity check.
- If anything fails, troubleshoot and continue until both apps run.
```

