# Vercel Root Fix

Diese ZIP ist absichtlich flach aufgebaut.

Direkt auf der ersten Ebene befinden sich:

- package.json
- package-lock.json
- app/
- components/
- lib/
- public/
- types/
- next.config.mjs
- vercel.json

Prüfungen:

- npm ci: erfolgreich
- npm run typecheck: erfolgreich
- npm run build: erfolgreich
- Next.js 14.2.35
- Node.js-Ziel: 20.x

Wichtig: Nicht einen zusätzlichen Überordner in das GitHub-Repository hochladen.
