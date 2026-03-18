# fyxcloud-split

Fyx Cloud AI — AI Security Posture Management platform.

Monolithic full-stack app (React/Vite + Express/TypeScript + PostgreSQL) with support for running frontend and backend on separate ports in development.

## Modes
- **Combined** (default): `npm run dev` — everything on port 5000
- **Split — Backend**: `API_ONLY=true PORT=3000 npm run dev` — Express API on port 3000
- **Split — Frontend**: `BACKEND_PORT=3000 vite --port 5000` — Vite on port 5000, proxies /api to port 3000
